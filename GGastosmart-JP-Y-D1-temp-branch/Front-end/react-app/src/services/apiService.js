import axios from 'axios'
import config from '../config/config'

const API_BASE_URL = config.apiBaseUrl

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Buscar token primero en sessionStorage, luego en localStorage
    const token = sessionStorage.getItem('token') || localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - limpiar solo datos de sesión
      sessionStorage.clear()
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('lastActivity')
      // NO eliminar userFinancialGoal ni mainGoalId - se recargan del backend
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Helper functions (pure functions, no this)
const getCurrentUser = () => {
  try {
    // Buscar primero en sessionStorage, luego en localStorage
    const userData = sessionStorage.getItem('user') || localStorage.getItem('user')
    return userData ? JSON.parse(userData) : null
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

const getCurrentUserId = () => {
  const user = getCurrentUser()
  return user ? user.id : null
}

export const apiService = {
  // Get current user from localStorage
  getCurrentUser,

  // Get current user ID from localStorage
  getCurrentUserId,

  // Transactions API
  transactions: {
    // Create transaction
    async create(transactionData) {
      try {
        const response = await api.post('/transactions/', transactionData)
        return response.data
      } catch (error) {
        const message = error.response?.data?.detail || 'Error al crear transacción'
        throw new Error(message)
      }
    },

    // Get transactions
    async getTransactions(params = {}) {
      try {
        const response = await api.get('/transactions/', {
          params: { ...params }
        })
        return response.data
      } catch (error) {
        const message = error.response?.data?.detail || 'Error al obtener transacciones'
        throw new Error(message)
      }
    },

    // Get transaction by ID
    async getById(transactionId) {
      try {
        const response = await api.get(`/transactions/${transactionId}`)
        return response.data
      } catch (error) {
        const message = error.response?.data?.detail || 'Error al obtener transacción'
        throw new Error(message)
      }
    },

    // Update transaction
    async update(transactionId, updateData) {
      try {
        const response = await api.put(`/transactions/${transactionId}`, updateData)
        return response.data
      } catch (error) {
        const message = error.response?.data?.detail || 'Error al actualizar transacción'
        throw new Error(message)
      }
    },

    // Delete transaction
    async delete(transactionId) {
      try {
        await api.delete(`/transactions/${transactionId}`)
        return true
      } catch (error) {
        const message = error.response?.data?.detail || 'Error al eliminar transacción'
        throw new Error(message)
      }
    },

    // Get transaction statistics
    async getStats(dateFrom = null, dateTo = null) {
      try {
        const params = {}
        if (dateFrom) params.date_from = dateFrom
        if (dateTo) params.date_to = dateTo
        
        const response = await api.get('/transactions/stats/summary', { params })
        return response.data
      } catch (error) {
        const message = error.response?.data?.detail || 'Error al obtener estadísticas'
        throw new Error(message)
      }
    },

    // Get categories
    async getCategories(transactionType = null) {
      try {
        const params = {}
        if (transactionType) params.transaction_type = transactionType
        
        const response = await api.get('/transactions/categories/list', { params })
        return response.data.categories
      } catch (error) {
        const message = error.response?.data?.detail || 'Error al obtener categorías'
        throw new Error(message)
      }
    },

    // Search transactions
    async search(query, skip = 0, limit = 50) {
      try {
        const response = await api.get('/transactions/search/query', {
          params: { query, skip, limit }
        })
        return response.data
      } catch (error) {
        const message = error.response?.data?.detail || 'Error al buscar transacciones'
        throw new Error(message)
      }
    }
  },

  // Users API
  users: {
    // Get user by ID
    async getById(userId) {
      try {
        const response = await api.get(`/users/${userId}`)
        return response.data
      } catch (error) {
        const message = error.response?.data?.detail || 'Error al obtener usuario'
        throw new Error(message)
      }
    },

    // Get user by email
    async getByEmail(email) {
      try {
        const response = await api.get(`/users/email/${email}`)
        return response.data
      } catch (error) {
        const message = error.response?.data?.detail || 'Error al obtener usuario'
        throw new Error(message)
      }
    }
  },

  // Goals API
  goals: {
    // Create goal
    async create(goalData) {
      try {
        const userId = getCurrentUserId()
        if (!userId) throw new Error('Usuario no autenticado')
        
        const response = await api.post('/goals/', goalData, {
          params: { user_id: userId }
        })
        return response.data
      } catch (error) {
        const message = error.response?.data?.detail || 'Error al crear meta'
        throw new Error(message)
      }
    },

    // Get goals
    async getGoals(params = {}) {
      try {
        const userId = getCurrentUserId()
        if (!userId) {
          console.error('getGoals - Usuario no autenticado')
          throw new Error('Usuario no autenticado')
        }
        
        console.log('getGoals - Obteniendo metas para usuario:', userId)
        console.log('getGoals - Parámetros:', params)
        
        const response = await api.get('/goals/', {
          params: { user_id: userId, ...params }
        })
        
        console.log('getGoals - Respuesta del servidor:', response.data)
        return response.data
      } catch (error) {
        console.error('getGoals - Error en la petición:', error)
        const status = error.response?.status
        const url = error.config?.url
        const message = error.response?.data?.detail || 'Error al obtener metas'
        const fullMessage = `getGoals failed (${status}): ${message} - URL: ${url}`
        throw new Error(fullMessage)
      }
    },

    // Get goal by ID
    async getById(goalId) {
      try {
        const userId = getCurrentUserId()
        if (!userId) throw new Error('Usuario no autenticado')
        
        const response = await api.get(`/goals/${goalId}`, {
          params: { user_id: userId }
        })
        return response.data
      } catch (error) {
        const message = error.response?.data?.detail || 'Error al obtener meta'
        throw new Error(message)
      }
    },

    // Update goal
    async update(goalId, updateData) {
      try {
        const userId = getCurrentUserId()
        if (!userId) throw new Error('Usuario no autenticado')
        
        const response = await api.put(`/goals/${goalId}`, updateData, {
          params: { user_id: userId }
        })
        return response.data
      } catch (error) {
        const message = error.response?.data?.detail || 'Error al actualizar meta'
        throw new Error(message)
      }
    },

    // Contribute to goal
    async contribute(goalId, contributionData) {
      try {
        const userId = getCurrentUserId()
        if (!userId) throw new Error('Usuario no autenticado')
        
        // Si es la meta principal, usar la ruta específica
        if (goalId === 'main-goal') {
          const response = await api.post('/goals/main-goal/contribute', contributionData, {
            params: { user_id: userId }
          })
          return response.data
        } else {
          // Para metas regulares, usar la ruta con ObjectId
          const response = await api.post(`/goals/${goalId}/contribute`, contributionData, {
            params: { user_id: userId }
          })
          return response.data
        }
      } catch (error) {
        const message = error.response?.data?.detail || 'Error al realizar abono'
        throw new Error(message)
      }
    },

    // Set goal as main
    async setAsMain(goalId) {
      try {
        const userId = getCurrentUserId()
        if (!userId) throw new Error('Usuario no autenticado')
        
        const response = await api.post(`/goals/${goalId}/set-main`, {}, {
          params: { user_id: userId }
        })
        return response.data
      } catch (error) {
        const message = error.response?.data?.detail || 'Error al establecer meta principal'
        throw new Error(message)
      }
    },

    // Delete goal
    async delete(goalId) {
      try {
        const userId = getCurrentUserId()
        if (!userId) throw new Error('Usuario no autenticado')
        
        await api.delete(`/goals/${goalId}`, {
          params: { user_id: userId }
        })
        return true
      } catch (error) {
        const message = error.response?.data?.detail || 'Error al eliminar meta'
        throw new Error(message)
      }
    },

    // Get goal statistics
    async getStats() {
      try {
        const userId = getCurrentUserId()
        if (!userId) {
          console.error('getStats - Usuario no autenticado')
          throw new Error('Usuario no autenticado')
        }
        
        console.log('getStats - Obteniendo estadísticas para usuario:', userId)
        
        const response = await api.get('/goals/stats/summary', {
          params: { user_id: userId }
        })
        
        console.log('getStats - Respuesta del servidor:', response.data)
        return response.data
      } catch (error) {
        console.error('getStats - Error en la petición:', error)
        const status = error.response?.status
        const url = error.config?.url
        const message = error.response?.data?.detail || 'Error al obtener estadísticas'
        const fullMessage = `getStats failed (${status}): ${message} - URL: ${url}`
        throw new Error(fullMessage)
      }
    },

    // Get goal trends
    async getTrends() {
      try {
        const response = await api.get('/goals/trends/popular')
        return response.data
      } catch (error) {
        const message = error.response?.data?.detail || 'Error al obtener tendencias'
        throw new Error(message)
      }
    },

    // Get monthly savings
    async getMonthlySavings(months = 6) {
      try {
        const userId = getCurrentUserId()
        if (!userId) throw new Error('Usuario no autenticado')
        
        const response = await api.get('/goals/analytics/monthly-savings', {
          params: { user_id: userId, months }
        })
        return response.data
      } catch (error) {
        const message = error.response?.data?.detail || 'Error al obtener ahorro mensual'
        throw new Error(message)
      }
    },

    // Get monthly contributions
    async getMonthlyContributions(months = 6, category = null) {
      try {
        const userId = getCurrentUserId()
        if (!userId) throw new Error('Usuario no autenticado')
        
        const params = { user_id: userId, months }
        if (category) {
          params.category = category
        }
        
        const response = await api.get('/goals/analytics/monthly-contributions', {
          params
        })
        return response.data
      } catch (error) {
        const message = error.response?.data?.detail || 'Error al obtener abonos mensuales'
        throw new Error(message)
      }
    },

    // Get daily contributions by goal
    async getDailyContributionsByGoal(goalId, year = null, month = null) {
      try {
        const userId = getCurrentUserId()
        if (!userId) throw new Error('Usuario no autenticado')
        
        const params = { user_id: userId }
        if (year) params.year = year
        if (month) params.month = month
        
        const response = await api.get(`/goals/analytics/daily-contributions/${goalId}`, {
          params
        })
        return response.data
      } catch (error) {
        const message = error.response?.data?.detail || 'Error al obtener abonos diarios'
        throw new Error(message)
      }
    },

    // Get categories
    async getCategories() {
      try {
        const response = await api.get('/goals/categories/list')
        return response.data.categories
      } catch (error) {
        const message = error.response?.data?.detail || 'Error al obtener categorías'
        throw new Error(message)
      }
    }
  },

  // Reports API
  reports: {
    // Get monthly summary
    async getMonthlySummary(year, month) {
      try {
        const url = `/reports/monthly-summary/${year}/${month}`
        console.log(`DEBUG apiService - getMonthlySummary URL: ${API_BASE_URL}${url}`)
        const response = await api.get(url)
        console.log(`DEBUG apiService - getMonthlySummary response type:`, typeof response.data)
        console.log(`DEBUG apiService - getMonthlySummary response:`, response.data)
        return response.data
      } catch (error) {
        console.error(`DEBUG apiService - getMonthlySummary ERROR:`, error)
        const message = error.response?.data?.detail || 'Error al obtener resumen mensual'
        throw new Error(message)
      }
    },

    // Get expense categories report
    async getExpenseCategories(startDate, endDate) {
      try {
        const params = {}
        if (startDate) params.start_date = startDate
        if (endDate) params.end_date = endDate
        
        const response = await api.get('/reports/expense-categories', { params })
        return response.data
      } catch (error) {
        const raw = error.response?.data?.detail
        const message = typeof raw === 'string' ? raw : raw ? JSON.stringify(raw) : 'Error al obtener reporte de categorías'
        throw new Error(message)
      }
    },

    // Get daily expenses report
    async getDailyExpenses(weekStart) {
      try {
        const params = {}
        if (weekStart) params.week_start = weekStart
        
        const response = await api.get('/reports/daily-expenses', { params })
        return response.data
      } catch (error) {
        const message = error.response?.data?.detail || 'Error al obtener reporte de gastos diarios'
        throw new Error(message)
      }
    },

    // Get income trend report
    async getIncomeTrend(months = 8) {
      try {
        const response = await api.get('/reports/income-trend', {
          params: { months }
        })
        return response.data
      } catch (error) {
        const message = error.response?.data?.detail || 'Error al obtener tendencia de ingresos'
        throw new Error(message)
      }
    },

    // Get savings evolution report
    async getSavingsEvolution(months = 8) {
      try {
        const response = await api.get('/reports/savings-evolution', {
          params: { months }
        })
        return response.data
      } catch (error) {
        const message = error.response?.data?.detail || 'Error al obtener evolución de ahorros'
        throw new Error(message)
      }
    },

    // Get comprehensive report
    async getComprehensiveReport(year, month) {
      try {
        const params = {}
        if (year) params.year = year
        if (month) params.month = month
        
        const response = await api.get('/reports/comprehensive', { params })
        return response.data
      } catch (error) {
        const message = error.response?.data?.detail || 'Error al obtener reporte completo'
        throw new Error(message)
      }
    },

    // Get user reports
    async getUserReports(limit = 10) {
      try {
        const response = await api.get('/reports/user-reports', {
          params: { limit }
        })
        return response.data
      } catch (error) {
        const message = error.response?.data?.detail || 'Error al obtener reportes del usuario'
        throw new Error(message)
      }
    },

    // Search reports
    async searchReports(query, reportTypes = null) {
      try {
        const response = await api.post('/reports/search', {
          query,
          report_types: reportTypes,
          limit: 10
        })
        return response.data
      } catch (error) {
        const message = error.response?.data?.detail || 'Error al buscar reportes'
        throw new Error(message)
      }
    },

    // Get report stats
    async getReportStats() {
      try {
        const response = await api.get('/reports/stats')
        return response.data
      } catch (error) {
        const message = error.response?.data?.detail || 'Error al obtener estadísticas de reportes'
        throw new Error(message)
      }
    },

    // Export report to PDF
    async exportToPDF(reportType, periodStart, periodEnd, options = {}) {
      try {
        const response = await api.post('/reports/export/pdf', {
          report_type: reportType,
          period_start: periodStart,
          period_end: periodEnd,
          include_charts: options.includeCharts !== false,
          include_details: options.includeDetails !== false,
          custom_title: options.customTitle
        })
        return response.data
      } catch (error) {
        const message = error.response?.data?.detail || 'Error al exportar reporte a PDF'
        throw new Error(message)
      }
    },

    // Delete report
    async deleteReport(reportId) {
      try {
        await api.delete(`/reports/${reportId}`)
        return true
      } catch (error) {
        const message = error.response?.data?.detail || 'Error al eliminar reporte'
        throw new Error(message)
      }
    },

    // Get expense categories list
    async getExpenseCategoriesList() {
      try {
        const response = await api.get('/reports/categories')
        return response.data
      } catch (error) {
        const message = error.response?.data?.detail || 'Error al obtener categorías de gastos'
        throw new Error(message)
      }
    },

    // Get available months
    async getAvailableMonths() {
      try {
        const response = await api.get('/reports/months-available')
        return response.data
      } catch (error) {
        const message = error.response?.data?.detail || 'Error al obtener meses disponibles'
        throw new Error(message)
      }
    }
  },

  // User Settings API
  userSettings: {
    // Get user profile
    async getProfile() {
      try {
        const response = await api.get('/user-settings/profile')
        return response.data
      } catch (error) {
        const message = error.response?.data?.detail || 'Error al obtener perfil del usuario'
        throw new Error(message)
      }
    },

    // Update user profile
    async updateProfile(profileData) {
      try {
        const response = await api.put('/user-settings/profile', profileData)
        return response.data
      } catch (error) {
        const message = error.response?.data?.detail || 'Error al actualizar perfil'
        throw new Error(message)
      }
    },

    // Update profile picture
    async updateProfilePicture(profilePicture) {
      try {
        const response = await api.put('/user-settings/profile-picture', {
          profile_picture: profilePicture
        })
        return response.data
      } catch (error) {
        const message = error.response?.data?.detail || 'Error al actualizar foto de perfil'
        throw new Error(message)
      }
    },

    // Update password
    async updatePassword(passwordData) {
      try {
        const response = await api.put('/user-settings/password', passwordData)
        return response.data
      } catch (error) {
        const message = error.response?.data?.detail || 'Error al actualizar contraseña'
        throw new Error(message)
      }
    },

    // Get notification settings
    async getNotificationSettings() {
      try {
        const response = await api.get('/user-settings/notifications')
        return response.data
      } catch (error) {
        const message = error.response?.data?.detail || 'Error al obtener configuración de notificaciones'
        throw new Error(message)
      }
    },

    // Update notification settings
    async updateNotificationSettings(settings) {
      try {
        const response = await api.put('/user-settings/notifications', settings)
        return response.data
      } catch (error) {
        const message = error.response?.data?.detail || 'Error al actualizar configuración de notificaciones'
        throw new Error(message)
      }
    },

    // Get privacy settings
    async getPrivacySettings() {
      try {
        const response = await api.get('/user-settings/privacy')
        return response.data
      } catch (error) {
        const message = error.response?.data?.detail || 'Error al obtener configuración de privacidad'
        throw new Error(message)
      }
    },

    // Update privacy settings
    async updatePrivacySettings(settings) {
      try {
        const response = await api.put('/user-settings/privacy', settings)
        return response.data
      } catch (error) {
        const message = error.response?.data?.detail || 'Error al actualizar configuración de privacidad'
        throw new Error(message)
      }
    },

    // Get user preferences
    async getUserPreferences() {
      try {
        const response = await api.get('/user-settings/preferences')
        return response.data
      } catch (error) {
        const message = error.response?.data?.detail || 'Error al obtener preferencias del usuario'
        throw new Error(message)
      }
    },

    // Update user preferences
    async updateUserPreferences(preferences) {
      try {
        const response = await api.put('/user-settings/preferences', preferences)
        return response.data
      } catch (error) {
        const message = error.response?.data?.detail || 'Error al actualizar preferencias del usuario'
        throw new Error(message)
      }
    },

    // Get complete settings
    async getCompleteSettings() {
      try {
        const response = await api.get('/user-settings/complete')
        return response.data
      } catch (error) {
        const message = error.response?.data?.detail || 'Error al obtener ajustes completos'
        throw new Error(message)
      }
    },

    // Get user settings stats
    async getUserSettingsStats() {
      try {
        const response = await api.get('/user-settings/stats')
        return response.data
      } catch (error) {
        const message = error.response?.data?.detail || 'Error al obtener estadísticas de ajustes'
        throw new Error(message)
      }
    },

    // Validate field
    async validateField(fieldName, fieldValue) {
      try {
        const response = await api.post('/user-settings/validate-field', null, {
          params: {
            field_name: fieldName,
            field_value: fieldValue
          }
        })
        return response.data
      } catch (error) {
        const message = error.response?.data?.detail || 'Error al validar campo'
        throw new Error(message)
      }
    },

    // Delete user account
    async deleteUserAccount() {
      try {
        const response = await api.delete('/user-settings/account')
        return response.data
      } catch (error) {
        const message = error.response?.data?.detail || 'Error al eliminar cuenta'
        throw new Error(message)
      }
    },

    // Get available countries
    async getAvailableCountries() {
      try {
        const response = await api.get('/user-settings/countries')
        return response.data
      } catch (error) {
        const message = error.response?.data?.detail || 'Error al obtener países disponibles'
        throw new Error(message)
      }
    },

    // Get phone formats
    async getPhoneFormats() {
      try {
        const response = await api.get('/user-settings/phone-formats')
        return response.data
      } catch (error) {
        const message = error.response?.data?.detail || 'Error al obtener formatos de teléfono'
        throw new Error(message)
      }
    }
  },

  // Config API
  config: {
    // Get regional configuration
    async getRegional() {
      try {
        const response = await api.get('/config/regional')
        return response.data
      } catch (error) {
        const message = error.response?.data?.detail || 'Error al obtener configuración'
        throw new Error(message)
      }
    }
  }
}
