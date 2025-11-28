import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import DashboardLayout from '../components/DashboardLayout'
import { apiService } from '../services/apiService'
import { formatCurrency } from '../config/config'
import './Settings.css'

const Settings = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [activeTab, setActiveTab] = useState('personal')

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm()

  useEffect(() => {
    loadUserProfile()
  }, [])

  const loadUserProfile = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const profile = await apiService.userSettings.getProfile()
      setUserProfile(profile)
      
      reset({
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
        phone_number: profile.phone_number || '',
        country: profile.country
      })
      
    } catch (err) {
      setError(err.message)
      console.error('Error cargando perfil:', err)
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data) => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)
      
      // Preparar solo los campos que cambiaron
      const updateData = {}
      
      if (data.first_name !== userProfile.first_name) {
        updateData.first_name = data.first_name
      }
      if (data.last_name !== userProfile.last_name) {
        updateData.last_name = data.last_name
      }
      if (data.email !== userProfile.email) {
        updateData.email = data.email
      }
      if (data.phone_number !== userProfile.phone_number) {
        updateData.phone_number = data.phone_number
      }
      
      if (Object.keys(updateData).length === 0) {
        setError('No hay cambios para guardar')
        return
      }
      
      // Enviar a la API
      await apiService.userSettings.updateProfile(updateData)
      
      // Recargar perfil actualizado
      await loadUserProfile()
      
      setSuccess('Cambios guardados exitosamente')
      
      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setSuccess(null), 3000)
      
    } catch (err) {
      setError(err.message)
      console.error('Error actualizando perfil:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleProfilePictureChange = async (event) => {
    const file = event.target.files[0]
    if (file) {
      try {
        setError(null)
        setSuccess(null)
        
        // Convertir imagen a base64
        const reader = new FileReader()
        reader.onloadend = async () => {
          try {
            await apiService.userSettings.updateProfilePicture(reader.result)
            await loadUserProfile()
            setSuccess('Foto de perfil actualizada exitosamente')
            setTimeout(() => setSuccess(null), 3000)
          } catch (err) {
            setError('Error al actualizar foto de perfil')
            console.error('Error:', err)
          }
        }
        reader.readAsDataURL(file)
        
      } catch (err) {
        setError('Error al actualizar foto de perfil')
        console.error('Error:', err)
      }
    }
  }

  const formatPhoneNumber = (value) => {
    // Formatear número de teléfono colombiano: +57 XXX XXX XXXX
    const cleaned = value.replace(/\D/g, '')
    if (cleaned.startsWith('57')) {
      const number = cleaned.substring(2)
      if (number.length <= 10) {
        const formatted = number.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3')
        return `+57 ${formatted}`
      }
    }
    return value
  }

  const handlePhoneChange = (event) => {
    const formatted = formatPhoneNumber(event.target.value)
    setValue('phone_number', formatted)
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="settings-loading">
          <div className="loading-spinner"></div>
          <p>Cargando ajustes...</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="settings-container">
        {/* Header */}
        <div className="page-header">
          <h1>Ajustes</h1>
        </div>

        {/* Error Message */}
        {error && (
          <div className="error-message">
            <i className="icon-warning"></i>
            {error}
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="success-message">
            <i className="icon-check"></i>
            {success}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="settings-tabs">
          <button 
            className={`tab-button ${activeTab === 'personal' ? 'active' : ''}`}
            onClick={() => setActiveTab('personal')}
          >
            Información Personal
          </button>
        </div>

        {/* Personal Information Section */}
        {activeTab === 'personal' && (
          <div className="personal-info-section">
            {/* Profile Picture */}
            <div className="profile-picture-container">
              <div className="profile-picture">
                <img 
                  src={userProfile?.profile_picture || '/default-avatar.png'} 
                  alt="Foto de perfil"
                  onError={(e) => {
                    e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9IjUwIiBjeT0iNDAiIHI9IjE1IiBmaWxsPSIjOUNBM0FGIi8+CjxwYXRoIGQ9Ik0yMCA4MEMyMCA2NS42NDA2IDMxLjY0MDYgNTQgNDYgNTRINTRDNjguMzU5NCA1NCA4MCA2NS42NDA2IDgwIDgwVjEwMEgyMFY4MFoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+'
                  }}
                />
                <div className="edit-icon">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePictureChange}
                    className="file-input"
                    id="profile-picture-input"
                  />
                  <label htmlFor="profile-picture-input" className="edit-button">
                    <i className="icon-edit"></i>
                  </label>
                </div>
              </div>
            </div>

            {/* Personal Information Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="personal-info-form">
              <div className="form-row">
                {/* Left Column */}
                <div className="form-column">
                  <div className="form-group">
                    <label htmlFor="first_name">Nombre</label>
                    <input
                      type="text"
                      id="first_name"
                      {...register('first_name', {
                        required: 'El nombre es requerido',
                        minLength: {
                          value: 2,
                          message: 'El nombre debe tener al menos 2 caracteres'
                        },
                        pattern: {
                          value: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/,
                          message: 'El nombre solo puede contener letras y espacios'
                        }
                      })}
                      className={errors.first_name ? 'error' : ''}
                    />
                    {errors.first_name && (
                      <span className="error-message">{errors.first_name.message}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="email">Correo</label>
                    <input
                      type="email"
                      id="email"
                      {...register('email', {
                        required: 'El correo es requerido',
                        pattern: {
                          value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                          message: 'Formato de correo inválido'
                        }
                      })}
                      className={errors.email ? 'error' : ''}
                    />
                    {errors.email && (
                      <span className="error-message">{errors.email.message}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="country">País</label>
                    <select
                      id="country"
                      {...register('country')}
                      disabled
                      className="disabled"
                    >
                      <option value="Colombia">Colombia</option>
                    </select>
                    <span className="field-note">País fijo para la aplicación</span>
                  </div>
                </div>

                {/* Right Column */}
                <div className="form-column">
                  <div className="form-group">
                    <label htmlFor="last_name">Apellido</label>
                    <input
                      type="text"
                      id="last_name"
                      {...register('last_name', {
                        required: 'El apellido es requerido',
                        minLength: {
                          value: 2,
                          message: 'El apellido debe tener al menos 2 caracteres'
                        },
                        pattern: {
                          value: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/,
                          message: 'El apellido solo puede contener letras y espacios'
                        }
                      })}
                      className={errors.last_name ? 'error' : ''}
                    />
                    {errors.last_name && (
                      <span className="error-message">{errors.last_name.message}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="phone_number">Número de Teléfono</label>
                    <input
                      type="tel"
                      id="phone_number"
                      {...register('phone_number', {
                        required: 'El número de teléfono es requerido',
                        pattern: {
                          value: /^\+57\s\d{3}\s\d{3}\s\d{4}$/,
                          message: 'Formato: +57 XXX XXX XXXX'
                        }
                      })}
                      onChange={handlePhoneChange}
                      placeholder="+57 XXX XXX XXXX"
                      className={errors.phone_number ? 'error' : ''}
                    />
                    {errors.phone_number && (
                      <span className="error-message">{errors.phone_number.message}</span>
                    )}
                    <span className="field-note">Formato: +57 XXX XXX XXXX</span>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="form-actions">
                <button 
                  type="submit" 
                  className="btn-save-changes"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <div className="loading-spinner-small"></div>
                      Guardando...
                    </>
                  ) : (
                    'Guardar Cambios'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default Settings