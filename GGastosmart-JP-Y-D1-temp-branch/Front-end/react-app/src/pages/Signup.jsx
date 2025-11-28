import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import '../styles/auth.css'

// Componente reutilizable para campos de formulario
const FormField = ({ 
  label, 
  type = 'text', 
  name, 
  placeholder, 
  value, 
  onChange, 
  required = false, 
  minLength,
  autoComplete,
  icon,
  showPassword,
  onTogglePassword,
  error
}) => {
  const isPasswordField = type === 'password'
  
  return (
    <div className="form__row">
      <label className="label" htmlFor={name}>
        {label}
        {required && <span className="required-asterisk"> *</span>}
      </label>
      <div className={`field ${isPasswordField ? 'field--password' : ''}`}>
        {icon && (
          <div className="field__icon">
            {icon}
          </div>
        )}
        <input
          type={isPasswordField ? (showPassword ? 'text' : 'password') : type}
          id={name}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          className={error ? 'error' : ''}
        />
        {isPasswordField && onTogglePassword && (
          <button 
            type="button" 
            className="password-toggle" 
            onClick={onTogglePassword}
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
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
        )}
      </div>
      {error && <div className="field-error">{error}</div>}
    </div>
  )
}

// Componente para el grid de campos (nombre y apellido)
const FormRow = ({ children }) => (
  <div className="form-row">
    {children}
  </div>
)

// Componente para términos y condiciones
const TermsCheckbox = ({ checked, onChange, error }) => (
  <div className="form__terms">
    <input
      type="checkbox"
      name="termsAccepted"
      id="termsAccepted"
      checked={checked}
      onChange={onChange}
      required
    />
    <label htmlFor="termsAccepted">
      Acepto los <Link to="#" className="link">términos y condiciones</Link>
    </label>
    {error && <div className="field-error">{error}</div>}
  </div>
)

// Componente para el botón de envío
const SubmitButton = ({ loading, children, disabled }) => (
  <button type="submit" className="btn" disabled={disabled || loading}>
    {loading ? (
      <>
        <div className="loading-spinner"></div>
        Registrando...
      </>
    ) : (
      children
    )}
  </button>
)

// Componente para mensajes de error
const ErrorMessage = ({ message, show }) => {
  if (!show || !message) return null
  
  return (
    <div className="error-message show" role="alert">
      {message}
    </div>
  )
}

