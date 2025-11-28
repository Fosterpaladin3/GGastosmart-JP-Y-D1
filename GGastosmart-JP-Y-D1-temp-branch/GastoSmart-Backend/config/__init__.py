"""
Paquete de Configuración Regional para GastoSmart - Colombia

Este paquete contiene la configuración específica de Colombia
para la aplicación GastoSmart.
"""

from .regional import (
    CURRENCY,
    CURRENCY_SYMBOL,
    CURRENCY_NAME,
    TIMEZONE,
    COUNTRY,
    DATE_FORMAT,
    NUMBER_FORMAT,
    EXPENSE_CATEGORIES,
    format_currency,
    parse_currency
)

__all__ = [
    "CURRENCY",
    "CURRENCY_SYMBOL",
    "CURRENCY_NAME", 
    "TIMEZONE",
    "COUNTRY",
    "DATE_FORMAT",
    "NUMBER_FORMAT",
    "EXPENSE_CATEGORIES",
    "format_currency",
    "parse_currency"
]
