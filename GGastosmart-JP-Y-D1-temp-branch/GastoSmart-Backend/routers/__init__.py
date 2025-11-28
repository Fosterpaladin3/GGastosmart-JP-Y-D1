"""
Paquete de Routers para GastoSmart

Este paquete contiene todos los routers de la API REST.
Cada router maneja un grupo específico de endpoints.
"""

from .users import router as users_router

__all__ = ["users_router"]
