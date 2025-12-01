import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import DashboardLayout from '../components/DashboardLayout'
import { apiService } from '../services/apiService'
import { CardSkeleton, ListSkeleton } from '../components/Skeleton'
import EmptyState from '../components/EmptyState'
import { formatCurrency } from '../config/config'
import { useAuth } from '../contexts/AuthContext'
import { useBalance } from '../contexts/BalanceContext'
import RecommendationsModal from "../components/RecommendationsModal.jsx";
import Alertas from "../components/Alertas"; // <-- IMPORTADO
import './IncomeExpenses.css'

const IncomeExpenses = () => {
  const { user } = useAuth()
  const { balance: globalBalance, refreshBalance } = useBalance()
  const [incomeTransactions, setIncomeTransactions] = useState([])
  const [expenseTransactions, setExpenseTransactions] = useState([])
  const [monthlySummary, setMonthlySummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState(null)
  const [transactionType, setTransactionType] = useState('income')
  const [amountValue, setAmountValue] = useState('')
  // estado para controlar el modal (usar el nombre que usas en el JSX)
  const [showRecs, setShowRecs] = useState(false);

  // funciones para abrir/cerrar
  const openRecs = () => setShowRecs(true);
  const closeRecs = () => setShowRecs(false);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm()

  // Income categories matching the prototype
  const incomeCategories = [
    'Salario',
    'Freelance', 
    'Inversiones',
    'Ventas',
    'Bonificaciones',
    'Otros ingresos'
  ]

  // Expense categories matching the prototype
  const expenseCategories = [
    'Alimentación',
    'Transporte',
    'Vivienda',
    'Entretenimiento',
    'Salud',
    'Educación',
    'Ropa',
    'Servicios',
    'Otros gastos'
  ]

  // Load data on component mount
  useEffect(() => {
    loadData()
  }, [])

  // FUNCION AUXILIAR: obtener rango del mes actual en ISO para pasar al componente Alertas
  const getCurrentMonthRangeISO = () => {
    const currentDate = new Date()
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth() + 1
    const dateFrom = new Date(year, month - 1, 1) // Primer día del mes
    const dateTo = new Date(year, month, 0, 23, 59, 59, 999) // Último día del mes (hasta final del día)
    return {
      dateFrom: dateFrom.toISOString(),
      dateTo: dateTo.toISOString()
    }
  }

  // Función para formatear números con separador de miles (formato colombiano)
  const formatNumberWithThousands = (value) => {
    if (!value) return ''
    
    // Remover todo excepto números y coma decimal
    let numericValue = value.toString().replace(/[^\d,]/g, '')
    
    // Si hay más de una coma, mantener solo la última
    const commaCount = (numericValue.match(/,/g) || []).length
    if (commaCount > 1) {
      const lastCommaIndex = numericValue.lastIndexOf(',')
      numericValue = numericValue.substring(0, lastCommaIndex).replace(/,/g, '') + numericValue.substring(lastCommaIndex)
    }
    
    // Separar parte entera y decimal
    const parts = numericValue.split(',')
    
    // Formatear parte entera con separador de miles (punto)
    if (parts[0]) {
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    }
    
    // Reunir las partes (máximo 2 decimales)
    if (parts.length > 1) {
      return parts[0] + ',' + parts[1].slice(0, 2)
    }
    
    return parts[0] || ''
  }

  // Función para convertir valor formateado a número
  const parseFormattedNumber = (formattedValue) => {
    if (!formattedValue) return 0
    // Remover separadores de miles (puntos) y cambiar coma decimal por punto
    return parseFloat(formattedValue.replace(/\./g, '').replace(',', '.')) || 0
  }

  // Manejar cambios en el campo de monto
  const handleAmountChange = (e) => {
    const inputValue = e.target.value
    const formattedValue = formatNumberWithThousands(inputValue)
    setAmountValue(formattedValue)
    
    // Actualizar el campo hidden para validación en tiempo real
    const parsedValue = parseFormattedNumber(formattedValue)
    setValue('amount', parsedValue)
  }

  // Usar el balance global del contexto
  const calculateCurrentBalance = () => {
    return globalBalance
  }

  // Calcular el total de gastos basado en las transacciones locales
  const calculateTotalExpenses = () => {
    return expenseTransactions.reduce((sum, transaction) => sum + transaction.amount, 0)
  }

  // Calcular el total de ingresos basado en las transacciones locales
  const calculateTotalIncome = () => {
    return incomeTransactions.reduce((sum, transaction) => sum + transaction.amount, 0)
  }

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const currentDate = new Date()
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth() + 1
      
      // Crear fechas para el período mensual actual
      const dateFrom = new Date(year, month - 1, 1) // Primer día del mes
      const dateTo = new Date(year, month, 0) // Último día del mes
      
      const [stats, transactions] = await Promise.all([
        apiService.transactions.getStats(dateFrom.toISOString(), dateTo.toISOString()),
        apiService.transactions.getTransactions({ limit: 50 })
      ])
      
      setMonthlySummary(stats)
      
      // Asegurar que transactions sea un array
      const transactionsArray = Array.isArray(transactions) ? transactions : []
      
      // Separar por tipo
      const incomes = transactionsArray.filter(t => t.type === 'income')
      const expenses = transactionsArray.filter(t => t.type === 'expense')
      
      setIncomeTransactions(incomes)
      setExpenseTransactions(expenses)
      
    } catch (err) {
      setError(err.message)
      console.error('Error cargando transacciones:', err)
      setIncomeTransactions([])
      setExpenseTransactions([])
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data) => {
    try {
      setSaving(true)
      setError(null)
      
      // Validar que el monto sea válido
      const parsedAmount = parseFormattedNumber(amountValue)
      if (!parsedAmount || parsedAmount <= 0) {
        setError('El monto debe ser mayor a 0')
        setSaving(false)
        return
      }
      
      // Actualizar el valor del campo hidden para validación
      setValue('amount', parsedAmount)
      
      const transactionData = {
        type: transactionType,
        amount: parsedAmount,
        category: data.category,
        description: data.description || '',
        date: new Date(data.date).toISOString()
      }
      
      console.log('Guardando transacción:', transactionData)
      
      // Guardar la transacción
      if (editingTransaction) {
        await apiService.transactions.update(editingTransaction.id, transactionData)
      } else {
        await apiService.transactions.create(transactionData)
      }
      
      // Cerrar el formulario inmediatamente para mejorar la experiencia del usuario
      setShowAddForm(false)
      setEditingTransaction(null)
      setAmountValue('') // Limpiar el valor formateado
      reset()
      
      // Recargar datos después de cerrar el formulario
      await loadData()
      
      // Refrescar saldo global
      await refreshBalance()
      
    } catch (err) {
      console.error('Error guardando transacción:', err)
      setError(err.message || 'Error al guardar la transacción. Intente nuevamente.')
      // Mantener el formulario abierto en caso de error
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction)
    setTransactionType(transaction.type)
    const formattedAmount = formatNumberWithThousands(transaction.amount.toString())
    setAmountValue(formattedAmount)
    setValue('amount', transaction.amount)
    setValue('category', transaction.category)
    setValue('description', transaction.description || '')
    setValue('date', format(new Date(transaction.date), 'yyyy-MM-dd'))
    setShowAddForm(true)
  }

  const handleDelete = async (transactionId) => {
    if (!window.confirm('¿Estás seguro de eliminar esta transacción?')) {
      return
    }
    
    try {
      setError(null)
      await apiService.transactions.delete(transactionId)
      await loadData()
      
      // Refrescar saldo global
      await refreshBalance()
    } catch (err) {
      setError(err.message)
      console.error('Error eliminando transacción:', err)
    }
  }

  const handleCancel = () => {
    reset()
    setAmountValue('')
    setShowAddForm(false)
    setEditingTransaction(null)
    setError(null)
  }


  if (loading) {
    return (
      <DashboardLayout hideBudget={true}>
        <div className="income-expenses-container">
          <div className="page-header">
            <h1>Ingresos/Gastos</h1>
          </div>
          <CardSkeleton />
          <div className="income-expense-grid">
            <ListSkeleton count={5} />
            <ListSkeleton count={5} />
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // Obtener rango del mes actual para pasar como props a Alertas
  const { dateFrom, dateTo } = getCurrentMonthRangeISO()

  return (
    <DashboardLayout hideBudget={true}>
      <div className="income-expenses-container">
        {/* Header */}
        <div className="page-header">
          <h1>Gestión de ingresos y gastos</h1>
        </div>

        {/* Error Message */}
        {error && (
          <div className="error-message">
            <i className="icon-warning"></i>
            {error}
          </div>
        )}

        {/* Balance Card - Full Width */}
        <div className="balance-section">
          <div className="balance-card">
            <h3>Balance mensual Actual</h3>
            <div className="balance-content">
              <div className="balance-amount">
                {formatCurrency(calculateCurrentBalance())}
                <span className="balance-change positive">
                  <i className="icon-arrow-up"></i>
                  +3.3%
                </span>
              </div>
              <div className="balance-actions">
                <button
                  id="recomendaciones-btn"
                  className="btn-recommendations"
                  onClick={() => setShowRecs(true)}
                  style={{ background: "#111", color:"#fff", padding: "8px 14px", borderRadius: 6, border: "none" }}
                >
                  Recomendaciones
                  <span className="notification-badge">2</span>
                </button>

                <RecommendationsModal open={showRecs} onClose={() => setShowRecs(false)} />

                {/* REEMPLAZADO: botón Alertas nativo --> componente Alertas */}
                <Alertas
                  dateFrom={dateFrom}
                  dateTo={dateTo}
                  endpoint="/api/transactions/stats/summary"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Income and Expense Cards - Side by Side */}
        <div className="income-expense-grid">
          {/* Income Card */}
          <div className="income-card">
            <h3>Ingreso mensual Actual</h3>
            <div className="income-content">
              {incomeTransactions.length === 0 ? (
                <EmptyState
                  message="Aún no tienes ingresos registrados"
                  icon="💰"
                  action={
                    <button onClick={() => {
                      setTransactionType('income')
                      setShowAddForm(true)
                      setEditingTransaction(null)
                      setAmountValue('')
                      reset()
                    }}>
                      Añadir primer ingreso
                    </button>
                  }
                />
              ) : (
                <>
                  <div className="income-amount">
                    {formatCurrency(calculateTotalIncome())}
                    <span className="income-change positive">
                      <i className="icon-arrow-up"></i>
                      +{monthlySummary?.income_change || 0}%
                    </span>
                  </div>
                  <p className="data-subtitle">Datos registrados</p>
                  
                  <div className="income-items">
                    {incomeTransactions.slice(0, 5).map((transaction) => (
                      <div key={transaction.id} className="income-item">
                        <span className="item-category">{transaction.category}</span>
                        <span className="item-amount">+{formatCurrency(transaction.amount)}</span>
                        <div className="item-actions">
                          <button onClick={() => handleEdit(transaction)}>✏️</button>
                          <button onClick={() => handleDelete(transaction.id)}>🗑️</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="total-income">
                    Total ingresos: {formatCurrency(calculateTotalIncome())}
                  </div>
                  
                  <div className="card-actions">
                    <button 
                      className="btn-add-income"
                      onClick={() => {
                        setTransactionType('income')
                        setShowAddForm(true)
                        setEditingTransaction(null)
                        setAmountValue('')
                        reset()
                      }}
                    >
                      <i className="icon-plus"></i>
                      Añadir Ingreso
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Expense Card */}
          <div className="expense-card">
            <h3>Gasto mensual Actual</h3>
            <div className="expense-content">
              {expenseTransactions.length === 0 ? (
                <EmptyState
                  message="Aún no tienes gastos registrados"
                  icon="💸"
                  action={
                    <button onClick={() => {
                      setTransactionType('expense')
                      setShowAddForm(true)
                      setEditingTransaction(null)
                      setAmountValue('')
                      reset()
                    }}>
                      Añadir primer gasto
                    </button>
                  }
                />
              ) : (
                <>
                  <div className="expense-amount">
                    {formatCurrency(calculateTotalExpenses())}
                    <span className={`expense-change ${(monthlySummary?.expense_change || 0) < 0 ? 'positive' : 'negative'}`}>
                      <i className={`icon-arrow-${(monthlySummary?.expense_change || 0) < 0 ? 'down' : 'up'}`}></i>
                      {monthlySummary?.expense_change || 0}%
                    </span>
                  </div>
                  <p className="data-subtitle">Datos registrados</p>
                  
                  <div className="expense-items">
                    {expenseTransactions.slice(0, 5).map((transaction) => (
                      <div key={transaction.id} className="expense-item">
                        <span className="item-category">{transaction.category}</span>
                        <span className="item-amount">-{formatCurrency(transaction.amount)}</span>
                        <div className="item-actions">
                          <button onClick={() => handleEdit(transaction)}>✏️</button>
                          <button onClick={() => handleDelete(transaction.id)}>🗑️</button>
                        </div>
                      </div>
                    ))} 
                  </div>
                  
                  <div className="total-expense">
                    Total gastos: {formatCurrency(calculateTotalExpenses())}
                  </div>
                  
                  <div className="card-actions">
                    <button 
                      className="btn-add-expense"
                      onClick={() => {
                        setTransactionType('expense')
                        setShowAddForm(true)
                        setEditingTransaction(null)
                        setAmountValue('')
                        reset()
                      }}
                    >
                      <i className="icon-plus"></i>
                      Añadir Gasto
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="form-overlay">
            <div className="form-container">
              <h2>{editingTransaction ? 'Editar Transacción' : `Añadir ${transactionType === 'income' ? 'Ingreso' : 'Gasto'}`}</h2>
              
              <form onSubmit={handleSubmit(onSubmit)} className="transaction-form">
                <div className="form-group">
                  <label>Monto *</label>
                  <input
                    type="text"
                    value={amountValue}
                    onChange={handleAmountChange}
                    className={errors.amount ? 'error' : ''}
                    placeholder="0"
                  />
                  <input
                    type="hidden"
                    {...register('amount', { 
                      required: 'El monto es obligatorio',
                      min: { value: 0.01, message: 'El monto debe ser mayor a 0' }
                    })}
                  />
                  {errors.amount && <span className="error-text">{errors.amount.message}</span>}
                </div>

                <div className="form-group">
                  <label>Categoría *</label>
                  <select
                    {...register('category', { required: 'La categoría es obligatoria' })}
                    className={errors.category ? 'error' : ''}
                  >
                    <option value="">Seleccionar categoría</option>
                    {(transactionType === 'income' ? incomeCategories : expenseCategories).map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                  {errors.category && <span className="error-text">{errors.category.message}</span>}
                </div>

                <div className="form-group">
                  <label>Fecha *</label>
                  <input
                    type="date"
                    {...register('date', { required: 'La fecha es obligatoria' })}
                    className={errors.date ? 'error' : ''}
                  />
                  {errors.date && <span className="error-text">{errors.date.message}</span>}
                </div>

                <div className="form-group">
                  <label>Descripción</label>
                  <textarea
                    {...register('description', { 
                      maxLength: { value: 200, message: 'Máximo 200 caracteres' }
                    })}
                    className={errors.description ? 'error' : ''}
                    placeholder="Descripción opcional (máximo 200 caracteres)"
                    rows="3"
                  />
                  {errors.description && <span className="error-text">{errors.description.message}</span>}
                </div>

                <div className="form-actions">
                  <button type="button" onClick={handleCancel} className="btn btn-secondary">
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingTransaction ? 'Actualizar' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default IncomeExpenses
