# routers/recommendations.py

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any, Optional

from auth.dependencies import get_current_user
from database.connection import get_async_database
from database.recommendation_operation import RecommendationOperations
from database.transaction_operations import TransactionOperations

from models.recommendation import (
    RecommendationItem,
    RecommendationsResponse,
    ApplyRecommendationRequest
)

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])


# ============================================================
#   EXTRACCIÓN DE USER_ID ROBUSTA
# ============================================================
def _extract_user_id(current_user) -> Optional[str]:
    """Extrae el user_id soportando dict, str, objeto, etc."""
    if current_user is None:
        return None
    if isinstance(current_user, dict):
        return current_user.get("user_id") or current_user.get("id")
    if isinstance(current_user, str):
        return current_user
    if hasattr(current_user, "id"):
        return getattr(current_user, "id")
    if hasattr(current_user, "_id"):
        return getattr(current_user, "_id")
    return None


# ============================================================
#   NORMALIZACIÓN DE RECOMENDACIONES
# ============================================================
def _normalize_recommendation_item(raw: Any) -> Dict[str, Any]:
    """Convierte cualquier tipo en un dict uniforme."""
    if raw is None:
        return {}

    # Si es string
    if isinstance(raw, str):
        return {
            "type": "generic",
            "title": raw[:80],
            "detail": raw,
            "score": None,
            "suggested_action": None
        }

    # Si es dict
    if isinstance(raw, dict):
        return {
            "type": raw.get("type", "generic"),
            "title": raw.get("title", raw.get("detail", "Recomendación"))[:80],
            "detail": raw.get("detail", ""),
            "score": raw.get("score"),
            "suggested_action": raw.get("suggested_action")
        }

    # Si es objeto
    try:
        return {
            "type": getattr(raw, "type", "generic"),
            "title": getattr(raw, "title", str(raw))[:80],
            "detail": getattr(raw, "detail", ""),
            "score": getattr(raw, "score", None),
            "suggested_action": getattr(raw, "suggested_action", None)
        }
    except Exception:
        return {
            "type": "generic",
            "title": "Recomendación",
            "detail": str(raw),
            "score": None,
            "suggested_action": None
        }


# ============================================================
#   GET RECOMMENDATIONS
# ============================================================
@router.get("/", summary="Obtener recomendaciones personalizadas",
            response_model=RecommendationsResponse)
async def get_recommendations(
    current_user=Depends(get_current_user),
    db=Depends(get_async_database)
):
    """Genera recomendaciones personalizadas basado en transacciones del usuario."""
    try:
        user_id = _extract_user_id(current_user)
        if not user_id:
            raise HTTPException(status_code=401, detail="Usuario no autenticado")

        # ------------------------------------------------------
        # INTENTAR CREAR TransactionOperations CORRECTAMENTE
        # ------------------------------------------------------
        tx_ops = None
        try:
            transactions_collection = getattr(db, "transactions", None)
            if transactions_collection is not None:
                tx_ops = TransactionOperations(transactions_collection)
                logger.debug("TransactionOperations inicializada con db.transactions")
            else:
                if hasattr(db, "find"):  # Si db es una colección directa
                    tx_ops = TransactionOperations(db)
        except Exception as e:
            logger.debug(f"No se pudo inicializar TransactionOperations: {e}")

        # ------------------------------------------------------
        # INICIALIZAR RecommendationOperations
        # ------------------------------------------------------
        try:
            if tx_ops:
                operations = RecommendationOperations(tx_ops)
                logger.debug("RecommendationOperations inicializada con TransactionOperations")
            else:
                operations = RecommendationOperations(db)
                logger.debug("RecommendationOperations inicializada con db (fallback)")
        except Exception as e:
            logger.exception("Error inicializando RecommendationOperations")
            raise HTTPException(500, "Error interno generando recomendaciones")

        # ------------------------------------------------------
        # LLAMADA PRINCIPAL
        # ------------------------------------------------------
        recs_raw = await operations.generate_recommendations(user_id)
        logger.debug(f"Recomendaciones crudas: {recs_raw}")

        # Validar que sea lista
        if not recs_raw:
            recs_raw = []

        if not isinstance(recs_raw, list):
            raise HTTPException(500, "RecommendationOperations no está retornando una lista válida")

        # ------------------------------------------------------
        # SI NO HAY RECOMENDACIONES → AGREGAR RECOMENDACIONES DEFAULT
        # ------------------------------------------------------
        if len(recs_raw) == 0:
            recs_raw = [
                {
                    "type": "no_data",
                    "title": "No hay transacciones registradas",
                    "detail": "Agrega ingresos o gastos para recibir recomendaciones personalizadas.",
                    "score": 0.1,
                    "suggested_action": "Registrar transacciones"
                },
                {
                    "type": "suggest_goal",
                    "title": "Crea una meta de ahorro",
                    "detail": "Una buena práctica es ahorrar el 10% de los ingresos mensuales.",
                    "score": 0.05,
                    "suggested_action": "Crear meta"
                }
            ]

        # ------------------------------------------------------
        # NORMALIZAR Y FORMATEAR
        # ------------------------------------------------------
        formatted_recs = []

        for raw in recs_raw:
            item = _normalize_recommendation_item(raw)
            formatted_recs.append({
                "type": item.get("type", "generic"),
                "title": item.get("title", "Recomendación"),
                "detail": item.get("detail", ""),
                "score": item.get("score"),
                "suggested_action": item.get("suggested_action")
            })

        # Ordenar por score si existe
        try:
            if any(r.get("score") is not None for r in formatted_recs):
                formatted_recs.sort(key=lambda r: (r.get("score") or 0), reverse=True)
        except Exception:
            pass

        # Limitar a 20
        formatted_recs = formatted_recs[:20]

        return {"recommendations": formatted_recs}

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error inesperado: {e}")
        raise HTTPException(500, "Error interno al generar recomendaciones")


# ============================================================
#   APPLY RECOMMENDATION
# ============================================================
@router.post("/apply", summary="Aplicar recomendación")
async def apply_recommendation(
    request: ApplyRecommendationRequest,
    current_user=Depends(get_current_user),
    db=Depends(get_async_database)
):
    """Aplica una acción sugerida por la recomendación."""
    try:
        user_id = _extract_user_id(current_user)
        if not user_id:
            raise HTTPException(401, "Usuario no autenticado")

        # Preparar TransactionOperations
        tx_ops = None
        try:
            transactions_collection = getattr(db, "transactions", None)
            if transactions_collection:
                tx_ops = TransactionOperations(transactions_collection)
            else:
                if hasattr(db, "find"):
                    tx_ops = TransactionOperations(db)
        except:
            tx_ops = None

        # RecommendationOperations
        try:
            if tx_ops:
                operations = RecommendationOperations(tx_ops)
            else:
                operations = RecommendationOperations(db)
        except:
            raise HTTPException(500, "Error interno al inicializar RecommendationOperations")

        if hasattr(operations, "apply_recommendation"):
            result = await operations.apply_recommendation(user_id, request)
            return {"success": True, "detail": result}

        raise HTTPException(501, "apply_recommendation no implementado")

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error aplicando recomendación: {e}")
        raise HTTPException(500, "Error interno al aplicar recomendación")
