import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import styled from 'styled-components'

// Variables CSS del diseño original
const CSS_VARS = `
  :root {
    --color-primary: #059669;
    --color-primary-dark: #047857;
    --color-primary-light: #d1fae5;
    --color-secondary: #ea580c;
    --color-secondary-dark: #c2410c;
    --color-secondary-light: #fed7aa;
    --color-white: #ffffff;
    --color-gray-50: #f9fafb;
    --color-gray-100: #f3f4f6;
    --color-gray-200: #e5e7eb;
    --color-gray-300: #d1d5db;
    --color-gray-400: #9ca3af;
    --color-gray-500: #6b7280;
    --color-gray-600: #4b5563;
    --color-gray-700: #374151;
    --color-gray-800: #1f2937;
    --color-gray-900: #111827;
    --color-success: #10b981;
    --color-error: #ef4444;
    --color-warning: #f59e0b;
    --color-info: #3b82f6;
    --color-left-gradient: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 50%, #a7f3d0 100%);
    --color-right-gradient: linear-gradient(135deg, #fff7ed 0%, #fed7aa 50%, #fdba74 100%);
    --spacing-xs: 0.25rem;
    --spacing-sm: 0.5rem;
    --spacing-md: 0.75rem;
    --spacing-lg: 1rem;
    --spacing-xl: 1.25rem;
    --spacing-2xl: 1.5rem;
    --spacing-3xl: 2rem;
    --spacing-4xl: 2.5rem;
    --spacing-5xl: 3rem;
    --spacing-6xl: 3.5rem;
    --radius-sm: 0.25rem;
    --radius-md: 0.375rem;
    --radius-lg: 0.5rem;
    --radius-xl: 0.75rem;
    --radius-2xl: 1rem;
    --radius-full: 9999px;
    --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    --font-size-xs: 0.75rem;
    --font-size-sm: 0.875rem;
    --font-size-md: 1rem;
    --font-size-lg: 1.125rem;
    --font-size-xl: 1.25rem;
    --font-size-2xl: 1.5rem;
    --font-size-3xl: 1.875rem;
    --font-size-4xl: 2rem;
    --font-size-5xl: 2.5rem;
  }
`

const VerifyCodeContainer = styled.div`
  min-height: 100vh;
  height: 100vh;
  display: flex;
  align-items: stretch;
  justify-content: center;
  padding: 0;
  background: transparent;
  overflow: hidden;
  
  ${CSS_VARS}
`

const VerifyCode = styled.section`
  width: 100%;
  height: 100vh;
  position: relative;
  display: flex;
`

const VerifyCodeGrid = styled.div`
  display: grid;
  grid-template-columns: 50% 50%;
  width: 100%;
  height: 100vh;
  background: transparent;
  border-radius: 0;
  box-shadow: none;
  overflow: hidden;
`

const VerifyCodeLeft = styled.aside`
  background: var(--color-left-gradient);
  padding: var(--spacing-5xl);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  color: var(--color-gray-800);
  position: relative;
  overflow: hidden;
`

const VerifyCodeRight = styled.section`
  padding: var(--spacing-3xl);
  display: flex;
  flex-direction: column;
  justify-content: center;
  background: var(--color-right-gradient);
  position: relative;
  overflow-y: auto;
  max-height: 100vh;
`

const FormWrap = styled.div`
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  min-height: auto;
`

const FormWrapTitle = styled.h2`
  font-size: var(--font-size-3xl);
  font-weight: 800;
  color: var(--color-gray-900);
  text-align: center;
  margin-bottom: var(--spacing-sm);
  letter-spacing: -0.02em;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
`

const FormWrapSubtitle = styled.p`
  font-size: var(--font-size-md);
  font-weight: 400;
  color: var(--color-gray-600);
  text-align: center;
  margin-bottom: var(--spacing-2xl);
  line-height: 1.6;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
`

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
`

const FormRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
`

const Label = styled.label`
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-gray-800);
  margin-bottom: var(--spacing-sm);
  display: block;
  letter-spacing: -0.01em;
`

const Field = styled.div`
  position: relative;
  display: block;
`

const FieldIcon = styled.div`
  position: absolute;
  left: 16px !important;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-gray-400);
  pointer-events: none !important;
  z-index: 1 !important;
  width: 20px;
  height: 20px;
  transition: color 0.2s ease;
`

