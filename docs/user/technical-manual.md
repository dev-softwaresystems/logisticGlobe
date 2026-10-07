# Manual técnico local — LogisticsGlobe

Fecha: 2026-10-07. Para operadores autorizados; producción aún no aprobada.

1. Usar Node 24 y pnpm 10.24.0 del packageManager. Desde la raíz, pnpm install --frozen-lockfile, pnpm setup:local y pnpm infra:up. setup:local genera archivos privados sin sobrescribirlos. Revisar puertos y bases existentes antes de iniciar; no borrar volúmenes.
2. Validar variables privadas y orígenes exactos. Usar pnpm db:generate, pnpm db:migrate y pnpm db:seed en desarrollo autorizado. Las migraciones compartidas son versionadas; producción usa migrate deploy explícito, nunca db push o reset. El seed preserva registros y solo crea ADMIN cuando corresponde.
3. pnpm dev inicia web y API. Comprobar health, health/services, readiness, login y dashboard. Swagger está en /api/docs en desarrollo. README contiene URLs, puertos alternativos y requisitos reales.
4. Para contenedores, pnpm app:build, pnpm app:migrate y pnpm app:up. Las imágenes usan usuario no root; el overlay limita capacidades y escritura. Preview de esta verificación: localhost:18080. HTTP local no sustituye TLS.
5. Ejecutar lint, typecheck, test, test:e2e, test:browser, build y format:check. E2E y navegador requieren TEST_DATABASE_URL terminada en _test; no compartir base con benchmarks concurrentes.
6. Mantener METRICS_TOKEN privado. Observar request ID, latencias, backlog/edad del outbox, GPS pending y salud funcional. No registrar coordenadas, tokens o emails innecesarios. Reintentar GPS con el mismo UUID; investigar pendientes antes de purgar.
7. Backup y restauración: verificar checksums, restaurar a destino nuevo, reconciliar motores, reconstruir Redis y validar funciones antes de reabrir. No ejecutar FLUSHALL ni restaurar encima de la fuente. [Runbook](../operations/recovery-plan.md).
8. Release: revisión de diff y gates; pnpm release:package y pnpm release:verify. Conservar manifest, SBOM y hashes. No incluir claves/backups/datos del cliente. Descifrado y canal de clave requieren política y destinatario aprobados.
9. En CI, las acciones están fijadas por SHA; se preparan checks y artefactos QA permitidos. Sin push no existe evidencia remota. Rollback productivo usa digest previo y migraciones compatibles, según [diseño](../operations/production-design.md).

Diagnóstico y escalación en [operación](../operations.md), [alertas](../operations/alert-rules.md), [relevo](../operations/devsecops-handover.md) y [verificación](../verification.md). Parámetros/proveedores y tratamiento de datos se aprueban antes de campo.
