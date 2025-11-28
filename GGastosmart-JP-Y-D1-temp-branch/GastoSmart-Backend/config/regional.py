"""
Configuración Regional para GastoSmart - Colombia

Este archivo contiene la configuración específica de Colombia
para la aplicación GastoSmart.
"""

from typing import Dict, Any

# Configuración fija para Colombia
CURRENCY = "COP"
CURRENCY_SYMBOL = "$"
CURRENCY_NAME = "Peso Colombiano"
TIMEZONE = "America/Bogota"
COUNTRY = "Colombia"
DATE_FORMAT = "%d/%m/%Y"  # Formato colombiano

# Configuración de formato de números colombiano
NUMBER_FORMAT = {
    "decimal_separator": ",",
    "thousands_separator": ".",
    "decimal_places": 0  # Los pesos colombianos no usan decimales comúnmente
}

# Funciones de formateo para COP
def format_currency(amount: float) -> str:
    """
    Formatear cantidad de dinero en pesos colombianos
    
    Args:
        amount: Cantidad a formatear
        
    Returns:
        String formateado (ej: "$2.000.000")
    """
    # Formato colombiano: $2.000.000
    formatted = f"{amount:,.0f}".replace(",", ".")
    return f"${formatted}"

def parse_currency(currency_string: str) -> float:
    """
    Convertir string de moneda a número
    
    Args:
        currency_string: String con formato de moneda (ej: "$2.000.000")
        
    Returns:
        Número float
    """
    # Remover símbolos y espacios
    cleaned = currency_string.replace("$", "").replace(" ", "").replace(".", "")
    return float(cleaned)

# Categorías de gastos comunes
EXPENSE_CATEGORIES = [
    "Alimentación",
    "Transporte",
    "Vivienda",
    "Servicios públicos",
    "Salud",
    "Educación",
    "Entretenimiento",
    "Ropa",
    "Ahorros",
    "Otros"
]
