# Manual administrativo

2026-10-07. ADMIN gestiona usuarios; LOGISTICS_ADMIN opera logística; FLEET_SUPERVISOR y TRAFFIC_COORDINATOR supervisan flota/rutas/envíos; WAREHOUSE_MANAGER gestiona inventario; VIEWER consulta y exporta. Aplica mínimo privilegio y cuentas nominales.

En Usuarios, crea o edita roles y actividad. El backend usa bcrypt, no devuelve hash/contraseña, exige expectedUpdatedAt y devuelve409 ante edición obsoleta. Desactivar o cambiar roles revoca sesiones entre réplicas. Ver cambios muestra auditoría sin secretos. La revisión trimestral de accesos es propuesta pendiente.

Configura en backend privado OPERATION_TIME_ZONE, ROUTING_URL y ROUTING_HEALTH_PATH aprobado sin costo, GPS_INGEST_TOKEN y scope de vehículos, METRICS_TOKEN, distribución Redis, TRUST_PROXY_HOPS y conexiones/JWT. Un cambio de zona inicia otra serie de snapshots. Usa custodios de secretos, reinicio controlado y verificaciones; nunca claves privadas en VITE ni .env en Git. Rotación GPS debe revocar token anterior y verificar 401; política de claves JWT/sesiones por aprobar.

Parámetros de rutas: corredor 20–5,000 m, confirmación 30–3,600 s y 2–20 muestras, radio de parada 20–200 m, tiempo 60–7,200 s, hueco 30–600 s menor que tiempo de parada, calidad 5–500 m, hasta 20 zonas autorizadas con radio 20–1,000 m. Validar con Flota y dispositivos antes del piloto; falta de accuracy no demuestra precisión.

Para integración referencia, mapear warehouseCode/SKU/externalId/version, preservar CAS y resultados por fila. El stock local es autoritativo hasta acordar WMS. Reportes contienen datos logísticos y requieren canal aprobado. No usar JWT de usuario como token de dispositivo.

CTO junto con TI del cliente propone aprobar infraestructura; Director General/comité con Finanzas, presupuesto; Director de Operaciones del cliente, UAT con logística/flota/almacén. Asignaciones pendientes de confirmación. Operación técnica en ../operations.md y ../operations/recovery-plan.md.
