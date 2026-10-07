# Recuperación y continuidad

Los objetivos de E3, RTO <2 h y RPO <15 min, cubren usuarios/roles/sesiones, envíos/stock/alertas, planes/incidencias, histórico GPS y outbox. Redis y sockets son estado derivado; no son fuente durable. Un dump local no valida continuidad productiva.

Propuesta pendiente: RDS PITR/WAL continuo y snapshots de 35 días; MongoDB replica set con PITR/oplog y retención coordinada; backups cifrados con KMS/TLS y custodia externa; permisos mínimos y alarma de hueco antes de 15 min. Un backup diario solo no cumple ese RPO. Restauración con acceso temporal auditado, ensayo trimestral y tras cambios importantes; sin purga automática.

1. CTO define incidente, hora UTC, funciones y corte. Detener escrituras por procedimiento aprobado, conservando bases y volúmenes. Capturar watermarks SQL, último GPS observado/recibido, outbox y pendientes.
2. Preparar un destino nuevo y aislado. Validar checksums, descifrado y custodia. En local, pnpm ops:backup y pnpm ops:restore:verify conservan fuentes y usan nombres _restore_test.
3. Restaurar PostgreSQL y MongoDB con namespaces de destino nuevos. Dumps consistentes entre motores requieren detener escrituras o coordinar watermarks; no existe transacción distribuida. En producción recuperar PITR al corte y revisar operaciones posteriores.
4. Reconstruir Redis: última posición desde MongoDB, estado de incidencias desde SQL. Sesiones permanecen SQL; clientes recuperan por HTTP. No ejecutar FLUSHALL.
5. Reconciliar monitoringPending hacia SQL de forma idempotente. Si SQL es más reciente que GPS, declarar desconocido e investigar; no inventar recorrido. Reenviar observaciones posteriores con UUID y orden; recuperar leases vencidos del outbox.
6. Validar login, readiness, stock, envío, incidencia, histórico GPS, roles y exportaciones. Comparar watermarks y pérdidas. Medir incidente→reapertura funcional para RTO y datos realmente recuperables para RPO.
7. QA/CTO autorizan reapertura, observan latencias/backlog y documentan excepciones e información al cliente por canal aprobado.

Ensayo opcional: CLOSURE_RECOVERY=true y pnpm test:recovery, con URLs dedicadas _test. Incluye usuario, pedido, artículo, tres GPS y una incidencia. El destino restaurado se conserva para inspección. Véase [resultado medido](recovery-drill-report.md); no demuestra PITR, almacenamiento externo o escala productiva.
