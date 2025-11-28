"""
Modelo de Transacción para GastoSmart

Este archivo define el modelo de datos para las transacciones financieras
(ingresos y gastos) en la aplicación GastoSmart.
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, Literal
from datetime import datetime
from enum import Enum

class TransactionType(str, Enum):
    """Tipos de transacción disponibles"""
    INCOME = "income"    # Ingreso
    EXPENSE = "expense"  # Gasto
    GOAL_CONTRIBUTION = "goal_contribution"  # Abono a meta (transferencia interna)

class IncomeCategory(str, Enum):
    """Categorías de ingresos"""
    SALARY = "Salario"
    FREELANCE = "Freelance"
    INVESTMENTS = "Inversiones"
    SALES = "Ventas"
    BONUSES = "Bonificaciones"
    OTHER_INCOME = "Otros ingresos"

class ExpenseCategory(str, Enum):
    """Categorías de gastos"""
    FOOD = "Alimentación"
    TRANSPORT = "Transporte"
    HOUSING = "Vivienda"
    ENTERTAINMENT = "Entretenimiento"
    HEALTH = "Salud"
    EDUCATION = "Educación"
    CLOTHING = "Ropa"
    SERVICES = "Servicios"
    OTHER_EXPENSES = "Otros gastos"

class Transaction(BaseModel):
    """
    Modelo de Transacción para GastoSmart
    
    Representa una transacción financiera (ingreso o gasto) realizada por el usuario.
    Implementa las validaciones del requerimiento RQF-005.
    """
    
    # Información básica de la transacción
    id: Optional[str] = Field(None, description="ID único de la transacción")
    user_id: str = Field(..., description="ID del usuario propietario")
    type: TransactionType = Field(..., description="Tipo de transacción (income/expense)")
    
    # Datos financieros (validaciones según RQF-005)
    amount: float = Field(..., gt=0, description="Monto de la transacción (debe ser mayor a 0)")
    category: str = Field(..., min_length=1, description="Categoría de la transacción (obligatoria)")
    description: Optional[str] = Field(None, max_length=500, description="Descripción opcional")
    
    # Fecha de la transacción
    date: datetime = Field(..., description="Fecha de la transacción")
    
    # Metadatos
    created_at: datetime = Field(default_factory=datetime.now, description="Fecha de creación del registro")
    updated_at: Optional[datetime] = Field(None, description="Fecha de última actualización")
    
    # Configuración regional
    currency: str = Field(default="COP", description="Moneda de la transacción")
    
    @validator('amount')
    def validate_amount(cls, v):
        """Validación RN-01: El monto debe ser mayor a 0"""
        if v <= 0:
            raise ValueError('El monto debe ser mayor a 0')
        return v
    
    @validator('category')
    def validate_category(cls, v):
        """Validación RN-02: La categoría debe seleccionarse obligatoriamente"""
        if not v or v.strip() == '':
            raise ValueError('La categoría es obligatoria')
        return v.strip()
    
    @validator('date')
    def validate_date(cls, v):
        """Validación RN-03: La fecha puede ser distinta a la actual"""
        # Permitir fechas pasadas, actuales y futuras (dentro de un rango razonable)
        now = datetime.now()
        min_date = datetime(2020, 1, 1)
        max_date = datetime(2030, 12, 31)
        
        if v < min_date or v > max_date:
            raise ValueError('La fecha debe estar entre 2020 y 2030')
        
        return v
    
    class Config:
        """Configuración del modelo"""
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
        json_schema_extra = {
            "example": {
                "user_id": "user_123456789",
                "type": "income",
                "amount": 2500000.00,
                "category": "Salario",
                "description": "Salario mensual enero 2025",
                "date": "2025-01-15T00:00:00Z",
                "currency": "COP"
            }
        }

class TransactionCreate(BaseModel):
    """
    Modelo para crear una nueva transacción
    
    Se usa en el endpoint de creación, sin incluir metadatos automáticos.
    """
    type: TransactionType
    amount: float = Field(..., gt=0)
    category: str = Field(..., min_length=1)
    description: Optional[str] = Field(None, max_length=500)
    date: datetime
    currency: str = Field(default="COP")
    
    @validator('amount')
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError('El monto debe ser mayor a 0')
        return v
    
    @validator('category')
    def validate_category(cls, v):
        if not v or v.strip() == '':
            raise ValueError('La categoría es obligatoria')
        return v.strip()

class TransactionResponse(BaseModel):
    """
    Modelo para respuesta de transacción
    
    Se usa para devolver información de la transacción al cliente.
    """
    id: str
    user_id: str
    type: TransactionType
    amount: float
    category: str
    description: Optional[str]
    date: datetime
    created_at: datetime
    updated_at: Optional[datetime]
    currency: str

class TransactionUpdate(BaseModel):
    """
    Modelo para actualizar una transacción existente
    """
    amount: Optional[float] = Field(None, gt=0)
    category: Optional[str] = Field(None, min_length=1)
    description: Optional[str] = Field(None, max_length=500)
    date: Optional[datetime]
    
    @validator('amount')
    def validate_amount(cls, v):
        if v is not None and v <= 0:
            raise ValueError('El monto debe ser mayor a 0')
        return v
    
    @validator('category')
    def validate_category(cls, v):
        if v is not None and (not v or v.strip() == ''):
            raise ValueError('La categoría no puede estar vacía')
        return v.strip() if v else v

class TransactionFilter(BaseModel):
    """
    Modelo para filtros de búsqueda de transacciones
    """
    type: Optional[TransactionType] = None
    category: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    amount_min: Optional[float] = Field(None, ge=0)
    amount_max: Optional[float] = Field(None, ge=0)
    
class TransactionSort(BaseModel):
    """
    Modelo para ordenamiento de transacciones
    """
    field: Literal["date", "amount", "category", "created_at"] = "date"
    order: Literal["asc", "desc"] = "desc"

class TransactionStats(BaseModel):
    """
    Modelo para estadísticas de transacciones
    """
    total_income: float = 0.0
    total_expense: float = 0.0
    balance: float = 0.0
    transaction_count: int = 0
    income_count: int = 0
    expense_count: int = 0
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
