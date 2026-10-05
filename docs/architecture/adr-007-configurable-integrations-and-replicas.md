# ADR 007 — Integraciones configurables y réplicas

Estado: aceptado para operación local; proveedores externos pendientes de aprobación.

La API modular incorpora administración de usuarios, GPS normalizado y rutas mediante puertos y adaptadores. PostgreSQL conserva identidades, auditoría y outbox; MongoDB conserva observaciones; Redis sigue siendo efímero.

GPS está deshabilitado sin token. Cada integración admite exclusivamente los UUID autorizados en GPS_ALLOWED_VEHICLE_IDS. El adaptador de entrada acepta NDJSON de un traductor de dispositivos; no presupone protocolo ni proveedor. El token es independiente de JWT y solo existe en servidor. La repetición utiliza el mismo UUID; contenido distinto es un conflicto. Transporte HTTPS fuera de loopback, timeout y reintentos limitados.

El puerto RoutingProvider recibe coordenadas. OsrmAdapter invoca exclusivamente ROUTING_URL configurada por el operador, sin aceptar destinos HTTP del usuario ni redirecciones. Valida geometría, métricas y tamaño; limita espera a dos segundos. Redis guarda resultados durante cinco minutos. Sin proveedor, 503 y estado visible; nunca se fabrica un trayecto en línea recta. La respuesta simulada del navegador es un fixture explícito, no evidencia de calidad vial ni rendimiento del motor.

DISTRIBUTED_REALTIME habilita un bus Redis pub/sub detrás de LocalEventBus y el adaptador oficial de Socket.IO. Cada réplica revalida sus propios clientes contra PostgreSQL antes de enviar; la SPA usa WebSocket y recupera datos por HTTP. Pub/sub no ofrece entrega durable a clientes desconectados. Se mantiene el outbox SQL como registro durable de cambios transaccionales y leasing de 60 segundos con FOR UPDATE SKIP LOCKED. La entrega es al menos una vez: un fallo después de publicar puede producir repetición; los consumidores deduplican por UUID. Redis no sustituye SQS/SNS ni DLQ.

DISTRIBUTED_RATE_LIMIT comparte contadores atómicos en Redis; falla cerrado si el almacenamiento cae. TRUST_PROXY_HOPS se configura únicamente detrás de un proxy confiable que reemplaza encabezados. Nginx local sustituye X-Forwarded-For.

La administración requiere ADMIN en cada petición, audita cambios sin contraseñas ni tokens, aplica control de versión, revoca sesiones ante cambios de permisos y protege al último administrador mediante transacciones Serializable.

El empaquetado utiliza [pnpm deploy](https://pnpm.io/10.x/cli/deploy) para producir dependencias portables. Los contenedores se verifican localmente; no crean recursos AWS.
