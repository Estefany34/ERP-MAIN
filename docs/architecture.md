# Arquitectura

El sistema usa un monolito modular para reducir complejidad operativa inicial. `apps/api` contiene Express, autenticación JWT, validación Zod, reglas de inventario, ventas, auditoría y un adaptador de conexión MongoDB Atlas. `apps/web` y `apps/mobile` comparten la pantalla React Native; Expo permite ejecutar la misma lógica en navegador y dispositivo.

## Multiempresa

El `companyId` se toma del membership asociado al token, nunca del body. Cada consulta de dominio filtra por esa empresa y los roles se verifican en el backend.

## Persistencia

La ejecución local sin `MONGODB_URI` usa un store en memoria para permitir desarrollo y pruebas sin secretos. Para producción se debe completar el repositorio MongoDB con índices y transacciones; la conexión ya está preparada y falla de forma explícita si Atlas está configurado pero no accesible.
