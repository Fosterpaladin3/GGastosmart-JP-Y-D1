"""
Rutas de API para Reportes Financieros

Este archivo define los endpoints REST para la gestión de reportes
financieros en GastoSmart.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Optional
from datetime import datetime, date, timedelta
from bson import ObjectId

from database.connection import get_async_database
from database.report_operations import ReportOperations
from models.report import (
    MonthlySummary, ExpenseCategoryReport, DailyExpensesReport,
    IncomeTrendReport, SavingsEvolutionReport, FinancialReport,
    ReportType, ReportFilter, ReportStats, PDFExportRequest,
    PDFExportResponse, ReportSearchRequest, ReportSearchResult
)
from models.user import User
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/reports", tags=["reports"])

# Agregar manejador explícito de OPTIONS para debugging
@router.options("/{path:path}")
async def options_handler(path: str):
    """Manejador explícito de OPTIONS para debugging CORS"""
    print(f"DEBUG OPTIONS - Petición OPTIONS recibida para: /api/reports/{path}")
    return {"message": "OPTIONS OK"}

@router.get("/monthly-summary/{year}/{month}", response_model=MonthlySummary)
async def get_monthly_summary(
    year: int,
    month: int,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_async_database)
):
    """
    Obtiene resumen financiero mensual
    Implementa RQF-008: Resumen financiero mensual
    """
    print(f"DEBUG ENDPOINT - /monthly-summary llamado: year={year}, month={month}, user={current_user.get('id', 'N/A')}")
    
    if not (1 <= month <= 12):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El mes debe estar entre 1 y 12"
        )
    
    if year < 2020 or year > 2030:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El año debe estar entre 2020 y 2030"
        )
    
    try:
        report_ops = ReportOperations(db)
        summary = await report_ops.generate_monthly_summary(
            current_user["id"], year, month
        )
        print(f"DEBUG ENDPOINT - Summary generado correctamente: {summary.month}")
        return summary
    except Exception as e:
        print(f"DEBUG ENDPOINT - ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al generar resumen mensual: {str(e)}"
        )

@router.get("/expense-categories", response_model=ExpenseCategoryReport)
async def get_expense_categories_report(
    start_date: Optional[date] = Query(None, description="Fecha de inicio"),
    end_date: Optional[date] = Query(None, description="Fecha de fin"),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_async_database)
):
    """
    Obtiene reporte de gastos por categoría
    Implementa RQF-009: Gráfico de gastos por categoría
    """
    # Si no se proporcionan fechas, usar el mes actual
    if not start_date:
        start_date = date.today().replace(day=1)
    if not end_date:
        if start_date.month == 12:
            end_date = start_date.replace(year=start_date.year + 1, month=1) - timedelta(days=1)
        else:
            end_date = start_date.replace(month=start_date.month + 1) - timedelta(days=1)
    
    try:
        report_ops = ReportOperations(db)
        report = await report_ops.generate_expense_category_report(
            current_user["id"], start_date, end_date
        )
        return report
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al generar reporte de categorías: {str(e)}"
        )

@router.get("/daily-expenses", response_model=DailyExpensesReport)
async def get_daily_expenses_report(
    week_start: Optional[date] = Query(None, description="Inicio de la semana"),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_async_database)
):
    """Obtiene reporte de gastos diarios de una semana"""
    # Si no se proporciona fecha, usar la semana actual
    if not week_start:
        today = date.today()
        week_start = today - timedelta(days=today.weekday())
    
    try:
        report_ops = ReportOperations(db)
        report = await report_ops.generate_daily_expenses_report(
            current_user["id"], week_start
        )
        return report
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al generar reporte de gastos diarios: {str(e)}"
        )

@router.get("/income-trend", response_model=IncomeTrendReport)
async def get_income_trend_report(
    months: int = Query(8, ge=1, le=24, description="Número de meses a incluir"),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_async_database)
):
    """Obtiene reporte de tendencia de ingresos"""
    try:
        report_ops = ReportOperations(db)
        report = await report_ops.generate_income_trend_report(
            current_user["id"], months
        )
        return report
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al generar reporte de tendencia de ingresos: {str(e)}"
        )

@router.get("/savings-evolution", response_model=SavingsEvolutionReport)
async def get_savings_evolution_report(
    months: int = Query(8, ge=1, le=24, description="Número de meses a incluir"),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_async_database)
):
    """Obtiene reporte de evolución de ahorros"""
    try:
        report_ops = ReportOperations(db)
        report = await report_ops.generate_savings_evolution_report(
            current_user["id"], months
        )
        return report
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al generar reporte de evolución de ahorros: {str(e)}"
        )

@router.get("/comprehensive", response_model=dict)
async def get_comprehensive_report(
    year: int = Query(None, description="Año del reporte"),
    month: int = Query(None, description="Mes del reporte"),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_async_database)
):
    """Obtiene reporte completo con todos los datos"""
    # Si no se proporcionan fechas, usar el mes actual
    if not year:
        year = datetime.now().year
    if not month:
        month = datetime.now().month
    
    try:
        report_ops = ReportOperations(db)
        
        # Generar todos los reportes
        monthly_summary = await report_ops.generate_monthly_summary(
            current_user["id"], year, month
        )
        
        start_date = date(year, month, 1)
        if month == 12:
            end_date = date(year + 1, 1, 1) - timedelta(days=1)
        else:
            end_date = date(year, month + 1, 1) - timedelta(days=1)
        
        expense_categories = await report_ops.generate_expense_category_report(
            current_user["id"], start_date, end_date
        )
        
        # Usar lunes de la semana actual para gastos diarios
        today = date.today()
        week_start = today - timedelta(days=today.weekday())
        daily_expenses = await report_ops.generate_daily_expenses_report(
            current_user["id"], week_start
        )
        
        income_trend = await report_ops.generate_income_trend_report(
            current_user["id"], 8
        )
        
        savings_evolution = await report_ops.generate_savings_evolution_report(
            current_user["id"], 8
        )
        
        return {
            "monthly_summary": monthly_summary,
            "expense_categories": expense_categories,
            "daily_expenses": daily_expenses,
            "income_trend": income_trend,
            "savings_evolution": savings_evolution,
            "generated_at": datetime.now()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al generar reporte completo: {str(e)}"
        )

@router.get("/user-reports", response_model=List[FinancialReport])
async def get_user_reports(
    limit: int = Query(10, ge=1, le=50, description="Límite de reportes"),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_async_database)
):
    """Obtiene lista de reportes del usuario"""
    try:
        report_ops = ReportOperations(db)
        reports = await report_ops.get_user_reports(str(current_user["id"]), limit)
        return reports
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener reportes del usuario: {str(e)}"
        )

@router.post("/search", response_model=List[ReportSearchResult])
async def search_reports(
    search_request: ReportSearchRequest,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_async_database)
):
    """Busca reportes por criterios"""
    try:
        report_ops = ReportOperations(db)
        reports = await report_ops.search_reports(
            current_user["id"], 
            search_request.query,
            search_request.report_types
        )
        
        # Convertir a resultados de búsqueda
        search_results = []
        for report in reports:
            search_results.append(ReportSearchResult(
                report_id=str(report.id) if hasattr(report, 'id') else "",
                report_type=report.report_type,
                title=f"Reporte {report.report_type.value}",
                period=f"{report.period_start} - {report.period_end}",
                generated_at=report.generated_at,
                relevance_score=1.0  # Simplificado
            ))
        
        return search_results[:search_request.limit]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al buscar reportes: {str(e)}"
        )

@router.get("/stats", response_model=ReportStats)
async def get_report_stats(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_async_database)
):
    """Obtiene estadísticas de reportes del usuario"""
    try:
        report_ops = ReportOperations(db)
        stats = await report_ops.get_report_stats(str(current_user["id"]))
        return stats
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener estadísticas: {str(e)}"
        )

@router.post("/export/pdf", response_model=PDFExportResponse)
async def export_report_to_pdf(
    export_request: PDFExportRequest,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_async_database)
):
    """Exporta reporte a PDF"""
    try:
        report_ops = ReportOperations(db)
        financial_report = None
        
        # Generar el reporte según el tipo solicitado
        if export_request.report_type == ReportType.MONTHLY_SUMMARY:
            monthly_data = await report_ops.generate_monthly_summary(
                current_user["id"], 
                export_request.period_start.year, 
                export_request.period_start.month
            )
            financial_report = FinancialReport(
                user_id=current_user["id"],
                report_type=export_request.report_type,
                period_start=export_request.period_start,
                period_end=export_request.period_end,
                monthly_summary=monthly_data,
                is_exported=True,
                export_format="PDF"
            )
            
        elif export_request.report_type == ReportType.EXPENSE_CATEGORY:
            expense_data = await report_ops.generate_expense_category_report(
                current_user["id"],
                export_request.period_start,
                export_request.period_end
            )
            financial_report = FinancialReport(
                user_id=current_user["id"],
                report_type=export_request.report_type,
                period_start=export_request.period_start,
                period_end=export_request.period_end,
                expense_category_report=expense_data,
                is_exported=True,
                export_format="PDF"
            )
            
        elif export_request.report_type == ReportType.DAILY_EXPENSES:
            daily_data = await report_ops.generate_daily_expenses_report(
                current_user["id"],
                export_request.period_start
            )
            financial_report = FinancialReport(
                user_id=current_user["id"],
                report_type=export_request.report_type,
                period_start=export_request.period_start,
                period_end=export_request.period_end,
                daily_expenses_report=daily_data,
                is_exported=True,
                export_format="PDF"
            )
            
        elif export_request.report_type == ReportType.INCOME_TREND:
            income_data = await report_ops.generate_income_trend_report(
                current_user["id"],
                12  # Últimos 12 meses
            )
            financial_report = FinancialReport(
                user_id=current_user["id"],
                report_type=export_request.report_type,
                period_start=export_request.period_start,
                period_end=export_request.period_end,
                income_trend_report=income_data,
                is_exported=True,
                export_format="PDF"
            )
            
        elif export_request.report_type == ReportType.SAVINGS_EVOLUTION:
            savings_data = await report_ops.generate_savings_evolution_report(
                current_user["id"],
                8  # Últimos 8 meses
            )
            financial_report = FinancialReport(
                user_id=current_user["id"],
                report_type=export_request.report_type,
                period_start=export_request.period_start,
                period_end=export_request.period_end,
                savings_evolution_report=savings_data,
                is_exported=True,
                export_format="PDF"
            )
        
        # Guardar el reporte en la base de datos
        if financial_report:
            report_id = await report_ops.save_report(financial_report)
            
            # Generar nombre del archivo PDF
            file_name = f"reporte_{export_request.report_type.value}_{export_request.period_start}_{export_request.period_end}.pdf"
            
            return PDFExportResponse(
                file_url=f"/exports/{file_name}",
                file_name=file_name,
                file_size=1024000,  # 1MB simulado
                generated_at=datetime.now(),
                expires_at=datetime.now() + timedelta(days=7)
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tipo de reporte no soportado"
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al exportar reporte a PDF: {str(e)}"
        )

@router.delete("/{report_id}")
async def delete_report(
    report_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_async_database)
):
    """Elimina un reporte"""
    try:
        if not ObjectId.is_valid(report_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="ID de reporte inválido"
            )
        
        report_ops = ReportOperations(db)
        deleted = await report_ops.delete_report(report_id, str(current_user["id"]))
        
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Reporte no encontrado"
            )
        
        return {"message": "Reporte eliminado exitosamente"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al eliminar reporte: {str(e)}"
        )

@router.get("/categories", response_model=List[str])
async def get_expense_categories(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_async_database)
):
    """Obtiene lista de categorías de gastos disponibles"""
    try:
        # Obtener categorías únicas de las transacciones del usuario
        pipeline = [
            {"$match": {"user_id": str(current_user["id"]), "type": "expense"}},
            {"$group": {"_id": "$category"}},
            {"$sort": {"_id": 1}}
        ]
        
        categories = await db.transactions.aggregate(pipeline).to_list(length=None)
        return [cat["_id"] for cat in categories]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener categorías: {str(e)}"
        )

@router.get("/months-available", response_model=List[dict])
async def get_available_months(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_async_database)
):
    """Obtiene lista de meses con datos disponibles"""
    try:
        # Obtener meses únicos con transacciones
        pipeline = [
            {"$match": {"user_id": str(current_user["id"])}},
            {
                "$group": {
                    "_id": {
                        "year": {"$year": "$date"},
                        "month": {"$month": "$date"}
                    }
                }
            },
            {"$sort": {"_id.year": -1, "_id.month": -1}}
        ]
        
        months = await db.transactions.aggregate(pipeline).to_list(length=None)
        
        month_names = [
            "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        ]
        
        result = []
        for month_data in months:
            year = month_data["_id"]["year"]
            month = month_data["_id"]["month"]
            result.append({
                "year": year,
                "month": month,
                "month_name": month_names[month - 1],
                "display": f"{month_names[month - 1]} {year}"
            })
        
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener meses disponibles: {str(e)}"
        )
