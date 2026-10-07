# Operación local y preparación del entorno aprobado

## Contenedores de aplicación

Después del inicio local y de preparar secretos válidos:

```bash
pnpm app:build
pnpm app:migrate
pnpm app:up
```

SPA y proxy: http://localhost:8080. La API se alcanza por /api/v1 dentro del mismo origen. El overlay conserva los volúmenes existentes, no publica el puerto de API y ejecuta API y Nginx sin root, con filesystem de solo lectura. app:migrate es una tarea explícita; iniciar API nunca ejecuta migraciones. app:down detiene únicamente API/web y conserva infraestructura y datos.

apps/api/.env.local se usa para el preview local. Para otro host, inyectar secretos desde el gestor aprobado y configurar WEB_ORIGIN, TLS, red privada y rol PostgreSQL DML separado del rol DDL de migración. Las URLs locales no son una configuración de producción pública. Revisar configuración sin imprimir secretos: docker compose -f docker-compose.yml -f docker-compose.application.yml config --quiet.

Rollback: conservar imagen por digest, detener promoción si readiness falla, volver al digest previamente verificado y comprobar login, refresh, dashboard y sockets. No revertir SQL automáticamente; diseñar migraciones compatibles con la versión anterior y ensayar restauración antes de un cambio irreversible.

## Integraciones

GPS: definir GPS_INGEST_TOKEN independiente (32 caracteres mínimos) y GPS_ALLOWED_VEHICLE_IDS con UUID separados por comas. El proveedor/traductor aprobado envía POST /api/v1/integrations/gps/positions con Authorization: Bearer y {id,vehicleId,latitude,longitude,observedAt}. GET /integrations/status indica solo disponibilidad. Mantener el token en backend y el UUID al reintentar.

gps:forward lee observaciones NDJSON por stdin. GPS_API_URL debe ser el endpoint completo de integración; GPS_API_TOKEN se suministra por entorno. Redireccionar un archivo NDJSON al proceso según la shell. No guardar el token en el archivo ni en argumentos, y no imprimir coordenadas de usuarios reales en logs.

Rutas: ROUTING_URL acepta el origen HTTP(S) de un servicio OSRM compatible aprobado. La página /routing utiliza la API protegida y muestra distancia, duración y geometría. Token privado en header de otro proveedor requerirá su adaptador, conservando el puerto actual. No usar un servicio público sin aprobar términos, privacidad y cuotas.

Mapas: VITE_MAP_TILE_URL y VITE_MAP_ATTRIBUTION son configuración pública de build. El proveedor local funciona sin ellas. Nunca colocar secretos privados en VITE.

## Salud, métricas e incidentes

/api/v1/health es liveness. /health/ready devuelve 503 cuando PostgreSQL, MongoDB o Redis fallan; el orquestador puede excluir la instancia del balanceador. /health/services permite diagnóstico sin connection strings.

/metrics está deshabilitado sin METRICS_TOKEN; con él exige bearer independiente. Exporta formato Prometheus con proceso, conteos HTTP por método/estado e histogramas de latencia y rutas; no usa URLs, identificadores ni datos personales como etiquetas. Guardar el token del scraper en un archivo externo restringido o gestor de secretos. Los logs JSON incluyen requestId y duración; configurar envío al destino aprobado.

Alertas de operación a configurar: readiness fallida, errores 5xx, p95 sostenido, backlog/edad del outbox, saturación de conexiones y volumen. Umbrales y ventana se aprueban con mediciones del entorno. Para 99.9%, acordar SLI, ventana y sondas externas; registrar incidentes y presupuesto de error.

Incidente: correlacionar requestId y métricas; revisar health/services y estado de bases sin volcar env; controlar tráfico/integraciones antes de reiniciar; conservar evidencia; restaurar servicio y verificar flujos críticos; registrar causa y acción preventiva. No eliminar outbox pendiente para ocultar backlog.

## Backup y restauración

```bash
pnpm ops:backup
pnpm ops:restore:verify -- artifacts/backups/DIRECTORIO_GENERADO
```

