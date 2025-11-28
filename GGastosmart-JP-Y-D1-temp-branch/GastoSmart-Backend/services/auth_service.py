"""
Servicio de Autenticación JWT para GastoSmart
"""

from fastapi import Depends, HTTPException, status, Header
from typing import Optional
from jose import JWTError, jwt
from datetime import datetime, timedelta
from bson import ObjectId
import os

from database.connection import get_async_database

# Configuración JWT
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "gastosmart-secret-key-change-in-production")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_HOURS = int(os.getenv("JWT_EXPIRATION_HOURS", "24"))

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """
    Crea un token JWT
    
    Args:
        data: Datos a codificar en el token
        expires_delta: Tiempo de expiración opcional
        
    Returns:
        str: Token JWT codificado
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    
    return encoded_jwt

async def get_current_user(
    authorization: Optional[str] = Header(None),
    db = Depends(get_async_database)
):
    """
    Obtiene el usuario actual desde el token JWT
    
    Args:
        authorization: Header de autorización con Bearer token
        db: Base de datos MongoDB
        
    Returns:
        dict: Usuario autenticado
        
    Raises:
        HTTPException: Si el token es inválido o el usuario no existe
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if authorization is None:
        raise credentials_exception
    
    # Extraer el token del header "Bearer <token>"
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise credentials_exception
    except ValueError:
        raise credentials_exception
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        
        if user_id is None:
            raise credentials_exception
            
    except JWTError:
        raise credentials_exception
    
    # Obtener usuario de la base de datos
    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if user is None:
            raise credentials_exception
        
        # No incluir la contraseña en la respuesta
        if "password" in user:
            del user["password"]
        
        # Convertir ObjectId a string
        user["id"] = str(user["_id"])
        
        return user
        
    except Exception as e:
        print(f"Error al obtener usuario: {e}")
        raise credentials_exception

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifica si una contraseña coincide con su hash
    
    Args:
        plain_password: Contraseña en texto plano
        hashed_password: Contraseña hasheada
        
    Returns:
        bool: True si coinciden, False en caso contrario
    """
    # Por ahora comparación simple
    # En producción, usar bcrypt o argon2
    return plain_password == hashed_password

def get_password_hash(password: str) -> str:
    """
    Genera el hash de una contraseña
    
    Args:
        password: Contraseña en texto plano
        
    Returns:
        str: Contraseña hasheada
    """
    # Por ahora retorna la contraseña tal cual
    # En producción, usar bcrypt o argon2
    return password
