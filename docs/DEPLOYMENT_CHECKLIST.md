# DEPLOYMENT CHECKLIST

Esta lista es solo de preparación para despliegue académico y no incluye valores reales ni secretos.

## BACKEND / RENDER

- NODE_ENV: production
- PORT: 4000 (o puerto asignado por Render)
- JWT_SECRET: valor secreto generado externamente y almacenado en variables de entorno
- MONGODB_URI: cadena de conexión de MongoDB Atlas configurada solo en el entorno de hosting
- CORS_ORIGIN: origen permitido del frontend público, por ejemplo el dominio de Cloudflare o la URL final del web app
- ALLOW_PUBLIC_REGISTRATION: false por defecto; solo true si se requiere registro abierto y se ha validado la seguridad

## FRONTEND / CLOUDFLARE

- EXPO_PUBLIC_API_URL: URL pública del backend API, configurada en el entorno del frontend

## MongoDB Atlas

- Crear base de datos y usuario con permisos mínimos
- Usar una cadena de conexión segura y almacenada en variables de entorno del backend
- No versionar credenciales ni archivos de conexión en el repositorio

## Render

- Configurar servicio para la API
- Exponer el puerto correcto del proceso
- Establecer variables de entorno del backend en secreto
- Validar que `NODE_ENV=production` y `JWT_SECRET` se carguen correctamente
- Verificar `MONGODB_URI` antes de abrir tráfico real

## Cloudflare

- Configurar el frontend estático exportado por Expo Web
- Enlazar la URL del backend API via `EXPO_PUBLIC_API_URL`
- Validar CORS con el origen esperado
- Mantener la aplicación sin credenciales embebidas ni secretos en el repositorio

## Android / Expo

- Usar el mismo backend configurado en variables de entorno
- Mantener la app sin secretos duros en código
- Validar login, sesión y acceso a módulos antes de la entrega final

## No deployment en esta fase

- No se crea servicio Render
- No se configura Cloudflare ni DNS
- No se despliega producción
- No se cambian credenciales reales ni enlaces de hosting
- No se publican secretos en el repositorio
