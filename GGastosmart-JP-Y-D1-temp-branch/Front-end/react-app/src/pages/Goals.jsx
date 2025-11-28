import React, { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { format } from 'date-fns'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import DashboardLayout from '../components/DashboardLayout'
import { apiService } from '../services/apiService'
import { CardSkeleton, ListSkeleton } from '../components/Skeleton'
import EmptyState from '../components/EmptyState'
import { formatCurrency } from '../config/config'
import { useBalance } from '../contexts/BalanceContext'
import './Goals.css'

const Goals = () => {
  const { balance: globalBalance, refreshBalance } = useBalance()
  const [goals, setGoals] = useState([])
  const [stats, setStats] = useState(null)
  const [trends, setTrends] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showContributeForm, setShowContributeForm] = useState(false)
  const [editingGoal, setEditingGoal] = useState(null)
  const [selectedGoal, setSelectedGoal] = useState(null)
  const [mainGoal, setMainGoal] = useState(null)
  const [contributeAmount, setContributeAmount] = useState('')
  const [formattedTargetAmount, setFormattedTargetAmount] = useState('')
  const [formattedContributeAmount, setFormattedContributeAmount] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})
  const [monthlySavings, setMonthlySavings] = useState([])
  const [dailyContributions, setDailyContributions] = useState([]) // Cambio: ahora son abonos diarios
  const [selectedGoalForChart, setSelectedGoalForChart] = useState('') // Meta seleccionada para gráfica de abonos
  const [contributionDate, setContributionDate] = useState('') // Fecha del abono
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1) // Mes actual (1-12)
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear()) // Año actual
  const [savingsMonthsToShow, setSavingsMonthsToShow] = useState(6) // Número de meses a mostrar en ahorro mensual

  // Ref para evitar ejecuciones duplicadas en StrictMode
  const hasLoadedRef = useRef(false)

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm()

  // Función para formatear montos con separadores de miles
  const formatAmount = (value) => {
    if (!value) return ''
    // Remover caracteres no numéricos excepto puntos
    const numericValue = value.replace(/[^\d]/g, '')
    // Agregar separadores de miles
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  }

  // Función para parsear montos formateados
  const parseAmount = (formattedValue) => {
    if (!formattedValue) return 0
    return parseInt(formattedValue.replace(/\./g, '')) || 0
  }

  // Función para manejar cambios en campos de monto
  const handleAmountChange = (e, setter) => {
    const formatted = formatAmount(e.target.value)
    setter(formatted)
  }

  // Goal categories matching the prototype
  const goalCategories = [
    'Fondo de Emergencia',
    'Viajes',
    'Educación',
    'Vivienda',
    'Vehículo',
    'Tecnología',
    'Salud',
    'Boda',
    'Jubilación',
    'Ahorros',
    'Inversiones',
    'Otros'
  ]

  // Función para formatear nombres de mes
  const formatMonthName = (monthStr) => {
    const months = {
      '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr',
      '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Ago',
      '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic',
      '1': 'Ene', '2': 'Feb', '3': 'Mar', '4': 'Abr',
      '5': 'May', '6': 'Jun', '7': 'Jul', '8': 'Ago',
      '9': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic'
    }
    return months[monthStr] || monthStr
  }

  // Manejador para cambio de meta en gráfica de abonos diarios
  const handleGoalChangeForChart = async (goalId) => {
    setSelectedGoalForChart(goalId)
    if (!goalId) {
      setDailyContributions([])
      return
    }
    
    try {
      const contributionsData = await apiService.goals.getDailyContributionsByGoal(goalId, currentYear, currentMonth)
      const contributionsFormatted = (contributionsData || []).map(c => ({
        day: c.day,
        date: c.date,
        amount: c.amount
      }))
      setDailyContributions(contributionsFormatted)
    } catch (error) {
      console.error('Error al cargar abonos diarios por meta:', error)
      setDailyContributions([])
    }
  }

  // Manejador para cambio de mes/año en gráfica de abonos diarios
  const handleMonthYearChange = async (month, year) => {
    setCurrentMonth(month)
    setCurrentYear(year)
    
    if (selectedGoalForChart) {
      try {
        const contributionsData = await apiService.goals.getDailyContributionsByGoal(selectedGoalForChart, year, month)
        const contributionsFormatted = (contributionsData || []).map(c => ({
          day: c.day,
          date: c.date,
          amount: c.amount
        }))
        setDailyContributions(contributionsFormatted)
      } catch (error) {
        console.error('Error al cargar abonos diarios:', error)
        setDailyContributions([])
      }
    }
  }

  // Manejador para cambio de meses a mostrar en ahorro mensual
  const handleSavingsMonthsChange = async (months) => {
    setSavingsMonthsToShow(months)
    try {
      const savingsData = await apiService.goals.getMonthlySavings(months)
      console.log('handleSavingsMonthsChange - savingsData recibido:', savingsData)
      
      // El backend ya filtra por categoría "Ahorros", solo necesitamos formatear
      const savingsFormatted = (savingsData || []).map(s => ({
        month: formatMonthName(s.month.toString().padStart(2, '0')),
        amount: s.amount
      }))
      
      console.log('handleSavingsMonthsChange - savingsFormatted:', savingsFormatted)
      setMonthlySavings(savingsFormatted)
    } catch (error) {
      console.error('Error al cargar ahorro mensual:', error)
    }
  }


  // Load data on component mount
  useEffect(() => {
    // Protección contra React.StrictMode (evita ejecuciones duplicadas)
    if (hasLoadedRef.current) {
      console.log('Goals - useEffect ya ejecutado, saltando carga duplicada')
      return
    }
    
    hasLoadedRef.current = true
    console.log('Goals - Iniciando carga de datos (primera vez)')
    
    loadData()
    loadMainGoal()
  }, [])

  // Cargar la meta principal desde el backend (no localStorage)
  const loadMainGoal = async () => {
    try {
      console.log('Goals - Cargando meta principal desde backend...')
      
      // Obtener todas las metas del usuario
      const goalsData = await apiService.goals.getGoals()
      
      // Buscar la meta principal (is_main: true)
      const mainGoalFromBackend = goalsData.find(goal => goal.is_main === true)
      
      if (mainGoalFromBackend) {
        console.log('Goals - Meta principal encontrada:', mainGoalFromBackend.name)
        
        // Convertir al formato esperado por el componente
        const formattedMainGoal = {
          goal_name: mainGoalFromBackend.name,
          goal_type: mainGoalFromBackend.category,
          goal_amount: mainGoalFromBackend.target_amount,
          current_amount: mainGoalFromBackend.current_amount,
          progress_percentage: mainGoalFromBackend.progress_percentage,
          goal_timeframe: mainGoalFromBackend.target_date ? 
            Math.ceil((new Date(mainGoalFromBackend.target_date) - new Date()) / (1000 * 60 * 60 * 24 * 30)) : null,
          id: mainGoalFromBackend.id,
          backend_id: mainGoalFromBackend.id
        }
        
        setMainGoal(formattedMainGoal)
        
        // Guardar en localStorage para referencia
        localStorage.setItem('userFinancialGoal', JSON.stringify(formattedMainGoal))
        localStorage.setItem('mainGoalId', mainGoalFromBackend.id)
        
        console.log('Goals - Meta principal cargada exitosamente')
      } else {
        console.log('Goals - No se encontró meta principal en el backend')
        setMainGoal(null)
      }
    } catch (error) {
      console.error('Goals - Error cargando meta principal:', error)
      setMainGoal(null)
    }
  }

  // Función centralizada para refrescar todos los datos de metas
  const refreshGoalsData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('Goals - refreshGoalsData - Iniciando peticiones al API...')
      
      // Cargar datos básicos primero
      const [goalsData, statsData, trendsData, savingsData] = await Promise.all([
        apiService.goals.getGoals(),
        apiService.goals.getStats(),
        apiService.goals.getTrends(),
        apiService.goals.getMonthlySavings(6)
      ])
      
      // Si hay una meta seleccionada para el gráfico, cargar sus abonos diarios
      let contributionsData = []
      if (selectedGoalForChart) {
        contributionsData = await apiService.goals.getDailyContributionsByGoal(selectedGoalForChart, currentYear, currentMonth)
      }
        
      console.log('Goals - refreshGoalsData - Datos recibidos del API:')
      console.log('Goals - refreshGoalsData - goalsData:', goalsData)
      console.log('Goals - refreshGoalsData - statsData:', statsData)
      console.log('Goals - refreshGoalsData - trendsData:', trendsData)
      console.log('Goals - refreshGoalsData - savingsData RAW:', savingsData)
      console.log('Goals - refreshGoalsData - contributionsData:', contributionsData)
      console.log('Goals - refreshGoalsData - goalsData con categorías:', goalsData.map(g => ({ id: g.id, name: g.name, category: g.category })))
      
      setGoals(goalsData || [])
      
      // Calcular metas activas e inversiones desde los datos reales
      const activeGoalsCount = (goalsData || []).filter(g => g.status === 'active').length
      const investmentsCount = (goalsData || []).filter(g => g.category === 'Inversiones').length
      
      // Calcular total ahorrado solo de metas con categoría "Ahorros"
      const totalSavedFromSavings = (goalsData || [])
        .filter(g => g.category === 'Ahorros')
        .reduce((sum, g) => sum + (g.current_amount || 0), 0)
      
      setStats({
        ...statsData,
        total_saved: totalSavedFromSavings,
        active_goals_count: activeGoalsCount,
        investments_count: investmentsCount
      })
      setTrends(trendsData || {
        average_savings: 0,
        most_common_category: 'Viajes',
        average_savings_time_months: 12
      })
      
      // Procesar datos de ahorro mensual (solo categoría "Ahorros")
      // El backend ya filtra por categoría "Ahorros", solo necesitamos formatear
      const savingsFormatted = (savingsData || []).map(s => ({
        month: formatMonthName(s.month.toString().padStart(2, '0')),
        amount: s.amount
      }))
      
      console.log('Goals - Datos de ahorro mensual formateados:', savingsFormatted)
      
      // Procesar datos de abonos diarios
      const contributionsFormatted = (contributionsData || []).map(c => ({
        day: c.day,
        date: c.date,
        amount: c.amount
      }))
      
      setMonthlySavings(savingsFormatted)
      setDailyContributions(contributionsFormatted)
      
    } catch (err) {
      console.error('Goals - refreshGoalsData - Error cargando datos:', err)
      setError('Error al cargar las metas. Intente nuevamente.')
      setGoals([])
      setStats({
        total_saved: 0,
        active_goals_count: 0,
        investments_count: 0
      })
      setTrends({
        average_savings: 0,
        most_common_category: 'Viajes',
        average_savings_time_months: 12
      })
      setMonthlySavings([])
      setDailyContributions([])
    } finally {
      setLoading(false)
    }
  }

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('Goals - loadData - Iniciando carga de datos')
      
      // Cargar datos del backend (no depender de localStorage)
      await refreshGoalsData()
      
    } catch (err) {
      console.error('Goals - loadData - Error general cargando metas:', err)
      setError('Error al cargar las metas. Mostrando datos por defecto.')
      setGoals([])
      setStats({
        total_saved: 0,
        active_goals_count: 0,
        investments_count: 0
      })
      setTrends({
        average_savings: 0,
        most_common_category: 'Viajes',
        average_savings_time_months: 12
      })
    } finally {
      setLoading(false)
    }
  }


  const getProgressColor = (percentage) => {
    // Lógica de colores basada en el prototipo:
    // Rojo: 0-25% (progreso bajo)
    // Naranja: 25-75% (progreso medio)
    // Verde: 75-100% (progreso alto/completado)
    if (percentage >= 75) return '#10b981' // Verde - progreso alto/completado
    if (percentage >= 25) return '#f59e0b' // Naranja - progreso medio
    return '#ef4444' // Rojo - progreso bajo
  }

  // Mapear nombres de metas a textos legibles
  const getGoalDisplayName = (goalType) => {
    const goalNames = {
      'emergencia': 'Fondo de Emergencia',
      'viaje': 'Vacaciones',
      'casa': 'Comprar Casa',
      'educacion': 'Educación',
      'other': mainGoal?.goal_name || 'Meta Personalizada'
    }
    return goalNames[goalType] || goalType
  }

  // Combinar meta principal con metas adicionales
  const getAllGoals = () => {
    const allGoals = []
    
    // Agregar meta principal si existe
    if (mainGoal) {
      // Buscar la meta principal real en la lista de metas
      const realMainGoal = goals.find(goal => goal.is_main === true || goal.is_main_goal === true)
      if (realMainGoal) {
        // Normalizar bandera para el render
        realMainGoal.is_main_goal = true
        allGoals.push(realMainGoal)
      } else {
        // Si no se encuentra en la lista, crear una representación temporal
        allGoals.push({
          id: 'main-goal',
          name: mainGoal.goal_name || getGoalDisplayName(mainGoal.goal_type),
          target_amount: mainGoal.goal_amount,
          current_amount: 0, // Sin progreso inicial - debe empezar en 0
          progress_percentage: 0, // Sin progreso inicial - debe empezar en 0
          category: getGoalDisplayName(mainGoal.goal_type),
          description: mainGoal.description || '',
          is_main_goal: true,
          target_date: mainGoal.goal_timeframe ? new Date(Date.now() + mainGoal.goal_timeframe * 30 * 24 * 60 * 60 * 1000).toISOString() : null
        })
      }
    }
    
    // Agregar metas adicionales (excluyendo la principal si ya se agregó)
    const additionalGoals = goals
      .map(g => ({ ...g, is_main_goal: g.is_main === true ? true : false }))
      .filter(goal => !goal.is_main_goal)
    allGoals.push(...additionalGoals)
    
    return allGoals
  }

  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true)
      setError(null)
      setValidationErrors({})
      
      // Validaciones previas
      const errors = {}
      
      if (!data.name || data.name.trim() === '') {
        errors.name = 'El nombre de la meta es requerido'
      } else if (data.name.trim().length < 3) {
        errors.name = 'El nombre debe tener al menos 3 caracteres'
      } else if (data.name.trim().length > 100) {
        errors.name = 'El nombre no puede exceder 100 caracteres'
      }
      
      if (!data.category || data.category.trim() === '') {
        errors.category = 'La categoría es requerida'
      }
      
      const targetAmount = parseAmount(formattedTargetAmount)
      if (!targetAmount || targetAmount <= 0) {
        errors.target_amount = 'El monto objetivo debe ser mayor que cero'
      } else if (targetAmount < 1000) {
        errors.target_amount = 'El monto objetivo debe ser al menos $1.000'
      } else if (targetAmount > 1000000000) {
        errors.target_amount = 'El monto objetivo no puede exceder $1.000.000.000'
      }
      
      if (data.target_date) {
        const targetDate = new Date(data.target_date)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        if (targetDate <= today) {
          errors.target_date = 'La fecha objetivo debe ser futura'
        } else {
          const daysDiff = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24))
          if (daysDiff > 3650) { // 10 años
            errors.target_date = 'La fecha objetivo no puede ser más de 10 años en el futuro'
          }
        }
      }
      
      if (data.description && data.description.length > 500) {
        errors.description = 'La descripción no puede exceder 500 caracteres'
      }
      
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors)
        return
      }
      
      const goalData = {
        name: data.name.trim(),
        target_amount: targetAmount,
        category: data.category,
        description: data.description || '',
        target_date: data.target_date ? new Date(data.target_date).toISOString().split('T')[0] : null, // Formato YYYY-MM-DD
        current_amount: editingGoal ? editingGoal.current_amount : 0,
        currency: 'COP',
        is_public: false,
        is_main: false // Las metas se crean como no principales por defecto
      }
      
      console.log(editingGoal ? 'Editando meta:' : 'Creando meta:', goalData)
      
      // Intentar crear o actualizar la meta
      try {
        if (editingGoal) {
          const updatedGoal = await apiService.goals.update(editingGoal.id, goalData)
          console.log('Meta actualizada exitosamente:', updatedGoal)
          
        } else {
          const newGoal = await apiService.goals.create(goalData)
          console.log('Meta creada exitosamente:', newGoal)
          
        }
        
      } catch (apiError) {
        console.error('Error en API:', apiError)
        
        // Manejar errores 422 (validación del backend)
        if (apiError.response?.status === 422) {
          const backendErrors = apiError.response.data?.detail || {}
          setValidationErrors(backendErrors)
          setError('Por favor corrige los errores en el formulario')
          return
        }
        
        // Para otros errores, mostrar mensaje del servidor
        const errorMessage = apiError.response?.data?.detail || apiError.message || 'Error al procesar la meta'
        setError(errorMessage)
        return
      }
      
      // Cerrar formulario y recargar datos
      setShowAddForm(false)
      setEditingGoal(null)
      setFormattedTargetAmount('')
      setValidationErrors({})
      reset()
      
      // Recargar datos para mostrar la meta creada/actualizada
      await refreshGoalsData()
      loadMainGoal() // Recargar meta principal también
      
    } catch (err) {
      console.error('Error procesando meta:', err)
      setError(err.message || 'Error al procesar la meta')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (goal) => {
    setEditingGoal(goal)
    setShowAddForm(true)
    
    // Pre-llenar el formulario con los datos de la meta
    setValue('name', goal.name)
    setValue('target_amount', goal.target_amount)
    setValue('category', goal.category)
    setValue('description', goal.description || '')
    setValue('target_date', goal.target_date ? format(new Date(goal.target_date), 'yyyy-MM-dd') : '')
    
    // Formatear el monto objetivo
    setFormattedTargetAmount(formatAmount(goal.target_amount.toString()))
  }

  const handleDelete = async (goal) => {
    const allGoals = getAllGoals()
    
    // Si solo hay una meta, bloquear eliminación
    if (allGoals.length <= 1) {
      setError('No puedes eliminar la única meta. Crea una nueva meta antes de eliminar esta.')
      return
    }
    
    // Si es la meta principal y hay otras metas, preguntar cuál será la nueva principal
    if (goal.is_main_goal && allGoals.length > 1) {
      const otherGoals = allGoals.filter(g => g.id !== goal.id)
      const newMainGoal = otherGoals[0] // Tomar la primera como nueva principal
      
      if (!window.confirm(`¿Estás seguro de eliminar la meta principal "${goal.name}"? La meta "${newMainGoal.name}" se establecerá como nueva meta principal.`)) {
        return
      }
    } else {
      if (!window.confirm(`¿Estás seguro de eliminar la meta "${goal.name}"?`)) {
        return
      }
    }
    
    try {
      setError(null)
      
      // Intentar eliminar la meta
      try {
        await apiService.goals.delete(goal.id)
        console.log('Meta eliminada exitosamente')
      } catch (apiError) {
        console.warn('Error eliminando meta en API:', apiError)
        // Simular eliminación exitosa para demo
        console.log('Meta eliminada localmente (demo)')
        
        // Para demo: eliminar localmente
        const updatedGoals = goals.filter(g => g.id !== goal.id)
        setGoals(updatedGoals)
      }
      
      // Si se eliminó la meta principal, establecer otra como principal
      if (goal.is_main_goal) {
        const remainingGoals = allGoals.filter(g => g.id !== goal.id)
        if (remainingGoals.length > 0) {
          const newMainGoal = remainingGoals[0]
          const mainGoalData = {
            goal_type: newMainGoal.category.toLowerCase().replace(/\s+/g, '_'),
            goal_name: newMainGoal.name,
            goal_amount: newMainGoal.target_amount,
            goal_timeframe: newMainGoal.target_date ? Math.ceil((new Date(newMainGoal.target_date) - new Date()) / (1000 * 60 * 60 * 24 * 30)) : 12
          }
          localStorage.setItem('userFinancialGoal', JSON.stringify(mainGoalData))
          console.log('Nueva meta principal establecida:', newMainGoal.name)
        }
      }
      
      await refreshGoalsData()
      loadMainGoal() // Recargar meta principal
      
    } catch (err) {
      console.error('Error eliminando meta:', err)
      setError('Error al eliminar la meta. Intente nuevamente.')
    }
  }

  const handleContribute = (goal) => {
    setSelectedGoal(goal)
    setContributeAmount('')
    setFormattedContributeAmount('')
    setContributionDate('') // Limpiar fecha
    setShowContributeForm(true)
  }

  const handleSetAsMain = async (goal) => {
    if (!window.confirm(`¿Estás seguro de establecer "${goal.name}" como meta principal?`)) {
      return
    }
    
    try {
      setError(null)
      
      // Llamar al API para establecer como meta principal
      await apiService.goals.setAsMain(goal.id)
      
      // Actualizar localStorage con la nueva meta principal
      const mainGoalData = {
        goal_type: goal.category.toLowerCase().replace(/\s+/g, '_'),
        goal_name: goal.name,
        goal_amount: goal.target_amount,
        goal_timeframe: goal.target_date ? Math.ceil((new Date(goal.target_date) - new Date()) / (1000 * 60 * 60 * 24 * 30)) : 12
      }
      localStorage.setItem('userFinancialGoal', JSON.stringify(mainGoalData))
      
      // Actualizar el ID de la meta principal
      localStorage.setItem('mainGoalId', goal.id)
      
      console.log('Meta principal cambiada a:', goal.name)
      
      // Recargar datos para reflejar el cambio
      await refreshGoalsData()
      loadMainGoal()
      
    } catch (err) {
      console.error('Error cambiando meta principal:', err)
      setError('Error al cambiar la meta principal. Intente nuevamente.')
    }
  }

  const onSubmitContribution = async (data) => {
    try {
      setIsSubmitting(true)
      setError(null)
      setValidationErrors({})
      
      const amount = parseAmount(formattedContributeAmount)
      const remainingAmount = selectedGoal.target_amount - selectedGoal.current_amount
      
      // Validaciones
      const errors = {}
      
      if (!amount || amount <= 0) {
        errors.amount = 'El monto debe ser mayor a 0'
      }
      
      if (amount > remainingAmount) {
        errors.amount = `El monto no puede superar el monto restante (${formatCurrency(remainingAmount)})`
      }
      
      // Validar saldo disponible usando el contexto global
      if (amount > globalBalance) {
        errors.amount = `Saldo insuficiente. Disponible: ${formatCurrency(globalBalance)}`
      }
      
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors)
        return
      }
      
      console.log(`Abonando ${formatCurrency(amount)} a la meta: ${selectedGoal.name}`)
      
      // Realizar abono a través del API
      try {
        const contributionData = {
          amount: amount,
          description: `Abono a meta: ${selectedGoal.name}`
        }
        
        // Agregar fecha si se especificó
        if (contributionDate) {
          contributionData.contribution_date = contributionDate
        }
        
        const updatedGoal = await apiService.goals.contribute(selectedGoal.id, contributionData)
        console.log('Abono realizado exitosamente:', updatedGoal)
        
        // Mostrar mensaje de éxito
        setError(null)
        
      } catch (apiError) {
        console.error('Error en API al abonar:', apiError)
        
        // Manejar errores 422 (validación del backend)
        if (apiError.response?.status === 422) {
          const backendErrors = apiError.response.data?.detail || {}
          setValidationErrors(backendErrors)
          setError('Por favor corrige los errores en el formulario')
          return
        }
        
        // Para otros errores, mostrar mensaje del servidor
        const errorMessage = apiError.response?.data?.detail || apiError.message || 'Error al realizar el abono'
        setError(errorMessage)
        return
      }
      
      // Cerrar formulario y recargar datos
      setShowContributeForm(false)
      setSelectedGoal(null)
      setContributeAmount('')
      setFormattedContributeAmount('')
      setContributionDate('')
      await refreshGoalsData()
      loadMainGoal()
      
      // Refrescar saldo global
      await refreshBalance()
      
    } catch (err) {
      console.error('Error realizando abono:', err)
      setError('Error al realizar el abono. Intente nuevamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout hideBudget={true}>
        <div className="goals-container">
          <div className="page-header">
            <h1>Metas</h1>
          </div>
          <CardSkeleton />
          <ListSkeleton count={3} />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout hideBudget={true}>
      <div className="goals-container">
        {/* Header */}
        <div className="page-header">
          <h1>Metas</h1>
        </div>

        {/* Error Message */}
        {error && (
          <div className="error-message">
            <i className="icon-warning"></i>
            {error}
          </div>
        )}

        {/* Summary Cards */}
        <div className="summary-cards">
          <div className="summary-card total-saved">
            <div className="card-icon">
              <i className="icon-money-bag">💰</i>
            </div>
            <div className="card-content">
              <h3>Total Ahorrado</h3>
              <div className="card-value">
                <span className="currency">COP</span>
                <span className="amount">{formatCurrency(stats.total_saved).replace('COP', '').trim()}</span>
              </div>
            </div>
          </div>

          <div className="summary-card active-goals">
            <div className="card-icon">
              <i className="icon-target">🎯</i>
            </div>
            <div className="card-content">
              <h3>N.º de Metas Activas</h3>
              <div className="card-value">
                <span className="number">{stats.active_goals_count}</span>
                <span className="label">metas</span>
              </div>
            </div>
          </div>

          <div className="summary-card investments">
            <div className="card-icon">
              <i className="icon-chart">📈</i>
            </div>
            <div className="card-content">
              <h3>N.º de Inversiones</h3>
              <div className="card-value">
                <span className="number">{stats.investments_count || 0}</span>
                <span className="label">{stats.investments_count === 1 ? 'inversión' : 'inversiones'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="charts-section">
          <div className="chart-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3>Ahorro mensual</h3>
                <div className="chart-subtitle" style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  Abonos mensuales a metas de categoría "Ahorros"
                </div>
              </div>
              <div className="months-selector">
                <label htmlFor="savings-months-select" style={{ marginRight: '0.5rem', fontSize: '0.875rem' }}>Mostrar:</label>
                <select 
                  id="savings-months-select"
                  value={savingsMonthsToShow} 
                  onChange={(e) => handleSavingsMonthsChange(parseInt(e.target.value))}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db' }}
                >
                  <option value="3">Últimos 3 meses</option>
                  <option value="6">Últimos 6 meses</option>
                  <option value="12">Últimos 12 meses</option>
                  <option value="24">Últimos 24 meses</option>
                </select>
              </div>
            </div>
            <div className="chart-container" style={{ height: '300px' }}>
              {monthlySavings.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlySavings} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                    <Tooltip 
                      formatter={(value) => [formatCurrency(value), 'Ahorro']}
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '8px' }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="#10b981" 
                      strokeWidth={3}
                      name="Ahorro mensual"
                      dot={{ fill: '#10b981', r: 6, strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <p style={{ marginBottom: '0.5rem' }}>No hay datos de ahorro mensual</p>
                  <small>Crea una meta de categoría "Ahorros" y realiza abonos para ver la gráfica</small>
                </div>
              )}
            </div>
          </div>

          <div className="chart-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3>Abonos del mes</h3>
                <div className="chart-subtitle" style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  {selectedGoalForChart 
                    ? `${new Date(currentYear, currentMonth - 1).toLocaleString('es', { month: 'long', year: 'numeric' })}` 
                    : 'Selecciona una meta para ver sus abonos'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div className="goal-selector">
                  <label htmlFor="goal-select" style={{ marginRight: '0.5rem', fontSize: '0.875rem' }}>Meta:</label>
                  <select 
                    id="goal-select"
                    value={selectedGoalForChart} 
                    onChange={(e) => handleGoalChangeForChart(e.target.value)}
                    style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db', minWidth: '150px' }}
                  >
                    <option value="">Seleccionar</option>
                    {getAllGoals().map(goal => (
                      <option key={goal.id} value={goal.id}>
                        {goal.name}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedGoalForChart && (
                  <>
                    <div className="month-selector">
                      <label htmlFor="month-select" style={{ marginRight: '0.5rem', fontSize: '0.875rem' }}>Mes:</label>
                      <select 
                        id="month-select"
                        value={currentMonth} 
                        onChange={(e) => handleMonthYearChange(parseInt(e.target.value), currentYear)}
                        style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db' }}
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
                    </div>
                    <div className="year-selector">
                      <label htmlFor="year-select" style={{ marginRight: '0.5rem', fontSize: '0.875rem' }}>Año:</label>
                      <select 
                        id="year-select"
                        value={currentYear} 
                        onChange={(e) => handleMonthYearChange(currentMonth, parseInt(e.target.value))}
                        style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db' }}
                      >
                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="chart-container" style={{ height: '300px' }}>
              {selectedGoalForChart && dailyContributions.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyContributions} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="day" 
                      label={{ value: 'Día del mes', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                    <Tooltip 
                      formatter={(value) => [formatCurrency(value), 'Abono']}
                      labelFormatter={(day) => `Día ${day}`}
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '8px' }}
                    />
                    <Legend />
                    <Bar 
                      dataKey="amount" 
                      fill="#f59e0b" 
                      name="Abono diario"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  {selectedGoalForChart 
                    ? <><p style={{ marginBottom: '0.5rem' }}>No hay abonos registrados en {new Date(currentYear, currentMonth - 1).toLocaleString('es', { month: 'long' })}</p>
                       <small>Realiza abonos a esta meta para ver la gráfica</small></> 
                    : <><p style={{ marginBottom: '0.5rem' }}>Selecciona una meta</p>
                       <small>Usa el selector de arriba para elegir una meta y ver sus abonos del mes</small></>}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Goals and Trends Section */}
        <div className="goals-trends-section">
          {/* My Goals */}
          <div className="my-goals">
            <h2>Mis Metas</h2>
            {!loading && getAllGoals().length === 0 ? (
              <EmptyState
                message="Aún no tienes metas creadas"
                icon="🎯"
                action={
                  <button onClick={() => setShowAddForm(true)}>
                    Crear tu primera meta
                  </button>
                }
              />
            ) : (
              <div className="goals-list">
                {getAllGoals().map(goal => (
                  <div key={goal.id} className={`goal-item ${goal.is_main_goal ? 'main-goal' : ''}`}>
                    <div className="goal-info">
                      <h4>
                        {goal.name}
                        {goal.is_main_goal && <span className="main-goal-badge">Meta Principal</span>}
                      </h4>
                      <div className="goal-progress">
                        <span className="progress-text">
                          {formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}
                        </span>
                        <span className="progress-percentage" style={{ color: getProgressColor(goal.progress_percentage) }}>
                          {Math.round(goal.progress_percentage)}%
                        </span>
                      </div>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill" 
                          style={{ 
                            width: `${Math.min(goal.progress_percentage, 100)}%`,
                            backgroundColor: getProgressColor(goal.progress_percentage)
                          }}
                        ></div>
                      </div>
                    </div>
                    <div className="goal-actions">
                      <button 
                        className="btn-contribute"
                        onClick={() => handleContribute(goal)}
                        aria-label={`Abonar a la meta ${goal.name}`}
                        title={`Abonar a la meta ${goal.name}`}
                      >
                        Abonar
                      </button>
                      <button 
                        className="btn-edit"
                        onClick={() => handleEdit(goal)}
                        aria-label={`Editar la meta ${goal.name}`}
                        title={`Editar la meta ${goal.name}`}
                      >
                        Editar
                      </button>
                      {!goal.is_main_goal && getAllGoals().length >= 2 && (
                        <button 
                          className="btn-main"
                          onClick={() => handleSetAsMain(goal)}
                          aria-label={`Establecer ${goal.name} como Meta Principal`}
                          title="Establecer como Meta Principal"
                        >
                          ⭐
                        </button>
                      )}
                      <button 
                        className="btn-delete"
                        onClick={() => handleDelete(goal)}
                        aria-label={`Eliminar la meta ${goal.name}`}
                        title={`Eliminar la meta ${goal.name}`}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Trending Goals */}
          <div className="trending-goals">
            <h2>Metas en tendencia</h2>
            <div className="trend-banner">
              <span className="trend-badge">¡Tendencia Popular!</span>
              <p>Los viajes son la meta más común entre usuarios</p>
            </div>
            <div className="trend-stats">
              <div className="trend-stat">
                <div className="stat-line green"></div>
                <span>Ahorro promedio de usuarios</span>
                <strong>{formatCurrency(trends.average_savings)}</strong>
              </div>
              <div className="trend-stat">
                <div className="stat-line blue"></div>
                <span>Meta más común</span>
                <strong style={{ color: '#3b82f6' }}>{trends.most_common_category}</strong>
              </div>
              <div className="trend-stat">
                <div className="stat-line orange"></div>
                <span>Tiempo promedio de ahorro</span>
                <strong>{trends.average_savings_time_months} meses</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="bottom-actions">
          <button 
            className="btn-add-goal"
            onClick={() => setShowAddForm(true)}
          >
            <span className="icon-plus">+</span>
            Añadir Meta
          </button>
        </div>

        {/* Add/Edit Goal Form */}
        {showAddForm && (
          <div className="form-overlay">
            <div className="form-container">
              <h2>{editingGoal ? 'Editar Meta' : 'Crear Nueva Meta'}</h2>
              
              <form onSubmit={handleSubmit(onSubmit)} className="goal-form">
                <div className="form-group">
                  <label>Nombre de la Meta *</label>
                  <input
                    type="text"
                    {...register('name', { required: 'El nombre es obligatorio' })}
                    className={errors.name ? 'error' : ''}
                    placeholder="Ej: Viaje a Europa"
                  />
                  {errors.name && <span className="error-text">{errors.name.message}</span>}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Monto Objetivo *</label>
                    <input
                      type="text"
                      value={formattedTargetAmount}
                      onChange={(e) => handleAmountChange(e, setFormattedTargetAmount)}
                      className={validationErrors.target_amount ? 'error' : ''}
                      placeholder="5.000.000"
                    />
                    {validationErrors.target_amount && <span className="error-text">{validationErrors.target_amount}</span>}
                  </div>

                  <div className="form-group">
                    <label>Categoría *</label>
                    <select
                      {...register('category', { required: 'La categoría es obligatoria' })}
                      className={errors.category ? 'error' : ''}
                    >
                      <option value="">Seleccionar categoría</option>
                      {goalCategories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                    {errors.category && <span className="error-text">{errors.category.message}</span>}
                  </div>
                </div>

                <div className="form-group">
                  <label>Fecha Objetivo</label>
                  <input
                    type="date"
                    {...register('target_date')}
                    className={errors.target_date ? 'error' : ''}
                  />
                  {errors.target_date && <span className="error-text">{errors.target_date.message}</span>}
                </div>

                <div className="form-group">
                  <label>Descripción</label>
                  <textarea
                    {...register('description', { 
                      maxLength: { value: 500, message: 'Máximo 500 caracteres' }
                    })}
                    className={errors.description ? 'error' : ''}
                    placeholder="Describe tu meta (opcional)"
                    rows="3"
                  />
                  {errors.description && <span className="error-text">{errors.description.message}</span>}
                </div>

                {/* Checkbox para marcar como meta principal - solo si hay 2 o más metas */}

                <div className="form-actions">
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowAddForm(false)
                      setEditingGoal(null)
                      setFormattedTargetAmount('')
                      reset()
                    }} 
                    className="btn btn-secondary"
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="loading-spinner-small"></span>
                        Procesando...
                      </>
                    ) : (
                      editingGoal ? 'Actualizar Meta' : 'Crear Meta'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Contribution Form */}
        {showContributeForm && selectedGoal && (
          <div className="form-overlay">
            <div className="form-container">
              <h2>Abonar a Meta</h2>
              
              <div className="goal-info-summary">
                <h3>{selectedGoal.name}</h3>
                <p>Progreso actual: {formatCurrency(selectedGoal.current_amount)} / {formatCurrency(selectedGoal.target_amount)}</p>
                <p>Progreso: {selectedGoal.progress_percentage}%</p>
              </div>
              
              <form onSubmit={handleSubmit(onSubmitContribution)} className="contribution-form">
                <div className="form-group">
                  <label>Monto a abonar *</label>
                  <input
                    type="text"
                    value={formattedContributeAmount}
                    onChange={(e) => handleAmountChange(e, setFormattedContributeAmount)}
                    className={validationErrors.amount ? 'error' : ''}
                    placeholder="0"
                    required
                  />
                  {validationErrors.amount && <span className="error-text">{validationErrors.amount}</span>}
                  <small className="form-help">
                    Monto restante: {formatCurrency(selectedGoal.target_amount - selectedGoal.current_amount)}
                  </small>
                </div>

                <div className="form-group">
                  <label>Fecha del abono</label>
                  <input
                    type="date"
                    value={contributionDate}
                    onChange={(e) => setContributionDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    placeholder="Fecha actual"
                  />
                  <small className="form-help">
                    Si no se especifica, se usará la fecha actual
                  </small>
                </div>

                <div className="form-actions">
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowContributeForm(false)
                      setSelectedGoal(null)
                      setContributeAmount('')
                      setFormattedContributeAmount('')
                      setContributionDate('')
                    }} 
                    className="btn btn-secondary"
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="loading-spinner-small"></span>
                        Procesando...
                      </>
                    ) : (
                      'Abonar'
                    )}
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

export default Goals