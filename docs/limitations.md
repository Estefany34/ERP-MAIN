# Limitaciones conocidas

- La sesión local sin MongoDB Atlas sigue usando memoria y se pierde al reiniciar; en producción el servidor exige `MONGODB_URI` y fallará si no está configurado.
- La persistencia Atlas continúa siendo un snapshot versionado de la aplicación; no se añadieron migraciones ni repositorios transaccionales ni alta concurrencia.
- Compras, RRHH, proyectos, finanzas básicas, producción básica, notificaciones, incidencias y reportes siguen siendo funcionales en la base actual, pero no sustituyen una arquitectura de producción completa.
- El cliente móvil reutiliza la interfaz base; la navegación nativa específica y permisos de dispositivo no se han extendido en esta fase.
- El usuario demo debe permanecer solo en desarrollo; en producción no se usa ni se muestra por defecto.
- Web y API están publicadas. La interfaz comparte componentes con Android; las mejoras de navegación, formularios y tarjetas móviles deben validarse además en un APK instalado. Consulte `AUDITORIA_QA_2026-10-02.md` para los pendientes actuales.
