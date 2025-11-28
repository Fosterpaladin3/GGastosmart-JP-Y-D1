import React from 'react'
import { useAuth } from '../contexts/AuthContext'

const Header = ({ onMobileMenuToggle, hideBudget = false }) => {
  const { user } = useAuth()

  const formatNumberWithThousands = (number) => {
    return number ? number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '0'
  }

  return (
    <header className="main-header">
      <div className="header-content">
        <button 
          className="mobile-menu-toggle" 
          onClick={onMobileMenuToggle}
          aria-label="Abrir menú"
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
          </svg>
        </button>
        <h1 className="page-title">GastoSmart</h1>
        {!hideBudget && (
          <div className="budget-pill">
            <span className="budget-label">Presupuesto:</span>
            <span className="budget-amount">${formatNumberWithThousands(user?.initial_budget || 0)} pesos</span>
          </div>
        )}
        <div className="header-right">
          <button className="notification-btn" aria-label="Notificaciones">
            <svg className="notification-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
            </svg>
          </button>
          <div className="user-dropdown">
            <button className="user-profile-btn">
              <div className="user-avatar">
                <span>{user?.first_name?.charAt(0).toUpperCase()}{user?.last_name?.charAt(0).toUpperCase()}</span>
              </div>
              <div className="user-info">
                <span className="user-name">{user?.first_name} {user?.last_name}</span>
                <span className="user-role">Usuario</span>
              </div>
              <svg className="dropdown-icon" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M7 10l5 5 5-5z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header