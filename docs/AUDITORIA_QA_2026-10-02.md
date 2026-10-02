# Auditoría funcional y técnica de Fanix Global

Fecha: 2 de octubre de 2026. Se inició sobre `8f4e269` y se integraron los cambios concurrentes de autenticación persistente, CRUD y navegación de `e672136` y las validaciones de `78c385b`, conservando sus capacidades. Alcance: API, interfaz web, componentes compartidos con Android, navegación, contratos de formularios, permisos y lógica de negocio.

## Dictamen

El sistema tiene una base funcional multiempresa. Antes de esta revisión, su interfaz solo mostraba ocho módulos además del dashboard y utilizaba un formulario genérico de un campo para todos. Esto impedía realizar varios flujos que sí existían en el backend. Esta entrega incorpora formularios específicos, edición, acciones de estado, más módulos y validación automatizada.

El resultado es una versión más completa para una demostración académica. No equivale a certificar un ERP de producción ni a demostrar que el APK funciona en un dispositivo físico. Las pruebas usan una API local en memoria; no modifican datos de la empresa publicada.

## Hallazgos corregidos

| ID | Prioridad | Defecto observado en el código anterior | Resultado de la corrección |
|---|---|---|---|
| QA-01 | Alta | Crear proyecto enviaba un UUID fijo sin membresía | Selector de responsables reales; responsable inicial es el usuario autenticado; validación de cliente de la misma empresa |
| QA-02 | Alta | Notificaciones mostraba Crear aunque no existía POST /notifications | Módulo de consulta con acción Marcar leída |
| QA-03 | Alta | Finanzas siempre enviaba amount=1 e income | Monto real, ingreso/egreso, categoría y referencia; acción Marcar pagado |
| QA-04 | Alta | Productos se creaba siempre con precio/costo cero y SKU automático | Campos explícitos de SKU, precio, costo y mínimo; control de SKU duplicado y edición |
| QA-05 | Alta | No había listados UI de ventas/compras/cotizaciones ni movimientos | Módulos accesibles con formularios de productos por operación, referencias válidas y acciones de compras/cotizaciones |
| QA-06 | Alta | Ventas no tenía GET /sales | Listado autenticado y restringido a roles comerciales |
| QA-07 | Alta | Líneas repetidas de una venta validaban stock por separado y podían dejarlo negativo | Rechazo de productos repetidos antes de cualquier mutación |
| QA-08 | Alta | BOM aceptaba componentes duplicados y el producto terminado como componente | Rechazo de duplicados y autorreferencia |
| QA-09 | Media | Referencias de producto inválidas en venta/compra terminaban en error 500 | Error 404 antes de calcular o modificar stock |
| QA-10 | Alta | La interfaz ignoraba refreshToken y logout solo borraba el token local | Renovación automática ante 401, renovación compartida entre solicitudes y revocación de sesión en el servidor |
| QA-11 | Alta | Fetch del dashboard no comprobaba HTTP; counts podía no existir | Cliente valida respuesta, reporta error y evita mostrar ceros como una carga exitosa |
| QA-12 | Alta | Navegación hacía cargas duplicadas y respuestas viejas podían reemplazar otro módulo | Estado separado por pantalla, limpieza al desmontar y descarte de respuestas obsoletas |
| QA-13 | Media | Sin búsqueda, paginación, edición ni confirmación de éxito | Búsqueda por columnas visibles, páginas de diez registros, edición admitida y mensajes de resultado |
| QA-14 | Media | Tabla exigía ancho mínimo de 520 px en celular | Tarjetas legibles debajo de 640 px; tabla con desplazamiento en escritorio |
| QA-15 | Media | Cerrar sesión se superponía al logo en encabezado compacto | Encabezado flexible y controles táctiles de al menos 44 px en acciones principales |
| QA-16 | Media | Teclado podía cubrir login y consumir el primer toque en formularios | Login desplazable, ajuste al teclado, envío desde teclado y conservación del toque en formularios |
| QA-17 | Media | Todos los usuarios aparecían como Admin | Nombre y rol reales; menú y creación según permisos del backend |
| QA-18 | Media | URL de API de release sin variable apuntaba a localhost | Fallback de producción a Render; prefijo /api/v1 conservado; eliminación de barra final |
| QA-19 | Media | Repetir un movimiento después de una respuesta perdida podía duplicarlo | API de movimientos admite Idempotency-Key y devuelve el movimiento existente; UI mantiene la clave al reintentar sin cambiar el formulario |
| QA-20 | Alta | Registro asumía tipos de entrada válidos y podía lanzar excepciones | Schema de registro para nombre, empresa, correo y contraseña |
| QA-21 | Alta | Rol sales podía registrar pagos ajenos a ventas; referencia financiera no comprobaba su tipo | Restricción comercial y validación del tipo de ingreso/egreso de referencia |
| QA-22 | Media | Versiones instaladas de React/RN diferían de las esperadas por Expo y había varias copias de React | React/React DOM 19.1.0, RN 0.81.5 y tipos 19.1; versiones compartidas en la raíz del monorepo |
| QA-23 | Media | Cambiar módulo no actualizaba URL ni permitía Atrás/Adelante en web | URLs con hash, por ejemplo #/Clientes; restauración del módulo después del login; Atrás de Android vuelve al dashboard |
| QA-24 | Media | Ediciones y varias acciones no generaban actividad de auditoría | Eventos de edición de catálogo, movimientos y transiciones seleccionadas de compras/proyectos/finanzas/incidencias |

