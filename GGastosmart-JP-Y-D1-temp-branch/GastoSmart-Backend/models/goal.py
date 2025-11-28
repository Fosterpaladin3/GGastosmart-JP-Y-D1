"""
Modelo de Metas de Ahorro para GastoSmart

Este archivo define el modelo de datos para las metas de ahorro
en la aplicación GastoSmart.
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, Literal
from datetime import datetime, date
from enum import Enum

class GoalStatus(str, Enum):
    """Estados de las metas"""
    ACTIVE = "active"        # Meta activa
    COMPLETED = "completed"  # Meta cumplida
    FAILED = "failed"        # Meta no alcanzada
    ARCHIVED = "archived"    # Meta archivada

class GoalCategory(str, Enum):
    """Categorías de metas"""
    EMERGENCY_FUND = "Fondo de Emergencia"
    VACATION = "Viajes"
    EDUCATION = "Educación"
    HOME = "Vivienda"
    VEHICLE = "Vehículo"
    TECHNOLOGY = "Tecnología"
    HEALTH = "Salud"
    WEDDING = "Boda"
    RETIREMENT = "Jubilación"
    SAVINGS = "Ahorros"
    INVESTMENTS = "Inversiones"
    OTHER = "Otros"

class Goal(BaseModel):
    """
    Modelo de Meta de Ahorro para GastoSmart
    
    Representa una meta de ahorro establecida por el usuario.
    Implementa las validaciones del requerimiento RQF-010.
    """
    
    # Información básica de la meta
    id: Optional[str] = Field(None, description="ID único de la meta")
    user_id: str = Field(..., description="ID del usuario propietario")
    name: str = Field(..., min_length=1, max_length=100, description="Nombre de la meta")
    description: Optional[str] = Field(None, max_length=500, description="Descripción de la meta")
    category: GoalCategory = Field(..., description="Categoría de la meta")
    
    # Objetivos financieros
    target_amount: float = Field(..., gt=0, description="Monto objetivo (debe ser mayor a 0)")
    current_amount: float = Field(default=0.0, ge=0, description="Monto actual ahorrado")
    
    # Fechas
    target_date: date = Field(..., description="Fecha límite para alcanzar la meta")
    created_at: datetime = Field(default_factory=datetime.now, description="Fecha de creación")
    updated_at: Optional[datetime] = Field(None, description="Fecha de última actualización")
    
    # Estado y progreso
    status: GoalStatus = Field(default=GoalStatus.ACTIVE, description="Estado actual de la meta")
    progress_percentage: float = Field(default=0.0, ge=0, le=100, description="Porcentaje de progreso")
    
    # Configuración
    currency: str = Field(default="COP", description="Moneda de la meta")
    is_public: bool = Field(default=False, description="Si la meta es pública para estadísticas")
    is_main: bool = Field(default=False, description="Si es la meta principal del usuario")
    
    @validator('target_amount')
    def validate_target_amount(cls, v):
        """Validación: El monto objetivo debe ser mayor a 0"""
        if v <= 0:
            raise ValueError('El monto objetivo debe ser mayor a 0')
        return v
    
    @validator('target_date')
    def validate_target_date(cls, v):
        """Validación: La fecha objetivo debe ser futura"""
        if v <= date.today():
            raise ValueError('La fecha objetivo debe ser futura')
        return v
    
    @validator('current_amount')
    def validate_current_amount(cls, v, values):
        """Validación: El monto actual no puede ser mayor al objetivo"""
        if 'target_amount' in values and v > values['target_amount']:
            raise ValueError('El monto actual no puede ser mayor al objetivo')
        return v
    
    def calculate_progress(self) -> float:
        """Calcular el porcentaje de progreso"""
        if self.target_amount == 0:
            return 0.0
        return min((self.current_amount / self.target_amount) * 100, 100.0)
    
    def update_progress(self):
        """Actualizar el progreso basado en el monto actual"""
        self.progress_percentage = self.calculate_progress()
        
        # Actualizar estado basado en progreso y fecha
        if self.progress_percentage >= 100:
            self.status = GoalStatus.COMPLETED
        elif self.target_date < date.today() and self.status == GoalStatus.ACTIVE:
            self.status = GoalStatus.FAILED
    
    class Config:
        """Configuración del modelo"""
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            date: lambda v: v.isoformat()
        }
        json_schema_extra = {
            "example": {
                "user_id": "user_123456789",
                "name": "Fondo de Emergencia",
                "description": "Ahorro para emergencias médicas y gastos imprevistos",
                "category": "Fondo de Emergencia",
                "target_amount": 2000000.00,
                "current_amount": 300000.00,
                "target_date": "2025-12-31",
                "currency": "COP",
                "is_public": True
            }
        }

class GoalCreate(BaseModel):
    """
    Modelo para crear una nueva meta
    
    Se usa en el endpoint de creación, sin incluir metadatos automáticos.
    """
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    category: GoalCategory
    target_amount: float = Field(..., gt=0)
    current_amount: float = Field(default=0.0, ge=0)
    target_date: date
    currency: str = Field(default="COP")
    is_public: bool = Field(default=False)
    is_main: bool = Field(default=False)
    
    @validator('target_amount')
    def validate_target_amount(cls, v):
        if v <= 0:
            raise ValueError('El monto objetivo debe ser mayor a 0')
        return v
    
    @validator('target_date')
    def validate_target_date(cls, v):
        if v <= date.today():
            raise ValueError('La fecha objetivo debe ser futura')
        return v

class GoalResponse(BaseModel):
    """
    Modelo para respuesta de meta
    
    Se usa para devolver información de la meta al cliente.
    """
    id: str
    user_id: str
    name: str
    description: Optional[str]
    category: GoalCategory
    target_amount: float
    current_amount: float
    target_date: date
    created_at: datetime
    updated_at: Optional[datetime]
    status: GoalStatus
    progress_percentage: float
    currency: str
    is_public: bool
    is_main: bool

class GoalUpdate(BaseModel):
    """
    Modelo para actualizar una meta existente
    """
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    category: Optional[GoalCategory] = None
    target_amount: Optional[float] = Field(None, gt=0)
    current_amount: Optional[float] = Field(None, ge=0)
    target_date: Optional[date] = None
    status: Optional[GoalStatus] = None
    is_public: Optional[bool] = None
    is_main: Optional[bool] = None
    
    @validator('target_amount')
    def validate_target_amount(cls, v):
        if v is not None and v <= 0:
            raise ValueError('El monto objetivo debe ser mayor a 0')
        return v
    
    @validator('target_date')
    def validate_target_date(cls, v):
        if v is not None and v <= date.today():
            raise ValueError('La fecha objetivo debe ser futura')
        return v

class GoalContribution(BaseModel):
    """
    Modelo para realizar un abono a una meta
    """
    amount: float = Field(..., gt=0, description="Monto del abono")
    description: Optional[str] = Field(None, max_length=200, description="Descripción del abono")
    contribution_date: Optional[date] = Field(None, description="Fecha del abono (opcional, por defecto fecha actual)")
    
    @validator('amount')
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError('El monto del abono debe ser mayor a 0')
        if v > 1000000000:  # 1 billón
            raise ValueError('El monto del abono no puede exceder $1.000.000.000')
        return v
    
    @validator('contribution_date')
    def validate_contribution_date(cls, v):
        if v is not None and v > date.today():
            raise ValueError('La fecha del abono no puede ser futura')
        return v

class GoalStats(BaseModel):
    """
    Modelo para estadísticas de metas
    """
    total_saved: float = 0.0
    active_goals_count: int = 0
    completed_goals_count: int = 0
    failed_goals_count: int = 0
    total_goals_count: int = 0
    average_progress: float = 0.0
    total_target_amount: float = 0.0

class GoalTrend(BaseModel):
    """
    Modelo para tendencias de metas
    """
    most_common_category: str
    average_savings: float
    average_savings_time_months: int
    popular_trends: list[str]

class MonthlySavings(BaseModel):
    """
    Modelo para ahorro mensual
    """
    month: str
    year: int
    amount: float
    goal_id: str
    goal_name: str

class MonthlyContribution(BaseModel):
    """
    Modelo para abono mensual
    """
    month: str
    year: int
    amount: float
    goal_id: str
    goal_name: str

class DailyContribution(BaseModel):
    """
    Modelo para abono diario (por día del mes)
    """
    day: int
    date: str
    amount: float
    goal_id: str
    goal_name: str
