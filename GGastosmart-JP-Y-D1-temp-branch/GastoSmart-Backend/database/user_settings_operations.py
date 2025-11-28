"""
Operaciones de Base de Datos para Ajustes de Usuario

Este archivo contiene las operaciones de base de datos para gestionar
la información básica del perfil de usuario en GastoSmart.
"""

from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
import re

from models.user_settings import (
    UserSettingsUpdate, UserSettingsResponse, UserProfilePictureUpdate,
    UserSettingsValidation
)

class UserSettingsOperations:
    """Clase para operaciones de ajustes de usuario"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.users_collection = db.users
        self.user_settings_collection = db.user_settings
    
    async def get_user_settings(self, user_id: str) -> Optional[UserSettingsResponse]:
        """
        Obtiene la información personal del usuario
        
        Args:
            user_id: ID del usuario
            
        Returns:
            UserSettingsResponse: Información del usuario o None si no existe
        """
        try:
            user = await self.users_collection.find_one({"_id": ObjectId(user_id)})
            if not user:
                return None
            
            # Obtener configuración adicional si existe
            settings = await self.user_settings_collection.find_one({"user_id": user_id})
            
            return UserSettingsResponse(
                id=str(user["_id"]),
                first_name=user.get("first_name", ""),
                last_name=user.get("last_name", ""),
                email=user.get("email", ""),
                phone_number=user.get("phone_number"),
                country=user.get("country", "Colombia"),
                country_code=user.get("country_code", "+57"),
                is_verified=user.get("is_verified", False),
                profile_picture=settings.get("profile_picture") if settings else None,
                created_at=user.get("created_at", datetime.now()),
                updated_at=user.get("updated_at")
            )
            
        except Exception as e:
            print(f"Error al obtener información del usuario: {e}")
            return None
    
    async def update_user_settings(self, user_id: str, settings_update: UserSettingsUpdate) -> bool:
        """
        Actualiza la información personal del usuario
        
        Args:
            user_id: ID del usuario
            settings_update: Datos a actualizar
            
        Returns:
            bool: True si se actualizó correctamente, False en caso contrario
        """
        try:
            # Preparar datos para actualizar
            update_data = {}
            
            if settings_update.first_name is not None:
                update_data["first_name"] = settings_update.first_name
            if settings_update.last_name is not None:
                update_data["last_name"] = settings_update.last_name
            if settings_update.email is not None:
                update_data["email"] = settings_update.email
            if settings_update.phone_number is not None:
                update_data["phone_number"] = settings_update.phone_number
            
            # Agregar timestamp de actualización
            update_data["updated_at"] = datetime.now()
            
            # Actualizar en la colección de usuarios
            result = await self.users_collection.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": update_data}
            )
            
            return result.modified_count > 0
            
        except Exception as e:
            print(f"Error al actualizar información del usuario: {e}")
            return False
    
    async def update_profile_picture(self, user_id: str, picture_update: UserProfilePictureUpdate) -> bool:
        """
        Actualiza la foto de perfil del usuario
        
        Args:
            user_id: ID del usuario
            picture_update: Datos de la nueva foto
            
        Returns:
            bool: True si se actualizó correctamente, False en caso contrario
        """
        try:
            # Actualizar o crear configuración de usuario
            await self.user_settings_collection.update_one(
                {"user_id": user_id},
                {
                    "$set": {
                        "profile_picture": picture_update.profile_picture,
                        "updated_at": datetime.now()
                    }
                },
                upsert=True
            )
            
            return True
            
        except Exception as e:
            print(f"Error al actualizar foto de perfil: {e}")
            return False
    
    async def validate_field(self, field_name: str, field_value: str) -> Dict[str, Any]:
        """
        Valida un campo específico
        
        Args:
            field_name: Nombre del campo a validar
            field_value: Valor del campo
            
        Returns:
            Dict[str, Any]: Resultado de la validación
        """
        try:
            validation_result = {
                "field_name": field_name,
                "field_value": field_value,
                "is_valid": True,
                "error_message": None
            }
            
            if field_name == "email":
                # Validar formato de email
                email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
                if not re.match(email_pattern, field_value):
                    validation_result["is_valid"] = False
                    validation_result["error_message"] = "Formato de email inválido"
            
            elif field_name == "phone_number":
                # Validar formato de teléfono colombiano
                phone_pattern = r'^\+57\s\d{3}\s\d{3}\s\d{4}$'
                if not re.match(phone_pattern, field_value):
                    validation_result["is_valid"] = False
                    validation_result["error_message"] = "El número de teléfono debe tener el formato: +57 XXX XXX XXXX"
            
            elif field_name in ["first_name", "last_name"]:
                # Validar nombres
                name_pattern = r'^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$'
                if not re.match(name_pattern, field_value):
                    validation_result["is_valid"] = False
                    validation_result["error_message"] = "El nombre solo puede contener letras, espacios y acentos"
                elif len(field_value.strip()) < 2:
                    validation_result["is_valid"] = False
                    validation_result["error_message"] = "El nombre debe tener al menos 2 caracteres"
            
            else:
                validation_result["is_valid"] = False
                validation_result["error_message"] = f"Campo '{field_name}' no es válido para validación"
            
            return validation_result
            
        except Exception as e:
            print(f"Error al validar campo: {e}")
            return {
                "field_name": field_name,
                "field_value": field_value,
                "is_valid": False,
                "error_message": f"Error interno: {str(e)}"
            }