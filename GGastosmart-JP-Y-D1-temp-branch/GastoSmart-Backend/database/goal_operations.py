"""
Operaciones de Base de Datos para Metas de Ahorro

Este archivo contiene todas las operaciones de base de datos relacionadas
con las metas de ahorro en GastoSmart.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta
from motor.motor_asyncio import AsyncIOMotorCollection
from models.goal import (
    Goal, GoalCreate, GoalResponse, GoalUpdate, GoalContribution,
    GoalStats, GoalTrend, MonthlySavings, MonthlyContribution, DailyContribution,
    GoalStatus, GoalCategory
)
from bson import ObjectId
import logging

logger = logging.getLogger(__name__)

class GoalOperations:
    """
    Clase para manejar operaciones de base de datos de metas
    """
    
    def __init__(self, collection: AsyncIOMotorCollection, transactions_collection: Optional[AsyncIOMotorCollection] = None):
        """
        Inicializar operaciones de metas
        
        Args:
            collection: Colección MongoDB para metas
            transactions_collection: Colección MongoDB para transacciones (opcional)
        """
        self.collection = collection
        self.transactions_collection = transactions_collection
    
    async def create_goal(self, user_id: str, goal_data: GoalCreate) -> GoalResponse:
        """
        Crear una nueva meta
        
        Args:
            user_id: ID del usuario propietario
            goal_data: Datos de la meta a crear
            
        Returns:
            GoalResponse: Meta creada
            
        Raises:
            ValueError: Si los datos son inválidos
        """
        try:
            # Crear documento de meta
            goal_doc = {
                "user_id": user_id,
                "name": goal_data.name,
                "description": goal_data.description,
                "category": goal_data.category.value,
                "target_amount": goal_data.target_amount,
                "current_amount": goal_data.current_amount,
                "target_date": goal_data.target_date.isoformat() if goal_data.target_date else None,
                "currency": goal_data.currency,
                "is_public": goal_data.is_public,
                "is_main": goal_data.is_main,
                "status": GoalStatus.ACTIVE.value,
                "created_at": datetime.now(),
                "updated_at": None
            }
            
            # Calcular progreso inicial
            progress = (goal_data.current_amount / goal_data.target_amount) * 100 if goal_data.target_amount > 0 else 0
            goal_doc["progress_percentage"] = min(progress, 100.0)
            
            # Insertar en la base de datos
            result = await self.collection.insert_one(goal_doc)
            logger.info(f"Meta insertada en colección 'goals' - inserted_id: {result.inserted_id}")
            
            # Obtener la meta creada
            created_goal = await self.collection.find_one({"_id": result.inserted_id})
            
            if created_goal:
                logger.info(f"Meta creada confirmada - _id: {created_goal['_id']}, name: {created_goal['name']}, is_main: {created_goal.get('is_main', False)}")
            else:
                logger.error(f"Error: No se pudo recuperar la meta recién creada con _id: {result.inserted_id}")
            
            return self._document_to_response(created_goal)
            
        except Exception as e:
            logger.error(f"Error al crear meta: {e}")
            raise ValueError(f"Error al crear meta: {str(e)}")
    
    async def get_goal_by_id(self, goal_id: str, user_id: str) -> Optional[GoalResponse]:
        """
        Obtener meta por ID
        
        Args:
            goal_id: ID de la meta
            user_id: ID del usuario propietario
            
        Returns:
            GoalResponse: Meta encontrada o None
        """
        try:
            goal_doc = await self.collection.find_one({
                "_id": ObjectId(goal_id),
                "user_id": user_id
            })
            
            return self._document_to_response(goal_doc) if goal_doc else None
            
        except Exception as e:
            logger.error(f"Error al obtener meta {goal_id}: {e}")
            return None
    
    async def get_user_goals(
        self, 
        user_id: str, 
        status: Optional[GoalStatus] = None,
        category: Optional[GoalCategory] = None,
        skip: int = 0, 
        limit: int = 100
    ) -> List[GoalResponse]:
        """
        Obtener metas de un usuario con filtros
        
        Args:
            user_id: ID del usuario
            status: Filtrar por estado
            category: Filtrar por categoría
            skip: Número de metas a saltar
            limit: Límite de metas a devolver
            
        Returns:
            List[GoalResponse]: Lista de metas
        """
        try:
            # Construir filtro de consulta
            query = {"user_id": user_id}
            
            if status:
                query["status"] = status.value
            if category:
                query["category"] = category.value
            
            # Ejecutar consulta ordenada por fecha de creación
            cursor = self.collection.find(query).sort("created_at", -1).skip(skip).limit(limit)
            goals = []
            
            async for doc in cursor:
                goals.append(self._document_to_response(doc))
            
            return goals
            
        except Exception as e:
            logger.error(f"Error al obtener metas del usuario {user_id}: {e}")
            return []
    
    async def update_goal(
        self, 
        goal_id: str, 
        user_id: str, 
        update_data: GoalUpdate
    ) -> Optional[GoalResponse]:
        """
        Actualizar una meta existente
        
        Args:
            goal_id: ID de la meta
            user_id: ID del usuario propietario
            update_data: Datos a actualizar
            
        Returns:
            GoalResponse: Meta actualizada o None
        """
        try:
            # Construir documento de actualización
            update_doc = {}
            
            if update_data.name is not None:
                update_doc["name"] = update_data.name
            if update_data.description is not None:
                update_doc["description"] = update_data.description
            if update_data.category is not None:
                update_doc["category"] = update_data.category.value
            if update_data.target_amount is not None:
                update_doc["target_amount"] = update_data.target_amount
            if update_data.current_amount is not None:
                update_doc["current_amount"] = update_data.current_amount
            if update_data.target_date is not None:
                update_doc["target_date"] = update_data.target_date.isoformat()
            if update_data.status is not None:
                update_doc["status"] = update_data.status.value
            if update_data.is_public is not None:
                update_doc["is_public"] = update_data.is_public
            if update_data.is_main is not None:
                update_doc["is_main"] = update_data.is_main
            
            update_doc["updated_at"] = datetime.now()
            
            # Actualizar en la base de datos
            result = await self.collection.update_one(
                {"_id": ObjectId(goal_id), "user_id": user_id},
                {"$set": update_doc}
            )
            
            if result.modified_count == 0:
                return None
            
            # Obtener la meta actualizada
            updated_goal = await self.collection.find_one({
                "_id": ObjectId(goal_id),
                "user_id": user_id
            })
            
            # Recalcular progreso
            if updated_goal:
                progress = (updated_goal["current_amount"] / updated_goal["target_amount"]) * 100
                await self.collection.update_one(
                    {"_id": ObjectId(goal_id)},
                    {"$set": {"progress_percentage": min(progress, 100.0)}}
                )
                updated_goal["progress_percentage"] = min(progress, 100.0)
            
            return self._document_to_response(updated_goal)
            
        except Exception as e:
            logger.error(f"Error al actualizar meta {goal_id}: {e}")
            return None
    
    async def contribute_to_main_goal(
        self, 
        user_id: str, 
        contribution: GoalContribution
    ) -> Optional[GoalResponse]:
        """
        Realizar un abono a la meta principal del usuario
        
        Args:
            user_id: ID del usuario propietario
            contribution: Datos del abono
            
        Returns:
            GoalResponse: Meta principal actualizada o None
        """
        try:
            logger.info(f"Buscando meta principal para user_id: {user_id}")
            
            # Buscar la meta principal del usuario
            goal_doc = await self.collection.find_one({
                "user_id": user_id,
                "is_main": True
            })
            
            if not goal_doc:
                logger.warning(f"No se encontró meta principal para user_id: {user_id}")
                return None
            
            logger.info(f"Meta principal encontrada: {goal_doc['_id']} - {goal_doc['name']}")
            
            # Validar que el abono no exceda el monto restante
            remaining_amount = goal_doc["target_amount"] - goal_doc["current_amount"]
            if contribution.amount > remaining_amount:
                raise ValueError(f"El monto del abono (${contribution.amount:,.0f}) excede el monto restante (${remaining_amount:,.0f})")
            
            # Calcular nuevo monto
            new_amount = goal_doc["current_amount"] + contribution.amount
            
            # Verificar que no exceda el objetivo (doble verificación)
            if new_amount > goal_doc["target_amount"]:
                new_amount = goal_doc["target_amount"]
            
            # Actualizar la meta
            update_doc = {
                "current_amount": new_amount,
                "updated_at": datetime.now()
            }
            
            # Calcular nuevo progreso
            progress = (new_amount / goal_doc["target_amount"]) * 100
            update_doc["progress_percentage"] = min(progress, 100.0)
            
            # Actualizar estado si se alcanzó el 100%
            if progress >= 100:
                update_doc["status"] = GoalStatus.COMPLETED.value
            
            result = await self.collection.update_one(
                {"_id": goal_doc["_id"], "user_id": user_id},
                {"$set": update_doc}
            )
            
            if result.modified_count == 0:
                logger.warning(f"No se pudo actualizar la meta principal {goal_doc['_id']}")
                return None
            
            logger.info(f"Meta principal actualizada - modified_count: {result.modified_count}")
            
            # Registrar transacción de abono a meta
            if self.transactions_collection is not None:
                try:
                    # Usar fecha personalizada o fecha actual
                    contribution_datetime = datetime.combine(
                        contribution.contribution_date if contribution.contribution_date else date.today(),
                        datetime.now().time()
                    )
                    
                    transaction_doc = {
                        "user_id": user_id,
                        "type": "goal_contribution",
                        "amount": contribution.amount,
                        "category": goal_doc.get("category", "Meta Principal"),
                        "description": contribution.description or f"Abono a meta: {goal_doc['name']}",
                        "date": contribution_datetime,
                        "created_at": datetime.now(),
                        "currency": "COP",
                        "goal_id": str(goal_doc["_id"]),
                        "goal_name": goal_doc["name"]
                    }
                    await self.transactions_collection.insert_one(transaction_doc)
                    logger.info(f"Transacción de abono registrada para meta principal")
                except Exception as trans_error:
                    logger.error(f"Error al registrar transacción de abono: {trans_error}")
                    # No fallar si la transacción no se registra
            
            # Obtener la meta actualizada
            updated_goal = await self.collection.find_one({
                "_id": goal_doc["_id"],
                "user_id": user_id
            })
            
            return self._document_to_response(updated_goal)
            
        except Exception as e:
            logger.error(f"Error al abonar a meta principal del usuario {user_id}: {e}")
            return None

    async def contribute_to_goal(
        self, 
        goal_id: str, 
        user_id: str, 
        contribution: GoalContribution
    ) -> Optional[GoalResponse]:
        """
        Realizar un abono a una meta específica por ID
        
        Args:
            goal_id: ID de la meta (ObjectId)
            user_id: ID del usuario propietario
            contribution: Datos del abono
            
        Returns:
            GoalResponse: Meta actualizada o None
        """
        try:
            logger.info(f"Abonando a meta {goal_id} para user_id: {user_id}")
            
            # Obtener la meta actual
            goal_doc = await self.collection.find_one({
                "_id": ObjectId(goal_id),
                "user_id": user_id
            })
            
            if not goal_doc:
                logger.warning(f"Meta {goal_id} no encontrada para user_id: {user_id}")
                return None
            
            # Validar que el abono no exceda el monto restante
            remaining_amount = goal_doc["target_amount"] - goal_doc["current_amount"]
            if contribution.amount > remaining_amount:
                raise ValueError(f"El monto del abono (${contribution.amount:,.0f}) excede el monto restante (${remaining_amount:,.0f})")
            
            # Calcular nuevo monto
            new_amount = goal_doc["current_amount"] + contribution.amount
            
            # Verificar que no exceda el objetivo (doble verificación)
            if new_amount > goal_doc["target_amount"]:
                new_amount = goal_doc["target_amount"]
            
            # Actualizar la meta
            update_doc = {
                "current_amount": new_amount,
                "updated_at": datetime.now()
            }
            
            # Calcular nuevo progreso
            progress = (new_amount / goal_doc["target_amount"]) * 100
            update_doc["progress_percentage"] = min(progress, 100.0)
            
            # Actualizar estado si se alcanzó el 100%
            if progress >= 100:
                update_doc["status"] = GoalStatus.COMPLETED.value
            
            result = await self.collection.update_one(
                {"_id": ObjectId(goal_id), "user_id": user_id},
                {"$set": update_doc}
            )
            
            if result.modified_count == 0:
                logger.warning(f"No se pudo actualizar la meta {goal_id}")
                return None
            
            logger.info(f"Meta {goal_id} actualizada - modified_count: {result.modified_count}")
            
            # Registrar transacción de abono a meta
            if self.transactions_collection is not None:
                try:
                    # Usar fecha personalizada o fecha actual
                    contribution_datetime = datetime.combine(
                        contribution.contribution_date if contribution.contribution_date else date.today(),
                        datetime.now().time()
                    )
                    
                    transaction_doc = {
                        "user_id": user_id,
                        "type": "goal_contribution",
                        "amount": contribution.amount,
                        "category": goal_doc.get("category", "Meta"),
                        "description": contribution.description or f"Abono a meta: {goal_doc['name']}",
                        "date": contribution_datetime,
                        "created_at": datetime.now(),
                        "currency": "COP",
                        "goal_id": goal_id,
                        "goal_name": goal_doc["name"]
                    }
                    await self.transactions_collection.insert_one(transaction_doc)
                    logger.info(f"Transacción de abono registrada para meta {goal_id}")
                except Exception as trans_error:
                    logger.error(f"Error al registrar transacción de abono: {trans_error}")
                    # No fallar si la transacción no se registra
            
            # Obtener la meta actualizada
            updated_goal = await self.collection.find_one({
                "_id": ObjectId(goal_id),
                "user_id": user_id
            })
            
            return self._document_to_response(updated_goal)
            
        except Exception as e:
            logger.error(f"Error al abonar a meta {goal_id}: {e}")
            return None
    
    async def delete_goal(self, goal_id: str, user_id: str) -> bool:
        """
        Eliminar una meta
        
        Args:
            goal_id: ID de la meta
            user_id: ID del usuario propietario
            
        Returns:
            bool: True si se eliminó correctamente
        """
        try:
            result = await self.collection.delete_one({
                "_id": ObjectId(goal_id),
                "user_id": user_id
            })
            
            return result.deleted_count > 0
            
        except Exception as e:
            logger.error(f"Error al eliminar meta {goal_id}: {e}")
            return False
    
    async def get_goal_stats(self, user_id: str) -> GoalStats:
        """
        Obtener estadísticas de metas de un usuario
        
        Args:
            user_id: ID del usuario
            
        Returns:
            GoalStats: Estadísticas de metas
        """
        try:
            # Pipeline de agregación para estadísticas
            pipeline = [
                {"$match": {"user_id": user_id}},
                {
                    "$group": {
                        "_id": "$status",
                        "count": {"$sum": 1},
                        "total_current": {"$sum": "$current_amount"},
                        "total_target": {"$sum": "$target_amount"},
                        "avg_progress": {"$avg": "$progress_percentage"}
                    }
                }
            ]
            
            results = await self.collection.aggregate(pipeline).to_list(length=None)
            
            # Procesar resultados
            stats = GoalStats()
            
            for result in results:
                status = result["_id"]
                if status == GoalStatus.ACTIVE.value:
                    stats.active_goals_count = result["count"]
                elif status == GoalStatus.COMPLETED.value:
                    stats.completed_goals_count = result["count"]
                elif status == GoalStatus.FAILED.value:
                    stats.failed_goals_count = result["count"]
                
                stats.total_saved += result["total_current"]
                stats.total_target_amount += result["total_target"]
            
            stats.total_goals_count = stats.active_goals_count + stats.completed_goals_count + stats.failed_goals_count
            
            # Calcular promedio de progreso
            if stats.total_goals_count > 0:
                total_progress = sum(r["avg_progress"] * r["count"] for r in results)
                stats.average_progress = total_progress / stats.total_goals_count
            
            return stats
            
        except Exception as e:
            logger.error(f"Error al obtener estadísticas del usuario {user_id}: {e}")
            return GoalStats()
    
    async def get_goal_trends(self) -> GoalTrend:
        """
        Obtener tendencias de metas (datos públicos)
        
        Returns:
            GoalTrend: Tendencias de metas
        """
        try:
            # Obtener metas públicas para estadísticas
            pipeline = [
                {"$match": {"is_public": True}},
                {
                    "$group": {
                        "_id": "$category",
                        "count": {"$sum": 1},
                        "avg_amount": {"$avg": "$target_amount"},
                        "avg_time": {"$avg": {"$divide": [{"$subtract": ["$target_date", "$created_at"]}, 86400000]}} # días
                    }
                },
                {"$sort": {"count": -1}}
            ]
            
            results = await self.collection.aggregate(pipeline).to_list(length=None)
            
            if not results:
                return GoalTrend(
                    most_common_category="Viajes",
                    average_savings=2000000.0,
                    average_savings_time_months=8,
                    popular_trends=["Viajes", "Fondo de Emergencia", "Educación"]
                )
            
            # Procesar resultados
            most_common = results[0]["_id"] if results else "Viajes"
            avg_savings = sum(r["avg_amount"] for r in results) / len(results) if results else 2000000.0
            avg_time_days = sum(r["avg_time"] for r in results) / len(results) if results else 240
            avg_time_months = int(avg_time_days / 30)
            
            popular_trends = [r["_id"] for r in results[:3]]
            
            return GoalTrend(
                most_common_category=most_common,
                average_savings=avg_savings,
                average_savings_time_months=avg_time_months,
                popular_trends=popular_trends
            )
            
        except Exception as e:
            logger.error(f"Error al obtener tendencias: {e}")
            return GoalTrend(
                most_common_category="Viajes",
                average_savings=2000000.0,
                average_savings_time_months=8,
                popular_trends=["Viajes", "Fondo de Emergencia", "Educación"]
            )
    
    async def get_monthly_savings(self, user_id: str, months: int = 6) -> List[MonthlySavings]:
        """
        Obtener ahorro mensual de los últimos meses para categoría "Ahorros"
        
        Args:
            user_id: ID del usuario
            months: Número de meses a obtener
            
        Returns:
            List[MonthlySavings]: Lista de ahorros mensuales
        """
        try:
            if self.transactions_collection is None:
                logger.warning("No se puede obtener ahorro mensual: transactions_collection no disponible")
                return []
            
            # Calcular fecha de inicio
            start_date = datetime.now() - timedelta(days=months * 30)
            
            # Obtener metas de categoría "Ahorros" del usuario
            savings_goals = await self.get_user_goals(user_id, category=GoalCategory.SAVINGS)
            savings_goal_ids = [goal.id for goal in savings_goals]
            
            if not savings_goal_ids:
                logger.info(f"Usuario {user_id} no tiene metas de categoría 'Ahorros'")
                return []
            
            # Pipeline de agregación para sumar abonos por mes para metas de categoría "Ahorros"
            pipeline = [
                {
                    "$match": {
                        "user_id": user_id,
                        "type": "goal_contribution",
                        "goal_id": {"$in": savings_goal_ids},
                        "date": {"$gte": start_date}
                    }
                },
                {
                    "$group": {
                        "_id": {
                            "year": {"$year": "$date"},
                            "month": {"$month": "$date"}
                        },
                        "total_amount": {"$sum": "$amount"}
                    }
                },
                {
                    "$sort": {"_id.year": 1, "_id.month": 1}
                }
            ]
            
            results = await self.transactions_collection.aggregate(pipeline).to_list(length=None)
            
            # Convertir resultados al formato esperado
            monthly_data = []
            for result in results:
                month = result["_id"]["month"]
                year = result["_id"]["year"]
                
                monthly_data.append(MonthlySavings(
                    month=str(month),
                    year=year,
                    amount=result["total_amount"],
                    goal_id="all_savings",
                    goal_name="Ahorros"
                ))
            
            return monthly_data
            
        except Exception as e:
            logger.error(f"Error al obtener ahorro mensual: {e}")
            return []
    
    async def get_monthly_contributions(self, user_id: str, months: int = 6, category: Optional[str] = None) -> List[MonthlyContribution]:
        """
        Obtener abonos mensuales de los últimos meses
        
        Args:
            user_id: ID del usuario
            months: Número de meses a obtener
            category: Categoría específica de meta (opcional)
            
        Returns:
            List[MonthlyContribution]: Lista de abonos mensuales
        """
        try:
            if self.transactions_collection is None:
                logger.warning("No se puede obtener abonos mensuales: transactions_collection no disponible")
                return []
            
            # Calcular fecha de inicio
            start_date = datetime.now() - timedelta(days=months * 30)
            
            # Construir filtro de consulta
            match_filter = {
                "user_id": user_id,
                "type": "goal_contribution",
                "date": {"$gte": start_date}
            }
            
            # Si se especifica categoría, filtrar por metas de esa categoría
            if category:
                category_goals = await self.get_user_goals(user_id, category=GoalCategory(category))
                category_goal_ids = [goal.id for goal in category_goals]
                
                if not category_goal_ids:
                    logger.info(f"Usuario {user_id} no tiene metas de categoría '{category}'")
                    return []
                
                match_filter["goal_id"] = {"$in": category_goal_ids}
            
            # Pipeline de agregación para sumar abonos por mes
            pipeline = [
                {"$match": match_filter},
                {
                    "$group": {
                        "_id": {
                            "year": {"$year": "$date"},
                            "month": {"$month": "$date"}
                        },
                        "total_amount": {"$sum": "$amount"}
                    }
                },
                {
                    "$sort": {"_id.year": 1, "_id.month": 1}
                }
            ]
            
            results = await self.transactions_collection.aggregate(pipeline).to_list(length=None)
            
            # Convertir resultados al formato esperado
            monthly_data = []
            for result in results:
                month = result["_id"]["month"]
                year = result["_id"]["year"]
                
                monthly_data.append(MonthlyContribution(
                    month=str(month),
                    year=year,
                    amount=result["total_amount"],
                    goal_id="all" if not category else f"category_{category}",
                    goal_name=category or "Todas las metas"
                ))
            
            return monthly_data
            
        except Exception as e:
            logger.error(f"Error al obtener abonos mensuales: {e}")
            return []
    
    async def get_daily_contributions_by_goal(
        self, 
        user_id: str, 
        goal_id: str, 
        year: Optional[int] = None, 
        month: Optional[int] = None
    ) -> List[DailyContribution]:
        """
        Obtener abonos diarios de una meta específica para un mes determinado
        
        Args:
            user_id: ID del usuario
            goal_id: ID de la meta específica
            year: Año (opcional, por defecto año actual)
            month: Mes (opcional, por defecto mes actual)
            
        Returns:
            List[DailyContribution]: Lista de abonos diarios
        """
        try:
            if self.transactions_collection is None:
                logger.warning("No se puede obtener abonos diarios: transactions_collection no disponible")
                return []
            
            # Usar fecha actual si no se especifica
            now = datetime.now()
            target_year = year if year else now.year
            target_month = month if month else now.month
            
            # Calcular rango de fechas para el mes específico
            start_date = datetime(target_year, target_month, 1)
            if target_month == 12:
                end_date = datetime(target_year + 1, 1, 1)
            else:
                end_date = datetime(target_year, target_month + 1, 1)
            
            # Verificar que la meta existe y pertenece al usuario
            goal_doc = await self.collection.find_one({
                "_id": ObjectId(goal_id),
                "user_id": user_id
            })
            
            if not goal_doc:
                logger.warning(f"Meta {goal_id} no encontrada para user_id: {user_id}")
                return []
            
            # Pipeline de agregación para obtener abonos diarios
            pipeline = [
                {
                    "$match": {
                        "user_id": user_id,
                        "type": "goal_contribution",
                        "goal_id": goal_id,
                        "date": {"$gte": start_date, "$lt": end_date}
                    }
                },
                {
                    "$group": {
                        "_id": {
                            "day": {"$dayOfMonth": "$date"},
                            "month": {"$month": "$date"},
                            "year": {"$year": "$date"}
                        },
                        "total_amount": {"$sum": "$amount"},
                        "date": {"$first": "$date"}
                    }
                },
                {
                    "$sort": {"_id.day": 1}
                }
            ]
            
            results = await self.transactions_collection.aggregate(pipeline).to_list(length=None)
            
            # Convertir resultados al formato esperado
            daily_data = []
            for result in results:
                day = result["_id"]["day"]
                date_obj = result["date"]
                
                daily_data.append(DailyContribution(
                    day=day,
                    date=date_obj.strftime("%Y-%m-%d"),
                    amount=result["total_amount"],
                    goal_id=goal_id,
                    goal_name=goal_doc["name"]
                ))
            
            return daily_data
            
        except Exception as e:
            logger.error(f"Error al obtener abonos diarios de meta {goal_id}: {e}")
            return []
    
    def _document_to_response(self, doc: Dict[str, Any]) -> GoalResponse:
        """
        Convertir documento MongoDB a GoalResponse
        
        Args:
            doc: Documento de MongoDB
            
        Returns:
            GoalResponse: Respuesta de meta
        """
        from datetime import datetime, date
        
        # Convertir target_date de string a date si es necesario
        target_date = doc["target_date"]
        if isinstance(target_date, str):
            target_date = datetime.fromisoformat(target_date).date()
        
        return GoalResponse(
            id=str(doc["_id"]),
            user_id=doc["user_id"],
            name=doc["name"],
            description=doc.get("description"),
            category=doc["category"],
            target_amount=doc["target_amount"],
            current_amount=doc["current_amount"],
            target_date=target_date,
            created_at=doc["created_at"],
            updated_at=doc.get("updated_at"),
            status=doc["status"],
            progress_percentage=doc["progress_percentage"],
            currency=doc.get("currency", "COP"),
            is_public=doc.get("is_public", False),
            is_main=doc.get("is_main", False)
        )
