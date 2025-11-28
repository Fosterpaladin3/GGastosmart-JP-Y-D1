"""
Endpoints de API para Usuarios

Este archivo contiene todos los endpoints REST para manejar operaciones
relacionadas con usuarios en GastoSmart.
"""

from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer
from typing import List
from database.connection import get_async_database
from database.user_operations import UserOperations
from models.user import UserCreate, UserResponse, UserLogin, BudgetUpdate, VerificationCodeRequest, VerificationCodeConfirm
from motor.motor_asyncio import AsyncIOMotorDatabase

# Crear router para usuarios
router = APIRouter(prefix="/api/users", tags=["usuarios"])

# Configurar autenticación 
security = HTTPBearer()

def get_user_operations(db: AsyncIOMotorDatabase = Depends(get_async_database)) -> UserOperations:
    """
    Obtener instancia de operaciones de usuario
    
    Args:
        db: Base de datos MongoDB
        
    Returns:
        UserOperations: Instancia para operaciones de usuario
    """
    return UserOperations(db)

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    user_data: UserCreate,
    user_ops: UserOperations = Depends(get_user_operations)
):
    """
    Registrar un nuevo usuario en GastoSmart
    
    Este endpoint permite a los usuarios crear una nueva cuenta con su información
    personal y configuración de presupuesto inicial.
    
    Args:
        user_data: Datos del usuario a registrar
        user_ops: Operaciones de usuario
        
    Returns:
        UserResponse: Usuario creado exitosamente
        
    Raises:
        HTTPException: Si el correo ya existe o hay error en la validación
    """
    try:
        # Crear usuario
        user = await user_ops.create_user(user_data)
        
        # Enviar código de verificación automáticamente
        user_name = f"{user_data.first_name} {user_data.last_name}"
        email_sent = await user_ops.send_verification_code(
            user_data.email, 
            "registration",
            user_name
        )
        
        if not email_sent:
            print(f"⚠️ Advertencia: No se pudo enviar email de verificación a {user_data.email}")
        else:
            print(f"✅ Email de verificación enviado a {user_data.email}")
        
        return user
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        print(f"❌ Error en registro: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.post("/login")
async def login_user(
    login_data: UserLogin,
    user_ops: UserOperations = Depends(get_user_operations)
):
    """
    Iniciar sesión de usuario
    
    Autentica al usuario con su correo electrónico y contraseña.
    Bloquea la cuenta tras 5 intentos fallidos durante 15 minutos.
    Retorna un token JWT para autenticación posterior.
    
    Args:
        login_data: Datos de login (correo y contraseña)
        user_ops: Operaciones de usuario
        
    Returns:
        dict: Token JWT y datos del usuario
        
    Raises:
        HTTPException: Si las credenciales son inválidas o la cuenta está bloqueada
    """
    print(f"[DEBUG] Login attempt for email: {login_data.email}")
    
    try:
        user = await user_ops.authenticate_user(login_data)
        
        if not user:
            print(f"[DEBUG] Login failed for email: {login_data.email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales inválidas"
            )
        
        # Importar función de creación de token
        from services.auth_service import create_access_token
        
        # Crear token JWT
        access_token = create_access_token(data={"sub": user.id})
        
        print(f"[DEBUG] Login successful for user: {user.email}")
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "email_verified": user.email_verified,
                "budget_configured": user.budget_configured,
                "initial_budget": user.initial_budget
            }
        }
        
    except HTTPException as e:
        # Re-raise HTTPException para mantener el código de estado correcto
        print(f"[DEBUG] HTTPException in login: {e.status_code} - {e.detail}")
        raise e
    except ValueError as e:
        # Capturar mensajes de bloqueo de cuenta
        error_message = str(e)
        print(f"[DEBUG] Login blocked: {error_message}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=error_message
        )
    except Exception as e:
        print(f"[DEBUG] Unexpected error in login: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    user_ops: UserOperations = Depends(get_user_operations)
):
    """
    Obtener información de un usuario por ID
    
    Args:
        user_id: ID único del usuario
        user_ops: Operaciones de usuario
        
    Returns:
        UserResponse: Información del usuario
        
    Raises:
        HTTPException: Si el usuario no existe
    """
    user = await user_ops.get_user_by_id(user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )
    
    return user

@router.get("/", response_model=List[UserResponse])
async def get_all_users(
    skip: int = 0,
    limit: int = 100,
    user_ops: UserOperations = Depends(get_user_operations)
):
    """
    Obtener lista de todos los usuarios (con paginación)
    
    Args:
        skip: Número de usuarios a saltar
        limit: Límite de usuarios a devolver
        user_ops: Operaciones de usuario
        
    Returns:
        List[UserResponse]: Lista de usuarios
    """
    users = await user_ops.get_all_users(skip=skip, limit=limit)
    return users

