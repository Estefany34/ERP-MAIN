# Auditoria funcional

Fecha: 2026-09-23. Revisada la implementacion real de `apps/api/src`, `apps/web/App.tsx`, `apps/mobile/App.tsx`, configuracion y pruebas.

| Modulo | Funcionalidades solicitadas | Estado actual | Defectos encontrados | Acciones necesarias |
|---|---|---|---|---|
| MOD-01 Administracion | Empresas, usuarios, membresias, roles, configuracion | Implementado parcialmente | Hay configuracion de modulos, sucursales y almacenes; faltan CRUD de usuarios, departamentos y permisos finos | Completar administracion protegida |
| MOD-02 Dashboard | Ventas, compras, stock, alertas, actividad | Implementado parcialmente | Ahora incluye compras, notificaciones no leidas y modulos; faltan accesos rapidos y agregados por rol | Ampliar agregados y permisos |
| MOD-03 CRM | CRUD, filtros, historial, interacciones | Implementado parcialmente | Clientes solo alta/listado; sin edicion ni interacciones | Agregar historial e interacciones |
| MOD-04 Ventas | Cotizaciones, estados, impuestos, pagos, reportes | Implementado parcialmente | Cotizaciones, impuesto basico y pagos idempotentes implementados; falta convertir cotizacion a venta y reportes filtrados | Completar ciclo comercial |
| MOD-05 Compras | Solicitudes, aprobacion, rechazo, recepcion, pagos | Implementado parcialmente | Aprobacion, rechazo y recepcion implementados; falta solicitud separada y relacion financiera automatica | Completar ciclo de compras |
| MOD-06 Proveedores | CRUD, clasificacion, historial | Implementado parcialmente | Solo alta/listado | Agregar edicion e historial |
| MOD-07 Inventario | Almacenes, transferencias, ajustes, categorias, UOM | Implementado parcialmente | Almacenes y movimientos existen; faltan transferencias, categorias, UOM y existencias por almacen | Agregar ubicaciones y operaciones idempotentes |
| MOD-08 Finanzas | Ingresos, egresos, cuentas, pagos, reportes | Implementado parcialmente | Transaccion basica y pago sin relacion automatica | Relacionar ventas/compras y reportar saldos |
| MOD-09 RRHH | Empleados, incidencias, ausencias, historial | Implementado parcialmente | Empleados basicos; sin incidencias laborales ni historial completo | Agregar eventos laborales y permisos |
| MOD-10 Proyectos | Proyectos, tareas, actividades, horas, reportes | Implementado parcialmente | Proyectos/tareas basicos; sin horas ni actividades | Agregar registro de horas y estados |
| MOD-11 Produccion | BOM, consumo, producto terminado, ordenes | Implementado parcialmente | BOM, inicio, consumo y producto terminado implementados; faltan planificacion avanzada y reportes | Completar planificacion |
| MOD-12 Reportes | Filtros, fechas, paginacion, CSV por modulo | Implementado parcialmente | Solo CSV de ventas sin filtros | Crear reportes parametrizados |
| MOD-13 Automatizacion | Alertas, aprobaciones, vencimientos, ejecuciones | Implementado parcialmente | Notificaciones CRUD minimo; sin scheduler ni deduplicacion efectiva | Crear servicio de eventos y ejecuciones deduplicadas |
| MOD-14 Documentos | Archivo, metadatos, descarga, permisos | Implementado parcialmente | Upload/download local seguro implementado; falta almacenamiento cloud y antivirus | Integrar proveedor externo cuando existan credenciales |
| MOD-15 Soporte/auditoria | Incidencias, notificaciones, auditoria | Implementado parcialmente | Auditoria de algunas altas/ventas; no hay eventos uniformes | Centralizar auditoria y soporte |
| MOD-16 Configuracion | Sucursales, moneda, zona, reglas, modulos | Implementado parcialmente | Empresa solo tiene moneda/modulos fijos | Agregar configuracion y validaciones |
| MOD-17 Integraciones | Correo, facturacion, pagos, storage, externos | Pendiente por configuración externa | No hay adaptadores ni contratos de integracion | Crear interfaces y adaptadores verificables/simulables |

## Riesgos técnicos

- Las rutas mutan arrays globales y la persistencia Atlas guarda un snapshot; no hay repositorios ni transacciones MongoDB por operación.
- El servidor no puede demostrar conexión Atlas sin una credencial real. El modo memoria está restringido a desarrollo y pruebas.
- Las pruebas existentes son API de integración con store en memoria; falta una suite con MongoDB efímero/Atlas.
- Expo/Metro mantiene vulnerabilidades transitivas que requieren un upgrade mayor.
