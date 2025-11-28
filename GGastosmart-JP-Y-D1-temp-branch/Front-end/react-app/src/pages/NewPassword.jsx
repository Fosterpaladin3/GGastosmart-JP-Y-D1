import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import '../styles/auth.css'

const NewPassword = () => {
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  
  // Estados de validación de contraseña
  const [passwordRequirements, setPasswordRequirements] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false
  })

  const navigate = useNavigate()
  const location = useLocation()

  // Verificar que el código fue verificado
  useEffect(() => {
    const emailFromState = location.state?.email
    const emailFromStorage = localStorage.getItem('resetEmail')
    const codeVerified = localStorage.getItem('codeVerified')
    
    // Si no hay email o no se verificó el código, redirigir
    if (!emailFromStorage || codeVerified !== 'true') {
      navigate('/password-reset')
      return
    }
    
    setEmail(emailFromState || emailFromStorage)
  }, [location, navigate])

  // Validar contraseña en tiempo real
  const validatePassword = (password) => {
    const requirements = {
      length: password.length >= 8,
      uppercase: /(?=.*[A-Z])/.test(password),
      lowercase: /(?=.*[a-z])/.test(password),
      number: /(?=.*\d|[!@#$%^&*(),.?":{}|<>])/.test(password)
    }
    setPasswordRequirements(requirements)
    return Object.values(requirements).every(req => req === true)
  }

  // Manejo de cambio de contraseña
  const handlePasswordChange = (e) => {
    const password = e.target.value
    setNewPassword(password)
    validatePassword(password)
    setError('')
  }

  // Verificar si todas las validaciones pasan
  const allRequirementsMet = Object.values(passwordRequirements).every(req => req === true) && newPassword.length > 0

  // Manejo de envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Validaciones
    if (!newPassword) {
      setError('Por favor, ingresa una nueva contraseña')
      return
    }

    if (!confirmPassword) {
      setError('Por favor, confirma tu nueva contraseña')
      return
    }

    if (newPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }

    if (!validatePassword(newPassword)) {
      setError('La contraseña no cumple con todos los requisitos de seguridad')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    try {
      setLoading(true)

      // Actualizar la contraseña en el servidor
      const resetResponse = await fetch('http://127.0.0.1:8000/api/users/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          new_password: newPassword
        })
      })

      if (resetResponse.ok) {
        // Limpiar datos del localStorage
        localStorage.removeItem('resetEmail')
        localStorage.removeItem('codeVerified')
        
        // Mostrar mensaje de éxito en pantalla
        setSuccess('¡Contraseña actualizada exitosamente!')
        setRedirecting(true)
        
        // Redirigir al login después de 1.5 segundos
        setTimeout(() => {
          navigate('/login', {
            state: { message: 'Contraseña actualizada exitosamente. Ahora puedes iniciar sesión.' },
            replace: true
          })
        }, 1500)
      } else {
        const resetData = await resetResponse.json()
        setError(resetData.detail || 'Error al actualizar la contraseña')
        setLoading(false)
      }

    } catch (err) {
      setError('Error de conexión con el servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <section className="login">
        <div className="login__grid">
          <aside className="login__left">
            <div className="brand">
              <div className="brand__logo" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                </svg>
              </div>
              <h1 className="brand__title">Nueva Contraseña</h1>
              <p className="brand__subtitle">
                Código verificado exitosamente. Ahora puedes establecer una nueva contraseña segura para tu cuenta.
              </p>
            </div>

            <ul className="features" role="list">
              <li className="feature">
                <div className="feature__icon">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                  </svg>
                </div>
                <div className="feature__content">
                  <h3 className="feature__title">Seguridad</h3>
                  <p className="feature__desc">Tu contraseña será encriptada</p>
                </div>
              </li>

              <li className="feature">
                <div className="feature__icon">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <div className="feature__content">
                  <h3 className="feature__title">Requisitos</h3>
                  <p className="feature__desc">Asegura una contraseña fuerte</p>
                </div>
              </li>

              <li className="feature">
                <div className="feature__icon">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M12 1a9 9 0 0 0-9 9v3.28l-1.447 3.447A1 1 0 0 0 2.447 18H6a9 9 0 1 0 6-17ZM4 10a8 8 0 1 1 8 8 8.03 8.03 0 0 1-7.06-4H4.447L6 11.72V10Z"/>
                  </svg>
                </div>
                <div className="feature__content">
                  <h3 className="feature__title">Último Paso</h3>
                  <p className="feature__desc">Ya casi terminas</p>
                </div>
              </li>
            </ul>
          </aside>

          <section className="login__right">
            <div className="formwrap">
              <h2 className="formwrap__title">CREAR NUEVA CONTRASEÑA</h2>
              <p className="formwrap__subtitle">
                Establece una contraseña segura para: <strong>{email}</strong>
              </p>

              {error && <div className="error-message show">{error}</div>}
              {(success || redirecting) && (
                <div style={{
                  background: '#d1fae5',
                  border: '1px solid #059669',
                  color: '#047857',
                  padding: '1rem',
                  borderRadius: '8px',
                  marginBottom: '1.5rem',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  textAlign: 'center'
                }}>
                  {redirecting ? '✓ Contraseña actualizada. Redirigiendo al login...' : success}
                </div>
              )}

              <form className="form" onSubmit={handleSubmit}>
                <div className="form__row">
                  <label className="label">Nueva contraseña:</label>
                  <div className="field field--password">
                    <div className="field__icon">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                      </svg>
                    </div>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="••••••••••••"
                      value={newPassword}
                      onChange={(e) => {
                        handlePasswordChange(e)
                        setSuccess('') // Limpiar mensaje de éxito al escribir
                      }}
                      required
                      autoComplete="new-password"
                      autoFocus
                    />
                    <button 
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      aria-label={showNewPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showNewPassword ? (
                        <svg className="eye-off-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                          <line x1="1" y1="1" x2="23" y2="23"/>
                        </svg>
                      ) : (
                        <svg className="eye-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Requisitos de contraseña */}
                {newPassword && (
                  <div 
                    className={`password-requirements ${allRequirementsMet ? 'all-valid' : ''}`}
                    style={{
                      marginTop: '-0.5rem',
                      marginBottom: '1rem',
                      padding: '1rem',
                      background: allRequirementsMet ? '#d1fae5' : '#fef3c7',
                      borderRadius: '8px',
                      border: `2px solid ${allRequirementsMet ? '#059669' : '#f59e0b'}`,
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <div style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                      La contraseña debe contener:
                    </div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      <li style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem', 
                        color: passwordRequirements.length ? '#059669' : '#6b7280',
                        fontSize: '0.85rem',
                        marginBottom: '0.25rem'
                      }}>
                        <span style={{ fontWeight: '700' }}>
                          {passwordRequirements.length ? '✓' : '✗'}
                        </span>
                        Mínimo 8 caracteres
                      </li>
                      <li style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem', 
                        color: passwordRequirements.uppercase ? '#059669' : '#6b7280',
                        fontSize: '0.85rem',
                        marginBottom: '0.25rem'
                      }}>
                        <span style={{ fontWeight: '700' }}>
                          {passwordRequirements.uppercase ? '✓' : '✗'}
                        </span>
                        Una letra mayúscula
                      </li>
                      <li style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem', 
                        color: passwordRequirements.lowercase ? '#059669' : '#6b7280',
                        fontSize: '0.85rem',
                        marginBottom: '0.25rem'
                      }}>
                        <span style={{ fontWeight: '700' }}>
                          {passwordRequirements.lowercase ? '✓' : '✗'}
                        </span>
                        Una letra minúscula
                      </li>
                      <li style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem', 
                        color: passwordRequirements.number ? '#059669' : '#6b7280',
                        fontSize: '0.85rem'
                      }}>
                        <span style={{ fontWeight: '700' }}>
                          {passwordRequirements.number ? '✓' : '✗'}
                        </span>
                        Un número o símbolo
                      </li>
                    </ul>
                  </div>
                )}

                <div className="form__row">
                  <label className="label">Confirmar nueva contraseña:</label>
                  <div className="field field--password">
                    <div className="field__icon">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                      </svg>
                    </div>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••••••"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value)
                        setError('')
                        setSuccess('')
                      }}
                      required
                      autoComplete="new-password"
                    />
                    <button 
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showConfirmPassword ? (
                        <svg className="eye-off-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                          <line x1="1" y1="1" x2="23" y2="23"/>
                        </svg>
                      ) : (
                        <svg className="eye-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="form__row">
                  <button 
                    type="submit" 
                    className="btn" 
                    disabled={loading || redirecting || !allRequirementsMet}
                    style={{ 
                      width: '100%',
                      opacity: (loading || redirecting || !allRequirementsMet) ? 0.6 : 1 
                    }}
                  >
                    {redirecting ? (
                      <>
                        <div className="loading-spinner"></div>
                        Redirigiendo...
                      </>
                    ) : loading ? (
                      <>
                        <div className="loading-spinner"></div>
                        Actualizando contraseña...
                      </>
                    ) : (
                      'Cambiar Contraseña'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </section>
        </div>
      </section>
    </div>
  )
}

export default NewPassword

