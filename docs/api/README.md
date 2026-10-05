# API del MVP local

Base: /api/v1. Swagger de desarrollo: /api/docs. Todas las rutas operativas requieren Bearer JWT, sesión activa y cualquiera de los seis roles para lectura.

| Método | Ruta                          | Acceso / comportamiento                                                 |
| ------ | ----------------------------- | ----------------------------------------------------------------------- |
| GET    | /health                       | Público; liveness                                                       |
| GET    | /health/services              | Público; estado seguro y latencias                                      |
| POST   | /auth/login                   | Credenciales; 5 intentos/minuto                                         |
| POST   | /auth/refresh                 | Cookie HttpOnly, origen restringido, rotación; 20/minuto                |
| POST   | /auth/logout                  | Revoca la sesión; 204; idempotente                                      |
| GET    | /auth/me                      | Sesión activa                                                           |
| GET    | /dashboard/summary            | Seis métricas, alertas y comparación histórica si hay datos             |
| GET    | /shipments                    | Paginación, search, status, priority, from y to                         |
| GET    | /shipments/:id                | Detalle e historial                                                     |
| POST   | /shipments                    | ADMIN, LOGISTICS_ADMIN, TRAFFIC_COORDINATOR; idempotencia por reference |
| PATCH  | /shipments/:id/status         | Mismos roles; status, expectedUpdatedAt y vehicleId al iniciar tránsito |
| GET    | /fleet/vehicles               | Paginación, search y status; últimas posiciones                         |
| GET    | /fleet/vehicles/:id           | Vehículo y última posición                                              |
| POST   | /fleet/vehicles               | ADMIN, LOGISTICS_ADMIN, FLEET_SUPERVISOR; plate única                   |
| PATCH  | /fleet/vehicles/:id           | Mismos roles; AVAILABLE/MAINTENANCE y expectedUpdatedAt                 |
| POST   | /fleet/vehicles/:id/positions | Mismos roles; observación GPS idempotente                               |
| GET    | /fleet/vehicles/:id/positions | Histórico MongoDB paginado; from/to UTC                                 |
| GET    | /inventory                    | Paginación, search y warehouseId                                        |
| GET    | /inventory/alerts             | Paginación, search, warehouseId, state=open/resolved/all                |
| GET    | /inventory/warehouses         | Paginación y search                                                     |
| POST   | /inventory/warehouses         | ADMIN, LOGISTICS_ADMIN, WAREHOUSE_MANAGER                               |
| POST   | /inventory                    | Mismos roles; warehouseId, sku, name, quantity, minimumQuantity         |
| PATCH  | /inventory/:id                | Mismos roles; quantity, minimumQuantity, reason, expectedUpdatedAt      |
| GET    | /inventory/:id/movements      | Historial paginado, sin datos personales del actor                      |
| GET    | /reports/shipments.csv        | CSV filtrado por search/status/priority/from/to                         |
| GET    | /reports/inventory.csv        | CSV del inventario actual                                               |

Las colecciones usan { items, total, page, pageSize }, page=1 y pageSize=20 por defecto, máximo 100. Fechas ISO 8601 e IDs UUID; las observaciones contienen id, latitude, longitude y observedAt. receivedAt se genera en servidor. El catálogo de flota informa telemetryStatus=degraded ante fallos de telemetría.

POST devuelve 201. PATCH devuelve 200. Entrada inválida=400, sesión inválida=401, permisos insuficientes=403, inexistente=404, conflicto=409, exportación demasiado grande=422 y rate limiting=429. Los errores incluyen statusCode, message, requestId y timestamp; nunca stack, credenciales ni conexiones. No deben pasarse filtros que el endpoint no admita.

Los CSV son UTF-8 con BOM, comillas escapadas, protección ante fórmulas de hojas de cálculo, Cache-Control: no-store y límite de 10,000 filas. Los filtros de fecha de envíos y reportes se aplican a createdAt, con extremos inclusivos.

Health retorna HTTP 200 con status=degraded cuando una dependencia falla. latencyMs de API es null porque es liveness interno; PostgreSQL, MongoDB y Redis tienen mediciones reales. Liveness no garantiza disponibilidad de datos ni es un SLO de producción.

## WebSocket

Namespace /operations. Handshake auth: { token: accessToken }. No se envían tokens por query string.
El servidor publica event con { id, name, occurredAt, payload } y los contratos de packages/shared/src/events. Los consumidores deben tolerar duplicados y recuperar estado mediante HTTP al reconectar. Los WebSockets no aceptan escrituras operativas; se realizan en REST con DTOs y RBAC.

## Administración, integraciones y operación

| Método | Ruta                        | Autorización / comportamiento                                                          |
| ------ | --------------------------- | -------------------------------------------------------------------------------------- |
| GET    | /users / /users/roles       | ADMIN; catálogo y listado paginado search/state                                        |
| POST   | /users                      | ADMIN; email, name, password y roles validados; sin contraseña/hash en respuesta       |
| PATCH  | /users/:id                  | ADMIN; name, active, roles, expectedUpdatedAt; revoca sesiones cuando cambian permisos |
| GET    | /users/:id/audit            | ADMIN; cambios paginados, actor UUID, sin contraseñas ni tokens                        |
| GET    | /integrations/status        | Roles de lectura; únicamente booleans de configuración                                 |
| POST   | /integrations/gps/positions | Token privado y scope de UUID; observation idempotente, 6000/min                       |
| POST   | /routing/route              | Roles de lectura, 60/min; origin/destination {latitude,longitude}                      |
| GET    | /health/ready               | Público; 200 operativo, 503 con dependencia caída                                      |
| GET    | /metrics                    | Deshabilitado sin METRICS_TOKEN; bearer dedicado, texto Prometheus                     |

Routing devuelve provider, distanceMeters, durationSeconds, coordinates [longitude,latitude], calculatedAt y cached. Sin configuración/proveedor disponible=503; sin ruta vial=422. No se envían connection strings ni URLs internas. GPS usa id, vehicleId, latitude, longitude y observedAt; no admite escrituras de entidades completas ni IDs fuera del scope.

El historial de usuarios registra creación y cambios de roles/actividad. No existe endpoint de eliminación ni cambios de contraseñas existentes. El último ADMIN activo no puede desactivarse ni perder el rol. Los controles requieren versión vigente; la UI recibe 409 ante conflicto.

Con DISTRIBUTED_REALTIME y DISTRIBUTED_RATE_LIMIT las réplicas utilizan Redis y leasing de outbox. Los consumidores deben deduplicar UUID y recuperar datos por HTTP ante reconexión; pub/sub no almacena mensajes para clientes desconectados.
