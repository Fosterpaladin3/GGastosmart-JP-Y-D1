"""
Rutas de API para Ajustes de Usuario

Este archivo define los endpoints REST para la gestión básica del perfil
de usuario en GastoSmart.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional
from datetime import datetime

from database.connection import get_async_database
from database.user_settings_operations import UserSettingsOperations
from models.user_settings import (
    UserSettingsUpdate, UserSettingsResponse, UserProfilePictureUpdate
)
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/user-settings", tags=["user-settings"])

@router.get("/profile", response_model=UserSettingsResponse)
async def get_user_profile(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_async_database)
):
    """
    Obtiene la información personal del usuario
    """
    try:
        settings_ops = UserSettingsOperations(db)
        user_settings = await settings_ops.get_user_settings(str(current_user["id"]))
        
        if not user_settings:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado"
            )
        
        return user_settings
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener información del usuario: {str(e)}"
        )

@router.put("/profile", response_model=UserSettingsResponse)
async def update_user_profile(
    settings_update: UserSettingsUpdate,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_async_database)
):
    """
    Actualiza la información personal del usuario
    """
    try:
        settings_ops = UserSettingsOperations(db)
        
        # Validar que al menos un campo sea proporcionado
        if not any([
            settings_update.first_name,
            settings_update.last_name,
            settings_update.email,
            settings_update.phone_number
        ]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Al menos un campo debe ser proporcionado para actualizar"
            )
        
        # Actualizar información
        success = await settings_ops.update_user_settings(
            current_user["id"], settings_update
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se pudo actualizar la información del usuario"
            )
        
        # Obtener información actualizada
        updated_settings = await settings_ops.get_user_settings(str(current_user["id"]))
        
        return updated_settings
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al actualizar información del usuario: {str(e)}"
        )

@router.put("/profile-picture")
async def update_profile_picture(
    profile_picture: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_async_database)
):
    """
    Actualiza la foto de perfil del usuario
    """
    try:
        settings_ops = UserSettingsOperations(db)
        
        picture_update = UserProfilePictureUpdate(profile_picture=profile_picture)
        success = await settings_ops.update_profile_picture(
            current_user["id"], picture_update
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se pudo actualizar la foto de perfil"
            )
        
        return {"message": "Foto de perfil actualizada exitosamente"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al actualizar foto de perfil: {str(e)}"
        )

@router.post("/validate-field")
async def validate_field(
    field_name: str,
    field_value: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_async_database)
):
    """
    Valida un campo específico
    """
    try:
        settings_ops = UserSettingsOperations(db)
        validation_result = await settings_ops.validate_field(field_name, field_value)
        
        return validation_result
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al validar campo: {str(e)}"
        )

@router.get("/phone-formats")
async def get_phone_formats():
    """
    Obtiene los formatos de teléfono disponibles
    """
    return {
        "formats": [
            {
                "country": "Colombia",
                "code": "+57",
                "format": "+57 XXX XXX XXXX",
                "example": "+57 315 445 6993",
                "pattern": r"^\+57\s\d{3}\s\d{3}\s\d{4}$"
            }
        ]
    }