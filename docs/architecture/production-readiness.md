# Preparación de producción

Esta guía define trabajo de operación posterior al MVP local; no es evidencia de despliegue ni una garantía de disponibilidad.

1. Aprobar región, red privada, dominios, proveedor cartográfico y presupuesto. Ejecutar una revisión de amenazas y dependencias; repetir pruebas e2e y carga sostenida con 500 envíos/100 dispositivos, usuarios concurrentes, pérdidas de red y fallos parciales.
2. Construir imágenes reproducibles y escaneadas, con usuario no root. Usar ECS/Fargate con réplicas en varias zonas, health/readiness diferenciados, despliegue gradual y rollback. Mantener los dominios modulares hasta justificar extracción.
3. PostgreSQL en RDS con backups, recuperación a un punto temporal y prueba de restauración. Separar rol de migración (DDL) y runtime (solo DML necesario); aplicar migraciones versionadas como tarea controlada, no al arrancar cada réplica.
4. MongoDB en infraestructura aprobada con autenticación, TLS, backups y políticas de retención para telemetría; Redis privado en ElastiCache con TLS, autenticación y límites. No publicar los puertos locales de Compose en producción.
5. Configurar HTTPS/WSS, same-site entre SPA y API y WEB_ORIGIN exacto. Secretos en Secrets Manager/KMS, rotación operativa y accesos IAM mínimos; nunca variables VITE para secretos. Las claves públicas restringidas de mapas deben ajustarse a la política del proveedor.
6. Distribuir rate limiting y Socket.IO entre réplicas usando Redis; agregar backpressure, límites de conexiones/sesiones y cargas máximas verificadas. Redis pub/sub, adaptador Socket.IO, rate limiting distribuido y leasing SQL están implementados y probados con dos instancias locales. Validar carga, fallos y topología del entorno aprobado; añadir adaptador SQS/SNS y DLQ cuando se use mensajería durable distribuida.
7. Exportar logs JSON/request ID a CloudWatch y métricas de latencia/error/saturación, establecer alarmas y sondas externas. Definir el SLI de disponibilidad y medir el SLO 99.9% sobre el periodo acordado; las sondas locales no prueban ese objetivo.
8. Definir proveedor, contrato y dataset del motor de rutas, medir p50/p95/p99 bajo la carga aprobada y validar el objetivo <50 ms con límites y timeouts. No sustituirlo por distancia en línea recta ni por latencia HTTP de otro endpoint.
9. Aprobar retención de sesiones, outbox, cambios operativos y GPS; ejecutar limpieza con tareas auditadas. Los datos de posición requieren una política corporativa de acceso y confidencialidad.
10. Ejecutar CI remota en PR, revisión humana y controles de promoción. Ninguna rama despliega automáticamente a producción. Preparar runbooks de incidentes, recuperación, alertas y rollback antes de abrir tráfico real.

El control de roles del MVP presupone una única organización; no se ha implementado aislamiento multi-tenant porque no está en el alcance indicado. Existe administración ADMIN con auditoría y revocación. Aprobar alta de identidades reales, SSO/MFA si la política corporativa lo requiere, y retención antes de conceder acceso externo. Los runbooks locales se encuentran en [operación](../operations.md).
