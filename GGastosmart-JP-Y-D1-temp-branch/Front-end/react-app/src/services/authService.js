import axios from 'axios'

const API_BASE_URL = '/api'

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
    // Buscar token primero en sessionStorage (sesión actual)
    // Si no existe, buscar en localStorage (para compatibilidad)
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

export const authService = {
  // Get current user from sessionStorage (prioridad) o localStorage (compatibilidad)
  getCurrentUser() {
    try {
      // Primero intentar sessionStorage (sesión actual)
      let userData = sessionStorage.getItem('user')
      
      // Si no existe en sessionStorage, buscar en localStorage (sesión antigua)
      if (!userData) {
        userData = localStorage.getItem('user')
        // Si encontramos en localStorage, migrar a sessionStorage
        if (userData) {
          sessionStorage.setItem('user', userData)
          const token = localStorage.getItem('token')
          if (token) {
            sessionStorage.setItem('token', token)
          }
        }
      }
      
      return userData ? JSON.parse(userData) : null
    } catch (error) {
      console.error('Error getting current user:', error)
      return null
    }
  },

  // Login user
  async login(email, password) {
    try {
      const response = await api.post('/users/login', {
        email,
        password
      })
      
      const responseData = response.data
      const token = responseData.access_token
      const user = responseData.user
      
      // Store user data and token in sessionStorage (se limpia al cerrar navegador)
      sessionStorage.setItem('user', JSON.stringify(user))
      sessionStorage.setItem('token', token)
      
      // Limpiar cualquier dato antiguo de localStorage
      localStorage.removeItem('user')
      localStorage.removeItem('token')
      
      return user
    } catch (error) {
      console.log('Error en authService.login:', error) // Debug
      
      let message = 'Error al iniciar sesión'
      
      // Manejar diferentes tipos de errores
      if (error.response?.data?.detail) {
        message = error.response.data.detail
      } else if (error.message) {
        message = error.message
      } else if (error.code === 'ERR_NETWORK' || error.message?.includes('Failed to fetch')) {
        message = 'Error de conexión. Verifique que el servidor esté funcionando'
      }
      
      // Crear un error personalizado que mantenga la información del response
      const customError = new Error(message)
      customError.response = error.response
      customError.status = error.response?.status
      customError.code = error.code
      throw customError
    }
  },

  // Register user
  async register(userData) {
    try {
      // Transform frontend field names to backend field names
      const backendData = {
        first_name: userData.firstName,
        last_name: userData.lastName,
        email: userData.email,
        password: userData.password,
        initial_budget: 1000000, // Default budget (COP)
        budget_period: 'mensual' // Default period
      }
      
      const response = await api.post('/users/register', backendData)
      return response.data
    } catch (error) {
      const message = error.response?.data?.detail || 'Error al registrar usuario'
      throw new Error(message)
    }
  },

  // Send verification code
  async sendVerificationCode(email, purpose) {
    try {
      const response = await api.post('/users/send-verification-code', {
        email,
        purpose
      })
      return response.data
    } catch (error) {
      const message = error.response?.data?.detail || 'Error al enviar código de verificación'
      throw new Error(message)
    }
  },

  // Verify code
  async verifyCode(email, code, purpose) {
    try {
      const response = await api.post('/users/verify-code', {
        email,
        code,
        purpose
      })
      return response.data
    } catch (error) {
      const message = error.response?.data?.detail || 'Error al verificar código'
      throw new Error(message)
    }
  },

  // Reset password
  async resetPassword(email, newPassword) {
    try {
      const response = await api.post('/users/reset-password', {
        email,
        new_password: newPassword
      })
      return response.data
    } catch (error) {
      const message = error.response?.data?.detail || 'Error al restablecer contraseña'
      throw new Error(message)
    }
  },

  // Update user budget
  async updateBudget(userId, budgetData) {
    try {
      const response = await api.put(`/users/${userId}/budget`, budgetData)
      const updatedUser = response.data
      
      // Update stored user data
      this.updateUserData(updatedUser)
      
      return updatedUser
    } catch (error) {
      const message = error.response?.data?.detail || 'Error al actualizar presupuesto'
      throw new Error(message)
    }
  },

  // Update user budget (new method for initial budget setup)
  async updateUserBudget(initialBudget, budgetPeriod) {
    try {
      const currentUser = this.getCurrentUser()
      if (!currentUser || !currentUser.id) {
        throw new Error('Usuario no autenticado')
      }

      const response = await api.put(`/users/${currentUser.id}/budget`, {
        initial_budget: initialBudget,
        budget_period: budgetPeriod
      })
      const updatedUser = response.data
      
      // Update stored user data
      this.updateUserData(updatedUser)
      
      return updatedUser
    } catch (error) {
      const message = error.response?.data?.detail || 'Error al configurar presupuesto'
      throw new Error(message)
    }
  },

  // Update user data in sessionStorage
  updateUserData(userData) {
    try {
      sessionStorage.setItem('user', JSON.stringify(userData))
      // También actualizar en localStorage para compatibilidad
      localStorage.removeItem('user')
    } catch (error) {
      console.error('Error updating user data:', error)
    }
  },

  // Logout user
  logout() {
    // Limpiar sessionStorage (sesión actual)
    sessionStorage.clear()
    
    // Limpiar localStorage (datos de sesión)
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    localStorage.removeItem('registrationEmail')
    localStorage.removeItem('registrationUserData')
    localStorage.removeItem('lastActivity')
    
    // NO eliminar userFinancialGoal ni mainGoalId
    // Estos se recargarán del backend en la próxima sesión
  },

  // Clear user data
  clearUserData() {
    this.logout()
  },

  // Clear only financial goal (for when user wants to reconfigure)
  clearFinancialGoal() {
    localStorage.removeItem('userFinancialGoal')
    localStorage.removeItem('mainGoalId')
    console.log('Meta principal eliminada del localStorage')
  }
}
