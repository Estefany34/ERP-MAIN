# Estado del proyecto

Fecha de verificacion: 2026-09-23.

## Completado y verificado

- API Express TypeScript con JWT, bcrypt, roles, validacion Zod, Helmet, CORS y rate limiting.
- Aislamiento multiempresa derivado de membresias del token, sin confiar en `companyId` del cliente.
- Persistencia MongoDB Atlas preparada: modelo singleton versionado `erpApplicationState`, carga al arranque, escrituras serializadas despues de mutaciones y cierre limpio.
- Modo memoria explicitamente limitado a desarrollo/pruebas cuando `MONGODB_URI` no esta configurado.
- Clientes, productos, proveedores, compras, aprobacion, rechazo, recepcion, movimientos de inventario y ventas idempotentes.
- Cotizaciones con impuestos y estados; pagos relacionados con ventas, compras y finanzas e idempotencia.
- RRHH basico: empleados, estado, departamento, puesto y auditoria de altas.
- Proyectos y tareas, finanzas basicas, notificaciones de lectura, documentos con metadatos y almacenamiento local seguro, incidencias y ordenes de produccion con BOM, consumo y producto terminado condicionadas al modulo habilitado.
- Sucursales, almacenes y activacion de modulos por empresa.
- Dashboard real por empresa, auditoria y exportacion CSV de ventas.
- Consola React Native Web compartida con la app Expo movil: login, navegacion y consultas/altas basicas de modulos.

## Pruebas ejecutadas

- `npm run typecheck --workspace apps/api`: correcto.
- `npm test --workspace apps/api`: 5 pruebas aprobadas, incluyendo cotizaciones, pagos, documentos y produccion.
- `npx expo export --platform web`: correcto.
- Health check HTTP local: correcto en `/api/v1/health`.
- La prueba de flujo cubre aislamiento de empresas, compra-aprobacion-recepcion, inventario, venta idempotente y rechazo de stock insuficiente.

## Parcial o pendiente

- MongoDB Atlas no pudo probarse contra un cluster real porque no se proporcionaron credenciales. La implementacion y variables estan preparadas.
- El snapshot MongoDB centraliza persistencia de la aplicacion actual; aun faltan repositorios por agregado, migraciones y transacciones MongoDB nativas para concurrencia de alta escala.
- Produccion incluye BOM y movimientos de consumo/obtencion, pero faltan planificacion avanzada, centros de trabajo y reportes de rendimiento.
- Ventas y compras tienen cotizaciones, impuestos basicos y pagos internos; faltan cuentas por cobrar/pagar completas y conciliacion bancaria.
- Documentos usan almacenamiento local seguro; falta proveedor cloud, antivirus y politicas de retencion.
- Correo, pasarelas, facturacion fiscal, integraciones externas y resumentes periodicos requieren credenciales/servicios.
- La consola movil comparte la experiencia funcional, pero falta navegacion nativa especifica y pruebas E2E de dispositivo.

## Seguridad y configuracion externa

Configurar `MONGODB_URI`, `JWT_SECRET` largo y `CORS_ORIGIN` en un entorno seguro. En produccion el servidor rechaza iniciar sin `MONGODB_URI`. No usar el usuario demo en produccion.

## Dependencias

`npm audit --omit=dev --audit-level=high` sigue reportando vulnerabilidades transitivas en Expo/Metro (`image-size`, `postcss`, `uuid`). La correccion propuesta por npm requiere `expo@57` y un cambio mayor; no se aplico automaticamente porque podria romper el stack actual.
