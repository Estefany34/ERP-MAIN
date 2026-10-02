# ERP Platform

ERP modular y multiempresa construido con Node.js, Express, TypeScript, MongoDB Atlas y React Native Web.

## Estado

La API y las aplicaciones web/Android comparten contratos multiempresa, roles y sesiones. La interfaz incluye formularios por módulo, edición de catálogos, búsqueda, paginación y acciones comerciales. Web está publicada en https://erp-fanixglobal.pages.dev/ y la API en https://erp-fanix-global.onrender.com/api/v1.

Consulta la [auditoría QA del 2 de octubre de 2026](docs/AUDITORIA_QA_2026-10-02.md) para conocer las correcciones, la matriz funcional, la evidencia de pruebas y los pendientes. Los módulos parciales y las limitaciones de persistencia siguen documentados; exportar Android no demuestra que el APK haya sido instalado en un dispositivo físico.

## Arranque de la API

```bash
npm install
cp apps/api/.env.example apps/api/.env
npm run dev:api
```

Health check: `http://localhost:4000/api/v1/health`.

MongoDB Atlas se activa configurando `MONGODB_URI`; nunca se deben guardar credenciales en el repositorio.

## Aplicaciones

```bash
npm run web --workspace apps/web
npm start --workspace apps/mobile
```

La API implementa login/registro, aislamiento multiempresa, roles, persistencia Atlas, clientes, proveedores, productos, movimientos de inventario, ventas idempotentes, compras con aprobación y recepción, RRHH, proyectos, finanzas básicas, documentos, notificaciones, incidencias, producción condicionada, dashboard, auditoría e informe CSV de ventas. Los endpoints usan el prefijo `/api/v1/` y requieren `Authorization: Bearer <token>` salvo autenticación y health checks.

## Pruebas

```bash
npm run typecheck
npm test
npm run export --workspace apps/web
npm exec --workspace apps/mobile -- expo export --platform android
```

La semilla local crea `admin@demo.local` con contraseña `Admin123!`. Sustituirla y configurar MongoDB antes de cualquier despliegue.
