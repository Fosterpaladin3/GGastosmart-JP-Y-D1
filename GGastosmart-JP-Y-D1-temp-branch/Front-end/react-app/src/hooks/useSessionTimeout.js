import { useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

/**
 * Hook personalizado para manejar la expiración de sesión por inactividad
 * Cierra sesión automáticamente después de 30 minutos sin actividad
 */
const useSessionTimeout = () => {
  const { logout, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const timeoutRef = useRef(null)
  
  // Tiempo de inactividad en milisegundos (30 minutos)
  const TIMEOUT_DURATION = 30 * 60 * 1000 // 30 minutos

  const resetTimeout = () => {
    // Limpiar el timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Crear un nuevo timeout
    timeoutRef.current = setTimeout(() => {
      console.log('[SESSION] Session expired due to inactivity')
      logout()
      navigate('/login', { 
        state: { message: 'Tu sesión ha expirado por inactividad. Por favor, inicia sesión nuevamente.' }
      })
    }, TIMEOUT_DURATION)
  }

  useEffect(() => {
    // Solo activar el timeout si el usuario está autenticado
    if (!isAuthenticated) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      return
    }

    // Lista de eventos que indican actividad del usuario
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
      'keydown'
    ]

    // Iniciar el timeout cuando se monta el componente
    resetTimeout()

    // Agregar event listeners para resetear el timeout en cada actividad
    events.forEach(event => {
      window.addEventListener(event, resetTimeout)
    })

    // Guardar el timestamp de última actividad en localStorage
    const saveLastActivity = () => {
      localStorage.setItem('lastActivity', Date.now().toString())
    }
    
    events.forEach(event => {
      window.addEventListener(event, saveLastActivity)
    })

    // Cleanup: remover event listeners y limpiar timeout
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      
      events.forEach(event => {
        window.removeEventListener(event, resetTimeout)
        window.removeEventListener(event, saveLastActivity)
      })
    }
  }, [isAuthenticated, logout, navigate])

  // Verificar al cargar si la sesión ya expiró
  useEffect(() => {
    if (!isAuthenticated) return

    const lastActivity = localStorage.getItem('lastActivity')
    if (lastActivity) {
      const timeSinceLastActivity = Date.now() - parseInt(lastActivity)
      
      // Si pasaron más de 30 minutos, cerrar sesión
      if (timeSinceLastActivity > TIMEOUT_DURATION) {
        console.log('[SESSION] Session expired - last activity was too long ago')
        logout()
        navigate('/login', {
          state: { message: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.' }
        })
      }
    }
  }, [isAuthenticated, logout, navigate])
}

export default useSessionTimeout

