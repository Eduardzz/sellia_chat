# Proyecto de Sala Chat en Tiempo Real

Este proyecto es una aplicación de chat en tiempo real que incluye un frontend desarrollado con Vue.js y un backend con Node.js y Socket.IO. Permite la comunicación entre usuarios y la visualización de mensajes en un panel de administración.

---

## Requisitos

- **Node.js**: Asegúrate de tener instalada la versión recomendada de Node.js.
- **MongoDB**: Es necesario tener una base de datos MongoDB en ejecución.
- **npm**: Gestor de paquetes de Node.js.

---

## Configuración del Proyecto

### 1. Configuración de Archivos `.env`

#### **Backend**
Crea un archivo `.env` en el directorio `backend` con el siguiente contenido:
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/chat
NODE_ENV=development
FRONTEND_URL=http://localhost:8080


#### **Client**
Crea un archivo `.env` en el directorio `client` con el siguiente contenido:
```env
VUE_APP_SOCKET_URL=http://localhost:3000
VUE_APP_BACKEND_URL=http://localhost:3000


### 2. Ejecutar el proyecto

#### **Client**
cd client
npm install
npm run serve


#### **Backend**
cd backend
npm install
npm run dev


### 3. Rutas

http://localhost:8080
http://localhost:8080/admin