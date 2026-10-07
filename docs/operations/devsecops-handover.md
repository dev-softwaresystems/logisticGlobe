# Relevo DevSecOps preparado — RSG-PRY-01

CTO es responsable propuesto. Designar y obtener aceptación de un segundo ingeniero como suplente. Runbooks: [operación](../operations.md), [recuperación](recovery-plan.md) y [producción](production-design.md). La puntuación 12 sigue vigente; material escrito no demuestra relevo humano.

| Recurso                   | Operador / suplente            | Privilegio y custodia                                         |
| ------------------------- | ------------------------------ | ------------------------------------------------------------- |
| Git y CI                  | Ingeniería / segundo ingeniero | Review, lectura y build; release aprobado; SSO organizacional |
| SQL runtime               | Servicio                       | DML y secuencias necesarias, sin DDL; gestor de secretos      |
| Migración y restore       | Operador autorizado            | DDL temporal y destino aislado; acceso excepcional auditado   |
| MongoDB y Redis           | Servicio / operador            | Scope mínimo, TLS/autenticación y secretos privados           |
| Cloud, imágenes y backups | DevSecOps / suplente           | IAM mínimo; descifrado KMS aprobado y acceso registrado       |

Sesión 1 propuesta, 90 min: instalación congelada, generación, migración dedicada/seed local, arranque, auth/roles, métricas, CI y logs seguros. Sesión 2, 90 min: fallo parcial GPS, lease del outbox, backup/checksum/restore aislado, reconstrucción Redis, reapertura funcional y rollback por digest.

Prueba de relevo propuesta, 120 min: el suplente instala sin ayuda, diagnostica SQL/routing 503, restaura datos no vacíos y reabre. Evaluador CTO/QA registra resultados y decide. Agenda, asistencia, ejecución y actas están pendientes.

Acta: fecha, personas/cargos aceptados, entorno, build/manifest, acciones, evidencia, RTO/RPO, fallos, retest y decisión/firma. Revisar incidentes diariamente, accesos/backups semanalmente y eficacia en retrospectiva. No incluir contactos privados, accesos o claves en Git.
