"""
Endpoints de API para Metas de Ahorro

Este archivo contiene todos los endpoints REST para manejar operaciones
relacionadas con metas de ahorro en GastoSmart.
Implementa el requerimiento RQF-010: Creación de metas de ahorro.
"""

from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import List, Optional
from datetime import datetime, date
from database.connection import get_async_database
from database.goal_operations import GoalOperations
from models.goal import (
    GoalCreate, GoalResponse, GoalUpdate, GoalContribution,
    GoalStats, GoalTrend, MonthlySavings, MonthlyContribution, DailyContribution,
    GoalStatus, GoalCategory
)
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
import logging

logger = logging.getLogger(__name__)

# Crear router para metas
router = APIRouter(prefix="/api/goals", tags=["metas"])

def get_goal_operations(db: AsyncIOMotorDatabase = Depends(get_async_database)) -> GoalOperations:
    """
    Obtener instancia de operaciones de metas
    
    Args:
        db: Base de datos MongoDB
        
    Returns:
        GoalOperations: Instancia para operaciones de metas
    """
    # Usar la colección de metas y transacciones
    goals_collection = db.goals
    transactions_collection = db.transactions
    
    # Logging de información de la colección (solo una vez por instancia)
    if not hasattr(get_goal_operations, '_logged'):
        logger.info(f"Router de metas inicializado - Base de datos: {db.name}, Colección: goals, transactions")
        get_goal_operations._logged = True
    
    return GoalOperations(goals_collection, transactions_collection)

@router.post("/", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
async def create_goal(
    goal_data: GoalCreate,
    user_id: str = Query(..., description="ID del usuario"),
    goal_ops: GoalOperations = Depends(get_goal_operations)
):
    """
    Crear una nueva meta de ahorro
    
    Implementa el requerimiento RQF-010: Creación de metas de ahorro.
    
    Precondiciones:
    - El usuario ha iniciado sesión
    
    Flujo Principal:
    1. El sistema presenta formulario para meta de ahorro
    2. El usuario ingresa monto objetivo y fecha límite
    3. El sistema calcula progreso según saldo disponible
    
    Reglas de Negocio:
    - RN-01: Se puede crear, editar y archivar metas
    - RN-02: Progreso se muestra como porcentaje
    - RN-03: Meta vencida sin cumplir se marca como 'no alcanzada'
    
    Args:
        goal_data: Datos de la meta a crear
        user_id: ID del usuario propietario
        goal_ops: Operaciones de metas
        
    Returns:
        GoalResponse: Meta creada exitosamente
        
    Raises:
        HTTPException: Si los datos son inválidos o hay error en el servidor
    """
    try:
        logger.info(f"POST /goals/ - Creando meta para user_id: {user_id}, nombre: {goal_data.name}")
        goal = await goal_ops.create_goal(user_id, goal_data)
        logger.info(f"Meta creada exitosamente - goal_id: {goal.id}, inserted_id confirmado")
        return goal
    except ValueError as e:
        logger.error(f"Error de validación al crear meta: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error interno al crear meta: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.get("/", response_model=List[GoalResponse])
async def get_goals(
    user_id: str = Query(..., description="ID del usuario"),
    status: Optional[str] = Query(None, description="Estado de la meta (active/completed/failed/archived)"),
    category: Optional[str] = Query(None, description="Categoría de la meta"),
    skip: int = Query(0, ge=0, description="Número de metas a saltar"),
    limit: int = Query(100, ge=1, le=1000, description="Límite de metas a devolver"),
    goal_ops: GoalOperations = Depends(get_goal_operations)
):
    """
    Obtener metas del usuario con filtros
    
    Args:
        user_id: ID del usuario
        status: Filtrar por estado de la meta
        category: Filtrar por categoría
        skip: Número de metas a saltar (paginación)
        limit: Límite de metas a devolver
        goal_ops: Operaciones de metas
        
    Returns:
        List[GoalResponse]: Lista de metas filtradas
    """
    try:
        # Convertir strings a enums si se proporcionan
        status_enum = None
        if status:
            try:
                status_enum = GoalStatus(status)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Estado inválido"
                )
        
        category_enum = None
        if category:
            try:
                category_enum = GoalCategory(category)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Categoría inválida"
                )
        
        goals = await goal_ops.get_user_goals(
            user_id=user_id,
            status=status_enum,
            category=category_enum,
            skip=skip,
            limit=limit
        )
        
        return goals
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener metas"
        )

@router.get("/{goal_id}", response_model=GoalResponse)
async def get_goal(
    goal_id: str,
    user_id: str = Query(..., description="ID del usuario"),
    goal_ops: GoalOperations = Depends(get_goal_operations)
):
    """
    Obtener una meta específica por ID
    
    Args:
        goal_id: ID único de la meta
        user_id: ID del usuario propietario
        goal_ops: Operaciones de metas
        
    Returns:
        GoalResponse: Información de la meta
        
    Raises:
        HTTPException: Si la meta no existe
    """
    goal = await goal_ops.get_goal_by_id(goal_id, user_id)
    
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meta no encontrada"
        )
    
    return goal

