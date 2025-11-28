"""
Script de Migración: Corregir Contribuciones a Metas

Este script identifica y corrige transacciones que fueron registradas incorrectamente
como "income" cuando deberían ser "goal_contribution".

Ejecutar con: python -m scripts.migrate_goal_contributions
"""

import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuración de MongoDB
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "gastosmart")

async def migrate_contributions():
    """
    Migrar contribuciones a metas mal etiquetadas
    """
    try:
        # Conectar a MongoDB
        client = AsyncIOMotorClient(MONGODB_URI)
        db = client[DATABASE_NAME]
        transactions_collection = db.transactions
        goals_collection = db.goals
        
        logger.info(f"Conectado a MongoDB: {DATABASE_NAME}")
        
        # Buscar transacciones que contengan "abono a meta" o "contribución" en la descripción
        # y que estén marcadas como "income"
        suspicious_transactions = await transactions_collection.find({
            "type": "income",
            "$or": [
                {"description": {"$regex": "abono.*meta", "$options": "i"}},
                {"description": {"$regex": "contribuci[oó]n", "$options": "i"}},
                {"description": {"$regex": "ahorro.*meta", "$options": "i"}}
            ]
        }).to_list(length=None)
        
        logger.info(f"Encontradas {len(suspicious_transactions)} transacciones sospechosas")
        
        corrected_count = 0
        
        for trans in suspicious_transactions:
            # Verificar si hay un goal_id asociado o si la descripción menciona una meta
            should_correct = False
            goal_id = trans.get("goal_id")
            
            if goal_id:
                # Verificar que la meta existe
                goal = await goals_collection.find_one({"_id": goal_id})
                if goal:
                    should_correct = True
            
            if should_correct:
                # Actualizar el tipo de transacción
                result = await transactions_collection.update_one(
                    {"_id": trans["_id"]},
                    {
                        "$set": {
                            "type": "goal_contribution",
                            "transaction_type": "goal_contribution",
                            "updated_at": datetime.now(),
                            "migrated": True,
                            "migration_date": datetime.now()
                        }
                    }
                )
                
                if result.modified_count > 0:
                    corrected_count += 1
                    logger.info(f"Corregida transacción {trans['_id']}: {trans.get('description', 'Sin descripción')}")
        
        logger.info(f"Migración completada. {corrected_count} transacciones corregidas")
        
        # Recalcular estadísticas de usuarios afectados
        affected_users = set([trans["user_id"] for trans in suspicious_transactions])
        logger.info(f"Usuarios afectados: {len(affected_users)}")
        
        for user_id in affected_users:
            logger.info(f"Recalculando estadísticas para usuario: {user_id}")
            # Aquí se podrían recalcular los totales si fuera necesario
        
        client.close()
        logger.info("Migración finalizada exitosamente")
        
    except Exception as e:
        logger.error(f"Error durante la migración: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(migrate_contributions())
