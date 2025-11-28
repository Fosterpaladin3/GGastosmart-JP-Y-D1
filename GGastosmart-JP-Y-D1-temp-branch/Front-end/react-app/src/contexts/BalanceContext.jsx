import React, { createContext, useContext, useState, useEffect } from 'react'
import { apiService } from '../services/apiService'

const BalanceContext = createContext()

export const useBalance = () => {
  const context = useContext(BalanceContext)
  if (!context) {
    throw new Error('useBalance debe usarse dentro de BalanceProvider')
  }
  return context
}

export const BalanceProvider = ({ children }) => {
  const [balance, setBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)

  // Función para calcular el saldo disponible
  const calculateBalance = async () => {
    try {
      setLoading(true)
      
      // Verificar si hay token antes de hacer peticiones
      const token = sessionStorage.getItem('token') || localStorage.getItem('token')
      if (!token) {
        setBalance(0)
        setLoading(false)
        return
      }
      
      // Obtener usuario y presupuesto inicial (primero sessionStorage, luego localStorage)
      const userDataSession = sessionStorage.getItem('user')
      const userDataLocal = localStorage.getItem('user')
      const user = JSON.parse(userDataSession || userDataLocal || '{}')
      
      if (!user || !user.id) {
        setBalance(0)
        setLoading(false)
        return
      }
      
      const initialBudget = user.initial_budget || 0
      
      // Obtener todas las transacciones
      const transactions = await apiService.transactions.getTransactions()
      
      console.log('BalanceContext - Transacciones cargadas:', transactions.length)
      console.log('BalanceContext - Presupuesto inicial:', initialBudget)
      
      // Calcular ingresos (usar campo "type" que viene del backend)
      const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0)
      
      console.log('BalanceContext - Ingresos totales:', income)
      
      // Calcular gastos
      const expenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0)
      
      console.log('BalanceContext - Gastos totales:', expenses)
      
      // Calcular TODOS los abonos a metas
      const goalContributions = transactions
        .filter(t => t.type === 'goal_contribution')
        .reduce((sum, t) => sum + t.amount, 0)
      
      console.log('BalanceContext - Abonos a metas:', goalContributions)
      
      // Saldo disponible = presupuesto + ingresos - gastos - abonos
      const newBalance = initialBudget + income - expenses - goalContributions
      
      console.log('BalanceContext - Balance calculado:', newBalance)
      
      setBalance(newBalance)
      setLastUpdate(new Date())
      
    } catch (error) {
      setBalance(0)
    } finally {
      setLoading(false)
    }
  }

  // Calcular saldo al montar el componente
  useEffect(() => {
    calculateBalance()
  }, [])

  // Función para refrescar el saldo manualmente
  const refreshBalance = () => {
    return calculateBalance()
  }

  const value = {
    balance,
    loading,
    lastUpdate,
    refreshBalance,
    calculateBalance
  }

  return (
    <BalanceContext.Provider value={value}>
      {children}
    </BalanceContext.Provider>
  )
}

export default BalanceContext
