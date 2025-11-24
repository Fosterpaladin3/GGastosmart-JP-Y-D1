"""
database/recommendation_operations.py

RecommendationOperations - Generador de recomendaciones para GastoSmart

Esta versión está diseñada para integrarse con tu proyecto:
- Soporta recibir una instancia de TransactionOperations (recomendado).
- Soporta recibir directamente AsyncIOMotorDatabase o AsyncIOMotorCollection como fallback.
- Métodos principales:
    - fetch_user_data(user_id, days=90)
    - generate_recommendations(user_id)
    - apply_recommendation(user_id, request)

Recomendaciones generadas (ejemplos):
- Balance negativo / bajo
- Porcentaje de gasto por categoría (alertas si >=30% o >=15%)
- Detecta posibles suscripciones (mismo merchant y montos repetidos)
- Muchos gastos pequeños que suman mucho
- Sugerencia de meta automática (10% ingresos)
- Alertas por superar límite configurado en user_settings

Ajusta umbrales y textos según necesites.
"""

from typing import List, Dict, Any, Optional, Union
from motor.motor_asyncio import AsyncIOMotorDatabase, AsyncIOMotorCollection
from datetime import datetime
import logging

try:
    # Importar TransactionOperations si existe en tu proyecto
    from database.transaction_operations import TransactionOperations
except Exception:
    TransactionOperations = None  # type: ignore

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)