Backup usa pg_dump custom y mongodump gzip del Compose local; guarda checksums SHA-256 y manifest en artifacts/backups, ignorado por Git. Puede seleccionar exclusivamente bases de ensayo con BACKUP_POSTGRES_DB y BACKUP_MONGO_DB. El backup contiene datos confidenciales: restringir acceso, cifrar y copiar a almacenamiento aprobado con retención y recuperación verificables. Un archivo local no aporta redundancia ni recuperación a un punto temporal.

restore:verify comprueba integridad, crea bases de nombre aleatorio terminado en _restore_test, restaura sin reemplazar fuentes y registra conteos. Las bases restauradas se conservan para inspección; su eliminación posterior necesita verificar el nombre exacto. Redis es caché y no fuente histórica.

PostgreSQL y MongoDB son backups independientes; no constituyen una instantánea atómica entre motores. Para recuperar producción, detener escrituras o acordar watermark de observaciones/eventos, restaurar ambos, reconstruir caché desde MongoDB y revisar replay/outbox y orden temporal antes de abrir tráfico. Establecer RPO/RTO, periodicidad, cifrado y prueba de restauración con responsables corporativos.

No hay políticas destructivas automáticas: aprobar retención de GPS, sesiones, outbox y auditoría antes de programar purgas; conservar eventos pendientes y trazabilidad requerida.

## Capacidad y pruebas

test:e2e usa TEST_DATABASE_URL dedicada terminada en _test; no apunta a producción. test:browser aplica migraciones a esa misma base, genera cuentas efímeras, levanta API 3001 y SPA 5174 y limpia exclusivamente sus fixtures. Instalar previamente Chromium: pnpm --filter @logistics-globe/api exec playwright install chromium. No ejecutar suites de persistencia simultáneamente en la misma base.

test:load exige LOAD_ACCESS_TOKEN de una sesión de ensayo en entorno; acepta LOAD_API_URL, LOAD_SECONDS (10–3600), LOAD_CONCURRENCY (1–100) y LOAD_REQUEST_INTERVAL_MS (1000 predeterminado; 0 permite carga sin pausas). Respeta rate limiting: las respuestas 429 cuentan como fallos y se informan. Usar base/entorno dedicado, preparar 500 envíos/100 vehículos y una carga representativa aprobada. El reporte local no prueba 99.9% ni latencia de routing.

CI prepara instalación congelada, lint, typecheck, unitarias, build, e2e, navegador, auditoría y build de imágenes; no publica ni despliega. Su ejecución remota necesita publicar cambios por una persona.

Para volver del preview de contenedores a desarrollo, ejecuta app:down antes de pnpm dev. Mantiene PostgreSQL, MongoDB, Redis y los volúmenes. Si se ejecutan varias API contra la misma base, todas deben habilitar el mismo transporte DISTRIBUTED_REALTIME para compartir eventos.

## Runbooks y evidencia del cierre local

Guías específicas: [continuidad](operations/recovery-plan.md), [ensayo](operations/recovery-drill-report.md), [diseño productivo](operations/production-design.md), [alertas](operations/alert-rules.md) y [relevo](operations/devsecops-handover.md). El ensayo local restaura SQL/Mongo no vacíos a destino nuevo, prueba login/stock/envío/GPS/incidente y read-through Redis. Fuentes y volúmenes preservados. PITR/offsite/cifrado real y persona suplente pendientes.

Retención propuesta, sin purgas reales, en security/data-treatment-and-retention.md. Leases outbox de 60 s y reconciler Mongo pendientes cada 2 s permiten replay al menos una vez; no transacción distribuida. No borrar pending ni Redis FLUSHALL. Config providers/secretos privada; cambios requieren restart/verificación, no secreto VITE.

Carga sostenida en testing/load-test-plan.md; pausar builds y otras suites que comparten _test. Paquete source/manifest/SBOM y extracción limpia por release:package/release:verify; no incluir .env, backups ni originales PDF. GPG demo verifica roundtrip de texto sintético, no entrega real. Región/IAM/PITR/SLI/soporte externo requieren gates de governance/release-approval.md.
