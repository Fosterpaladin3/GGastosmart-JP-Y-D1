# 🏦 GastoSmart - Sistema de Gestión de Gastos

GastoSmart es una aplicación web completa para la gestión de gastos personales, desarrollada con React (Frontend) y FastAPI (Backend), específicamente diseñada para el mercado colombiano.

## 📋 Tabla de Contenidos

- [Características](#-características)
- [Tecnologías Utilizadas](#-tecnologías-utilizadas)
- [Requisitos del Sistema](#-requisitos-del-sistema)
- [Instalación](#-instalación)
- [Configuración](#-configuración)
- [Ejecución](#-ejecución)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [API Endpoints](#-api-endpoints)
- [Troubleshooting](#-troubleshooting)
- [Contribución](#-contribución)

## ✨ Características

- 📊 **Dashboard Interactivo**: Visualización de gastos con gráficos y estadísticas
- 💰 **Gestión de Presupuestos**: Configuración de presupuestos quincenales y mensuales
- 🎯 **Metas Financieras**: Establecimiento y seguimiento de objetivos de ahorro
- 📈 **Reportes Detallados**: Análisis de gastos por categorías y períodos
- 🔐 **Autenticación Segura**: Sistema de login con JWT y verificación por email
- 📱 **Responsive Design**: Interfaz adaptable a dispositivos móviles
- 🇨🇴 **Localización Colombiana**: Moneda COP, formatos de fecha y configuración regional

## 🛠 Tecnologías Utilizadas

### Backend
- **FastAPI** - Framework web moderno y rápido
- **MongoDB** - Base de datos NoSQL
- **Motor** - Driver asíncrono para MongoDB
- **PyMongo** - Driver síncrono para MongoDB
- **Pydantic** - Validación de datos
- **JWT** - Autenticación con tokens
- **FastAPI-Mail** - Envío de correos electrónicos
- **Bcrypt** - Encriptación de contraseñas

### Frontend
- **React 18** - Biblioteca de interfaz de usuario
- **Vite** - Herramienta de construcción rápida
- **React Router** - Enrutamiento del lado del cliente
- **Recharts** - Biblioteca de gráficos
- **Axios** - Cliente HTTP
- **React Hook Form** - Manejo de formularios
- **Styled Components** - CSS-in-JS
- **HTML2Canvas & jsPDF** - Generación de reportes PDF

## 📋 Requisitos del Sistema

### Software Requerido
- **Python 3.8+** (recomendado 3.11+)
- **Node.js 16+** (recomendado 18+)
- **MongoDB 4.4+** (local o Atlas)
- **Git** (para clonar el repositorio)

### Herramientas Recomendadas
- **Visual Studio Code** con extensiones:
  - Python
  - ES7+ React/Redux/React-Native snippets
  - MongoDB for VS Code
  - Thunder Client (para testing de API)

## 🚀 Instalación

### 1. Clonar el Repositorio

```bash
git clone <url-del-repositorio>
cd GastoSmart
```

### 2. Configurar el Backend (Python/FastAPI)

#### 2.1 Crear Entorno Virtual

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

#### 2.2 Instalar Dependencias del Backend

```bash
cd GastoSmart-Backend
pip install -r requirements.txt
```

**Dependencias principales que se instalarán:**
- `fastapi==0.116.1` - Framework web
- `uvicorn==0.35.0` - Servidor ASGI
- `motor==3.7.1` - Driver asíncrono MongoDB
- `pymongo==4.15.0` - Driver síncrono MongoDB
- `pydantic==2.11.7` - Validación de datos
- `python-jose[cryptography]==3.3.0` - JWT tokens
- `fastapi-mail==1.4.1` - Envío de emails
- `bcrypt==4.2.1` - Encriptación
- `passlib[bcrypt]==1.7.4` - Manejo de contraseñas

### 3. Configurar el Frontend (React)

#### 3.1 Instalar Node.js y npm

Descargar e instalar desde [nodejs.org](https://nodejs.org/)

#### 3.2 Instalar Dependencias del Frontend

```bash
cd Front-end/react-app
npm install
```

**Dependencias principales que se instalarán:**
- `react@^18.2.0` - Biblioteca de UI
- `react-dom@^18.2.0` - DOM de React
- `react-router-dom@^6.20.1` - Enrutamiento
- `recharts@^2.8.0` - **Gráficos y visualizaciones**
- `axios@^1.6.2` - Cliente HTTP
- `react-hook-form@^7.48.2` - Manejo de formularios
- `styled-components@^6.1.19` - CSS-in-JS
- `html2canvas@^1.4.1` - Captura de pantalla
- `jspdf@^3.0.3` - Generación de PDF
- `date-fns@^2.30.0` - Manipulación de fechas

## ⚙️ Configuración

### 1. Configurar MongoDB

####  MongoDB Atlas 
1. Crear cuenta en [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Crear un cluster gratuito
3. Obtener la cadena de conexión

### 2. Variables de Entorno

Crear archivo `.env` en la carpeta `GastoSmart-Backend`:


## 🏃‍♂️ Ejecución

### 1. Iniciar MongoDB


### 2. Ejecutar el Backend

```bash
# Activar entorno virtual
# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

# Navegar al directorio del backend
cd GastoSmart-Backend

# Ejecutar el servidor
python main.py
# O alternativamente:
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

El backend estará disponible en: `http://127.0.0.1:8000`
Documentación de la API: `http://127.0.0.1:8000/docs`

### 3. Ejecutar el Frontend

```bash
# En una nueva terminal
cd Front-end/react-app

# Instalar dependencias (solo la primera vez)
npm install

# Ejecutar en modo desarrollo
npm run dev
```

El frontend estará disponible en: `http://localhost:3000`

### 4. Verificar la Instalación

1. **Backend**: Visitar `http://127.0.0.1:8000/api/test`
2. **Frontend**: Visitar `http://localhost:3000`
3. **API Docs**: Visitar `http://127.0.0.1:8000/docs`

## 📁 Estructura del Proyecto

```
GastoSmart/
├── Front-end/
│   ├── react-app/                 # Aplicación React
│   │   ├── src/
│   │   │   ├── components/        # Componentes reutilizables
│   │   │   ├── pages/            # Páginas de la aplicación
│   │   │   ├── contexts/         # Contextos de React
│   │   │   ├── services/         # Servicios de API
│   │   │   ├── hooks/            # Hooks personalizados
│   │   │   ├── styles/           # Estilos globales
│   │   │   └── config/           # Configuración
│   │   ├── public/               # Archivos públicos
│   │   ├── package.json          # Dependencias del frontend
│   │   └── vite.config.js        # Configuración de Vite
│   └── dist/                     # Build de producción
├── GastoSmart-Backend/
│   ├── main.py                   # Punto de entrada de la aplicación
│   ├── requirements.txt          # Dependencias de Python
│   ├── database/                 # Operaciones de base de datos
│   ├── models/                   # Modelos de Pydantic
│   ├── routers/                  # Endpoints de la API
│   ├── services/                 # Servicios de negocio
│   ├── config/                   # Configuración regional
│   └── scripts/                  # Scripts de migración
└── venv/                         # Entorno virtual de Python
```


## 🔧 Troubleshooting

### Problemas Comunes

#### 1. Error de Conexión a MongoDB
```
Error: [Errno 111] Connection refused
```
**Solución:**
- Verificar que MongoDB esté ejecutándose
- Comprobar la URL de conexión en `.env`
- Para Atlas, verificar la IP whitelist

#### 2. Error de Dependencias de Python
```
ModuleNotFoundError: No module named 'fastapi'
```
**Solución:**
```bash
# Verificar que el entorno virtual esté activado
# Windows
venv\Scripts\activate

# Reinstalar dependencias
pip install -r requirements.txt
```

#### 3. Error de Dependencias de Node.js
```
Cannot find module 'react'
```
**Solución:**
```bash
cd Front-end/react-app
rm -rf node_modules package-lock.json
npm install
```

#### 4. Error de CORS
```
Access to fetch at 'http://127.0.0.1:8000' from origin 'http://localhost:3000' has been blocked by CORS policy
```
**Solución:**
- Verificar que el backend esté ejecutándose en el puerto 8000
- Comprobar la configuración de CORS en `main.py`

#### 5. Error de Gráficos (Recharts)
```
Error: Cannot read property 'map' of undefined
```
**Solución:**
- Verificar que los datos estén en el formato correcto
- Comprobar que Recharts esté instalado: `npm list recharts`

### Comandos Útiles

```bash
# Verificar versión de Python
python --version

# Verificar versión de Node.js
node --version
npm --version

# Verificar instalación de MongoDB
mongod --version

# Verificar puertos en uso
# Windows
netstat -an | findstr :8000
netstat -an | findstr :3000

# macOS/Linux
lsof -i :8000
lsof -i :3000
```


## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.


---
**¡Disfruta usando GastoSmart! 🎉**
