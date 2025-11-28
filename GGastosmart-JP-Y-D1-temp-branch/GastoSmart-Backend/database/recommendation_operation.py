# database/recommendation_operations.py

from typing import List, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from models.recommendation import RecommendationItem

class RecommendationOperations:
    """
    Generador de recomendaciones que opera sobre AsyncIOMotorDatabase.
    Sigue el patrón de tus otras clases (UserSettingsOperations).
    """

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.transactions = db.transactions
        self.user_settings = db.user_settings

    async def fetch_user_data(self, user_id: str):
        """
        Obtiene transacciones y settings para user_id.
        """
        transactions = await self.transactions.find({"user_id": user_id}).to_list(None)
        settings = await self.user_settings.find_one({"user_id": user_id})
        if not settings:
            settings = {"meta_ahorro": None, "limite_gastos": None}
        return transactions, settings

    async def generate_recommendations(self, user_id: str) -> List[Dict[str, Any]]:
        """
        Genera recomendaciones como lista de dicts compatibles con RecommendationItem.
        """
        transactions, settings = await self.fetch_user_data(user_id)

        # Normalizar nombres de tipos que usas en tu BD (ajusta si usas "expense"/"income")
        ingresos = sum(t.get("amount", 0) for t in transactions if t.get("type") in ("ingreso", "income"))
        gastos = sum(t.get("amount", 0) for t in transactions if t.get("type") in ("gasto", "expense"))

        recomendaciones: List[Dict[str, Any]] = []

        balance = ingresos - gastos

        # 1) Balance negativo o bajo
        if balance < 0:
            recomendaciones.append({
                "type": "negative_balance",
                "title": "Balance negativo",
                "detail": "Tu balance mensual es negativo. Considera reducir gastos variables.",
                "score": 1.0
            })
        elif ingresos > 0 and balance < ingresos * 0.1:
            recomendaciones.append({
                "type": "low_saving_margin",
                "title": "Margen de ahorro bajo",
                "detail": "Tu margen de ahorro es menor al 10% de tus ingresos. Intenta reservar al menos el 10%.",
                "score": 0.9
            })
        else:
            recomendaciones.append({
                "type": "healthy_balance",
                "title": "Balance saludable",
                "detail": "Tu balance parece saludable. Mantén el buen hábito.",
                "score": 0.2
            })

        # 2) Gastos altos relativos a ingresos
        if ingresos > 0 and gastos > ingresos * 0.7:
            recomendaciones.append({
                "type": "high_spending",
                "title": "Gastos altos",
                "detail": "Estás gastando más del 70% de tus ingresos. Revisa gastos esenciales.",
                "score": 0.95
            })

        # 3) Meta de ahorro
        meta_ahorro = settings.get("meta_ahorro")
        if meta_ahorro:
            if balance < meta_ahorro:
                recomendaciones.append({
                    "type": "miss_saving_goal",
                    "title": "No alcanzas la meta de ahorro",
                    "detail": f"No alcanzaste la meta de ahorro mensual ({meta_ahorro}). Reduce gastos no esenciales.",
                    "score": 0.85
                })
            else:
                recomendaciones.append({
                    "type": "achieved_saving_goal",
                    "title": "Meta de ahorro cumplida",
                    "detail": f"Has alcanzado o superado la meta de ahorro ({meta_ahorro}). ¡Buen trabajo!",
                    "score": 0.4
                })

        # 4) Límite de gastos
        limite_gastos = settings.get("limite_gastos")
        if limite_gastos is not None:
            if gastos > limite_gastos:
                recomendaciones.append({
                    "type": "over_limit",
                    "title": "Límite de gastos superado",
                    "detail": f"Has superado tu límite de gastos configurado ({limite_gastos}). Ajusta tus compras.",
                    "score": 0.9
                })
            else:
                recomendaciones.append({
                    "type": "within_limit",
                    "title": "Dentro del límite",
                    "detail": "Aún no superas tu límite mensual de gastos.",
                    "score": 0.3
                })

        # 5) Detección simple de suscripciones (misma merchant y monto 3+ veces)
        merchant_counts = {}
        for t in transactions:
            if t.get("type") in ("gasto", "expense"):
                m = (t.get("merchant") or t.get("description") or "").strip().lower()
                amt = abs(t.get("amount", 0))
                if m:
                    key = (m, amt)
                    merchant_counts[key] = merchant_counts.get(key, 0) + 1

        for (m, amt), count in merchant_counts.items():
            if count >= 3:
                recomendaciones.append({
                    "type": "possible_subscription",
                    "title": f"Suscripción detectada: {m}",
                    "detail": f"Se detectaron {count} cargos similares de {amt}. Revisa si aún lo necesitas.",
                    "score": 0.8
                })

        # 6) Consejos generales
        recomendaciones.extend([
            {
                "type": "daily_tracking",
                "title": "Registra diariamente",
                "detail": "Registrar tus gastos diariamente ayuda a detectar fugas de dinero.",
                "score": 0.1
            },
            {
                "type": "automate_saving",
                "title": "Automatiza ahorro",
                "detail": "Considera automatizar un ahorro del 10–20% de tus ingresos.",
                "score": 0.1
            }
        ])

        # Ordenar por score descendente
        recomendaciones = sorted(recomendaciones, key=lambda r: r.get("score", 0), reverse=True)

        # Validación mínima: asegurar keys requeridas por RecommendationItem (type, title, detail)
        validated: List[Dict[str, Any]] = []
        for r in recomendaciones:
            validated.append({
                "type": r.get("type", "generic"),
                "title": r.get("title", "Recomendación"),
                "detail": r.get("detail", ""),
                "score": r.get("score", None),
                "suggested_action": r.get("suggested_action", None)
            })

        return validated