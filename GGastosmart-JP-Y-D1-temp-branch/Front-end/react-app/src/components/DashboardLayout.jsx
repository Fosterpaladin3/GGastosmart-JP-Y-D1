import React, { useState } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import '../styles/dashboard.css'

const DashboardLayout = ({ children, hideBudget = false }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  return (
    <div className="dashboard-layout">
      {isMobileMenuOpen && (
        <div 
          className={`mobile-menu-overlay ${isMobileMenuOpen ? 'active' : ''}`}
          onClick={closeMobileMenu}
        />
      )}
      <Sidebar isOpen={isMobileMenuOpen} onClose={closeMobileMenu} />
      <main className="main-content">
        <Header onMobileMenuToggle={toggleMobileMenu} hideBudget={hideBudget} />
        <div className="dashboard-content">
          <div className="content-container">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}

export default DashboardLayout