@router.put("/{user_id}/budget", response_model=UserResponse)
async def update_user_budget(
    user_id: str,
    budget_data: BudgetUpdate,
    user_ops: UserOperations = Depends(get_user_operations)
):
    """
    Actualizar presupuesto del usuario
    
    Permite al usuario modificar su presupuesto inicial y período.
    
    Args:
        user_id: ID único del usuario
        budget_data: Nuevos datos de presupuesto
        user_ops: Operaciones de usuario
        
    Returns:
        UserResponse: Usuario con presupuesto actualizado
        
    Raises:
        HTTPException: Si el usuario no existe
    """
    user = await user_ops.update_budget(user_id, budget_data)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )
    
    return user

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_user(
    user_id: str,
    user_ops: UserOperations = Depends(get_user_operations)
):
    """
    Desactivar usuario (soft delete)
    
    Args:
        user_id: ID único del usuario
        user_ops: Operaciones de usuario
        
    Raises:
        HTTPException: Si el usuario no existe
    """
    success = await user_ops.deactivate_user(user_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )

@router.get("/email/{email}", response_model=UserResponse)
async def get_user_by_email(
    email: str,
    user_ops: UserOperations = Depends(get_user_operations)
):
    """
    Obtener usuario por correo electrónico
    
    Args:
        email: Correo electrónico del usuario
        user_ops: Operaciones de usuario
        
    Returns:
        UserResponse: Información del usuario
        
    Raises:
        HTTPException: Si el usuario no existe
    """
    user = await user_ops.get_user_by_email(email)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )
    
    return user

@router.post("/send-verification-code")
async def send_verification_code(
    request: VerificationCodeRequest,
    user_ops: UserOperations = Depends(get_user_operations)):
    """
    Enviar código de verificación por correo
    
    Envía un código único de 6 dígitos al correo del usuario para
    verificación en registro o recuperación de contraseña.
    """
    try:
        # Para registro, verificar que el correo no esté ya verificado
        if request.purpose == "registration":
            # Buscar usuario incluyendo los inactivos
            user_doc = await user_ops.collection.find_one({"email": request.email})
            if user_doc and user_doc.get("email_verified", False):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El correo electrónico ya está registrado y verificado"
                )
        
        # Para recuperación de contraseña, verificar que el usuario existe
        elif request.purpose == "password_recovery":
            # Verificación directa en la base de datos para mejor rendimiento
            user_doc = await user_ops.collection.find_one({"email": request.email})
            if not user_doc:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="No se encontró una cuenta asociada a este correo electrónico"
                )
        
        # Enviar código de verificación
        success = await user_ops.send_verification_code(
            request.email, 
            request.purpose
        )
        
        if success:
            return {"message": "Código de verificación enviado exitosamente"}
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error al enviar el código de verificación"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.post("/verify-code")
async def verify_code(
    request: VerificationCodeConfirm,
    user_ops: UserOperations = Depends(get_user_operations)):
    """
    Verificar código de verificación
    
    Valida el código enviado por correo para completar el proceso
    de registro o recuperación de contraseña.
    """
    try:
        result = await user_ops.verify_code(
            request.email,
            request.code,
            request.purpose
        )
        
        if result["valid"]:
            # Si es un código de registro, activar la cuenta del usuario
            if request.purpose == "registration":
                user_activated = await user_ops.activate_user_by_email(request.email)
                if user_activated:
                    print(f"✅ Usuario activado: {request.email}")
                else:
                    print(f"⚠️ No se pudo activar usuario: {request.email}")
            
            return {
                "message": result["message"], 
                "valid": True,
                "attempts_left": result["attempts_left"]
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["message"]
            )
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error en verificación de código: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.post("/reset-password")
async def reset_password(
    request: dict,
    user_ops: UserOperations = Depends(get_user_operations)):
    """
    Restablecer contraseña después de verificar código
    
    Actualiza la contraseña del usuario después de que se haya
    verificado exitosamente el código de recuperación.
    """
    try:
        email = request.get("email")
        new_password = request.get("new_password")
        
        print(f"[DEBUG] Reset password request for email: {email}")
        
        if not email or not new_password:
            print(f"[DEBUG] Missing email or password: email={email}, password={'***' if new_password else None}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email y nueva contraseña son requeridos"
            )
        
        # Verificar que el usuario existe (cualquier estado)
        user = await user_ops.get_user_by_email_any_status(email)
        print(f"[DEBUG] User found: {user is not None}")
        if not user:
            print(f"[DEBUG] User not found for email: {email}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado"
            )
        
        print(f"[DEBUG] User found: {user.email}, is_active: {user.is_active}")
        
        # Actualizar la contraseña
        success = await user_ops.update_password(email, new_password)
        print(f"[DEBUG] Password update success: {success}")
        
        if success:
            return {"message": "Contraseña actualizada exitosamente"}
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error al actualizar la contraseña"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"[DEBUG] Exception in reset_password: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )