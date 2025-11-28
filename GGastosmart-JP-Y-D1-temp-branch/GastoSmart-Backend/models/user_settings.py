"""
Modelo de Ajustes de Usuario para GastoSmart

Este archivo define el modelo de datos para la gestión básica del perfil
de usuario en la aplicación GastoSmart.
"""

from pydantic import BaseModel, Field, EmailStr, validator
from typing import Optional
from datetime import datetime
import re

class UserSettingsUpdate(BaseModel):
    """
    Modelo para actualizar información personal del usuario
    """
    first_name: Optional[str] = Field(None, min_length=2, max_length=50, description="Nombre del usuario")
    last_name: Optional[str] = Field(None, min_length=2, max_length=50, description="Apellido del usuario")
    email: Optional[EmailStr] = Field(None, description="Correo electrónico del usuario")
    phone_number: Optional[str] = Field(None, description="Número de teléfono del usuario")
    
    @validator('phone_number')
    def validate_phone_number(cls, v):
        if v is not None:
            # Validar formato de teléfono colombiano: +57 XXX XXX XXXX
            phone_pattern = r'^\+57\s\d{3}\s\d{3}\s\d{4}$'
            if not re.match(phone_pattern, v):
                raise ValueError('El número de teléfono debe tener el formato: +57 XXX XXX XXXX')
        return v
    
    @validator('first_name', 'last_name')
    def validate_names(cls, v):
        if v is not None:
            # Validar que solo contenga letras, espacios y acentos
            name_pattern = r'^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$'
            if not re.match(name_pattern, v):
                raise ValueError('El nombre solo puede contener letras, espacios y acentos')
            # Validar longitud mínima después de quitar espacios
            if len(v.strip()) < 2:
                raise ValueError('El nombre debe tener al menos 2 caracteres')
        return v

class UserSettingsResponse(BaseModel):
    """
    Modelo de respuesta para información personal del usuario
    """
    id: str = Field(..., description="ID único del usuario")
    first_name: str = Field(..., description="Nombre del usuario")
    last_name: str = Field(..., description="Apellido del usuario")
    email: str = Field(..., description="Correo electrónico del usuario")
    phone_number: Optional[str] = Field(None, description="Número de teléfono del usuario")
    country: str = Field(default="Colombia", description="País del usuario (siempre Colombia)")
    country_code: str = Field(default="+57", description="Código de país (siempre +57)")
    is_verified: bool = Field(default=False, description="Si el usuario está verificado")
    profile_picture: Optional[str] = Field(None, description="URL de la foto de perfil")
    created_at: datetime = Field(..., description="Fecha de creación de la cuenta")
    updated_at: Optional[datetime] = Field(None, description="Fecha de última actualización")

class UserProfilePictureUpdate(BaseModel):
    """
    Modelo para actualizar foto de perfil
    """
    profile_picture: str = Field(..., description="URL o base64 de la nueva foto de perfil")

class UserSettingsValidation(BaseModel):
    """
    Modelo para validación de campos de ajustes
    """
    field_name: str = Field(..., description="Nombre del campo a validar")
    field_value: str = Field(..., description="Valor del campo")
    is_valid: bool = Field(..., description="Si el campo es válido")
    error_message: Optional[str] = Field(None, description="Mensaje de error si no es válido")