| QA-25 | Alta | La eliminación concurrente de clientes/productos podía dejar referencias huérfanas | Se conserva la eliminación con confirmación explícita y se impide borrar catálogos relacionados con ventas, cotizaciones, proyectos, compras o producción |

## Matriz funcional después de la entrega

Los permisos se comprueban también en la API. La navegación móvil comparte estos componentes; los listados se adaptan al ancho.

| Módulo | Operaciones disponibles desde la interfaz | Pendientes para cerrar el módulo |
|---|---|---|
| Dashboard | Conteos, stock bajo, actividad, actualización manual y accesos rápidos | Indicadores monetarios por período y accesos rápidos por rol |
| Clientes | Alta, listado, búsqueda, edición, paginación y eliminación protegida | Historial comercial, interacciones y archivo lógico |
| Productos | Alta, edición, eliminación protegida, SKU, precio/costo y stock calculado | Categorías, unidades de medida, existencias por almacén |
| Inventario | Entradas/salidas, historial y rechazo de salida sin stock | Transferencias, conteo físico y significado explícito de adjustment |
| Ventas | Alta con múltiples productos, precios/cantidades, listado; operación idempotente | Impuestos de venta, devoluciones, cancelaciones y facturación |
| Cotizaciones | Alta con múltiples productos/impuesto; enviada, aceptada o rechazada | Conversión a venta y vencimiento automático |
| Compras | Alta, aprobar/rechazar, recibir una vez y actualizar stock | Solicitudes, pagos y conciliación financiera |
| Proveedores | Alta, edición, búsqueda y eliminación protegida | Clasificación e historial de compras |
| Empleados | Alta y edición de datos/estado | Ausencias, historial y gestión departamental |
| Proyectos | Alta con responsable válido y estado planeado/activo/cerrado | Interfaz de tareas, horas y reportes de ejecución |
| Finanzas | Ingreso/egreso, monto real, referencia y marca manual de pagado | Libro contable, saldos, conciliación y automatización desde ventas/compras |
| Incidencias | Alta, listado y resolución por administrador | Asignación, prioridad y reapertura |
| Notificaciones | Listado y marca de lectura | Servicio generador de alertas, vencimientos y deduplicación |
| Sucursales | Alta, edición y consulta | Desactivar desde interfaz y preferencias por sucursal |
| Almacenes | Alta y asociación con sucursal | Transferencias y stock desglosado |
| Documentos | Consulta del catálogo de metadatos, explícitamente identificada como parcial | Carga/descarga UI, almacenamiento durable y permisos por documento |
| Auditoría | Consulta, búsqueda y paginación de eventos | Cobertura uniforme de todas las mutaciones, filtros y retención |
| Reportes | Listado de ventas, búsqueda; CSV en web y contenido CSV compartible en Android | Rango de fechas, agregados, compras/inventario/finanzas y archivo CSV nativo |
| Producción | API existente de recetas, inicio y finalización; prueba de integración y validación de componentes | Interfaz completa de recetas/órdenes; bloqueo consistente cuando el módulo está desactivado |
| Administración | Rol/empresa reales y menú según rol | CRUD de usuarios, membresías, empresa, moneda y permisos finos |
| Integraciones | API pública configurada para web/app | Adaptadores de facturación, correo, pagos y almacenamiento |

## Riesgos que siguen abiertos

