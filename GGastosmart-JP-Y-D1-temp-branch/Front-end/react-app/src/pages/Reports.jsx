import React, { useState, useEffect, useRef } from 'react'
import { format, set } from 'date-fns'
import { es, ht } from 'date-fns/locale'
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, AreaChart, Area, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts'
import DashboardLayout from '../components/DashboardLayout'
import { useBalance } from '../contexts/BalanceContext'
import { apiService } from '../services/apiService'
import { CardSkeleton, ChartSkeleton } from '../components/Skeleton'
import EmptyState from '../components/EmptyState'
import { formatCurrency } from '../config/config'
import './Reports.css'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

const Reports = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [searchQuery, setSearchQuery] = useState('')
  const { balance: globalBalance, refreshBalance } = useBalance()

  useEffect(() => {
    refreshBalance?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadReportsData();
  }, [selectedMonth, selectedYear])

  // Estados para los datos de reportes
  const [monthlySummary, setMonthlySummary] = useState(null)
  const [expenseCategories, setExpenseCategories] = useState([])
  const [expensesByCategory, setExpensesByCategory] = useState([]) // Nueva: gastos por categoría (barras)
  const [dailyExpenses, setDailyExpenses] = useState([])
  const [incomeTrend, setIncomeTrend] = useState([])
  const [savingsEvolution, setSavingsEvolution] = useState([])
  const pdfRef = useRef(null) // Contenedor a exportar (Resumen Mensual + gráficas)

  const MONTHS_ES_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  
  const buildYearSeries = (year, items, {  
    monthKey = 'month',   // 'Ene','Feb',...
    yearKey  = 'year',    // 2025
    valueKey = 'amount'   // valor por mes
  } = {}) => {
    const idx = Object.create(null);
    (items || []).forEach(it => {
    const m = it[monthKey];
    const y = it[yearKey];
    if (!m || y == null) return;
    idx[`${y}-${m}`] = it[valueKey] ?? 0;
    });

    return MONTHS_ES_SHORT.map(m => ({
      month: m,
      year,
      amount: idx[`${year}-${m}`] ?? 0, // 0 si no hay dato
    }));
  };

  
  // Colores de la paleta
  const COLORS = ['#10b981', '#f59e0b'] // Verde y naranja

  const getMonthRange = (year, month) => {
    const start = new Date(year, month - 1, 1)
    const endInclusive = new Date(year, month, 0); // último día real del mes
    const toISO = (d) => (
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    );
    return{
      startStr: toISO(start),
      endStr: toISO(endInclusive),
      weekStartStr: toISO(start),
    }
  }

  const loadReportsData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { startStr, endStr, weekStartStr } = getMonthRange(selectedYear, selectedMonth)

      const [summary, categories, daily, income, savingsGoals] = await Promise.all([
        apiService.reports.getMonthlySummary(selectedYear, selectedMonth),
        apiService.reports.getExpenseCategories(startStr, endStr),
        apiService.reports.getDailyExpenses(weekStartStr),
        apiService.reports.getIncomeTrend(12), // Últimos 12 meses para vista anual
        apiService.goals.getMonthlySavings(6)
      ])
      
      console.log('Reports - Datos cargados:')
      console.log('Reports - summary:', summary)
      console.log('Reports - categories:', categories)
      console.log('Reports - daily:', daily)
      console.log('Reports - income:', income)
      console.log('Reports - savingsGoals:', savingsGoals)
      
      setMonthlySummary(summary)
      
      // El backend devuelve ExpenseCategoryReport con un campo categories
      const categoriesData = categories?.categories || []
      console.log('Reports - categoriesData extraído:', categoriesData)
      setExpenseCategories(categoriesData)
      setExpensesByCategory(categoriesData)
      
      // El backend devuelve DailyExpensesReport con un campo daily_data
      const dailyData = daily?.daily_data || []
      console.log('Reports - dailyData extraído:', dailyData)
      setDailyExpenses(dailyData)
      
      // El backend devuelve IncomeTrendReport con un campo monthly_data
      const incomeData = income?.monthly_data || []
      console.log('Reports - incomeData extraído:', incomeData)
      setIncomeTrend(incomeData)
      
      // Igual que Metas: usar la respuesta tal cual (month, amount)
      console.log('Reports - ahorro mensual (últimos meses):', savingsGoals);
      setSavingsEvolution(savingsGoals);

    } catch (err) {
      setError(err.message)
      console.error('Error cargando reportes:', err)
      // Mantener estados vacíos para mostrar empty states
      setMonthlySummary(null)
      setExpenseCategories([])
      setExpensesByCategory([])
      setDailyExpenses([])
      setIncomeTrend([])
      setSavingsEvolution([])
    } finally {
      setLoading(false)
    }
  }

  const handleMonthChange = (month) => {
    setSelectedMonth(parseInt(month))
  }

  const handleYearChange = (year) => {
    setSelectedYear(parseInt(year))
  }

  const handleSearch = (query) => {
    setSearchQuery(query)
    // Aquí se implementaría la búsqueda de reportes
  }

  const handleExportPDF = async () => {
    try {
      if (!pdfRef.current) return;
      // una pequeña pausa para asegurar el renderizado completo de las gráficas
      await new Promise (r => setTimeout(r, 50));
      
      const canvas = await html2canvas(pdfRef.current, {
        scale: 2, // Mejor resolución
        backgroundColor: '#fff', // Fondo blanco
        useCORS: true,
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()

      const pxToMm = (px) => px * 0.264583
      const imgWmm = pxToMm(canvas.width)
      const imgHmm = pxToMm(canvas.height)
      const ratio = Math.min(pageW / imgWmm, pageH / imgHmm)
      const drawW = imgWmm * ratio
      const drawH = imgHmm * ratio
      const offsetX = (pageW - drawW) / 2
      const offsetY = (pageH - drawH) / 2

      pdf.addImage(imgData, 'PNG', offsetX, offsetY, drawW, drawH)

      const now = new Date()
      const yyyy = now.getFullYear()
      const mm = String(now.getMonth() + 1).padStart(2, '0')
      pdf.save(`ResumenMensual_${yyyy}-${mm}.pdf`)
    } catch (err) {
      setError('Error al exportar reporte')
    }
  }

  if (loading) {
    return (
      <DashboardLayout hideBudget={true}>
        <div className="reports-container">
          <div className="page-header">
            <h1>Reportes</h1>
          </div>
          <CardSkeleton />
          <div className="charts-grid">
            <ChartSkeleton />
            <ChartSkeleton />
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout hideBudget={true}>
      <div className="reports-container">
        {/* Header */}
        <div className="page-header">
          <h1>Reportes</h1>
        </div>

        {/* Error Message */}
        {error && (
          <div className="error-message">
            <i className="icon-warning"></i>
            {error}
          </div>
        )}

        {/* Top Controls */}
        <div className="reports-controls">
          <div className="controls-left">
            <select 
              className="month-selector"
              value={selectedMonth}
              onChange={(e) => handleMonthChange(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db', marginRight: '0.5rem' }}
            >
              <option value="1">Enero</option>
              <option value="2">Febrero</option>
              <option value="3">Marzo</option>
              <option value="4">Abril</option>
              <option value="5">Mayo</option>
              <option value="6">Junio</option>
              <option value="7">Julio</option>
              <option value="8">Agosto</option>
              <option value="9">Septiembre</option>
              <option value="10">Octubre</option>
              <option value="11">Noviembre</option>
              <option value="12">Diciembre</option>
            </select>

            <select 
              className="year-selector"
              value={selectedYear}
              onChange={(e) => handleYearChange(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db' }}
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          
          <button className="btn-generate-pdf" onClick={handleExportPDF}>
            <i className="icon-document"></i>
            Generar PDF
          </button>
        </div>
        

        {/* Contenido a exportar (Resumen Mensual + TODAS las gráficas) */}
        <div ref={pdfRef} id="pdf-capture" style={{ backgroundColor: '#fff' }}>
        {/* Monthly Summary Card - Resumen Mensual */}
        {monthlySummary ? (
          <div className="monthly-summary-card" style={{ 
            backgroundColor: '#fff', 
            borderRadius: '12px', 
            padding: '1.5rem', 
            marginBottom: '2rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: '600' }}>
              Resumen Mensual - {new Date(selectedYear, selectedMonth - 1).toLocaleString('es', { month: 'long', year: 'numeric' })}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
              <div className="summary-item">
                <div style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Total de Ingresos</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#10b981' }}>
                  {formatCurrency(monthlySummary.total_income || 0)}
                </div>
              </div>
              
              <div className="summary-item">
                <div style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Total de Gastos</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#ef4444' }}>
                  {formatCurrency(monthlySummary.total_expenses || 0)}
                </div>
              </div>
              
              <div className="summary-item">
                <div style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Balance Neto</div>
                <div style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: '700', 
                  color: (globalBalance ?? 0) >= 0 ? '#10b981' : '#ef4444' 
                }}>
                  {formatCurrency(globalBalance ?? 0)}
                </div>
              </div>
              
              <div className="summary-item">
                <div style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Porcentaje de Ahorro</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#f59e0b' }}>
                  {(() => {
                    const income = monthlySummary?.total_income ?? 0;
                    const expenses = monthlySummary?.total_expenses ?? 0;
                    const monthlySavings = Math.max(0, income - expenses);
                    const positiveBalance = Math.max(0, globalBalance ?? 0);
                    
                    const base = income + positiveBalance;

                    const savingsWithBalance = income + positiveBalance - expenses;
                    
                    const percentage = base > 0
                      ? Math.min(100, Math.max(0, (savingsWithBalance / base) * 100))
                      : 0;

                    return `${percentage.toFixed(1)}%`;
                  })()}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <EmptyState
            message="Aún no tienes transacciones registradas para este mes"
            icon="📊"
          />
        )}

        {/* Charts Grid */}
        <div className="charts-grid">
          {/* Daily Expenses Chart - Días con mayores gastos */}
          <div className="chart-card">
            <h3>Días con mayores gastos</h3>
            <div className="chart-subtitle" style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
              {new Date(selectedYear, selectedMonth - 1).toLocaleString('es', { month: 'long', year: 'numeric' })}
            </div>
            <div className="chart-container" style={{ height: '300px' }}>
              {dailyExpenses && dailyExpenses.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyExpenses} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" label={{ value: 'Día del mes', position: 'insideBottom', offset: -5 }} />
                    <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                    <Tooltip 
                      formatter={(value) => [formatCurrency(value), 'Gasto']}
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '8px' }}
                    />
                    <Legend />
                    <Bar dataKey="amount" fill="#f59e0b" name="Gastos diarios" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  No hay datos de gastos diarios este mes
                </div>
              )}
            </div>
          </div>

          {/* Income Trend Chart - Ingresos anuales */}
          <div className="chart-card">
            <h3>Ingresos</h3>
            <div className="chart-subtitle" style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
              Tendencia anual de ingresos
            </div>
            <div className="chart-container" style={{ height: '300px' }}>
              {incomeTrend && incomeTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={incomeTrend} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                    <Tooltip 
                      formatter={(value) => [formatCurrency(value), 'Ingreso']}
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '8px' }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="#10b981" 
                      strokeWidth={3}
                      name="Ingresos mensuales"
                      dot={{ fill: '#10b981', r: 6, strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  No hay datos de ingresos
                </div>
              )}
            </div>
          </div>

          {/* Expense Distribution Chart - Distribución de gastos (Pie Chart) */}
          <div className="chart-card">
            <h3>Distribución de gastos</h3>
            <div className="chart-subtitle" style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
              Porcentaje por categoría
            </div>
            <div className="chart-container" style={{ height: '300px' }}>
              {expenseCategories && expenseCategories.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseCategories}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ category, percentage }) => `${category}: ${percentage.toFixed(1)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="percentage"
                    >
                      {expenseCategories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  No hay datos de distribución de gastos
                </div>
              )}
            </div>
          </div>

          {/* Savings Evolution Chart - Evolución de ahorro (Area Chart) */}
          <div className="chart-card">
            <h3>Evolución de Ahorro</h3>
            <div className="chart-subtitle" style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
              Últimos 6 meses
            </div>
            <div className="chart-container" style={{ height: '300px' }}>
              {savingsEvolution && savingsEvolution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={savingsEvolution} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis domain={[0, 'auto']} tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                    <Tooltip 
                      formatter={(value) => [formatCurrency(value), 'Ahorro del mes']}
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '8px' }}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorSavings)" 
                      name="Ahorro mensual"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  No hay datos de ahorro mensual
                </div>
              )}
            </div>
          </div>

          {/* NEW: Gastos por Categoría (Bar Chart) */}
          <div className="chart-card">
            <h3>Gastos por categoría</h3>
            <div className="chart-subtitle" style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
              Identificación de categorías con mayor consumo
            </div>
            <div className="chart-container" style={{ height: '300px' }}>
              {expensesByCategory && expensesByCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={expensesByCategory} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" angle={-45} textAnchor="end" height={100} />
                    <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                    <Tooltip 
                      formatter={(value) => [formatCurrency(value), 'Monto']}
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '8px' }}
                    />
                    <Legend />
                    <Bar dataKey="amount" name="Gasto por categoría" radius={[8, 8, 0, 0]}>
                      {expensesByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  No hay datos de gastos por categoría
                </div>
              )}
            </div>
          </div>
        </div>
      </div>  
    </div>
    </DashboardLayout>
  )
}

export default Reports