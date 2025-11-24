# GastoSmart-Backend/models/recommendation.py
from pydantic import BaseModel, Field
from typing import List, Optional

class RecommendationItem(BaseModel):
    """
    Un ítem de recomendación simple.
    """
    type: str = Field(..., description="Tipo categórico de la recomendación (ej: over_budget, subscription)")
    title: str = Field(..., description="Título corto que se muestra al usuario")
    detail: str = Field(..., description="Descripción detallada de la recomendación")
    score: Optional[float] = Field(None, description="Puntaje/score opcional para ordenar prioridad (mayor = más importante)")
    suggested_action: Optional[str] = Field(None, description="Acción sugerida (ej: 'Crear meta', 'Revisar suscripción')")


class RecommendationsResponse(BaseModel):
    """
    Respuesta que envía la lista de recomendaciones.
    """
    recommendations: List[RecommendationItem] = Field(..., description="Lista de recomendaciones ordenadas por prioridad")


class ApplyRecommendationRequest(BaseModel):
    """
    Payload para aplicar/confirmar una recomendación desde el frontend.

    Campos sugeridos:
    - rec_type: tipo de recomendación (para identificar la acción a tomar en backend)
    - metadata: datos adicionales necesarios (por ejemplo, { "goal_id": "...", "amount": 50000 })
    - confirm: boolean para confirmar que el usuario aceptó la sugerencia
    """
    rec_type: str = Field(..., description="Tipo de la recomendación que se desea aplicar")
    metadata: Optional[dict] = Field(None, description="Datos adicionales para aplicar la recomendación (opcional)")
    confirm: bool = Field(..., description="El usuario confirma aplicar la acción sugerida (true/false)")