| Prioridad | Hallazgo | Consecuencia | Acción recomendada |
|---|---|---|---|
| Alta | MongoDB guarda un snapshot global; la respuesta exitosa se envía antes de terminar persistDatabase | Una falla de escritura puede perder operaciones; varias réplicas pueden sobrescribir estado | Repositorios por colección, transacciones de inventario y persistencia confirmada antes de responder |
| Alta | Documentos se guardan en el sistema de archivos local | Sin disco persistente o storage externo, un redespliegue puede perder archivos aunque conserve metadatos | Configurar almacenamiento durable y verificar restauración |
| Alta | Pagos no comprueba el saldo pendiente ni limita sobrepagos | Se pueden registrar importes superiores a una referencia | Validar saldo, moneda y transacción contable; pruebas de pagos parciales y concurrencia |
| Alta | No se ha ejecutado la versión nueva del APK en el Motorola físico | Exportar el bundle Android no detecta todos los fallos nativos | Construir APK release e instalar; capturar adb logcat si falla |
| Alta | La autenticación persistente concurrente usa AsyncStorage para tokens | En Android no es almacenamiento cifrado para secretos; en web existe exposición ante XSS | Conservar restauración funcional, migrar a SecureStore/cookies apropiadas y definir “recordarme” |
| Media | Idempotencia depende de estado en memoria/snapshot y no valida que el payload repetido coincida | No hay garantía completa frente a múltiples procesos; una clave repetida puede devolver otra operación | Índices únicos por empresa/clave, huella de solicitud y transacciones |
| Media | Listados descargan todos los registros; paginación es cliente | Rendimiento y consumo de datos empeoran con grandes volúmenes | Paginación, filtros y búsqueda del servidor |
| Media | Los formularios de edición omiten campos opcionales vacíos | Vaciar un campo no elimina necesariamente el valor previamente guardado | Definir semántica explícita de borrado de campos y validación PATCH |
| Media | Las transiciones de cotización/proyecto en la API son más permisivas que las acciones visibles | Un cliente externo puede cambiar estados fuera de la secuencia de UI | Máquina de estados validada en backend |
| Media | enabledModules no bloquea de forma uniforme todas las rutas | Desactivar un módulo no garantiza impedir cada operación | Middleware de habilitación por módulo |
| Media | Hay eliminación permanente protegida de clientes/productos/proveedores, sin archivo lógico | Falta recuperación de registros y política de retención | Implementar archivo lógico con autorización y referencias existentes |

## Evidencia y límites de las pruebas

1. `npm run typecheck`: API, web y móvil.
2. `npm test`: compila API, ejecuta trece pruebas de integración y el recorrido de componentes compartidos.
3. El recorrido de componentes usa React con host nativo simulado y la API Express real en memoria. Verifica eventos de botones y formularios, login, rol, alta/edición/búsqueda de clientes, notificaciones sin botón inexistente, responsable/estado de proyecto, monto/estado financiero, resolución de incidencias, renovación/restauración de sesión persistente, creación de producto, entrada de inventario, venta y compra aprobada/recibida, stock final de 6 unidades y logout en servidor.
4. `npm run export --workspace apps/web`: generación de la aplicación web.
5. `npm exec --workspace apps/mobile -- expo export --platform android`: resolución de módulos y bundle Hermes. No es generación ni instalación de un APK.
6. `expo install --check` en web y mobile: compatibilidad de dependencias con el SDK instalado.

No se han verificado en esta auditoría: operaciones con una cuenta real de producción, pruebas concurrentes con Atlas, ciclo de respaldo/restauración, instalación del APK físico, lector de pantalla ni layout visual exhaustivo en todos los dispositivos. No se deben presentar estas comprobaciones como realizadas.

## Criterios de aceptación para la próxima entrega

- Ejecutar en web y Motorola: login, cliente, producto, entrada de stock, venta, compra aprobada/recibida, finanzas, incidencia y logout.
- Verificar que el stock final coincida exactamente con entradas, salidas y operaciones comerciales.
- Cortar conexión durante una operación idempotente y reintentar sin duplicar datos.
- Repetir el recorrido con roles Consulta, Ventas e Inventario; comprobar 403 en acciones no autorizadas.
- Reiniciar API y confirmar registros de Atlas; redesplegar y comprobar archivos de documentos.
- Completar pago parcial/final, conversión de cotización y archivo lógico antes de considerar cerrados esos módulos.

La prioridad de la siguiente fase debe ser persistencia/stock transaccional, archivos durables y pagos; después, validación del APK físico y los módulos parcialmente expuestos.
