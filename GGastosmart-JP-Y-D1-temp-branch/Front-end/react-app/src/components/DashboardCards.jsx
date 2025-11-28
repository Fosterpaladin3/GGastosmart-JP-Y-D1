import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useBalance } from '../contexts/BalanceContext'
import { apiService } from '../services/apiService'

const DashboardCards = () => {
  const { user } = useAuth()
  const { balance: globalBalance, refreshBalance } = useBalance()
  const [stats, setStats] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  // Formatear número con puntos de miles
  const formatCurrency = (number) => {
    if (!number) return '0'
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  }

  // Cargar datos desde el backend
  useEffect(() => {
    const loadData = async () => {
      try {
        // Verificar si hay token antes de hacer peticiones
        const token = sessionStorage.getItem('token') || localStorage.getItem('token')
        if (!token) {
          setLoading(false)
          return
        }
        
        setLoading(true)
        
        // Obtener estadísticas de metas (incluye total_saved)
        const goalsStats = await apiService.goals.getStats()
        
        // Obtener transacciones para calcular ingresos y gastos
        const transactionsData = await apiService.transactions.getTransactions()
        
        setStats(goalsStats)
        setTransactions(transactionsData)
        
        // Refrescar saldo global
        await refreshBalance()
      } catch (error) {
        // Si es error 401, no reintentar
        if (error.response?.status === 401) {
          return
        }
      } finally {
        setLoading(false)
      }
    }

    loadData()
    
    // Recargar cada 30 segundos solo si hay token
    const interval = setInterval(() => {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token')
      if (token) {
        loadData()
      }
    }, 30000)
    
    return () => clearInterval(interval)
  }, [refreshBalance])

  // Calcular valores
  const budget = user?.initial_budget || 0
  
  // Calcular ingresos y gastos desde transacciones (usar campo "type" del backend)
  const income = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)
  
  const expense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)
  
  // Ahorro total (para mostrar) = SOLO abonos a metas con categoría "Ahorros"
  const savingsContributions = transactions
    .filter(t => t.type === 'goal_contribution' && t.category === 'Ahorros')
    .reduce((sum, t) => sum + t.amount, 0)
  
  // Usar saldo global del contexto
  const balance = globalBalance
  
  // Ahorro Total (para mostrar en card) = solo categoría "Ahorros"
  const totalSavings = savingsContributions
  
  // Calcular tendencia (comparar con mes anterior - por ahora simulado)
  const balanceTrend = balance > 0 ? '+3.2%' : '-2.1%'
  const savingsTrend = totalSavings > 0 ? '+1.8%' : '0%'

  return (
    <div className="dashboard-cards">
      {/* Total Balance Card */}
      <div className="dashboard-card card-balance">
        <div className="card-header">
          <h3 className="card-title">Saldo Total</h3>
          <span className={`card-trend ${balance >= 0 ? 'positive' : 'negative'}`}>
            {balance >= 0 ? '↑' : '↓'} {balanceTrend}
          </span>
        </div>
        <div className="card-content">
          <div className="card-amount">CO ${formatCurrency(Math.abs(balance))}</div>
          <div className="card-details">
            <span className="detail-item income">
              Ingreso <span className="amount">${formatCurrency(budget + income)}</span>
            </span>
            <span className="detail-item expense">
              Gasto <span className="amount">${formatCurrency(expense)}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Total Savings Card */}
      <div className="dashboard-card card-savings">
        <div className="card-header">
          <h3 className="card-title">Ahorro Total</h3>
          <span className={`card-trend ${totalSavings > 0 ? 'positive' : 'neutral'}`}>
            {totalSavings > 0 ? '↑' : '→'} {savingsTrend}
          </span>
        </div>
        <div className="card-content">
          <div className="card-amount">CO ${formatCurrency(totalSavings)}</div>
        </div>
        <div className="card-chart">
          {/* Placeholder for chart - se implementará con datos reales */}
        </div>
      </div>
    </div>
  )
}

export default DashboardCards