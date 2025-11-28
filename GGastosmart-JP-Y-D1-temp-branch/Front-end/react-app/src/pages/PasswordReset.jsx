import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import '../styles/auth.css'

const PasswordReset = () => {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [fieldError, setFieldError] = useState('')
  
  const navigate = useNavigate()

  // Manejo de envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setFieldError('')

    // Validaciones
    if (!email.trim()) {
      setFieldError('El correo electrónico es obligatorio')
      setError('Por favor, ingresa tu correo electrónico')
      return
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      setFieldError('El formato del correo electrónico no es válido')
      setError('Por favor, ingresa un correo electrónico válido')
      return
    }

    try {
      setLoading(true)

      // Enviar código de verificación
      const response = await fetch('http://127.0.0.1:8000/api/users/send-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          purpose: 'password_recovery'
        })
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.detail || 'Error al enviar el código de verificación')
        return
      }

      // Guardar email en localStorage
      localStorage.setItem('resetEmail', email)

      // Redirigir a la página de verificación de código
      setTimeout(() => {
        navigate('/verify-recovery-code', { state: { email } })
      }, 1000)

    } catch (err) {
      setError('Error de conexión con el servidor. Verifica que el servidor esté funcionando correctamente')
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
                <img src="/assets/logo.png" alt="GastoSmart Logo" />
              </div>
              <h1 className="brand__title">Recuperar Contraseña</h1>
              <p className="brand__subtitle">
                No te preocupes, te ayudamos a recuperar el acceso a tu cuenta de forma segura. Te enviaremos un código de verificación a tu correo electrónico.
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
                  <h3 className="feature__title">Proceso Seguro</h3>
                  <p className="feature__desc">Verificación por correo electrónico</p>
                </div>
              </li>

              <li className="feature">
                <div className="feature__icon">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                  </svg>
                </div>
                <div className="feature__content">
                  <h3 className="feature__title">Código de Verificación</h3>
                  <p className="feature__desc">Recibirás un código de 6 dígitos</p>
                </div>
              </li>

              <li className="feature">
                <div className="feature__icon">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <div className="feature__content">
                  <h3 className="feature__title">Rápido y Fácil</h3>
                  <p className="feature__desc">Solo toma unos minutos</p>
                </div>
              </li>
            </ul>
          </aside>

          <section className="login__right">
            <div className="formwrap">
              <h2 className="formwrap__title">RECUPERAR CONTRASEÑA</h2>
              <p className="formwrap__subtitle">Ingresa tu correo electrónico para recibir un código de verificación</p>

              {error && <div className="error-message show">{error}</div>}

              <form className="form" onSubmit={handleSubmit}>
                <div className="form__row">
                  <label className="label">
                    Correo electrónico:
                    <div className="field">
                      <div className="field__icon">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                        </svg>
                      </div>
                      <input
                        type="email"
                        placeholder="tu@correo.com"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value)
                          setError('')
                          setFieldError('')
                        }}
                        required
                        autoComplete="email"
                        autoFocus
                        className={fieldError ? 'error' : ''}
                      />
                    </div>
                    {fieldError && <div className="field-error">{fieldError}</div>}
                  </label>
                </div>

                <div className="form__row">
                  <button 
                    type="submit" 
                    className="btn" 
                    disabled={loading}
                    style={{ width: '100%' }}
                  >
                    {loading ? (
                      <>
                        <div className="loading-spinner"></div>
                        Enviando código...
                      </>
                    ) : (
                      'Enviar Código de Verificación'
                    )}
                  </button>
                </div>
              </form>

              <div className="formwrap__footer">
                <p className="footer__text">
                  ¿Recordaste tu contraseña? <Link to="/login" className="footer__link">Iniciar Sesión</Link>
                </p>
                <p className="footer__text">
                  ¿No tienes cuenta? <Link to="/signup" className="footer__link">Crear Cuenta</Link>
                </p>
              </div>
            </div>
          </section>
        </div>
      </section>
    </div>
  )
}

export default PasswordReset
