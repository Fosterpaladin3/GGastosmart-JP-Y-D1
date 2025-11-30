import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import '../styles/auth.css'

const LoginComponent = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  
  // Estados para manejo de intentos fallidos y bloqueo
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [isBlocked, setIsBlocked] = useState(false)
  const [blockUntil, setBlockUntil] = useState(null)
  const [timeLeft, setTimeLeft] = useState(0)

  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Mostrar mensaje de sesión expirada si viene del state
  useEffect(() => {
    if (location.state?.message) {
      setInfo(location.state.message)
      // Limpiar el state para que no se muestre de nuevo después de 5 segundos
      const timer = setTimeout(() => {
        setInfo('')
        window.history.replaceState({}, document.title)
      }, 5000)
      
      return () => clearTimeout(timer)
    }
  }, [location])

  // Cargar solo el estado de bloqueo desde localStorage (NO los intentos fallidos)
  useEffect(() => {
    const savedBlockUntil = localStorage.getItem('loginBlockUntil')
    
    // Limpiar intentos fallidos al cargar la página
    localStorage.removeItem('loginFailedAttempts')
    setFailedAttempts(0)
    
    if (savedBlockUntil) {
      const blockTime = new Date(savedBlockUntil).getTime()
      const now = new Date().getTime()
      
      if (now < blockTime) {
        setIsBlocked(true)
        setBlockUntil(blockTime)
        setTimeLeft(Math.ceil((blockTime - now) / 1000))
      } else {
        // El bloqueo ha expirado, limpiar datos
        localStorage.removeItem('loginFailedAttempts')
        localStorage.removeItem('loginBlockUntil')
        setFailedAttempts(0)
        setIsBlocked(false)
        setBlockUntil(null)
      }
    }
  }, [])

  // Timer para el bloqueo de cuenta
  useEffect(() => {
    if (isBlocked && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsBlocked(false)
            setBlockUntil(null)
            localStorage.removeItem('loginFailedAttempts')
            localStorage.removeItem('loginBlockUntil')
            return 0
          }
          return prev - 1
        })
      }, 1000)
      
      return () => clearInterval(timer)
    }
  }, [isBlocked, timeLeft])

  // Función para formatear tiempo restante
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    setError('') // Clear error when user starts typing
    setInfo('') // Clear info message when user starts typing
    
    // Clear field-specific errors
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateForm = () => {
    const errors = {}
    
    // Solo validar que los campos no estén vacíos
    if (!formData.email.trim()) {
      errors.email = 'El correo electrónico es obligatorio'
    }
    
    if (!formData.password) {
      errors.password = 'La contraseña es obligatoria'
    }
    
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('handleSubmit ejecutado - NO debería recargar la página') // Debug
    setError('')
    setInfo('') // Limpiar mensaje de info al intentar login

    // RN-02: Verificar si la cuenta está bloqueada
    if (isBlocked) {
      setError(`Cuenta bloqueada temporalmente. Intente nuevamente en ${formatTime(timeLeft)}`)
      return false
    }

    // Validar formulario
    if (!validateForm()) {
      // No mostrar mensaje genérico, solo los errores de campo específicos
      return false
    }

    try {
      setLoading(true)
      
      // Verificar que el servidor esté funcionando antes de enviar datos
      console.log('Enviando datos al servidor:', { email: formData.email, password: '***' }) // Debug
      
      // Intentar login directamente - el backend nos dirá si el correo existe o no
      const userData = await login(formData.email, formData.password)
      
      // Login exitoso - limpiar intentos fallidos
      localStorage.removeItem('loginFailedAttempts')
      localStorage.removeItem('loginBlockUntil')
      setFailedAttempts(0)
      setIsBlocked(false)
      
      // RN-01: Configurar expiración de sesión a 30 minutos
      const sessionExpiry = new Date().getTime() + (30 * 60 * 1000) // 30 minutos
      localStorage.setItem('sessionExpiry', sessionExpiry.toString())
      
      // Redirección inteligente según configuración de presupuesto
      if (userData.budget_configured === true || 
          (userData.initial_budget && userData.initial_budget > 1000000)) {
        // Usuario ya tiene presupuesto configurado → Dashboard
        navigate('/dashboard')
      } else {
        // Usuario no tiene presupuesto configurado → Initial Budget
        navigate('/initial-budget')
      }
    } catch (err) {
      setLoading(false)
      
      console.log('Error en login:', err) // Debug
      console.log('Status (response):', err.response?.status) // Debug
      console.log('Status (direct):', err.status) // Debug
      console.log('Error code:', err.code) // Debug
      console.log('Data:', err.response?.data) // Debug
      console.log('Error message:', err.message) // Debug
      
      let errorMessage = 'Error al iniciar sesión'
      let fieldErrors = {}
      let shouldCountAttempt = false // Solo contar intentos para contraseñas incorrectas
      
      // Verificar si es un error de bloqueo por intentos fallidos
      if (err.message && err.message.includes('máximo de intentos') && err.message.includes('bloqueada')) {
        errorMessage = 'Cuenta bloqueada temporalmente. Intente nuevamente en 15 minutos'
        fieldErrors = {}
        shouldCountAttempt = false // NO contar este intento
        console.log('Cuenta bloqueada - NO contando intento') // Debug
        
        // Activar bloqueo en el frontend
        const blockUntil = new Date().getTime() + (15 * 60 * 1000) // 15 minutos
        setIsBlocked(true)
        setBlockUntil(blockUntil)
        setTimeLeft(15 * 60) // 15 minutos en segundos
        localStorage.setItem('loginBlockUntil', blockUntil.toString())
        
        // Limpiar intentos fallidos ya que el servidor ya bloqueó
        localStorage.removeItem('loginFailedAttempts')
        setFailedAttempts(0)
      }
      // Obtener el status del error (puede venir de err.status o err.response?.status)
      const errorStatus = err.status || err.response?.status
      
      // Manejar diferentes tipos de errores con mensajes específicos
      if (errorStatus === 401) {
        // Contraseña incorrecta (correo existe pero contraseña no coincide)
        errorMessage = 'CONTRASEÑA INCORRECTA'
        fieldErrors = {
          password: 'La contraseña no coincide con la registrada'
        }
        shouldCountAttempt = true // SÍ contar este intento
        console.log('Contraseña incorrecta - contando intento') // Debug
      } else if (errorStatus === 404) {
        // Correo no registrado
        errorMessage = 'CORREO NO ENCONTRADO EN LA BASE DE DATOS'
        fieldErrors = {
          email: 'Este correo no está registrado en nuestro sistema'
        }
        shouldCountAttempt = false // NO contar este intento
        console.log('Correo no existe - NO contando intento') // Debug
      } else if (errorStatus === 403) {
        // Verificar si es bloqueo por intentos o cuenta no verificada
        if (err.message && err.message.includes('bloqueada')) {
          errorMessage = 'Cuenta bloqueada temporalmente. Intente nuevamente en 15 minutos'
          fieldErrors = {}
          shouldCountAttempt = false
          console.log('Cuenta bloqueada (403) - NO contando intento') // Debug
        } else {
          errorMessage = 'Cuenta no verificada'
          fieldErrors = {
            email: 'Debes verificar tu cuenta primero'
          }
          shouldCountAttempt = false // NO contar este intento
          console.log('Cuenta no verificada - NO contando intento') // Debug
        }
      } else if (errorStatus === 500) {
        // Error interno del servidor
        errorMessage = 'Error interno del servidor. Por favor, intente más tarde'
        fieldErrors = {}
        shouldCountAttempt = false // NO contar intentos por errores del servidor
        console.log('Error 500 del servidor - NO contando intento') // Debug
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail
        shouldCountAttempt = false // NO contar intentos por errores del servidor
        console.log('Error del servidor - NO contando intento') // Debug
      } else if (err.code === 'ERR_NETWORK' || err.message?.includes('Failed to fetch') || err.message?.includes('Network Error') || err.message?.includes('ERR_CONNECTION_REFUSED')) {
        // Error de conexión
        errorMessage = 'Error de conexión. Verifique que el servidor esté funcionando'
        fieldErrors = {}
        shouldCountAttempt = false // NO contar intentos por errores de red
        console.log('Error de conexión - NO contando intento') // Debug
      } else if (err.message) {
        errorMessage = err.message
        shouldCountAttempt = false // NO contar intentos por errores de red
        console.log('Error de red - NO contando intento') // Debug
      }
      
      // RN-02: Solo contar intentos fallidos para contraseñas incorrectas
      if (shouldCountAttempt) {
        const newFailedAttempts = failedAttempts + 1
        setFailedAttempts(newFailedAttempts)
        localStorage.setItem('loginFailedAttempts', newFailedAttempts.toString())
        
        console.log('Contando intento fallido:', newFailedAttempts) // Debug
        
        // RN-02: Bloquear cuenta tras 5 intentos fallidos
        if (newFailedAttempts >= 5) {
          const blockUntil = new Date().getTime() + (15 * 60 * 1000) // 15 minutos
          setIsBlocked(true)
          setBlockUntil(blockUntil)
          setTimeLeft(15 * 60) // 15 minutos en segundos
          localStorage.setItem('loginBlockUntil', blockUntil.toString())
          
          errorMessage = 'Cuenta bloqueada temporalmente. Intente nuevamente en 15 minutos'
          fieldErrors = {}
        }
      } else {
        console.log('NO contando intento fallido - tipo de error:', err.response?.status) // Debug
      }
      
      if (errorMessage.includes('network') || errorMessage.includes('conexión')) {
        errorMessage = 'Error de conexión. Verifica tu internet e intenta de nuevo'
      }
      
      console.log('Mensaje de error final:', errorMessage) // Debug
      console.log('Errores de campo:', fieldErrors) // Debug
      console.log('Estableciendo error:', errorMessage) // Debug
      console.log('Estableciendo fieldErrors:', fieldErrors) // Debug
      
      setError(errorMessage)
      setFieldErrors(fieldErrors)
    }
    
    return false
  }


  return (
    <div className="login-container">
      <section className="login">
        <div className="login__grid">
          <aside className="login__left">
            <div className="brand">
              <div className="brand__logo" aria-hidden="true">
                <img src="/assets/logo.png" alt="GastoSmart Logo" />
              </div>
              <h1 className="brand__title">GastoSmart</h1>
              <p className="brand__subtitle">
                Bienvenido de vuelta. Accede a tu cuenta para continuar gestionando tus finanzas de manera inteligente
              </p>
            </div>

            <ul className="features" role="list">
              <li className="feature">
                <div className="feature__icon">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <div className="feature__content">
                  <h3 className="feature__title">Acceso Seguro</h3>
                  <p className="feature__desc">Tu información está protegida con encriptación avanzada</p>
                </div>
              </li>

              <li className="feature">
                <div className="feature__icon">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M12 1a9 9 0 0 0-9 9v3.28l-1.447 3.447A1 1 0 0 0 2.447 18H6a9 9 0 1 0 6-17ZM4 10a8 8 0 1 1 8 8 8.03 8.03 0 0 1-7.06-4H4.447L6 11.72V10Z"/>
                  </svg>
                </div>
                <div className="feature__content">
                  <h3 className="feature__title">Sesión Inteligente</h3>
                  <p className="feature__desc">Mantén tu sesión activa de forma segura</p>
                </div>
              </li>

              <li className="feature">
                <div className="feature__icon">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                  </svg>
                </div>
                <div className="feature__content">
                  <h3 className="feature__title">Dashboard Personalizado</h3>
                  <p className="feature__desc">Accede a tus reportes y análisis financieros</p>
                </div>
              </li>
            </ul>
          </aside>

          <section className="login__right">
            <div className="formwrap">
              <h2 className="formwrap__title">INICIAR SESIÓN</h2>
              <p className="formwrap__subtitle">Ingresa tus credenciales para acceder a tu cuenta</p>

              {info && (
                <div style={{
                  background: '#dbeafe',
                  border: '1px solid #3b82f6',
                  color: '#1e40af',
                  padding: '1rem',
                  borderRadius: '8px',
                  marginBottom: '1.5rem',
                  fontSize: '0.9rem'
                }}>
                  {info}
                </div>
              )}

              {error && <div className="error-message show">{error}</div>}

              <form className="form" onSubmit={handleSubmit} onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault() }}>
                <div className="form__row">
                  <label className="label">
                    Ingrese su correo:
                    <div className="field">
                      <div className="field__icon">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                        </svg>
                      </div>
                      <input
                        type="email"
                        name="email"
                        placeholder="youremail@example.com"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        autoComplete="email"
                        className={fieldErrors.email ? 'error' : ''}
                      />
                    </div>
                    {fieldErrors.email && <div className="field-error">{fieldErrors.email}</div>}
                  </label>
                </div>

                <div className="form__row">
                  <label className="label">Ingrese su contraseña:</label>
                  <div className="field field--password">
                    <div className="field__icon">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                      </svg>
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      placeholder="••••••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      autoComplete="current-password"
                      className={fieldErrors.password ? 'error' : ''}
                    />
                    <button 
                      type="button" 
                      className="password-toggle" 
                      onClick={() => setShowPassword(!showPassword)} 
                      aria-label="Mostrar contraseña"
                    >
                      {showPassword ? (
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
                  {fieldErrors.password && <div className="field-error">{fieldErrors.password}</div>}
                </div>

                <button 
                  type="submit" 
                  className="btn" 
                  disabled={loading || isBlocked}
                >
                  {loading ? (
                    <>
                      <div className="loading-spinner"></div>
                      Iniciando sesión...
                    </>
                  ) : isBlocked ? (
                    `Bloqueado (${formatTime(timeLeft)})`
                  ) : (
                    'Entrar'
                  )}
                </button>
                
                {/* Mostrar información sobre intentos fallidos */}
                {failedAttempts > 0 && !isBlocked && (
                  <div style={{
                    textAlign: 'center',
                    marginTop: '1rem',
                    padding: '0.75rem',
                    background: '#fef3c7',
                    border: '1px solid #f59e0b',
                    borderRadius: '8px',
                    color: '#92400e',
                    fontSize: '0.875rem'
                  }}>
                    Intentos fallidos: {failedAttempts}/5
                    {failedAttempts >= 3 && (
                      <div style={{ marginTop: '0.5rem', fontWeight: '600' }}>
                        ⚠️ Después de 5 intentos fallidos, la cuenta se bloqueará por 15 minutos
                      </div>
                    )}
                  </div>
                )}
              </form>

              <div className="formwrap__footer">
                <p className="footer__text">
                  <Link to="/password-reset" className="footer__link">¿Olvidé mi contraseña?</Link>
                </p>
                <p className="footer__text">
                  ¿No tienes cuenta? <Link to="/signup" className="footer__link">Crear cuenta</Link>
                </p>
              </div>
            </div>
          </section>
        </div>
      </section>
    </div>
  )
}

export default LoginComponent