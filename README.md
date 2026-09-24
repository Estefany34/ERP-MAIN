# ERP Platform

ERP modular y multiempresa construido con Node.js, Express, TypeScript, MongoDB Atlas y React Native Web.

## Estado

El repositorio parte vacío. La base ejecutable inicial incluye una API Express tipada, health checks, cabeceras de seguridad, CORS configurable y limitación de solicitudes. Los módulos se implementan sobre esta base y se documentan conforme quedan verificables.

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
npm run typecheck --workspace apps/api
npm test --workspace apps/api
npx expo export --platform web
```

La semilla local crea `admin@demo.local` con contraseña `Admin123!`. Sustituirla y configurar MongoDB antes de cualquier despliegue.
