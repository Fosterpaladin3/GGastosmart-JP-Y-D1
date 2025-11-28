"""
Endpoints de API para Transacciones

Este archivo contiene todos los endpoints REST para manejar operaciones
relacionadas con transacciones financieras en GastoSmart.
Implementa el requerimiento RQF-005: Registro de ingreso.
"""

from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import List, Optional
from datetime import datetime
from database.connection import get_async_database
from database.transaction_operations import TransactionOperations
from models.transaction import (
    TransactionCreate, TransactionResponse, TransactionUpdate,
    TransactionFilter, TransactionSort, TransactionStats
)
from motor.motor_asyncio import AsyncIOMotorDatabase
from services.auth_service import get_current_user

# Crear router para transacciones
router = APIRouter(prefix="/api/transactions", tags=["transacciones"])

def get_transaction_operations(db: AsyncIOMotorDatabase = Depends(get_async_database)) -> TransactionOperations:
    """
    Obtener instancia de operaciones de transacciones
    
    Args:
        db: Base de datos MongoDB
        
    Returns:
        TransactionOperations: Instancia para operaciones de transacciones
    """
    # Usar la colección de transacciones
    transactions_collection = db.transactions
    return TransactionOperations(transactions_collection)

@router.post("/", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    transaction_data: TransactionCreate,
    current_user: dict = Depends(get_current_user),
    transaction_ops: TransactionOperations = Depends(get_transaction_operations)
):
    """
    Crear una nueva transacción (ingreso o gasto)
    
    Implementa el requerimiento RQF-005: Registro de ingreso.
    
    Precondiciones:
    - El usuario ha iniciado sesión en la aplicación
    
    Flujo Principal:
    1. El sistema presenta un formulario para registrar la transacción
    2. El usuario ingresa monto, fecha y categoría
    3. El sistema valida que el monto sea numérico y positivo
    4. El sistema guarda el registro y actualiza el saldo total
    
    Reglas de Negocio:
    - RN-01: El monto debe ser mayor a 0
    - RN-02: La categoría debe seleccionarse obligatoriamente
    - RN-03: La fecha puede ser distinta a la actual
    
    Args:
        transaction_data: Datos de la transacción a crear
        user_id: ID del usuario propietario
        transaction_ops: Operaciones de transacciones
        
    Returns:
        TransactionResponse: Transacción creada exitosamente
        
    Raises:
        HTTPException: Si los datos son inválidos o hay error en el servidor
    """
    try:
        transaction = await transaction_ops.create_transaction(current_user["id"], transaction_data)
        return transaction
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.get("/", response_model=List[TransactionResponse])
async def get_transactions(
    current_user: dict = Depends(get_current_user),
    skip: int = Query(0, ge=0, description="Número de transacciones a saltar"),
    limit: int = Query(100, ge=1, le=1000, description="Límite de transacciones a devolver"),
    transaction_type: Optional[str] = Query(None, description="Tipo de transacción (income/expense)"),
    category: Optional[str] = Query(None, description="Categoría de la transacción"),
    date_from: Optional[datetime] = Query(None, description="Fecha de inicio del filtro"),
    date_to: Optional[datetime] = Query(None, description="Fecha de fin del filtro"),
    amount_min: Optional[float] = Query(None, ge=0, description="Monto mínimo"),
    amount_max: Optional[float] = Query(None, ge=0, description="Monto máximo"),
    sort_by: str = Query("date", description="Campo por el cual ordenar"),
    sort_order: str = Query("desc", description="Orden de clasificación (asc/desc)"),
    transaction_ops: TransactionOperations = Depends(get_transaction_operations)
):
    """
    Obtener transacciones del usuario con filtros y ordenamiento
    
    Permite obtener las transacciones del usuario con diversos filtros
    y opciones de ordenamiento, incluyendo el algoritmo merge-sort
    implementado en el frontend.
    
    Args:
        user_id: ID del usuario
        skip: Número de transacciones a saltar (paginación)
        limit: Límite de transacciones a devolver
        transaction_type: Filtrar por tipo de transacción
        category: Filtrar por categoría
        date_from: Fecha de inicio del filtro
        date_to: Fecha de fin del filtro
        amount_min: Monto mínimo
        amount_max: Monto máximo
        sort_by: Campo por el cual ordenar
        sort_order: Orden de clasificación
        transaction_ops: Operaciones de transacciones
        
    Returns:
        List[TransactionResponse]: Lista de transacciones filtradas y ordenadas
    """
    try:
        # Construir filtros
        filters = None
        if any([transaction_type, category, date_from, date_to, amount_min, amount_max]):
            filters = TransactionFilter(
                type=transaction_type,
                category=category,
                date_from=date_from,
                date_to=date_to,
                amount_min=amount_min,
                amount_max=amount_max
            )
        
        # Construir ordenamiento
        sort = TransactionSort(field=sort_by, order=sort_order)
        
        transactions = await transaction_ops.get_user_transactions(
            user_id=current_user["id"],
            skip=skip,
            limit=limit,
            filters=filters,
            sort=sort
        )
        
        return transactions
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener transacciones"
        )

