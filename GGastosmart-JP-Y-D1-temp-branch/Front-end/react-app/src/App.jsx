import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { BalanceProvider } from './contexts/BalanceContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { PublicRoute } from './components/PublicRoute'
import useSessionTimeout from './hooks/useSessionTimeout'

// Pages
import Login from './pages/Login'
import Signup from './pages/Signup'
import InitialBudget from './pages/InitialBudget'
import Dashboard from './pages/Dashboard'
import IncomeExpenses from './pages/IncomeExpenses'
import Goals from './pages/Goals'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import PasswordReset from './pages/PasswordReset'
import VerifyRecoveryCode from './pages/VerifyRecoveryCode'
import NewPassword from './pages/NewPassword'
import VerifyRegistrationCode from './pages/VerifyRegistrationCode'

// Componente interno que usa el hook de timeout
function AppContent() {
  // Activar el timeout de sesión globalmente
  useSessionTimeout()

  // Limpiar sesiones antiguas de localStorage al cargar la app
  React.useEffect(() => {
    // Si no hay sesión activa en sessionStorage, limpiar solo datos de sesión
    const hasActiveSession = sessionStorage.getItem('token') || sessionStorage.getItem('user')
    
    if (!hasActiveSession) {
      // No hay sesión activa, limpiar solo datos de sesión (NO las metas)
      const keysToRemove = ['token', 'user', 'lastActivity']
      keysToRemove.forEach(key => localStorage.removeItem(key))
      // userFinancialGoal y mainGoalId se mantienen para recargar del backend
    }
  }, [])

  return (
    <div className="App">
      <Routes>
          {/* Public routes */}
          <Route path="/login" element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } />
          <Route path="/signup" element={
            <PublicRoute>
              <Signup />
            </PublicRoute>
          } />
          <Route path="/password-reset" element={
            <PublicRoute>
              <PasswordReset />
            </PublicRoute>
          } />
          <Route path="/verify-recovery-code" element={
            <PublicRoute>
              <VerifyRecoveryCode />
            </PublicRoute>
          } />
          <Route path="/new-password" element={
            <PublicRoute>
              <NewPassword />
            </PublicRoute>
          } />
          <Route path="/verify-registration-code" element={
            <PublicRoute>
              <VerifyRegistrationCode />
            </PublicRoute>
          } />

          {/* Protected routes */}
          <Route path="/initial-budget" element={
            <ProtectedRoute>
              <InitialBudget />
            </ProtectedRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/income-expenses" element={
            <ProtectedRoute>
              <IncomeExpenses />
            </ProtectedRoute>
          } />
          <Route path="/goals" element={
            <ProtectedRoute>
              <Goals />
            </ProtectedRoute>
          } />
          <Route path="/reports" element={
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          } />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <BalanceProvider>
        <AppContent />
      </BalanceProvider>
    </AuthProvider>
  )
}

export default App
