"""
Modelo de Usuario para GastoSmart

Este archivo define el modelo de datos para los usuarios de la aplicación,
incluyendo información personal y configuración de presupuesto inicial.
"""

# Pydantic: para validar los datos
# EmailStr: para validar el correo electrónico
# Field: para definir los campos del modelo
# Optional: para definir los campos opcionales
# datetime: para definir la fecha y hora
# Enum: para definir los valores posibles

from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from enum import Enum

class BudgetPeriod(str, Enum):
    """Períodos de presupuesto disponibles"""
    BYWEEKLY = "quincenal"  # Cada 15 días
    MONTHLY = "mensual"      # Cada mes

class User(BaseModel):
    """
    Modelo de Usuario para GastoSmart
    
    Representa un usuario registrado en la aplicación con toda su información
    personal y configuración financiera inicial.
    """
    
    # Información personal básica
    first_name: str = Field(..., min_length=2, max_length=50, description="Nombre del usuario")
    last_name: str = Field(..., min_length=2, max_length=50, description="Apellido del usuario")
    email: EmailStr = Field(..., description="Correo electrónico único del usuario")
    password: str = Field(..., min_length=8, description="Contraseña encriptada del usuario")
    
    # Configuración de presupuesto inicial
    initial_budget: float = Field(..., ge=0, description="Monto del presupuesto inicial (puede ser 0 temporalmente)")
    budget_period: BudgetPeriod = Field(..., description="Período del presupuesto (quincenal/mensual)")
    budget_configured: bool = Field(default=False, description="Si el usuario ha configurado su presupuesto")
    
    # Metadatos del usuario
    registration_date: datetime = Field(default_factory=datetime.now, description="Fecha de registro del usuario")
    is_active: bool = Field(default=True, description="Estado activo del usuario")
    last_access: Optional[datetime] = Field(default=None, description="Última vez que el usuario accedió")
    
    # Seguridad de login
    failed_login_attempts: int = Field(default=0, description="Número de intentos fallidos de login")
    locked_until: Optional[datetime] = Field(default=None, description="Fecha hasta la que la cuenta está bloqueada")
    
    # Configuración adicional
    currency: str = Field(default="COP", description="Moneda preferida del usuario")
    timezone: str = Field(default="America/Bogota", description="Zona horaria del usuario")
    
    class Config:
        """Configuración del modelo"""
        json_encoders = {
            datetime: lambda v: v.isoformat()  # Para convertir la fecha y hora a JSON, formato ISO
        }
        json_schema_extra = {
            "example": {
                "first_name": "Juan",
                "last_name": "Pérez",
                "email": "juan.perez@ejemplo.com",
                "password": "mi_contraseña_segura_123",
                "initial_budget": 2000000.00,
                "budget_period": "mensual",
                "currency": "COP",
                "timezone": "America/Bogota"
            }
        }

class UserCreate(BaseModel):
    """
    Modelo para crear un nuevo usuario
    
    Se usa en el endpoint de registro, sin incluir metadatos automáticos.
    """
    first_name: str = Field(..., min_length=2, max_length=50)
    last_name: str = Field(..., min_length=2, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8)
    initial_budget: float = Field(..., ge=0)  # Permitir 0 para presupuesto temporal
    budget_period: BudgetPeriod
    currency: str = Field(default="COP")
    timezone: str = Field(default="America/Bogota")

class UserResponse(BaseModel):
    """
    Modelo para respuesta de usuario (sin contraseña)
    
    Se usa para devolver información del usuario sin exponer la contraseña.
    """
    id: str = Field(..., description="ID único del usuario")
    first_name: str
    last_name: str
    email: EmailStr
    initial_budget: float
    budget_period: BudgetPeriod
    budget_configured: bool
    registration_date: datetime
    is_active: bool
    email_verified: Optional[bool] = Field(default=False, description="Si el email ha sido verificado")
    last_access: Optional[datetime]
    currency: str
    timezone: str

class UserLogin(BaseModel):
    """
    Modelo para login de usuario
    """
    email: EmailStr
    password: str

class VerificationCodeRequest(BaseModel):
    
    # Modelo para solicitar código de verificación
    
    email: EmailStr  # Campo obligatorio de tipo email
    purpose: str = Field(..., description="Propósito: 'registration' o 'password_recovery'")  # Campo obligatorio con descripción

class VerificationCodeConfirm(BaseModel):
    
    # Modelo para confirmar código de verificación
    
    email: EmailStr  # Campo obligatorio de tipo email
    code: str = Field(..., min_length=6, max_length=6, description="Código de 6 dígitos")  # Campo obligatorio con validación de longitud
    purpose: str = Field(..., description="Propósito: 'registration' o 'password_recovery'")  # Campo obligatorio con descripción

class BudgetUpdate(BaseModel):
    
    # Modelo para actualizar presupuesto del usuario
    
    initial_budget: float = Field(..., gt=0)  # Debe ser mayor a 0 cuando se configura
    budget_period: BudgetPeriod
