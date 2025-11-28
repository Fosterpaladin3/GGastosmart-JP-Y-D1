"""
Modelo de Reportes Financieros para GastoSmart

Este archivo define el modelo de datos para los reportes financieros
en la aplicación GastoSmart.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from enum import Enum

class ReportType(str, Enum):
    """Tipos de reportes disponibles"""
    MONTHLY_SUMMARY = "monthly_summary"
    EXPENSE_CATEGORY = "expense_category"
    INCOME_TREND = "income_trend"
    SAVINGS_EVOLUTION = "savings_evolution"
    DAILY_EXPENSES = "daily_expenses"

class MonthlySummary(BaseModel):
    """
    Modelo para resumen financiero mensual
    Implementa el requerimiento RQF-008
    """
    month: str = Field(..., description="Mes del reporte (formato: YYYY-MM)")
    year: int = Field(..., description="Año del reporte")
    
    # Totales financieros
    total_income: float = Field(default=0.0, description="Total de ingresos del mes")
    total_expenses: float = Field(default=0.0, description="Total de gastos del mes")
    balance: float = Field(default=0.0, description="Balance neto (ingresos - gastos)")
    available_balance: float = Field(default=0.0, description="Saldo disponible")
    
    # Estadísticas adicionales
    savings_percentage: float = Field(default=0.0, description="Porcentaje de ahorro")
    transaction_count: int = Field(default=0, description="Número total de transacciones")
    income_count: int = Field(default=0, description="Número de ingresos")
    expense_count: int = Field(default=0, description="Número de gastos")
    
    # Cambios respecto al mes anterior
    income_change: float = Field(default=0.0, description="Cambio en ingresos (%)")
    expense_change: float = Field(default=0.0, description="Cambio en gastos (%)")
    balance_change: float = Field(default=0.0, description="Cambio en balance (%)")
    
    # Metadatos
    generated_at: datetime = Field(default_factory=datetime.now, description="Fecha de generación del reporte")
    currency: str = Field(default="COP", description="Moneda del reporte")

class ExpenseCategoryData(BaseModel):
    """
    Modelo para datos de gastos por categoría
    Implementa el requerimiento RQF-009
    """
    category: str = Field(..., description="Nombre de la categoría")
    amount: float = Field(..., description="Monto total gastado en esta categoría")
    percentage: float = Field(..., description="Porcentaje del total de gastos")
    transaction_count: int = Field(default=0, description="Número de transacciones en esta categoría")
    color: str = Field(default="#3b82f6", description="Color para representar la categoría en gráficos")

class ExpenseCategoryReport(BaseModel):
    """
    Reporte de gastos por categoría
    """
    period_start: date = Field(..., description="Fecha de inicio del período")
    period_end: date = Field(..., description="Fecha de fin del período")
    total_expenses: float = Field(default=0.0, description="Total de gastos en el período")
    categories: List[ExpenseCategoryData] = Field(default=[], description="Lista de categorías con sus datos")
    generated_at: datetime = Field(default_factory=datetime.now, description="Fecha de generación")

class DailyExpenseData(BaseModel):
    """
    Datos de gastos diarios
    """
    day: str = Field(..., description="Día de la semana")
    expense_date: date = Field(..., description="Fecha específica")
    amount: float = Field(default=0.0, description="Monto gastado en este día")
    transaction_count: int = Field(default=0, description="Número de transacciones")

class DailyExpensesReport(BaseModel):
    """
    Reporte de gastos diarios
    """
    week_start: date = Field(..., description="Inicio de la semana")
    week_end: date = Field(..., description="Fin de la semana")
    daily_data: List[DailyExpenseData] = Field(default=[], description="Datos por día")
    total_week_expenses: float = Field(default=0.0, description="Total de gastos de la semana")
    average_daily_expense: float = Field(default=0.0, description="Promedio diario de gastos")

class IncomeTrendData(BaseModel):
    """
    Datos de tendencia de ingresos
    """
    month: str = Field(..., description="Mes (formato: MMM)")
    year: int = Field(..., description="Año")
    amount: float = Field(default=0.0, description="Monto de ingresos del mes")
    transaction_count: int = Field(default=0, description="Número de transacciones de ingreso")

class IncomeTrendReport(BaseModel):
    """
    Reporte de tendencia de ingresos
    """
    period_start: date = Field(..., description="Fecha de inicio del período")
    period_end: date = Field(..., description="Fecha de fin del período")
    monthly_data: List[IncomeTrendData] = Field(default=[], description="Datos mensuales")
    total_income: float = Field(default=0.0, description="Total de ingresos en el período")
    average_monthly_income: float = Field(default=0.0, description="Promedio mensual de ingresos")
    growth_rate: float = Field(default=0.0, description="Tasa de crecimiento (%)")

class SavingsEvolutionData(BaseModel):
    """
    Datos de evolución de ahorros
    """
    month: str = Field(..., description="Mes (formato: MMM)")
    year: int = Field(..., description="Año")
    savings_amount: float = Field(default=0.0, description="Monto ahorrado acumulado")
    monthly_savings: float = Field(default=0.0, description="Ahorro del mes")
    savings_rate: float = Field(default=0.0, description="Tasa de ahorro del mes (%)")

class SavingsEvolutionReport(BaseModel):
    """
    Reporte de evolución de ahorros
    """
    period_start: date = Field(..., description="Fecha de inicio del período")
    period_end: date = Field(..., description="Fecha de fin del período")
    monthly_data: List[SavingsEvolutionData] = Field(default=[], description="Datos mensuales")
    total_savings: float = Field(default=0.0, description="Total ahorrado en el período")
    average_monthly_savings: float = Field(default=0.0, description="Promedio mensual de ahorro")
    savings_growth_rate: float = Field(default=0.0, description="Tasa de crecimiento de ahorros (%)")

class FinancialReport(BaseModel):
    """
    Reporte financiero completo
    """
    user_id: str = Field(..., description="ID del usuario")
    report_type: ReportType = Field(..., description="Tipo de reporte")
    period_start: date = Field(..., description="Fecha de inicio del período")
    period_end: date = Field(..., description="Fecha de fin del período")
    
    # Datos específicos según el tipo de reporte
    monthly_summary: Optional[MonthlySummary] = None
    expense_category_report: Optional[ExpenseCategoryReport] = None
    daily_expenses_report: Optional[DailyExpensesReport] = None
    income_trend_report: Optional[IncomeTrendReport] = None
    savings_evolution_report: Optional[SavingsEvolutionReport] = None
    
    # Metadatos
    generated_at: datetime = Field(default_factory=datetime.now, description="Fecha de generación")
    is_exported: bool = Field(default=False, description="Si el reporte ha sido exportado")
    export_format: Optional[str] = Field(None, description="Formato de exportación (PDF, Excel, etc.)")

class ReportFilter(BaseModel):
    """
    Filtros para generar reportes
    """
    start_date: Optional[date] = Field(None, description="Fecha de inicio")
    end_date: Optional[date] = Field(None, description="Fecha de fin")
    month: Optional[int] = Field(None, ge=1, le=12, description="Mes específico")
    year: Optional[int] = Field(None, ge=2020, le=2030, description="Año específico")
    categories: Optional[List[str]] = Field(None, description="Categorías específicas a incluir")
    transaction_types: Optional[List[str]] = Field(None, description="Tipos de transacción (income/expense)")

class ReportStats(BaseModel):
    """
    Estadísticas generales de reportes
    """
    total_reports_generated: int = Field(default=0, description="Total de reportes generados")
    last_report_date: Optional[datetime] = Field(None, description="Fecha del último reporte")
    most_requested_report: Optional[ReportType] = Field(None, description="Tipo de reporte más solicitado")
    average_generation_time: float = Field(default=0.0, description="Tiempo promedio de generación (segundos)")

class PDFExportRequest(BaseModel):
    """
    Solicitud de exportación a PDF
    """
    report_type: ReportType = Field(..., description="Tipo de reporte a exportar")
    period_start: date = Field(..., description="Fecha de inicio")
    period_end: date = Field(..., description="Fecha de fin")
    include_charts: bool = Field(default=True, description="Incluir gráficos en el PDF")
    include_details: bool = Field(default=True, description="Incluir detalles de transacciones")
    custom_title: Optional[str] = Field(None, description="Título personalizado para el reporte")

class PDFExportResponse(BaseModel):
    """
    Respuesta de exportación a PDF
    """
    file_url: str = Field(..., description="URL del archivo PDF generado")
    file_name: str = Field(..., description="Nombre del archivo")
    file_size: int = Field(..., description="Tamaño del archivo en bytes")
    generated_at: datetime = Field(default_factory=datetime.now, description="Fecha de generación")
    expires_at: Optional[datetime] = Field(None, description="Fecha de expiración del enlace")

class ReportSearchRequest(BaseModel):
    """
    Solicitud de búsqueda de reportes
    """
    query: str = Field(..., min_length=1, description="Término de búsqueda")
    report_types: Optional[List[ReportType]] = Field(None, description="Tipos de reporte a buscar")
    date_range: Optional[Dict[str, date]] = Field(None, description="Rango de fechas")
    limit: int = Field(default=10, ge=1, le=100, description="Límite de resultados")

class ReportSearchResult(BaseModel):
    """
    Resultado de búsqueda de reportes
    """
    report_id: str = Field(..., description="ID del reporte")
    report_type: ReportType = Field(..., description="Tipo de reporte")
    title: str = Field(..., description="Título del reporte")
    period: str = Field(..., description="Período del reporte")
    generated_at: datetime = Field(..., description="Fecha de generación")
    relevance_score: float = Field(default=0.0, description="Puntuación de relevancia")
