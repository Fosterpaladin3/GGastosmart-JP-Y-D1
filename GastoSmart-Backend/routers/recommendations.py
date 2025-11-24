# GastoSmart-Backend/routers/recommendations.py

from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any

from auth.dependencies import get_current_user
from database.connection import get_async_database
from database.recommendation_operation import RecommendationOperations

from models.recommendation import (
    RecommendationItem,
    RecommendationsResponse,
    ApplyRecommendationRequest
)

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])


def _extract_user_id(current_user) -> str:
    """
    Extrae el user_id de la dependencia get_current_user.
    Soporta varios formatos (dict con 'user_id' o 'id', string, objeto con .id / ._id).
    """
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


@router.get(
    "/",
    summary="Obtener recomendaciones personalizadas",
    response_model=RecommendationsResponse
)
async def get_recommendations(
    current_user = Depends(get_current_user),
    db = Depends(get_async_database)
):
    """
    Devuelve recomendaciones basadas en transacciones y ajustes del usuario.
    """
    try:
        user_id = _extract_user_id(current_user)
        if not user_id:
            raise HTTPException(status_code=401, detail="Usuario no autenticado")

        # Obtener colecciones desde la db asíncrona
        transactions_collection = db.transactions
        user_settings_collection = db.user_settings

        # Intentar crear la instancia de operaciones con las colecciones (si tu clase acepta colecciones)
        try:
            operations = RecommendationOperations(
                transactions_collection=transactions_collection,
                user_settings_collection=user_settings_collection
            )
        except TypeError:
            # Fallback: si la clase espera el objeto db completo
            operations = RecommendationOperations(db)

        recs: List[Dict[str, Any]] = await operations.generate_recommendations(user_id)

        # Formatear a la forma esperada por RecommendationItem
        formatted_recs = []
        for r in recs:
            formatted_recs.append({
                "type": r.get("type", "generic"),
                "title": r.get("title", "Recomendación"),
                "detail": r.get("detail", ""),
                "score": r.get("score", None),
                "suggested_action": r.get("suggested_action", None)
            })

        return {"recommendations": formatted_recs}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/apply", summary="Aplicar una recomendación")
async def apply_recommendation(
    request: ApplyRecommendationRequest,
    current_user = Depends(get_current_user),
    db = Depends(get_async_database)
):
    """
    Endpoint para aplicar/confirmar la acción sugerida por una recomendación.
    Depende de que RecommendationOperations implemente `apply_recommendation`.
    """
    try:
        user_id = _extract_user_id(current_user)
        if not user_id:
            raise HTTPException(status_code=401, detail="Usuario no autenticado")

        # Preparar instancia de operaciones (manejar distintos constructores)
        try:
            operations = RecommendationOperations(
                transactions_collection=None,
                user_settings_collection=db.user_settings
            )
        except TypeError:
            operations = RecommendationOperations(db)

        if hasattr(operations, "apply_recommendation"):
            result = await operations.apply_recommendation(user_id, request)
            return {"success": True, "detail": result}
        else:
            raise HTTPException(status_code=501, detail="apply_recommendation no implementado en RecommendationOperations")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