@router.get("/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(
    transaction_id: str,
    current_user: dict = Depends(get_current_user),
    transaction_ops: TransactionOperations = Depends(get_transaction_operations)
):
    """
    Obtener una transacción específica por ID
    
    Args:
        transaction_id: ID único de la transacción
        user_id: ID del usuario propietario
        transaction_ops: Operaciones de transacciones
        
    Returns:
        TransactionResponse: Información de la transacción
        
    Raises:
        HTTPException: Si la transacción no existe
    """
    transaction = await transaction_ops.get_transaction_by_id(transaction_id, current_user["id"])
    
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transacción no encontrada"
        )
    
    return transaction

@router.put("/{transaction_id}", response_model=TransactionResponse)
async def update_transaction(
    transaction_id: str,
    update_data: TransactionUpdate,
    current_user: dict = Depends(get_current_user),
    transaction_ops: TransactionOperations = Depends(get_transaction_operations)
):
    """
    Actualizar una transacción existente
    
    Args:
        transaction_id: ID de la transacción a actualizar
        update_data: Datos a actualizar
        user_id: ID del usuario propietario
        transaction_ops: Operaciones de transacciones
        
    Returns:
        TransactionResponse: Transacción actualizada
        
    Raises:
        HTTPException: Si la transacción no existe o los datos son inválidos
    """
    try:
        transaction = await transaction_ops.update_transaction(transaction_id, current_user["id"], update_data)
        
        if not transaction:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transacción no encontrada"
            )
        
        return transaction
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al actualizar transacción"
        )

@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(
    transaction_id: str,
    current_user: dict = Depends(get_current_user),
    transaction_ops: TransactionOperations = Depends(get_transaction_operations)
):
    """
    Eliminar una transacción
    
    Args:
        transaction_id: ID de la transacción a eliminar
        user_id: ID del usuario propietario
        transaction_ops: Operaciones de transacciones
        
    Raises:
        HTTPException: Si la transacción no existe
    """
    success = await transaction_ops.delete_transaction(transaction_id, current_user["id"])
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transacción no encontrada"
        )

@router.get("/stats/summary", response_model=TransactionStats)
async def get_transaction_stats(
    current_user: dict = Depends(get_current_user),
    date_from: Optional[datetime] = Query(None, description="Fecha de inicio del período"),
    date_to: Optional[datetime] = Query(None, description="Fecha de fin del período"),
    transaction_ops: TransactionOperations = Depends(get_transaction_operations)
):
    """
    Obtener estadísticas de transacciones del usuario
    
    Calcula estadísticas financieras incluyendo totales de ingresos,
    gastos, balance y conteos de transacciones.
    
    Args:
        user_id: ID del usuario
        date_from: Fecha de inicio del período de análisis
        date_to: Fecha de fin del período de análisis
        transaction_ops: Operaciones de transacciones
        
    Returns:
        TransactionStats: Estadísticas de transacciones
    """
    try:
        stats = await transaction_ops.get_transaction_stats(current_user["id"], date_from, date_to)
        return stats
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener estadísticas"
        )

@router.get("/categories/list")
async def get_categories(
    current_user: dict = Depends(get_current_user),
    transaction_type: Optional[str] = Query(None, description="Tipo de transacción (income/expense)"),
    transaction_ops: TransactionOperations = Depends(get_transaction_operations)
):
    """
    Obtener lista de categorías utilizadas por el usuario
    
    Args:
        user_id: ID del usuario
        transaction_type: Filtrar por tipo de transacción
        transaction_ops: Operaciones de transacciones
        
    Returns:
        List[str]: Lista de categorías únicas
    """
    try:
        categories = await transaction_ops.get_categories(current_user["id"], transaction_type)
        return {"categories": categories}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener categorías"
        )

@router.get("/search/query")
async def search_transactions(
    current_user: dict = Depends(get_current_user),
    query: str = Query(..., min_length=1, description="Término de búsqueda"),
    skip: int = Query(0, ge=0, description="Número de transacciones a saltar"),
    limit: int = Query(50, ge=1, le=100, description="Límite de transacciones a devolver"),
    transaction_ops: TransactionOperations = Depends(get_transaction_operations)
):
    """
    Buscar transacciones por texto
    
    Realiza una búsqueda de texto en categorías y descripciones
    de las transacciones del usuario.
    
    Args:
        user_id: ID del usuario
        query: Término de búsqueda
        skip: Número de transacciones a saltar
        limit: Límite de transacciones a devolver
        transaction_ops: Operaciones de transacciones
        
    Returns:
        List[TransactionResponse]: Lista de transacciones que coinciden con la búsqueda
    """
    try:
        # Crear filtro de búsqueda
        search_filter = TransactionFilter()
        
        # Realizar búsqueda en categorías y descripciones
        transactions = await transaction_ops.get_user_transactions(
            user_id=current_user["id"],
            skip=skip,
            limit=limit,
            filters=search_filter
        )
        
        # Filtrar por término de búsqueda en el frontend
        # (En una implementación real, esto se haría en la base de datos)
        filtered_transactions = []
        query_lower = query.lower()
        
        for transaction in transactions:
            if (query_lower in transaction.category.lower() or
                (transaction.description and query_lower in transaction.description.lower()) or
                query_lower in str(transaction.amount)):
                filtered_transactions.append(transaction)
        
        return filtered_transactions
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al buscar transacciones"
        )
