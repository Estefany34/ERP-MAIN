# Limitaciones conocidas

- La sesión local sin MongoDB Atlas usa memoria y se pierde al reiniciar; en producción el servidor exige `MONGODB_URI`.
- La persistencia Atlas usa un snapshot versionado de la aplicación; aún faltan repositorios por agregado, migraciones y transacciones nativas para concurrencia de alta escala.
- Compras, RRHH, proyectos, finanzas básicas, producción básica, documentos con metadatos, notificaciones, incidencias y reportes CSV tienen endpoints funcionales, pero sus flujos avanzados aún están pendientes.
- El cliente móvil reutiliza la interfaz base; la navegación nativa específica y permisos de dispositivo aún no están desarrollados.
- El usuario demo sólo debe existir en desarrollo y debe sustituirse por un flujo de alta controlado en un despliegue real.
