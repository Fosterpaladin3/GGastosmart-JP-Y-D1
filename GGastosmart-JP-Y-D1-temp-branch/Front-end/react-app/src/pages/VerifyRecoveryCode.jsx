import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import '../styles/auth.css'

const VerifyRecoveryCode = () => {
  const [code, setCode] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [timeLeft, setTimeLeft] = useState(600) // 10 minutos
  const [canResend, setCanResend] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)
  const [redirecting, setRedirecting] = useState(false)
  
  const navigate = useNavigate()
  const location = useLocation()

  // Inicializar email desde state o localStorage
  useEffect(() => {
    const emailFromState = location.state?.email
    const emailFromStorage = localStorage.getItem('resetEmail')
    const userEmail = emailFromState || emailFromStorage
    
    if (!userEmail) {
      navigate('/password-reset')
      return
    }
    setEmail(userEmail)
  }, [location, navigate])

  // Timer de expiración del código (10 minutos)
  useEffect(() => {
    if (timeLeft <= 0) return
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    
    return () => clearInterval(timer)
  }, [timeLeft])

  // Timer de reenvío (60 segundos)
  useEffect(() => {
    if (resendTimer <= 0) {
      setCanResend(true)
      return
    }
    
    const timer = setInterval(() => {
      setResendTimer(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          setCanResend(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    
    return () => clearInterval(timer)
  }, [resendTimer])

  // Formatear tiempo (mm:ss)
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Reenviar código
  const handleResendCode = async () => {
    if (!email || !canResend) return

    try {
      setLoading(true)
      const response = await fetch('http://127.0.0.1:8000/api/users/send-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          purpose: 'password_recovery'
        })
      })

      if (response.ok) {
        setError('')
        setTimeLeft(600) // Reiniciar timer de 10 minutos
        setResendTimer(60) // Nuevo timer de 60 segundos
        setCanResend(false)
        setCode('')
      } else {
        const data = await response.json()
        setError(data.detail || 'Error al reenviar código')
      }
    } catch (err) {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  // Verificar código
  const handleSubmit = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setError('')

    // Validaciones
    if (!code) {
      setError('Por favor, ingresa el código de verificación')
      return false
    }
    
    if (code.length !== 6) {
      setError('El código debe tener exactamente 6 dígitos')
      return false
    }

    if (!/^\d{6}$/.test(code)) {
      setError('El código debe contener solo números')
      return false
    }
    
    if (timeLeft === 0) {
      setError('El código ha expirado. Por favor, solicita uno nuevo.')
      return false
    }

    setLoading(true)

    try {
      // Verificar código
      const verifyResponse = await fetch('http://127.0.0.1:8000/api/users/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          code: code,
          purpose: 'password_recovery'
        })
      })

      if (!verifyResponse.ok) {
        setLoading(false)
        setRedirecting(false)
        
        const data = await verifyResponse.json()
        const errorMessage = data.detail || data.message || 'Código inválido o expirado'
        setError(errorMessage)
        
        // Si se acabaron los intentos
        if (errorMessage.includes('Máximo de intentos alcanzado')) {
          setError('Máximo de intentos alcanzado. Haz clic en "Reenviar código" para obtener uno nuevo.')
        }
        return false
      }

      // Código verificado exitosamente, guardar flag y redirigir a nueva contraseña
      localStorage.setItem('codeVerified', 'true')
      setRedirecting(true)
      
      setTimeout(() => {
        navigate('/new-password', { 
          state: { email },
          replace: true
        })
      }, 800)

    } catch (err) {
      setLoading(false)
      setRedirecting(false)
      setError('Error de conexión con el servidor')
    }
    
    return false
  }

  return (
    <div className="signup-container">
      <section className="signup">
        <div className="signup__grid">
          <aside className="signup__left">
            <div className="brand">
              <div className="brand__logo" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                </svg>
              </div>
              <h1 className="brand__title">Verifica tu Código</h1>
              <p className="brand__subtitle">
                Ingresa el código de 6 dígitos que enviamos a tu correo para continuar con la recuperación de contraseña
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
                  <h3 className="feature__title">Código Seguro</h3>
                  <p className="feature__desc">El código es válido por 10 minutos</p>
                </div>
              </li>

              <li className="feature">
                <div className="feature__icon">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                  </svg>
                </div>
                <div className="feature__content">
                  <h3 className="feature__title">Verifica tu Email</h3>
                  <p className="feature__desc">Revisa tu bandeja de entrada y spam</p>
                </div>
              </li>

              <li className="feature">
                <div className="feature__icon">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <div className="feature__content">
                  <h3 className="feature__title">Proceso Rápido</h3>
                  <p className="feature__desc">Solo toma unos segundos verificar</p>
                </div>
              </li>
            </ul>
          </aside>

          <section className="signup__right">
            <div className="formwrap">
              <h2 className="formwrap__title">VERIFICAR CÓDIGO</h2>
              <p className="formwrap__subtitle">
                Ingresa el código de 6 dígitos que recibiste en: <strong>{email}</strong>
              </p>

              {timeLeft > 0 && (
                <div style={{ 
                  textAlign: 'center', 
                  marginBottom: 'var(--spacing-lg)', 
                  color: 'var(--color-gray-600)',
                  fontSize: '0.95rem'
                }}>
                  El código expira en: {' '}
                  <strong style={{ 
                    color: timeLeft < 60 ? 'var(--color-error)' : 'var(--color-primary)',
                    fontSize: '1.1rem'
                  }}>
                    {formatTime(timeLeft)}
                  </strong>
                </div>
              )}

              {error && <div className="error-message show">{error}</div>}

              {redirecting && (
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
                  ✓ Código verificado. Redirigiendo...
                </div>
              )}

              <form className="form" onSubmit={handleSubmit}>
                <div className="form__row">
                  <label className="label">
                    Código de verificación:
                    <div className="field">
                      <div className="field__icon">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                        </svg>
                      </div>
                      <input
                        type="text"
                        placeholder="123456"
                        value={code}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 6)
                          setCode(val)
                          if (error) setError('') // Limpiar error al escribir
                        }}
                        required
                        maxLength="6"
                        disabled={timeLeft === 0}
                        autoFocus
                        style={{
                          letterSpacing: '0.3rem',
                          fontSize: '1.2rem',
                          textAlign: 'center',
                          fontWeight: '600'
                        }}
                      />
                    </div>
                  </label>
                </div>

                <div className="form__row">
                  <button 
                    type="submit" 
                    className="btn" 
                    disabled={loading || redirecting || !email || code.length !== 6 || timeLeft === 0}
                    style={{ width: '100%' }}
                  >
                    {redirecting ? (
                      <>
                        <div className="loading-spinner"></div>
                        Redirigiendo...
                      </>
                    ) : loading ? (
                      <>
                        <div className="loading-spinner"></div>
                        Verificando...
                      </>
                    ) : timeLeft === 0 ? (
                      'Código Expirado'
                    ) : (
                      'Verificar Código'
                    )}
                  </button>
                </div>
              </form>

              <div className="formwrap__footer">
                <p className="footer__text">
                  ¿No recibiste el código? {' '}
                  {canResend ? (
                    <button 
                      onClick={handleResendCode} 
                      disabled={loading}
                      style={{ 
                        border: 'none', 
                        background: 'none', 
                        color: 'var(--color-primary)', 
                        cursor: 'pointer', 
                        padding: 0,
                        textDecoration: 'underline',
                        fontWeight: '600'
                      }}
                    >
                      Reenviar código
                    </button>
                  ) : (
                    <span style={{ color: 'var(--color-gray-500)' }}>
                      Espera {resendTimer}s para reenviar
                    </span>
                  )}
                </p>
              </div>
            </div>
          </section>
        </div>
      </section>
    </div>
  )
}

export default VerifyRecoveryCode
