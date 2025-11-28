import React, { createContext, useContext, useState, useEffect } from 'react'
import { authService } from '../services/authService'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Check for existing session on app load
  useEffect(() => {
    const checkExistingSession = () => {
      try {
        // Check if user is already logged in
        const existingUser = authService.getCurrentUser()
        if (existingUser) {
          setUser(existingUser)
          console.log('Usuario encontrado en sesión:', existingUser)
        } else {
          console.log('No hay usuario en sesión')
        }
      } catch (error) {
        console.error('Error checking session:', error)
      } finally {
        setLoading(false)
      }
    }

    checkExistingSession()
  }, [])

  const login = async (email, password) => {
    try {
      setLoading(true)
      setError(null)
      const userData = await authService.login(email, password)
      setUser(userData)
      return userData
    } catch (error) {
      setError(error.message)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const register = async (userData) => {
    try {
      setLoading(true)
      setError(null)
      const newUser = await authService.register(userData)
      return newUser
    } catch (error) {
      setError(error.message)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    authService.logout()
    setUser(null)
    setError(null)
  }

  const updateUser = (userData) => {
    setUser(userData)
    authService.updateUserData(userData)
  }

  const updateUserBudget = async (initialBudget, budgetPeriod) => {
    try {
      setLoading(true)
      setError(null)
      const updatedUser = await authService.updateUserBudget(initialBudget, budgetPeriod)
      setUser(updatedUser)
      return updatedUser
    } catch (error) {
      setError(error.message)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const confirmCode = async (email, code, purpose) => {
    try {
      setLoading(true)
      setError(null)
      const result = await authService.verifyCode(email, code, purpose)
      return result
    } catch (error) {
      setError(error.message)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const hasBudgetConfigured = (userData = user) => {
    if (!userData) return false
    
    // Use budget_configured field if available
    if (userData.budget_configured !== undefined) {
      return userData.budget_configured === true
    }
    
    // Fallback for existing users without budget_configured field
    const isDefaultBudget = userData.initial_budget === 1000000
    return userData.initial_budget && 
           userData.budget_period && 
           userData.initial_budget > 0 && 
           userData.budget_period.trim() !== '' &&
           !isDefaultBudget
  }

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    updateUser,
    updateUserBudget,
    confirmCode,
    hasBudgetConfigured,
    isAuthenticated: !!user,
    isBudgetConfigured: hasBudgetConfigured()
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
