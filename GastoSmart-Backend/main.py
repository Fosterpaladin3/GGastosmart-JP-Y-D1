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

# -------------------------
# Lifespan de la app
# -------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manejar el ciclo de vida de la aplicación"""
    await connect_to_mongo()
    yield
    await close_mongo_connection()

# -------------------------
# Crear aplicación FastAPI
# -------------------------
app = FastAPI(
    title="GastoSmart API",
    description="API para el sistema de gestión de gastos GastoSmart - Colombia",
    version="1.0.0",
    lifespan=lifespan
)

# -------------------------
# Middleware de logging
# -------------------------
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

# -------------------------
# Middleware CORS
# -------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------
# Archivos estáticos y frontend
# -------------------------
if os.path.exists("../Front-end/dist"):
    app.mount("/assets", StaticFiles(directory="../Front-end/dist/assets"), name="assets")

@app.get("/")
async def read_index():
    if os.path.exists("../Front-end/dist/index.html"):
        return FileResponse("../Front-end/dist/index.html")
    else:
        return {"message": "Frontend en modo desarrollo. Accede a http://localhost:3000"}

# -------------------------
# Importar routers
# -------------------------
from routers.users import router as users_router
from routers.transactions import router as transactions_router
from routers.goals import router as goals_router
from routers.reports import router as reports_router
from routers.user_settings import router as user_settings_router
from routers.recommendations import router as recommendations_router

# -------------------------
# Incluir routers sin duplicar prefijo /api
# -------------------------
app.include_router(users_router)              # /api/users/login ya funciona
app.include_router(transactions_router)       # /api/transactions/...
app.include_router(goals_router)              # /api/goals/...
app.include_router(reports_router)            # /api/reports/...
app.include_router(user_settings_router)      # /api/user_settings/...
app.include_router(recommendations_router)    # /api/recommendations/...

# -------------------------
# Rutas de prueba y debug
# -------------------------
@app.get("/api/test")
async def test_api():
    return {"message": "¡GastoSmart API funcionando!", "status": "success"}

@app.get("/api/debug/routes")
async def list_routes():
    routes = []
    for route in app.routes:
        if hasattr(route, "methods"):
            routes.append({
                "path": route.path,
                "name": route.name,
                "methods": list(route.methods)
            })
    return {"total_routes": len(routes), "routes": routes}

@app.get("/api/config/regional")
async def get_regional_config():
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

# -------------------------
# Catch-all para frontend React
# -------------------------
@app.get("/{path:path}")
async def read_frontend(path: str):
    if path.startswith('api/'):
        raise HTTPException(status_code=404, detail=f"API endpoint not found: /{path}")
    
    if path.startswith('assets/') or path.endswith(('.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot')):
        static_path = f"../Front-end/dist/{path}"
        if os.path.exists(static_path):
            return FileResponse(static_path)
        else:
            raise HTTPException(status_code=404, detail=f"Asset not found: {path}")
    
    if os.path.exists("../Front-end/dist/index.html"):
        return FileResponse("../Front-end/dist/index.html")
    else:
        return {"message": "Accede a http://localhost:3000 para el frontend en desarrollo"}

# -------------------------
# Arrancar servidor
# -------------------------
if __name__ == "__main__":
    print("Arrancando GastoSmart API en http://127.0.0.1:8000")
    uvicorn.run(app, host="127.0.0.1", port=8000)