@router.put("/{goal_id}", response_model=GoalResponse)
async def update_goal(
    goal_id: str,
    update_data: GoalUpdate,
    user_id: str = Query(..., description="ID del usuario"),
    goal_ops: GoalOperations = Depends(get_goal_operations)
):
    """
    Actualizar una meta existente
    
    Args:
        goal_id: ID de la meta a actualizar
        update_data: Datos a actualizar
        user_id: ID del usuario propietario
        goal_ops: Operaciones de metas
        
    Returns:
        GoalResponse: Meta actualizada
        
    Raises:
        HTTPException: Si la meta no existe o los datos son inválidos
    """
    try:
        goal = await goal_ops.update_goal(goal_id, user_id, update_data)
        
        if not goal:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Meta no encontrada"
            )
        
        return goal
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al actualizar meta"
        )

@router.post("/main-goal/contribute", response_model=GoalResponse)
async def contribute_to_main_goal(
    contribution: GoalContribution,
    user_id: str = Query(..., description="ID del usuario"),
    goal_ops: GoalOperations = Depends(get_goal_operations)
):
    """
    Realizar un abono a la meta principal del usuario
    
    Args:
        contribution: Datos del abono
        user_id: ID del usuario propietario
        goal_ops: Operaciones de metas
        
    Returns:
        GoalResponse: Meta principal actualizada con el nuevo abono
        
    Raises:
        HTTPException: Si la meta principal no existe o el abono es inválido
    """
    try:
        logger.info(f"POST /goals/main-goal/contribute - user_id: {user_id}, amount: {contribution.amount}")
        
        goal = await goal_ops.contribute_to_main_goal(user_id, contribution)
        
        if not goal:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Meta principal no encontrada"
            )
        
        logger.info(f"Abono exitoso a meta principal - goal_id: {goal.id}, new_amount: {goal.current_amount}")
        return goal
        
    except ValueError as e:
        logger.error(f"Error de validación en abono a meta principal: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error interno en abono a meta principal: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al realizar abono a meta principal"
        )

@router.post("/{goal_id}/set-main", response_model=GoalResponse)
async def set_goal_as_main(
    goal_id: str,
    user_id: str = Query(..., description="ID del usuario"),
    goal_ops: GoalOperations = Depends(get_goal_operations)
):
    """
    Establecer una meta como principal del usuario
    
    Args:
        goal_id: ID de la meta a establecer como principal
        user_id: ID del usuario propietario
        goal_ops: Operaciones de metas
        
    Returns:
        GoalResponse: Meta establecida como principal
        
    Raises:
        HTTPException: Si la meta no existe o no pertenece al usuario
    """
    try:
        logger.info(f"POST /goals/{goal_id}/set-main - user_id: {user_id}")
        
        # Primero, desmarcar todas las metas como principales
        await goal_ops.collection.update_many(
            {"user_id": user_id, "is_main": True},
            {"$set": {"is_main": False, "updated_at": datetime.now()}}
        )
        
        # Establecer la meta específica como principal
        result = await goal_ops.collection.update_one(
            {"_id": ObjectId(goal_id), "user_id": user_id},
            {"$set": {"is_main": True, "updated_at": datetime.now()}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Meta no encontrada o no pertenece al usuario"
            )
        
        # Obtener la meta actualizada
        updated_goal = await goal_ops.collection.find_one({
            "_id": ObjectId(goal_id),
            "user_id": user_id
        })
        
        if not updated_goal:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Meta no encontrada después de actualización"
            )
        
        logger.info(f"Meta {goal_id} establecida como principal para usuario {user_id}")
        return goal_ops._document_to_response(updated_goal)
        
    except Exception as e:
        logger.error(f"Error estableciendo meta {goal_id} como principal: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.post("/{goal_id}/contribute", response_model=GoalResponse)
async def contribute_to_goal(
    goal_id: str,
    contribution: GoalContribution,
    user_id: str = Query(..., description="ID del usuario"),
    goal_ops: GoalOperations = Depends(get_goal_operations)
):
    """
    Realizar un abono a una meta específica por ID
    
    Args:
        goal_id: ID de la meta (debe ser un ObjectId válido)
        contribution: Datos del abono
        user_id: ID del usuario propietario
        goal_ops: Operaciones de metas
        
    Returns:
        GoalResponse: Meta actualizada con el nuevo abono
        
    Raises:
        HTTPException: Si la meta no existe o el abono es inválido
    """
    try:
        # Validar que goal_id no sea "main-goal"
        if goal_id == "main-goal":
            logger.warning(f"Intento de usar 'main-goal' como ObjectId en ruta /{goal_id}/contribute")
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="goal_id inválido; use la ruta /goals/main-goal/contribute para la meta principal o un ObjectId válido"
            )
        
        logger.info(f"POST /goals/{goal_id}/contribute - user_id: {user_id}, amount: {contribution.amount}")
        
        goal = await goal_ops.contribute_to_goal(goal_id, user_id, contribution)
        
        if not goal:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Meta no encontrada"
            )
        
        logger.info(f"Abono exitoso a meta - goal_id: {goal.id}, new_amount: {goal.current_amount}")
        return goal
        
    except ValueError as e:
        logger.error(f"Error de validación en abono a meta {goal_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error interno en abono a meta {goal_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al realizar abono"
        )

