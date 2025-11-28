# database/connection.py

from motor.motor_asyncio import AsyncIOMotorClient # Cliente asíncrono para FastAPI
from pymongo import MongoClient # Cliente síncrono para operaciones que lo requieran
import os
from dotenv import load_dotenv

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "gastosmart")

async_client = None
sync_client = None

async def connect_to_mongo():
    """Conectar a MongoDB"""
    global async_client, sync_client
    try:
        async_client = AsyncIOMotorClient(MONGODB_URL)
        sync_client = MongoClient(MONGODB_URL)
        
        # Verificar conexión (ping). motor's ping is synchronousish but await admin.command works
        await async_client.admin.command('ping')
        print(f"Conectado a MongoDB: {DATABASE_NAME}")
    except Exception as e:
        print(f"Error conectando a MongoDB: {e}")
        raise e

async def close_mongo_connection():
    """Cerrar conexión a MongoDB"""
    global async_client, sync_client
    if async_client:
        async_client.close()
    if sync_client:
        sync_client.close()

def get_database():
    """Obtener instancia de la base de datos (síncrono)"""
    if sync_client is None:
        raise Exception("Base de datos no conectada")
    return sync_client[DATABASE_NAME]

async def get_async_database():
    """
    Obtener instancia asíncrona de la base de datos (para Depends).
    Además **anexamos** propiedades .transactions, .user_settings, .goals
    para compatibilidad con los constructores de tus operations.
    """
    if async_client is None:
        raise Exception("Base de datos no conectada")
    db = async_client[DATABASE_NAME]

    # Adjuntar colecciones útiles como atributos (esto es práctico y seguro)
    # De este modo getattr(db, "transactions", None) devuelve la colección.
    try:
        # solo asignar si no existen (para evitar sobrescribir)
        if not hasattr(db, "transactions"):
            db.transactions = db.get_collection("transactions")
        if not hasattr(db, "user_settings"):
            db.user_settings = db.get_collection("user_settings")
        if not hasattr(db, "goals"):
            db.goals = db.get_collection("goals")
    except Exception:
        # Si por algún motivo no se pueden anexar, dejar db tal cual
        pass

    return db
