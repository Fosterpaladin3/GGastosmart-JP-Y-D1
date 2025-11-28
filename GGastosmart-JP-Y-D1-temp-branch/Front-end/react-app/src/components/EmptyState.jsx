import React from 'react'
import './EmptyState.css'

const EmptyState = ({ 
  message = 'Aún no tienes datos',
  icon = '📊',
  action = null,
  className = ''
}) => {
  return (
    <div className={`empty-state ${className}`}>
      <div className="empty-state-icon">{icon}</div>
      <p className="empty-state-message">{message}</p>
      {action && (
        <div className="empty-state-action">{action}</div>
      )}
    </div>
  )
}

export default EmptyState
