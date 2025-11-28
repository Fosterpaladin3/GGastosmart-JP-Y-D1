import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export const PublicRoute = ({ children }) => {
  const { isAuthenticated, isBudgetConfigured, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
      </div>
    )
  }

  // If user is authenticated and has budget configured, redirect to dashboard
  if (isAuthenticated && isBudgetConfigured) {
    return <Navigate to="/dashboard" replace />
  }

  // If user is authenticated but hasn't configured budget, redirect to initial-budget
  if (isAuthenticated && !isBudgetConfigured) {
    return <Navigate to="/initial-budget" replace />
  }

  return children
}