@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_goal(
    goal_id: str,
    user_id: str = Query(..., description="ID del usuario"),
    goal_ops: GoalOperations = Depends(get_goal_operations)
):
    """
    Eliminar una meta
    
    Args:
        goal_id: ID de la meta a eliminar
        user_id: ID del usuario propietario
        goal_ops: Operaciones de metas
        
    Raises:
        HTTPException: Si la meta no existe
    """
    success = await goal_ops.delete_goal(goal_id, user_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meta no encontrada"
        )

@router.get("/stats/summary", response_model=GoalStats)
async def get_goal_stats(
    user_id: str = Query(..., description="ID del usuario"),
    goal_ops: GoalOperations = Depends(get_goal_operations)
):
    """
    Obtener estadísticas de metas del usuario
    
    Calcula estadísticas incluyendo total ahorrado, número de metas activas,
    completadas, fallidas y promedio de progreso.
    
    Args:
        user_id: ID del usuario
        goal_ops: Operaciones de metas
        
    Returns:
        GoalStats: Estadísticas de metas
    """
    try:
        stats = await goal_ops.get_goal_stats(user_id)
        return stats
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener estadísticas"
        )

@router.get("/trends/popular", response_model=GoalTrend)
async def get_goal_trends(
    goal_ops: GoalOperations = Depends(get_goal_operations)
):
    """
    Obtener tendencias populares de metas
    
    Retorna información sobre las metas más comunes, ahorro promedio
    y tiempo promedio de ahorro basado en datos públicos.
    
    Args:
        goal_ops: Operaciones de metas
        
    Returns:
        GoalTrend: Tendencias de metas
    """
    try:
        trends = await goal_ops.get_goal_trends()
        return trends
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener tendencias"
        )

@router.get("/analytics/monthly-savings", response_model=List[MonthlySavings])
async def get_monthly_savings(
    user_id: str = Query(..., description="ID del usuario"),
    months: int = Query(6, ge=1, le=24, description="Número de meses a obtener"),
    goal_ops: GoalOperations = Depends(get_goal_operations)
):
    """
    Obtener datos de ahorro mensual para gráficos
    
    Args:
        user_id: ID del usuario
        months: Número de meses a obtener
        goal_ops: Operaciones de metas
        
    Returns:
        List[MonthlySavings]: Lista de ahorros mensuales
    """
    try:
        savings = await goal_ops.get_monthly_savings(user_id, months)
        return savings
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener ahorro mensual"
        )

@router.get("/analytics/monthly-contributions", response_model=List[MonthlyContribution])
async def get_monthly_contributions(
    user_id: str = Query(..., description="ID del usuario"),
    months: int = Query(6, ge=1, le=24, description="Número de meses a obtener"),
    category: Optional[str] = Query(None, description="Categoría específica de meta"),
    goal_ops: GoalOperations = Depends(get_goal_operations)
):
    """
    Obtener datos de abono mensual para gráficos
    
    Args:
        user_id: ID del usuario
        months: Número de meses a obtener
        category: Categoría específica de meta (opcional)
        goal_ops: Operaciones de metas
        
    Returns:
        List[MonthlyContribution]: Lista de abonos mensuales
    """
    try:
        contributions = await goal_ops.get_monthly_contributions(user_id, months, category)
        return contributions
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener abonos mensuales"
        )

@router.get("/analytics/daily-contributions/{goal_id}", response_model=List[DailyContribution])
async def get_daily_contributions_by_goal(
    goal_id: str,
    user_id: str = Query(..., description="ID del usuario"),
    year: Optional[int] = Query(None, description="Año (por defecto año actual)"),
    month: Optional[int] = Query(None, description="Mes (por defecto mes actual)"),
    goal_ops: GoalOperations = Depends(get_goal_operations)
):
    """
    Obtener abonos diarios de una meta específica para un mes determinado
    
    Args:
        goal_id: ID de la meta
        user_id: ID del usuario
        year: Año (opcional)
        month: Mes (opcional)
        goal_ops: Operaciones de metas
        
    Returns:
        List[DailyContribution]: Lista de abonos diarios
    """
    try:
        contributions = await goal_ops.get_daily_contributions_by_goal(user_id, goal_id, year, month)
        return contributions
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener abonos diarios"
        )

@router.get("/categories/list")
async def get_goal_categories():
    """
    Obtener lista de categorías de metas disponibles
    
    Returns:
        List[str]: Lista de categorías disponibles
    """
    return {
        "categories": [category.value for category in GoalCategory]
    }
