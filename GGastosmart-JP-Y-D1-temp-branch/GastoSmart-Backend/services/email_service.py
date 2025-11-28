"""
    Servicio de envío de correos electrónicos
"""

import os #Sistema operativo: en el proyecto leer variables de entorno
import random #Generar códigos de verificación random
import string #Constante con caracteres, usar para generar 6 digitos
from datetime import datetime, timedelta #Fecha y hora - diferencia de tiempo
from typing import Optional #Definir tipo de dato opcional, sea de tipo o none

from fastapi_mail import FastMail, MessageSchema, ConnectionConfig   
# FastMail: clase para enviar correos electrónicos
# MessageSchema: esquema para el cuerpo del mensaje
# ConnectionConfig: configuración para el servidor de correo SMTP


from motor.motor_asyncio import AsyncIOMotorDatabase
#motor: motor asincronico (driver) para interactuar con la base de datos MongoDB

class EmailService:
    def __init__(self, database: AsyncIOMotorDatabase):
        
        # await esperar a que se complete una operación asíncrona (que toma tiempo)
        # self. Accede a metodos y atributos de la clase
        self.database = database
        self.verification_codes = database.verification_codes
        
        self.mail_config = ConnectionConfig(
            #os.getenv busca una variable de entorno con el primer parametro, si no existe, usa el segundo parametro (default)
            MAIL_USERNAME=os.getenv("MAIL_USERNAME", "gastosmart.app@gmail.com"),
            MAIL_PASSWORD=os.getenv("MAIL_PASSWORD", "gastosmart"),
            MAIL_FROM=os.getenv("MAIL_FROM","gastosmart.app@gmail.com"),
            MAIL_PORT=587,
            MAIL_SERVER="smtp.gmail.com",
            MAIL_STARTTLS=True,
            MAIL_SSL_TLS=False,
            USE_CREDENTIALS=True,
            VALIDATE_CERTS=True,
            )
        
        self.fastmail = FastMail(self.mail_config)
        
    async def generate_verification_code(self,email:str, purpose:str) -> str:
        # Generar el codigo de verificacion
        code = ''.join(random.choices(string.digits, k=6))
        # Generar la fecha de expiracion
        expires_at = datetime.now() + timedelta(minutes=10)
        
        # Guardar el codigo de verificacion en la base de datos
        verification_doc = {
            "email":email,
            "code":code,
            "purpose":purpose,
            "created_at":datetime.now(),
            "expires_at": expires_at,
            "used": False,
            "attempts": 0
        }
        
        await self.verification_codes.insert_one(verification_doc)
        return code
    
    async def send_verification_email(self, email:str, code:str, purpose:str, user_name:str = None) -> bool:
        # Enviar correo electrónico con el codigo de verificacion
        try:
            # Determinar el asunto y el contenido según el propósito
            if purpose == "registration":
                subject = "Verificación de cuenta - GastoSmart"
                template_name = "verification_registration"
            else:
                subject = "Recuperación de contraseña - GastoSmart"
                template_name = "verification_recovery"
            
            # Crear el mensaje
            message = MessageSchema(
                subject=subject,
                recipients=[email],
                body=self._create_email_body(code,purpose,user_name),
                subtype="html",
            )
            
            # Enviar el correo electrónico
            await self.fastmail.send_message(message)
            return True
        except Exception as e:
            print(f"Error al enviar el correo electrónico: {e}")
            return False
        
    def _create_email_body(self, code:str, purpose:str, user_name:str = None) -> str:
        
        greeting = f"Hola {user_name}!" if user_name else "Hola!"
        if purpose == "registration":
            title = "Verificación de cuenta"
            message = "Para completar tu registro en GastoSmart, por favor ingresa el siguiente código de verificación:"
        else:
            title = "Recuperación de contraseña"
            message = "Para recuperar tu contraseña en GastoSmart, por favor ingresa el siguiente código de verificación:"
            
        html_body = f"""
        <!DOCTYPE html>
        <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>{title} - GastoSmart</title>
                <style>
                    body {{
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                    }}
                    .container {{
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                    }}
                    .header {{
                        text-align: center;
                        color: #ea580c;
                    }}
                    .code {{
                        font-size: 32px;
                        font-weight: bold;
                        color: #ea580c;
                        text-align: center;
                        margin: 20px 0;
                        
                    }}
                    .footer {{
                        margin-top: 30px;
                        font-size: 14px;
                        color: #666;
                    }}
                </style>
            </head>
            <body>
                <div class="container">
                    <h2 class="header">GastoSmart - {title}</h2>
                    <p>{greeting}</p>
                    <p>{message}</p>
                    <div class="code">{code}</div>
                    <p>Este código expirará en 10 minutos.</p>
                    <p>Si no solicitaste este código, por favor ignora este correo.</p>
                    <div class="footer">
                        <p>Saludos,<br> Equipo GastoSmart</p>
                        <p>GastoSmart</p>
                    </div>
                </div>
            </body>
            </html>
        """
        return html_body
    
    async def verify_code(self, email:str, code:str, purpose:str) -> dict:
        """
        Verificar código de verificación con control de intentos
        
        Returns:
            dict: {"valid": bool, "message": str, "attempts_left": int}
        """
        
        # Buscar el código más reciente para este email y propósito
        verification_doc = await self.verification_codes.find_one({
            "email": email,
            "purpose": purpose,
            "used": False,
            "expires_at": {"$gt": datetime.now()},
        }, sort=[("created_at", -1)])
        
        if not verification_doc:
            return {
                "valid": False, 
                "message": "Código inválido o expirado",
                "attempts_left": 0
            }
        
        # Verificar si el código coincide
        if verification_doc["code"] == code:
            # Código correcto - marcar como usado
            await self.verification_codes.update_one(
                {"_id": verification_doc["_id"]},
                {"$set": {"used": True}},
            )
            return {
                "valid": True,
                "message": "Código verificado exitosamente",
                "attempts_left": 3
            }
        else:
            # Código incorrecto - incrementar intentos
            current_attempts = verification_doc.get("attempts", 0) + 1
            attempts_left = max(0, 3 - current_attempts)
            
            if current_attempts >= 3:
                # Máximo de intentos alcanzado - marcar como usado
                await self.verification_codes.update_one(
                    {"_id": verification_doc["_id"]},
                    {"$set": {"used": True, "attempts": current_attempts}},
                )
                return {
                    "valid": False,
                    "message": "Máximo de intentos alcanzado. Solicita un nuevo código",
                    "attempts_left": 0
                }
            else:
                # Actualizar contador de intentos
                await self.verification_codes.update_one(
                    {"_id": verification_doc["_id"]},
                    {"$set": {"attempts": current_attempts}},
                )
                return {
                    "valid": False,
                    "message": f"Código incorrecto. Te quedan {attempts_left} intentos",
                    "attempts_left": attempts_left
                }