const Input = styled.input`
  width: 100%;
  padding: var(--spacing-xl) var(--spacing-4xl) var(--spacing-xl) 60px !important;
  border: 2px solid var(--color-gray-200);
  border-radius: var(--radius-lg);
  font-size: var(--font-size-md);
  font-weight: 400;
  font-family: inherit;
  color: var(--color-gray-900);
  background: var(--color-white);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  outline: none;
  min-height: 56px;
  box-sizing: border-box;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

  &:focus {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.1), 0 4px 12px rgba(0, 0, 0, 0.08);
    transform: translateY(-1px);
  }

  &:focus + ${FieldIcon} {
    color: var(--color-primary);
  }

  &::placeholder {
    color: var(--color-gray-400);
    font-size: var(--font-size-md);
  }
`

const SubmitButton = styled.button`
  width: 100%;
  padding: var(--spacing-xl) var(--spacing-3xl);
  background: linear-gradient(135deg, var(--color-secondary) 0%, var(--color-secondary-dark) 100%);
  color: var(--color-white);
  border: none;
  border-radius: var(--radius-lg);
  font-size: var(--font-size-md);
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  margin-bottom: var(--spacing-lg);
  position: relative;
  overflow: hidden;
  min-height: 56px;
  height: 56px;
  box-shadow: 0 4px 12px rgba(234, 88, 12, 0.3);
  letter-spacing: -0.01em;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, var(--color-secondary-dark) 0%, #b45309 100%);
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(234, 88, 12, 0.4);
  }

  &:disabled {
    background: var(--color-gray-300);
    color: var(--color-gray-500);
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`

const FormWrapFooter = styled.div`
  text-align: center;
  margin-top: var(--spacing-lg);
  padding: var(--spacing-lg) 0;
  border-top: 1px solid var(--color-gray-200);
  display: block !important;
  width: 100%;
  background: transparent;
`

const FooterText = styled.p`
  margin: var(--spacing-sm) 0;
  font-size: var(--font-size-sm);
  color: var(--color-gray-700);
  line-height: 1.5;
`

const FooterLink = styled(Link)`
  color: var(--color-secondary);
  text-decoration: none;
  font-weight: 600;
  transition: all 0.2s ease;

  &:hover {
    color: var(--color-secondary-dark);
    text-decoration: underline;
  }
`

const ErrorMessage = styled.div`
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  margin-bottom: var(--spacing-lg);
  animation: slideDown 0.3s ease-out;
  
  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`

const VerifyRegistrationCodeComponent = () => {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [timeLeft, setTimeLeft] = useState(600) // 10 minutos en segundos
  const [canResend, setCanResend] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)
  const [redirecting, setRedirecting] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    // Obtener email del state o localStorage
    const emailFromState = location.state?.email
    const emailFromStorage = localStorage.getItem('registrationEmail')
    const userEmail = emailFromState || emailFromStorage
    
    if (!userEmail) {
      navigate('/signup')
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

  // Timer para reenvío de código (60 segundos)
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

  const handleResendCode = async () => {
    if (!email || !canResend) return

    try {
      setLoading(true)
      const response = await fetch('http://127.0.0.1:8000/api/users/send-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          purpose: 'registration'
        })
      })

      if (response.ok) {
        setError('')
        setTimeLeft(600) // Reiniciar timer de 10 minutos
        setResendTimer(60) // Nuevo timer de 60 segundos
        setCanResend(false)
        setCode('')
        // Mostrar mensaje de éxito (puedes agregar un estado para esto)
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

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setError('')
    console.log('Iniciando verificación con código:', code) // Debug
    
    // Validaciones del formulario
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

    if (!email) {
      setError('Email no encontrado. Por favor regístrate de nuevo.')
      return false
    }

    setLoading(true)

    try {
      // Llamar directamente al API sin usar AuthContext
      const response = await fetch('http://127.0.0.1:8000/api/users/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          code: code,
          purpose: 'registration'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Error al verificar código')
      }
      
      // Limpiar email de localStorage
      localStorage.removeItem('registrationEmail')
      
      // Redirigir inmediatamente
      navigate('/login', { 
        state: { message: '¡Cuenta verificada! Ahora puedes iniciar sesión.' },
        replace: true
      })
    } catch (err) {
      setLoading(false)
      
      let errorMessage = 'Error al verificar el código'
      
      console.log('Error completo:', err) // Debug completo
      console.log('Error message:', err.message) // Debug del mensaje
      
      // Manejar diferentes tipos de errores
      if (err.message.includes('incorrecto') || err.message.includes('incorrect')) {
        // Si el mensaje contiene "incorrecto" pero también "quedan X intentos", usar el mensaje original
        if (err.message.includes('quedan') && err.message.includes('intentos')) {
          errorMessage = err.message // Usar el mensaje exacto del servidor
        } else {
          errorMessage = 'Código incorrecto. Verifica los números ingresados'
        }
      } else if (err.message.includes('invalid') || err.message.includes('inválido')) {
        errorMessage = 'Código inválido. Verifica los números ingresados'
      } else if (err.message.includes('expired') || err.message.includes('expirado')) {
        errorMessage = 'Código expirado. Solicita uno nuevo'
      } else if (err.message.includes('máximo de intentos') || err.message.includes('maximum attempts')) {
        errorMessage = 'Máximo de intentos alcanzado. Solicita un nuevo código'
      } else if (err.message.includes('network') || err.message.includes('conexión')) {
        errorMessage = 'Error de conexión. Verifica tu internet e intenta de nuevo'
      } else if (err.message) {
        errorMessage = err.message
      }
      
      console.log('Mensaje de error final:', errorMessage) // Debug del mensaje final
      setError(errorMessage)
    }
    
    return false
  }

  return (
    <VerifyCodeContainer>
      <VerifyCode>
        <VerifyCodeGrid>
          {/* Panel izquierdo */}
          <VerifyCodeLeft>
            <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-4xl)' }}>
              <div style={{ 
                width: '80px', 
                height: '80px', 
                background: 'var(--color-white)', 
                borderRadius: 'var(--radius-full)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                margin: '0 auto var(--spacing-xl)', 
                boxShadow: 'var(--shadow-lg)',
                border: '3px solid var(--color-white)'
              }}>
                <svg viewBox="0 0 24 24" width="40" height="40" fill="currentColor" style={{ color: 'var(--color-primary)' }}>
                  <path d="M21 7h-1V6a2 2 0 0 0-2-2H5a3 3 0 0 0-3 3v9a3 3 0 0 0 3 3h14a2 2 0 0 0 2-2v-1h1a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Zm-4-1a1 1 0 0 1 1 1v1H5a2 2 0 0 1-2-2v-.171A1.83 1.83 0 0 1 4.829 4Zm5 8h-3V9h3Zm-5.5-2.5a1 1 0 1 1-1-1 1 1 0 0 1 1 1Z"/>
                </svg>
              </div>
              <h1 style={{ fontSize: 'var(--font-size-5xl)', fontWeight: 800, color: 'var(--color-gray-900)', marginBottom: 'var(--spacing-xl)' }}>
                GastoSmart
              </h1>
              <p style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-gray-600)', lineHeight: 1.7, maxWidth: '420px', margin: '0 auto' }}>
                Verifica tu cuenta para comenzar a gestionar tus finanzas de manera inteligente
              </p>
            </div>

            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2xl)', marginTop: 'var(--spacing-4xl)', position: 'relative', zIndex: 1 }}>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-lg)', textAlign: 'left', transition: 'transform 0.2s ease' }}>
                <div style={{ width: '48px', height: '48px', minWidth: '48px', background: 'var(--color-white)', borderRadius: 'var(--radius-full)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)', border: '2px solid var(--color-primary-light)' }}>
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" style={{ color: 'var(--color-primary)' }}>
                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                  </svg>
                </div>
                <div style={{ flex: 1, paddingTop: 'var(--spacing-sm)' }}>
                  <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, color: 'var(--color-gray-900)', marginBottom: 'var(--spacing-sm)' }}>
                    Seguridad Verificada
                  </h3>
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-600)', lineHeight: 1.6, maxWidth: '280px' }}>
                    Tu código es único y expira en 10 minutos
                  </p>
                </div>
              </li>

              <li style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-lg)', textAlign: 'left', transition: 'transform 0.2s ease' }}>
                <div style={{ width: '48px', height: '48px', minWidth: '48px', background: 'var(--color-white)', borderRadius: 'var(--radius-full)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)', border: '2px solid var(--color-primary-light)' }}>
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" style={{ color: 'var(--color-primary)' }}>
                    <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                  </svg>
                </div>
                <div style={{ flex: 1, paddingTop: 'var(--spacing-sm)' }}>
                  <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, color: 'var(--color-gray-900)', marginBottom: 'var(--spacing-sm)' }}>
                    Código por Email
                  </h3>
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-600)', lineHeight: 1.6, maxWidth: '280px' }}>
                    Revisa tu bandeja de entrada y spam
                  </p>
                </div>
              </li>

              <li style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-lg)', textAlign: 'left', transition: 'transform 0.2s ease' }}>
                <div style={{ width: '48px', height: '48px', minWidth: '48px', background: 'var(--color-white)', borderRadius: 'var(--radius-full)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)', border: '2px solid var(--color-primary-light)' }}>
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" style={{ color: 'var(--color-primary)' }}>
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <div style={{ flex: 1, paddingTop: 'var(--spacing-sm)' }}>
                  <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, color: 'var(--color-gray-900)', marginBottom: 'var(--spacing-sm)' }}>
                    Activación Rápida
                  </h3>
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-600)', lineHeight: 1.6, maxWidth: '280px' }}>
                    Accede a todas las funciones en segundos
                  </p>
                </div>
              </li>
            </ul>
          </VerifyCodeLeft>

          {/* Panel derecho */}
          <VerifyCodeRight>
            <FormWrap>
              <FormWrapTitle>VERIFICAR REGISTRO</FormWrapTitle>
              <FormWrapSubtitle>
                Ingresa el código de 6 dígitos que recibiste en: <strong>{email}</strong>
              </FormWrapSubtitle>

              {timeLeft > 0 && (
                <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-lg)', color: 'var(--color-gray-600)' }}>
                  El código expira en: <strong style={{ color: timeLeft < 60 ? 'var(--color-error)' : 'var(--color-primary)' }}>{formatTime(timeLeft)}</strong>
                </div>
              )}

              <Form onSubmit={handleSubmit} onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault() }}>
                {error && (
                  <div style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#dc2626',
                    padding: '1rem',
                    borderRadius: '8px',
                    marginBottom: '1rem',
                    fontSize: '0.9rem',
                    fontWeight: '500'
                  }}>
                    {error}
                  </div>
                )}
                
                <FormRow>
                  <Label>
                    Código de verificación:
                    <Field>
                      <FieldIcon>
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                        </svg>
                      </FieldIcon>
                      <Input
                        type="text"
                        placeholder="123456"
                        value={code}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 6)
                          setCode(val)
                          if (error) {
                            setError('') // Limpiar error al escribir
                            console.log('Error limpiado al escribir') // Debug
                          }
                        }}
                        required
                        maxLength="6"
                        disabled={timeLeft === 0}
                        autoFocus
                        style={{
                          letterSpacing: '0.5rem',
                          fontSize: '1.25rem',
                          textAlign: 'center',
                          fontWeight: '600'
                        }}
                      />
                    </Field>
                  </Label>
                </FormRow>

                <FormRow>
                  <SubmitButton type="submit" disabled={loading || !email || code.length !== 6 || timeLeft === 0}>
                    {loading ? 'Verificando...' : timeLeft === 0 ? 'Código Expirado' : 'Verificar Código'}
                  </SubmitButton>
                </FormRow>
              </Form>

              <FormWrapFooter>
                <FooterText>
                  ¿No recibiste el código? {' '}
                  {canResend ? (
                    <FooterLink as="button" onClick={handleResendCode} disabled={loading} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}>
                      Reenviar código
                    </FooterLink>
                  ) : (
                    <span style={{ color: 'var(--color-gray-500)' }}>
                      Espera {resendTimer}s para reenviar
                    </span>
                  )}
                </FooterText>
              </FormWrapFooter>
            </FormWrap>
          </VerifyCodeRight>
        </VerifyCodeGrid>
      </VerifyCode>
    </VerifyCodeContainer>
  )
}

export default VerifyRegistrationCodeComponent