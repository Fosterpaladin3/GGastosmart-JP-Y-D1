/**
 * Configuración de la aplicación
 * Variables de entorno y constantes globales
 */

export const config = {
  // API Configuration
  // En desarrollo, usar URL relativa para aprovechar el proxy de Vite
  // En producción, se puede configurar con VITE_API_BASE_URL en las variables de entorno
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
  
  // Application
  appName: import.meta.env.VITE_APP_NAME || 'GastoSmart',
  appVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',
  
  // Regional
  country: import.meta.env.VITE_COUNTRY || 'Colombia',
  currency: import.meta.env.VITE_CURRENCY || 'COP',
  currencySymbol: import.meta.env.VITE_CURRENCY_SYMBOL || '$',
  locale: import.meta.env.VITE_LOCALE || 'es-CO',
  
  // Formato de moneda
  currencyFormat: {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }
}

/**
 * Formatea un número como moneda colombiana
 * @param {number} amount - Monto a formatear
 * @returns {string} - Monto formateado
 */
export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 'COP $0'
  }
  
  return new Intl.NumberFormat(config.locale, config.currencyFormat).format(amount)
}

/**
 * Formatea una fecha según la configuración regional
 * @param {Date|string} date - Fecha a formatear
 * @param {object} options - Opciones de formato
 * @returns {string} - Fecha formateada
 */
export const formatDate = (date, options = {}) => {
  if (!date) return ''
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  const defaultOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options
  }
  
  return new Intl.DateTimeFormat(config.locale, defaultOptions).format(dateObj)
}

/**
 * Formatea un número con separadores de miles
 * @param {number} number - Número a formatear
 * @returns {string} - Número formateado
 */
export const formatNumber = (number) => {
  if (number === null || number === undefined || isNaN(number)) {
    return '0'
  }
  
  return new Intl.NumberFormat(config.locale).format(number)
}

export default config