// Componente principal de Signup
const SignupComponent = () => {
  // Estado del formulario
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    termsAccepted: false,
  })
  
  // Estado de la UI
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [redirecting, setRedirecting] = useState(false)
  
  // Estados de validación de contraseña
  const [passwordRequirements, setPasswordRequirements] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false
  })

  // Hooks
  const { register } = useAuth()
  const navigate = useNavigate()

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

  // Handlers
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    const newValue = type === 'checkbox' ? checked : value
    
    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }))
    
    // Limpiar errores cuando el usuario empieza a escribir
    if (error) setError('')
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
    
    // Validar contraseña en tiempo real
    if (name === 'password') {
      validatePassword(newValue)
      // También validar confirmPassword si ya tiene contenido
      if (formData.confirmPassword) {
        const errors = { ...fieldErrors }
        if (formData.confirmPassword !== newValue) {
          errors.confirmPassword = 'Las contraseñas no coinciden'
        } else {
          delete errors.confirmPassword
        }
        setFieldErrors(errors)
      }
    }
    
    // Validar confirmación de contraseña en tiempo real
    if (name === 'confirmPassword') {
      const errors = { ...fieldErrors }
      if (newValue && newValue !== formData.password) {
        errors[name] = 'Las contraseñas no coinciden'
      } else {
        delete errors[name]
      }
      setFieldErrors(errors)
    }
    
    // Validar campos de texto en tiempo real (nombre, apellido, email)
    if (['firstName', 'lastName', 'email'].includes(name) && newValue) {
      validateField(name, newValue, true)
    }
  }

  const handlePasswordToggle = (field) => {
    if (field === 'password') {
      setShowPassword(prev => !prev)
    } else if (field === 'confirmPassword') {
      setShowConfirmPassword(prev => !prev)
    }
  }

  // Validaciones
  const validateField = (name, value, showRequiredError = true) => {
    const errors = { ...fieldErrors }
    
    switch (name) {
      case 'firstName':
      case 'lastName':
        if (!value || !value.trim()) {
          if (showRequiredError) {
            errors[name] = 'Este campo es obligatorio'
          }
        } else if (value.trim().length < 2) {
          errors[name] = 'Debe tener al menos 2 caracteres'
        } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(value.trim())) {
          errors[name] = 'Solo se permiten letras'
        } else {
          delete errors[name]
        }
        break
        
      case 'email':
        if (!value || !value.trim()) {
          if (showRequiredError) {
            errors[name] = 'Este campo es obligatorio'
          }
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
          errors[name] = 'El formato del correo electrónico no es válido'
        } else if (value.trim().length > 100) {
          errors[name] = 'El correo es demasiado largo'
        } else {
          delete errors[name]
        }
        break
        
      case 'password':
        if (!value) {
          if (showRequiredError) {
            errors[name] = 'Este campo es obligatorio'
          }
        } else {
          const passwordErrors = []
          if (value.length < 8) passwordErrors.push('mínimo 8 caracteres')
          if (!/(?=.*[A-Z])/.test(value)) passwordErrors.push('una mayúscula')
          if (!/(?=.*[a-z])/.test(value)) passwordErrors.push('una minúscula')
          if (!/(?=.*\d|[!@#$%^&*(),.?":{}|<>])/.test(value)) passwordErrors.push('un número o símbolo')
          
          if (passwordErrors.length > 0) {
            errors[name] = `Debe contener: ${passwordErrors.join(', ')}`
          } else {
            delete errors[name]
          }
        }
        break
        
      case 'confirmPassword':
        if (!value) {
          if (showRequiredError) {
            errors[name] = 'Este campo es obligatorio'
          }
        } else if (value !== formData.password) {
          errors[name] = 'Las contraseñas no coinciden'
        } else {
          delete errors[name]
        }
        break
        
      default:
        break
    }
    
    setFieldErrors(errors)
    return !errors[name]
  }

  const validateForm = () => {
    const fields = ['firstName', 'lastName', 'email', 'password', 'confirmPassword']
    let isValid = true
    let emptyFields = []
    let specificErrors = []
    
    // Verificar campos vacíos
    fields.forEach(field => {
      if (!formData[field] || formData[field].toString().trim() === '') {
        emptyFields.push(field)
        isValid = false
      }
    })
    
    // Verificar términos
    if (!formData.termsAccepted) {
      specificErrors.push('términos')
      isValid = false
    }
    
    // Si hay múltiples campos vacíos, mostrar mensaje general
    if (emptyFields.length > 1 || (emptyFields.length > 0 && !formData.termsAccepted)) {
      setError('Por favor, completa todos los campos antes de continuar')
      return false
    }
    
    // Si solo falta un campo específico, validar ese campo
    if (emptyFields.length === 1) {
      const field = emptyFields[0]
      validateField(field, formData[field], true) // Mostrar error de campo obligatorio
      return false
    }
    
    // Si solo faltan los términos
    if (specificErrors.length === 1 && specificErrors[0] === 'términos') {
      setError('Debes aceptar los términos y condiciones')
      return false
    }
    
    // Validar todos los campos con contenido
    fields.forEach(field => {
      if (formData[field] && formData[field].toString().trim() !== '') {
        if (!validateField(field, formData[field], false)) { // No mostrar error de campo obligatorio
          isValid = false
        }
      }
    })
    
    // Validar que la contraseña cumpla todos los requisitos
    if (formData.password && !Object.values(passwordRequirements).every(req => req === true)) {
      setError('La contraseña no cumple con todos los requisitos')
      isValid = false
    }
    
    // Validar que las contraseñas coincidan
    if (formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden')
      isValid = false
    }
    
    return isValid
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setError('')
    
    if (!validateForm()) {
      return false
    }

    try {
      setLoading(true)
      const { confirmPassword, termsAccepted, ...dataToRegister } = formData
      
      // Guardar email en localStorage ANTES de registrar
      localStorage.setItem('registrationEmail', formData.email)
      
      await register(dataToRegister)
      
      // Redirigir inmediatamente sin delay
      navigate('/verify-registration-code', { 
        state: { email: formData.email },
        replace: true
      })
    } catch (err) {
      setLoading(false)
      
      // Manejar errores del backend con mensajes específicos
      let errorMsg = 'Error al registrar usuario'
      
      if (err.response?.data?.detail) {
        const detail = err.response.data.detail
        if (Array.isArray(detail)) {
          // Errores de validación de Pydantic
          errorMsg = detail.map(e => e.msg || e.message || 'Error de validación').join(', ')
        } else {
          errorMsg = detail
        }
      } else if (err.message) {
        errorMsg = err.message
      }
      
      // Mensajes específicos según el tipo de error
      if (errorMsg.includes('email') || errorMsg.includes('correo')) {
        errorMsg = 'Este correo electrónico ya está registrado'
      } else if (errorMsg.includes('password') || errorMsg.includes('contraseña')) {
        errorMsg = 'La contraseña no cumple con los requisitos'
      } else if (errorMsg.includes('network') || errorMsg.includes('conexión')) {
        errorMsg = 'Error de conexión. Verifica tu internet e intenta de nuevo'
      }
      
      setError(errorMsg)
      localStorage.removeItem('registrationEmail')
    }
    
    return false
  }

  // Íconos SVG como componentes
  const UserIcon = () => (
    <svg viewBox="0 0 24 24">
      <path fill="currentColor" d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.418 0-8 2.239-8 5v1h16v-1c0-2.761-3.582-5-8-5Z"/>
    </svg>
  )

  const EmailIcon = () => (
    <svg viewBox="0 0 24 24">
      <path fill="currentColor" d="M20 4H4a2 2 0 0 0-2 2v1l10 6 10-6V6a2 2 0 0 0-2-2Zm0 6.236-8 4.8-8-4.8V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2Z"/>
    </svg>
  )

  const LockIcon = () => (
    <svg viewBox="0 0 24 24">
      <path fill="currentColor" d="M17 8h-1V6a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2Zm-6 0V6a2 2 0 0 1 4 0v2Z"/>
    </svg>
  )

  return (
    <div className="signup-container">
      <section className="signup">
        <div className="signup__grid">
          {/* Panel izquierdo - Branding */}
          <aside className="signup__left">
            <div className="brand">
              <div className="brand__logo" aria-hidden="true">
                <img src="/assets/logo.png" alt="GastoSmart Logo" />
              </div>
              <h1 className="brand__title">GastoSmart</h1>
              <p className="brand__subtitle">
                Controla tus finanzas de manera inteligente y toma decisiones financieras más acertadas
              </p>
            </div>

            <ul className="features" role="list">
              <li className="feature">
                <div className="feature__icon">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M5 3a2 2 0 0 0-2 2v14l4-2 4 2 4-2 4 2V5a2 2 0 0 0-2-2H5Zm2 6h10v2H7V9Zm0 4h6v2H7v-2Z"/>
                  </svg>
                </div>
                <div className="feature__content">
                  <h3 className="feature__title">Seguimiento Inteligente</h3>
                  <p className="feature__desc">Monitorea tus gastos automáticamente</p>
                </div>
              </li>

              <li className="feature">
                <div className="feature__icon">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M12 1a9 9 0 0 0-9 9v3.28l-1.447 3.447A1 1 0 0 0 2.447 18H6a9 9 0 1 0 6-17ZM4 10a8 8 0 1 1 8 8 8.03 8.03 0 0 1-7.06-4H4.447L6 11.72V10Z"/>
                  </svg>
                </div>
                <div className="feature__content">
                  <h3 className="feature__title">Ahorro Automático</h3>
                  <p className="feature__desc">Alcanza tus metas financieras</p>
                </div>
              </li>

              <li className="feature">
                <div className="feature__icon">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M12 1a7 7 0 0 0-7 7c0 5.25 7 14 7 14s7-8.75 7-14a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 14.5 8 2.5 2.5 0 0 1 12 10.5Z"/>
                  </svg>
                </div>
                <div className="feature__content">
                  <h3 className="feature__title">Seguridad Total</h3>
                  <p className="feature__desc">Tus datos están protegidos</p>
                </div>
              </li>
            </ul>
          </aside>

          {/* Panel derecho - Formulario */}
          <section className="signup__right">
            <div className="formwrap">
              <header className="formwrap__header">
                <h2 className="formwrap__title">Crear Cuenta</h2>
                <p className="formwrap__subtitle">
                  Únete a GastoSmart y comienza a gestionar tus finanzas
                </p>
              </header>

              <ErrorMessage message={error} show={!!error} />

              <form className="form" onSubmit={handleSubmit} noValidate>
                <FormRow>
                  <FormField
                    label="Nombre"
                    name="firstName"
                    placeholder="Ingresa tu nombre"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                    minLength="2"
                    autoComplete="given-name"
                    icon={<UserIcon />}
                    error={fieldErrors.firstName}
                  />

                  <FormField
                    label="Apellido"
                    name="lastName"
                    placeholder="Ingresa tu apellido"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                    minLength="2"
                    autoComplete="family-name"
                    icon={<UserIcon />}
                    error={fieldErrors.lastName}
                  />
                </FormRow>

                <FormField
                  label="Correo Electrónico"
                  type="email"
                  name="email"
                  placeholder="ejemplo@correo.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  autoComplete="email"
                  icon={<EmailIcon />}
                  error={fieldErrors.email}
                />

                <FormField
                  label="Contraseña"
                  type="password"
                  name="password"
                  placeholder="Mínimo 8 caracteres"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  minLength="8"
                  autoComplete="new-password"
                  icon={<LockIcon />}
                  showPassword={showPassword}
                  onTogglePassword={() => handlePasswordToggle('password')}
                  error={fieldErrors.password}
                />

                {/* Requisitos de contraseña */}
                {formData.password && (
                  <div 
                    className={`password-requirements ${Object.values(passwordRequirements).every(req => req === true) ? 'all-valid' : ''}`}
                    style={{
                      marginTop: '-0.5rem',
                      marginBottom: '1rem',
                      padding: '1rem',
                      background: Object.values(passwordRequirements).every(req => req === true) ? '#d1fae5' : '#fef3c7',
                      borderRadius: '8px',
                      border: `2px solid ${Object.values(passwordRequirements).every(req => req === true) ? '#059669' : '#f59e0b'}`,
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

                <FormField
                  label="Confirmar Contraseña"
                  type="password"
                  name="confirmPassword"
                  placeholder="Confirma tu contraseña"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                  minLength="8"
                  autoComplete="new-password"
                  icon={<LockIcon />}
                  showPassword={showConfirmPassword}
                  onTogglePassword={() => handlePasswordToggle('confirmPassword')}
                  error={fieldErrors.confirmPassword}
                />

                <TermsCheckbox
                  checked={formData.termsAccepted}
                  onChange={handleInputChange}
                  error={fieldErrors.termsAccepted}
                />

                <SubmitButton loading={loading} disabled={loading}>
                  Crear Cuenta
                </SubmitButton>
              </form>

              <footer className="formwrap__footer">
                <p className="footer__text">
                  ¿Ya tienes una cuenta? <Link to="/login" className="footer__link">Iniciar Sesión</Link>
                </p>
              </footer>
            </div>
          </section>
        </div>
      </section>
    </div>
  )
}

export default SignupComponent