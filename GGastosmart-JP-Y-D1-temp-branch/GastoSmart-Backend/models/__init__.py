"""
Paquete de Modelos para GastoSmart

Este paquete contiene todos los modelos de datos utilizados en la aplicación.
Los modelos definen la estructura de los documentos que se almacenan en MongoDB.
"""

from .user import User, UserCreate, UserResponse, UserLogin, BudgetUpdate, BudgetPeriod

__all__ = [
    "User",
    "UserCreate", 
    "UserResponse",
    "UserLogin",
    "BudgetUpdate",
    "BudgetPeriod"
]