class RecommendationOperations:
    """Generador de recomendaciones.

    La clase intenta trabajar con la mayor flexibilidad posible respecto a cómo se la
    instancia:
      - RecommendationOperations(TransactionOperations(...))  # recomendado
      - RecommendationOperations(async_db)  # AsyncIOMotorDatabase
      - RecommendationOperations(collection)  # AsyncIOMotorCollection

    """

    def __init__(
        self,
        db_or_tx: Optional[Union[AsyncIOMotorDatabase, TransactionOperations, AsyncIOMotorCollection]] = None,
        user_settings_collection: Optional[AsyncIOMotorCollection] = None
    ) -> None:
        self.transaction_ops: Optional[TransactionOperations] = None
        self.transactions_collection: Optional[AsyncIOMotorCollection] = None
        self.user_settings_collection: Optional[AsyncIOMotorCollection] = None
        self.goals_collection: Optional[AsyncIOMotorCollection] = None

        # Si nos pasaron TransactionOperations, usarla
        try:
            if TransactionOperations is not None and isinstance(db_or_tx, TransactionOperations):
                self.transaction_ops = db_or_tx
                # intentar extraer colecciones desde la instancia, si las expone
                self.user_settings_collection = getattr(db_or_tx, "user_settings", None)
                self.goals_collection = getattr(db_or_tx, "goals", None)
                logger.debug("RecommendationOperations inicializada con TransactionOperations")
                return
        except Exception as e:
            logger.debug("Error detectando TransactionOperations: %s", e)

        # Si viene una DB o una colección
        if db_or_tx is not None:
            # DB completa
            if hasattr(db_or_tx, "transactions") and hasattr(db_or_tx, "user_settings"):
                self.transactions_collection = getattr(db_or_tx, "transactions")
                self.user_settings_collection = getattr(db_or_tx, "user_settings")
                # goals opcional
                try:
                    self.goals_collection = getattr(db_or_tx, "goals", None) or db_or_tx.get_collection("goals")
                except Exception:
                    self.goals_collection = None
                logger.debug("RecommendationOperations inicializada con objeto DB (colecciones detectadas)")
            else:
                # Posible que nos pasen directamente la colección de transacciones
                self.transactions_collection = db_or_tx  # type: ignore
                try:
                    db = getattr(self.transactions_collection, "database", None)
                    if db is not None:
                        self.user_settings_collection = getattr(db, "user_settings", None) or db.get_collection("user_settings")
                        self.goals_collection = getattr(db, "goals", None) or db.get_collection("goals")
                except Exception:
                    pass

        # Si user_settings_collection fue pasada explícitamente
        if user_settings_collection is not None:
            self.user_settings_collection = user_settings_collection

        # Asegurarse atributos existan
        self.goals_collection = getattr(self, "goals_collection", None)

    # -----------------------------
    # Helpers
    # -----------------------------
    def _is_income(self, t: Dict[str, Any]) -> bool:
        typ = (t.get("type") or "").lower()
        return typ in ("ingreso", "income", "in", "deposit")

    def _is_expense(self, t: Dict[str, Any]) -> bool:
        typ = (t.get("type") or "").lower()
        return typ in ("gasto", "expense", "out", "withdrawal")

    def _parse_amount(self, t: Dict[str, Any]) -> float:
        amt = t.get("amount", 0) or 0
        try:
            return float(amt)
        except Exception:
            try:
                return float(str(amt).replace(",", "").strip())
            except Exception:
                return 0.0

    def _normalize_transaction(self, t: Any) -> Dict[str, Any]:
        if t is None:
            return {}
        if isinstance(t, dict):
            return t
        # pydantic / objeto
        try:
            if hasattr(t, "dict"):
                return t.dict()
            # fallback: construir manual
            return {
                "user_id": getattr(t, "user_id", None),
                "type": getattr(t, "type", None),
                "amount": getattr(t, "amount", 0),
                "category": getattr(t, "category", None),
                "description": getattr(t, "description", None),
                "merchant": getattr(t, "merchant", None),
                "date": getattr(t, "date", None),
            }
        except Exception:
            return {}

    # =====================================================
    #       OBTENER DATOS DEL USUARIO
    # =====================================================
    async def fetch_user_data(self, user_id: str, days: int = 90):
        """Devuelve (transactions:list, settings:dict).

        Transactions se normalizan a dicts simples.
        """
        transactions: List[Dict[str, Any]] = []
        settings: Optional[Dict[str, Any]] = None

        # 1) Intentar obtener mediante TransactionOperations (si existe)
        if self.transaction_ops is not None:
            try:
                tx_list = await self.transaction_ops.get_user_transactions(user_id, skip=0, limit=2000, filters=None, sort=None)
                normalized = [self._normalize_transaction(t) for t in tx_list]
                transactions = normalized
                logger.debug("fetch_user_data: obtenidas %d transacciones desde TransactionOperations", len(transactions))
            except Exception as e:
                logger.exception("Error usando TransactionOperations.get_user_transactions: %s", e)
                transactions = []
        else:
            # 2) Fallback directo desde colección Mongo
            try:
                if self.transactions_collection is None:
                    transactions = []
                else:
                    cursor = self.transactions_collection.find({"user_id": user_id})
                    transactions = await cursor.to_list(length=None)
                    logger.debug("fetch_user_data: obtenidas %d transacciones desde colección", len(transactions))
            except Exception as e:
                logger.exception("Error leyendo colección transactions: %s", e)
                transactions = []

        # Obtener settings
        try:
            if self.user_settings_collection is not None:
                settings = await self.user_settings_collection.find_one({"user_id": user_id})
                logger.debug("fetch_user_data: settings encontrados: %s", bool(settings))
        except Exception as e:
            logger.exception("Error leyendo user_settings: %s", e)
            settings = None

        if not settings:
            settings = {"meta_ahorro": None, "limite_gastos": None}

        return transactions, settings

    # =====================================================
    #       GENERADOR PRINCIPAL DE RECOMENDACIONES
    # =====================================================
    async def generate_recommendations(self, user_id: str) -> List[Dict[str, Any]]:
        """Genera recomendaciones basadas en transacciones y settings del usuario."""
        transactions, settings = await self.fetch_user_data(user_id)

        # Normalizar
        ingresos = 0.0
        gastos = 0.0
        by_category: Dict[str, float] = {}
        merchant_map: Dict[str, List[float]] = {}
        small_expense_count = 0
        small_expense_total = 0.0

        for raw in transactions:
            t = self._normalize_transaction(raw)
            amt = self._parse_amount(t)
            if self._is_income(t):
                ingresos += amt
            elif self._is_expense(t):
                gastos += amt
                cat = t.get("category") or "Sin categoría"
                by_category[cat] = by_category.get(cat, 0.0) + amt
                m = (t.get("merchant") or t.get("description") or "").strip().lower()
                if m:
                    merchant_map.setdefault(m, []).append(amt)
                if amt <= 20000:
                    small_expense_count += 1
                    small_expense_total += amt
            else:
                # si no se identifica, ignorar
                pass

        balance = ingresos - gastos
        recs: List[Dict[str, Any]] = []

        logger.debug("generate_recommendations: ingresos=%.2f gastos=%.2f balance=%.2f trans_count=%d",
                     ingresos, gastos, balance, len(transactions))

        # 1) Balance e ingresos
        if ingresos == 0 and gastos > 0:
            recs.append({
                "type": "no_income",
                "title": "No se detectaron ingresos",
                "detail": "Registra tus ingresos para obtener recomendaciones más precisas.",
                "score": 1.0,
                "suggested_action": "Registrar ingreso"
            })
        elif balance < 0:
            recs.append({
                "type": "negative_balance",
                "title": "Gastas más de lo que ingresas",
                "detail": f"Tus gastos ({gastos:.0f}) superan tus ingresos ({ingresos:.0f}). Considera reducir gastos.",
                "score": 0.98,
                "suggested_action": "Revisar presupuesto"
            })
        elif ingresos > 0 and (balance / ingresos) < 0.05:
            recs.append({
                "type": "low_saving_margin",
                "title": "Margen de ahorro bajo",
                "detail": f"Tu ahorro es {(balance/ingresos*100):.1f}% de tus ingresos. Intenta ahorrar al menos 5-10%.",
                "score": 0.9,
                "suggested_action": "Crear meta de ahorro"
            })
        else:
            recs.append({
                "type": "healthy_balance",
                "title": "Balance saludable",
                "detail": "Tu balance es positivo. Considera crear o aumentar metas de ahorro.",
                "score": 0.2,
                "suggested_action": "Crear o aumentar meta"
            })

        # 2) Porcentaje de gasto por categoría
        total_expense = sum(by_category.values())
        if total_expense > 0:
            sorted_cats = sorted(by_category.items(), key=lambda x: x[1], reverse=True)
            for cat, amt in sorted_cats[:5]:
                pct = (amt / total_expense) * 100
                if pct >= 30:
                    recs.append({
                        "type": "reduce_category",
                        "title": f"Reduce gastos en {cat}",
                        "detail": f"Has gastado {pct:.1f}% en {cat} ({amt:.0f}). Revisa suscripciones y hábitos.",
                        "score": 0.95,
                        "suggested_action": f"Revisar gastos en {cat}"
                    })
                elif pct >= 15:
                    recs.append({
                        "type": "monitor_category",
                        "title": f"Vigila {cat}",
                        "detail": f"{pct:.1f}% de tus gastos están en {cat}. Considera reducir un 10% para ahorrar.",
                        "score": 0.6,
                        "suggested_action": f"Reducir gastos en {cat}"
                    })

        # 3) Detectar posibles suscripciones
        for merchant, amounts in merchant_map.items():
            if len(amounts) >= 3:
                avg = sum(amounts) / len(amounts)
                recs.append({
                    "type": "possible_subscription",
                    "title": f"Revisa posible suscripción: {merchant}",
                    "detail": f"Se detectaron {len(amounts)} cargos frecuentes (~{avg:.0f}) en {merchant}.",
                    "score": 0.85,
                    "suggested_action": "Revisar suscripción"
                })

        # 4) Muchos gastos pequeños que suman bastante
        if ingresos > 0 and small_expense_count >= 3 and small_expense_total > ingresos * 0.10:
            recs.append({
                "type": "many_small_expenses",
                "title": "Gastos pequeños que suman mucho",
                "detail": f"Tienes {small_expense_count} gastos pequeños que suman {small_expense_total:.0f}, más del 10% de tus ingresos.",
                "score": 0.8,
                "suggested_action": "Consolidar o reducir gastos pequeños"
            })

        # 5) Alertas si gastos muy altos respecto a ingresos
        if ingresos > 0 and gastos > ingresos * 0.7:
            recs.append({
                "type": "high_expense_ratio",
                "title": "Gastos muy altos en relación a ingresos",
                "detail": "Tus gastos superan el 70% de tus ingresos. Revisa prioridades y reduce gastos no esenciales.",
                "score": 0.9,
                "suggested_action": "Reducir gastos no esenciales"
            })

        # 6) Límite configurado por usuario (user_settings)
        limite_gastos = settings.get("limite_gastos") if isinstance(settings, dict) else None
        if limite_gastos:
            try:
                limite_val = float(limite_gastos)
                if gastos > limite_val:
                    recs.append({
                        "type": "over_limit",
                        "title": "Has superado tu límite de gastos",
                        "detail": f"Tus gastos ({gastos:.0f}) exceden el límite configurado ({limite_val:.0f}).",
                        "score": 0.92,
                        "suggested_action": "Revisar límite o reducir gastos"
                    })
                else:
                    recs.append({
                        "type": "within_limit",
                        "title": "Dentro del límite",
                        "detail": f"Estás dentro del límite mensual ({limite_val:.0f}).",
                        "score": 0.25
                    })
            except Exception:
                logger.debug("Limite de gastos no convertible a número: %s", limite_gastos)

        # 7) Sugerencia automática de meta si no existe
        meta_ahorro = settings.get("meta_ahorro") if isinstance(settings, dict) else None
        if (not meta_ahorro) and ingresos > 0:
            sugerido = int(round(ingresos * 0.10))
            recs.append({
                "type": "suggest_goal",
                "title": "Crea una meta de ahorro",
                "detail": f"Sugerimos una meta inicial de {sugerido:,} mensuales (≈10% de tus ingresos).",
                "score": 0.7,
                "suggested_action": "Crear meta"
            })

        # 8) Consejos generales
        recs.append({
            "type": "daily_tracking",
            "title": "Registra tus movimientos",
            "detail": "Llevar control diario ayuda a identificar fugas de dinero.",
            "score": 0.05,
            "suggested_action": "Registrar diariamente"
        })
        recs.append({
            "type": "automate_saving",
            "title": "Ahorro automático",
            "detail": "Automatiza un porcentaje (ej. 5-20%) para construir el hábito de ahorrar.",
            "score": 0.04,
            "suggested_action": "Configurar transferencia automática"
        })

        # Si no hay transacciones, poner recomendación al inicio
        if len(transactions) == 0:
            recs.insert(0, {
                "type": "no_data",
                "title": "No hay datos suficientes",
                "detail": "Registra ingresos y gastos para obtener recomendaciones personalizadas.",
                "score": 1.0,
                "suggested_action": "Registrar transacciones"
            })

        # Ordenar por score descendente y deduplicar
        recs_sorted = sorted(recs, key=lambda r: r.get("score", 0), reverse=True)
        validated: List[Dict[str, Any]] = []
        seen = set()
        for r in recs_sorted:
            key = (r.get("type"), r.get("title"))
            if key in seen:
                continue
            seen.add(key)
            validated.append({
                "type": r.get("type", "generic"),
                "title": r.get("title", "Recomendación"),
                "detail": r.get("detail", ""),
                "score": r.get("score", None),
                "suggested_action": r.get("suggested_action", None)
            })

        return validated

    # =====================================================
    #       APLICAR / CONFIRMAR RECOMENDACIÓN
    # =====================================================
    async def apply_recommendation(self, user_id: str, request) -> Dict[str, Any]:
        """Aplica o registra la acción resultante de una recomendación.

        Request puede ser pydantic ApplyRecommendationRequest o dict con claves:
            { rec_type: str, metadata: dict|None, confirm: bool }

        Comportamiento básico implementado:
          - Si rec_type indica crear meta -> crear documento en collection 'goals' o en user_settings.goals
          - Si rec_type es registrar acción -> guardar en user_settings.recommendation_actions
        """
        try:
            if hasattr(request, "dict"):
                payload = request.dict()
            elif isinstance(request, dict):
                payload = request
            else:
                payload = {"rec_type": getattr(request, "rec_type", None),
                           "metadata": getattr(request, "metadata", None),
                           "confirm": getattr(request, "confirm", False)}
        except Exception:
            payload = {"rec_type": None, "metadata": None, "confirm": False}

        rec_type = payload.get("rec_type") or payload.get("type")
        metadata = payload.get("metadata") or {}
        confirm = bool(payload.get("confirm", False))

        if not confirm:
            return {"success": False, "detail": "Acción no confirmada por el usuario."}

        # Crear meta si aplica
        if rec_type in ("suggest_goal", "goal_suggestion", "create_goal"):
            amount = metadata.get("amount")
            name = metadata.get("name") or "Ahorro sugerido"
            try:
                if amount is None:
                    transactions, _ = await self.fetch_user_data(user_id)
                    ingresos = sum(self._parse_amount(t) for t in transactions if self._is_income(t))
                    amount = int(round(ingresos * 0.10)) if ingresos > 0 else 50000

                goal_doc = {
                    "user_id": user_id,
                    "name": name,
                    "target_amount": float(amount),
                    "current_amount": 0.0,
                    "created_at": datetime.utcnow(),
                    "meta_type": "savings",
                    "source": "recommendation"
                }

                if self.goals_collection is None:
                    # intentar obtener desde transactions_collection.database
                    if self.transactions_collection is not None and hasattr(self.transactions_collection, "database"):
                        db = getattr(self.transactions_collection, "database", None)
                        if db is not None:
                            self.goals_collection = db.get_collection("goals")

                if self.goals_collection is None:
                    # fallback: guardar en user_settings.goals
                    if self.user_settings_collection:
                        await self.user_settings_collection.update_one({"user_id": user_id}, {"$push": {"goals": goal_doc}}, upsert=True)
                        return {"success": True, "detail": "Meta añadida a user_settings.goals"}
                    return {"success": False, "detail": "No hay colección goals ni user_settings disponible."}

                result = await self.goals_collection.insert_one(goal_doc)
                return {"success": True, "detail": f"Meta creada con id {str(result.inserted_id)}"}
            except Exception as e:
                logger.exception("Error creando meta desde apply_recommendation: %s", e)
                return {"success": False, "detail": "Error al crear la meta."}

        # Registrar acción en user_settings
        if rec_type in ("reduce_category", "monitor_category", "possible_subscription", "many_small_expenses"):
            try:
                note = {"rec_type": rec_type, "metadata": metadata, "applied_at": datetime.utcnow()}
                if self.user_settings_collection:
                    await self.user_settings_collection.update_one({"user_id": user_id}, {"$push": {"recommendation_actions": note}}, upsert=True)
                    return {"success": True, "detail": "Acción registrada en user_settings"}
                return {"success": False, "detail": "No hay user_settings para registrar la acción."}
            except Exception as e:
                logger.exception("Error registrando acción en user_settings: %s", e)
                return {"success": False, "detail": "Error al registrar la acción."}

        return {"success": False, "detail": f"Tipo de recomendación '{rec_type}' no soportado."}
