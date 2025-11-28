"""
Operaciones de Base de Datos para Transacciones

Este archivo contiene todas las operaciones de base de datos relacionadas
con las transacciones financieras en GastoSmart.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorCollection
from models.transaction import (
    Transaction, TransactionCreate, TransactionResponse, 
    TransactionUpdate, TransactionFilter, TransactionSort, TransactionStats
)
from bson import ObjectId
import logging

logger = logging.getLogger(__name__)

class TransactionOperations:
    """
    Clase para manejar operaciones de base de datos de transacciones
    """
    
    def __init__(self, collection: AsyncIOMotorCollection):
        """
        Inicializar operaciones de transacciones
        
        Args:
            collection: Colección MongoDB para transacciones
        """
        self.collection = collection
    
    async def create_transaction(self, user_id: str, transaction_data: TransactionCreate) -> TransactionResponse:
        """
        Crear una nueva transacción
        
        Args:
            user_id: ID del usuario propietario
            transaction_data: Datos de la transacción a crear
            
        Returns:
            TransactionResponse: Transacción creada
            
        Raises:
            ValueError: Si los datos son inválidos
        """
        try:
            # Crear documento de transacción
            transaction_doc = {
                "user_id": user_id,
                "type": transaction_data.type.value,
                "amount": transaction_data.amount,
                "category": transaction_data.category,
                "description": transaction_data.description,
                "date": transaction_data.date,
                "currency": transaction_data.currency,
                "created_at": datetime.now(),
                "updated_at": None
            }
            
            # Insertar en la base de datos
            result = await self.collection.insert_one(transaction_doc)
            
            # Obtener la transacción creada
            created_transaction = await self.collection.find_one({"_id": result.inserted_id})
            
            return self._document_to_response(created_transaction)
            
        except Exception as e:
            logger.error(f"Error al crear transacción: {e}")
            raise ValueError(f"Error al crear transacción: {str(e)}")
    
    async def get_transaction_by_id(self, transaction_id: str, user_id: str) -> Optional[TransactionResponse]:
        """
        Obtener transacción por ID
        
        Args:
            transaction_id: ID de la transacción
            user_id: ID del usuario propietario
            
        Returns:
            TransactionResponse: Transacción encontrada o None
        """
        try:
            transaction_doc = await self.collection.find_one({
                "_id": ObjectId(transaction_id),
                "user_id": user_id
            })
            
            return self._document_to_response(transaction_doc) if transaction_doc else None
            
        except Exception as e:
            logger.error(f"Error al obtener transacción {transaction_id}: {e}")
            return None
    
    async def get_user_transactions(
        self, 
        user_id: str, 
        skip: int = 0, 
        limit: int = 100,
        filters: Optional[TransactionFilter] = None,
        sort: Optional[TransactionSort] = None
    ) -> List[TransactionResponse]:
        """
        Obtener transacciones de un usuario con filtros y ordenamiento
        
        Args:
            user_id: ID del usuario
            skip: Número de transacciones a saltar
            limit: Límite de transacciones a devolver
            filters: Filtros a aplicar
            sort: Criterios de ordenamiento
            
        Returns:
            List[TransactionResponse]: Lista de transacciones
        """
        try:
            # Construir filtro de consulta
            query = {"user_id": user_id}
            
            if filters:
                if filters.type:
                    query["type"] = filters.type.value
                if filters.category:
                    query["category"] = {"$regex": filters.category, "$options": "i"}
                if filters.date_from or filters.date_to:
                    date_filter = {}
                    if filters.date_from:
                        date_filter["$gte"] = filters.date_from
                    if filters.date_to:
                        date_filter["$lte"] = filters.date_to
                    query["date"] = date_filter
                if filters.amount_min or filters.amount_max:
                    amount_filter = {}
                    if filters.amount_min:
                        amount_filter["$gte"] = filters.amount_min
                    if filters.amount_max:
                        amount_filter["$lte"] = filters.amount_max
                    query["amount"] = amount_filter
            
            # Construir ordenamiento
            sort_criteria = []
            if sort:
                field_mapping = {
                    "date": "date",
                    "amount": "amount",
                    "category": "category",
                    "created_at": "created_at"
                }
                sort_field = field_mapping.get(sort.field, "date")
                sort_order = 1 if sort.order == "asc" else -1
                sort_criteria.append((sort_field, sort_order))
            else:
                # Ordenamiento por defecto: fecha descendente
                sort_criteria.append(("date", -1))
            
            # Ejecutar consulta
            cursor = self.collection.find(query).sort(sort_criteria).skip(skip).limit(limit)
            transactions = []
            
            async for doc in cursor:
                transactions.append(self._document_to_response(doc))
            
            return transactions
            
        except Exception as e:
            logger.error(f"Error al obtener transacciones del usuario {user_id}: {e}")
            return []
    
    async def update_transaction(
        self, 
        transaction_id: str, 
        user_id: str, 
        update_data: TransactionUpdate
    ) -> Optional[TransactionResponse]:
        """
        Actualizar una transacción existente
        
        Args:
            transaction_id: ID de la transacción
            user_id: ID del usuario propietario
            update_data: Datos a actualizar
            
        Returns:
            TransactionResponse: Transacción actualizada o None
        """
        try:
            # Construir documento de actualización
            update_doc = {}
            
            if update_data.amount is not None:
                update_doc["amount"] = update_data.amount
            if update_data.category is not None:
                update_doc["category"] = update_data.category
            if update_data.description is not None:
                update_doc["description"] = update_data.description
            if update_data.date is not None:
                update_doc["date"] = update_data.date
            
            update_doc["updated_at"] = datetime.now()
            
            # Actualizar en la base de datos
            result = await self.collection.update_one(
                {"_id": ObjectId(transaction_id), "user_id": user_id},
                {"$set": update_doc}
            )
            
            if result.modified_count == 0:
                return None
            
            # Obtener la transacción actualizada
            updated_transaction = await self.collection.find_one({
                "_id": ObjectId(transaction_id),
                "user_id": user_id
            })
            
            return self._document_to_response(updated_transaction)
            
        except Exception as e:
            logger.error(f"Error al actualizar transacción {transaction_id}: {e}")
            return None
    
    async def delete_transaction(self, transaction_id: str, user_id: str) -> bool:
        """
        Eliminar una transacción
        
        Args:
            transaction_id: ID de la transacción
            user_id: ID del usuario propietario
            
        Returns:
            bool: True si se eliminó correctamente
        """
        try:
            result = await self.collection.delete_one({
                "_id": ObjectId(transaction_id),
                "user_id": user_id
            })
            
            return result.deleted_count > 0
            
        except Exception as e:
            logger.error(f"Error al eliminar transacción {transaction_id}: {e}")
            return False
    
    async def get_transaction_stats(
        self, 
        user_id: str, 
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None
    ) -> TransactionStats:
        """
        Obtener estadísticas de transacciones de un usuario
        
        Args:
            user_id: ID del usuario
            date_from: Fecha de inicio del período
            date_to: Fecha de fin del período
            
        Returns:
            TransactionStats: Estadísticas de transacciones
        """
        try:
            # Construir filtro de fecha
            date_filter = {"user_id": user_id}
            if date_from or date_to:
                date_range = {}
                if date_from:
                    date_range["$gte"] = date_from
                if date_to:
                    date_range["$lte"] = date_to
                date_filter["date"] = date_range
            
            # Pipeline de agregación
            pipeline = [
                {"$match": date_filter},
                {
                    "$group": {
                        "_id": "$type",
                        "total_amount": {"$sum": "$amount"},
                        "count": {"$sum": 1}
                    }
                }
            ]
            
            # Ejecutar agregación
            results = await self.collection.aggregate(pipeline).to_list(length=None)
            
            # Procesar resultados
            total_income = 0.0
            total_expense = 0.0
            income_count = 0
            expense_count = 0
            
            for result in results:
                if result["_id"] == "income":
                    total_income = result["total_amount"]
                    income_count = result["count"]
                elif result["_id"] == "expense":
                    total_expense = result["total_amount"]
                    expense_count = result["count"]
            
            # Obtener total de transacciones
            total_count = await self.collection.count_documents(date_filter)
            
            return TransactionStats(
                total_income=total_income,
                total_expense=total_expense,
                balance=total_income - total_expense,
                transaction_count=total_count,
                income_count=income_count,
                expense_count=expense_count,
                period_start=date_from,
                period_end=date_to
            )
            
        except Exception as e:
            logger.error(f"Error al obtener estadísticas del usuario {user_id}: {e}")
            return TransactionStats()
    
    async def get_categories(self, user_id: str, transaction_type: Optional[str] = None) -> List[str]:
        """
        Obtener categorías únicas de transacciones del usuario
        
        Args:
            user_id: ID del usuario
            transaction_type: Tipo de transacción (opcional)
            
        Returns:
            List[str]: Lista de categorías únicas
        """
        try:
            # Construir filtro
            filter_doc = {"user_id": user_id}
            if transaction_type:
                filter_doc["type"] = transaction_type
            
            # Obtener categorías únicas
            categories = await self.collection.distinct("category", filter_doc)
            return sorted(categories)
            
        except Exception as e:
            logger.error(f"Error al obtener categorías del usuario {user_id}: {e}")
            return []
    
    def _document_to_response(self, doc: Dict[str, Any]) -> TransactionResponse:
        """
        Convertir documento MongoDB a TransactionResponse
        
        Args:
            doc: Documento de MongoDB
            
        Returns:
            TransactionResponse: Respuesta de transacción
        """
        return TransactionResponse(
            id=str(doc["_id"]),
            user_id=doc["user_id"],
            type=doc["type"],
            amount=doc["amount"],
            category=doc["category"],
            description=doc.get("description"),
            date=doc["date"],
            created_at=doc["created_at"],
            updated_at=doc.get("updated_at"),
            currency=doc.get("currency", "COP")
        )