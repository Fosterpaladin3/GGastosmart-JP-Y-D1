# main.py
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
from dotenv import load_dotenv
from contextlib import asynccontextmanager
import uvicorn
import time

# Importar conexión a MongoDB
from database.connection import connect_to_mongo, close_mongo_connection

# Cargar variables de entorno
load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manejar el ciclo de vida de la aplicación"""
    # Startup
    await connect_to_mongo()
    yield
    # Shutdown
    await close_mongo_connection()

# Crear aplicación FastAPI
app = FastAPI(
    title="GastoSmart API",
    description="API para el sistema de gestión de gastos GastoSmart - Colombia",
    version="1.0.0",
    lifespan=lifespan
)

# Middleware de logging para debugging
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    print(f"\n{'='*80}")
    print(f"[REQUEST] {request.method} {request.url.path}")
    print(f"[HEADERS] Authorization: {'Present' if 'authorization' in request.headers else 'Missing'}")
    print(f"[HEADERS] Origin: {request.headers.get('origin', 'N/A')}")
    
    response = await call_next(request)
    
    process_time = time.time() - start_time
    print(f"[RESPONSE] Status: {response.status_code} | Time: {process_time:.2f}s")
    print(f"{'='*80}\n")
    
    return response

# Configurar CORS de forma explícita para desarrollo
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:8000", "http://127.0.0.1:8000"],  
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# NOTA: En modo desarrollo, Vite maneja los archivos estáticos
# Solo servir archivos estáticos en producción
if os.path.exists("../Front-end/dist"):
    app.mount("/assets", StaticFiles(directory="../Front-end/dist/assets"), name="assets")

# Ruta para servir el frontend React (solo en producción)
@app.get("/")
async def read_index():
    if os.path.exists("../Front-end/dist/index.html"):
        return FileResponse("../Front-end/dist/index.html")
    else:
        return {"message": "Frontend en modo desarrollo. Accede a http://localhost:3000"}

# -------------------------
# Importar routers
# -------------------------
# IMPORTANTE: cuando incluimos los routers los montamos bajo el prefijo /api
# para que las llamadas del frontend a /api/... funcionen correctamente.
from routers.users import router as users_router
from routers.transactions import router as transactions_router
from routers.goals import router as goals_router
from routers.reports import router as reports_router
from routers.user_settings import router as user_settings_router
from routers.recommendations import router as recommendations_router

# Incluir routers en la aplicación bajo /api para que el frontend use /api/...
app.include_router(users_router, prefix="/api")
app.include_router(transactions_router, prefix="/api")
app.include_router(goals_router, prefix="/api")
app.include_router(reports_router, prefix="/api")
app.include_router(user_settings_router, prefix="/api")
app.include_router(recommendations_router, prefix="/api")

# Ruta de prueba
@app.get("/api/test")
async def test_api():
    return {"message": "¡GastoSmart API funcionando!", "status": "success"}

# Ruta de debug para listar todas las rutas registradas
@app.get("/api/debug/routes")
async def list_routes():
    """Lista todas las rutas registradas en la aplicación"""
    routes = []
    for route in app.routes:
        if hasattr(route, "methods"):
            routes.append({
                "path": route.path,
                "name": route.name,
                "methods": list(route.methods)
            })
    return {"total_routes": len(routes), "routes": routes}

# Ruta para obtener configuración regional
@app.get("/api/config/regional")
async def get_regional_config():
    """
    Obtener configuración regional de Colombia
    """
    from config.regional import (
        CURRENCY, CURRENCY_SYMBOL, CURRENCY_NAME, TIMEZONE, 
        COUNTRY, DATE_FORMAT, NUMBER_FORMAT, EXPENSE_CATEGORIES
    )
    
    return {
        "country": COUNTRY,
        "currency": {
            "code": CURRENCY,
            "symbol": CURRENCY_SYMBOL,
            "name": CURRENCY_NAME
        },
        "timezone": TIMEZONE,
        "date_format": DATE_FORMAT,
        "number_format": NUMBER_FORMAT,
        "expense_categories": EXPENSE_CATEGORIES
    }

# Ruta catch-all para servir archivos del frontend React (DEBE ir al final)
# IMPORTANTE: Excluir rutas de API para evitar conflictos
@app.get("/{path:path}")
async def read_frontend(path: str):
    # NO capturar rutas de API - dejar que los routers las manejen
    if path.startswith('api/'):
        # Si llegamos aquí, la ruta API no existe - retornar 404
        raise HTTPException(status_code=404, detail=f"API endpoint not found: /{path}")
    
    # Si es un archivo estático (JS, CSS, imágenes, etc.) - solo en producción
    if path.startswith('assets/') or path.endswith(('.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot')):
        static_path = f"../Front-end/dist/{path}"
        if os.path.exists(static_path):
            return FileResponse(static_path)
        else:
            # En desarrollo, Vite maneja los assets
            raise HTTPException(status_code=404, detail=f"Asset not found: {path}")
    
    # Para todas las demás rutas, servir el index.html de React (solo en producción)
    if os.path.exists("../Front-end/dist/index.html"):
        return FileResponse("../Front-end/dist/index.html")
    else:
        # En desarrollo, redirigir a Vite
        return {"message": "Accede a http://localhost:3000 para el frontend en desarrollo"}

if __name__ == "__main__":
    # Mensaje útil al arrancar para debugging
    print("Arrancando GastoSmart API en http://127.0.0.1:8000")
    uvicorn.run(app, host="127.0.0.1", port=8000)
