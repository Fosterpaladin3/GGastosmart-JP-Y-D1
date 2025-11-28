# auth/dependencies.py

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
import os

# Ruta del endpoint que entrega el token de autenticación
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# Clave secreta del JWT (asegúrate de moverla a variables de entorno en producción)
SECRET_KEY = os.getenv("SECRET_KEY", "SUPER_SECRET_KEY_CHANGE_THIS")
ALGORITHM = "HS256"


def get_current_user(token: str = Depends(oauth2_scheme)):
    """
    Extrae información del usuario desde el token JWT.
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token no proporcionado",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        # Decodificar token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")

        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido: no contiene 'sub'",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Puedes devolver un diccionario o un objeto user
        return {"user_id": user_id}

    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
