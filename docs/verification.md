# Verificación local de LogisticsGlobe

Ejecución: 4 de octubre de 2026 (America/Mexico_City). Windows, Node 24.11.1 y pnpm 10.24.0. Sin commit, push ni recursos remotos.

## Comandos y evidencias de la ampliación

| Comando                                         | Resultado                                                                                                               |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| pnpm install --frozen-lockfile --offline        | Correcto con pnpm 10.24; store local y contratos workspace inyectados                                                   |
| pnpm lint                                       | Correcto                                                                                                                |
| pnpm typecheck                                  | Correcto                                                                                                                |
| pnpm test                                       | 35 pruebas: 25 API y 10 frontend                                                                                        |
| pnpm test:e2e                                   | 37 pruebas en 4 archivos con PostgreSQL, MongoDB y Redis reales                                                         |
| pnpm test:browser                               | 6 casos Chromium: 3 escritorio y 3 móvil, con API/SPA y base dedicada                                                   |
| pnpm build                                      | API y frontend compilados, mapas en chunks separados                                                                    |
| pnpm format:check                               | Correcto                                                                                                                |
| pnpm audit --prod                               | Sin vulnerabilidades conocidas reportadas                                                                               |
| prisma validate / db:generate                   | Schema válido y cliente 7.10.0 generado                                                                                 |
| db:migrate                                      | Cuatro migraciones; sin drift ni cambios pendientes                                                                     |
| Compose base y overlay config --quiet           | Configuración local sin imprimir secretos                                                                               |
| ops:backup / ops:restore:verify                 | Dumps de ensayo, SHA-256 y restauración a bases nuevas; fuentes preservadas                                             |
| node browser/container-smoke.mjs desde apps/api | Login, refresh por cookie tras recarga, dashboard, readiness y logout en contenedores, escritorio/móvil, sin errores JS |

La suite usa logistics_test y solo elimina sus propios fixtures. PostgreSQL local está en 5433 para conservar el servicio ajeno en 5432. El preview en contenedores se comprobó en 18080 porque otro proceso ocupa 8080; se exportaron APP_WEB_PORT y APP_WEB_ORIGIN sin modificar archivos del usuario.

También se ejecutó db:seed de nuevo: conservó los registros y credenciales existentes. El chequeo de sintaxis de scripts, git diff --check y ambos Compose config --quiet pasó; los archivos .env y .env.local siguen ignorados.

El comando pnpm --offline --filter @logistics-globe/api deploy --prod generó una copia aislada con 354 dependencias de producción. Esa copia inició en Windows con una base dedicada y respondió readiness; no dependió de módulos de desarrollo del workspace. Esta prueba verifica el empaquetado portable en Windows y no sustituye la reconstrucción Linux pendiente.

## Flujos comprobados

Autenticación, rotación/revocación, RBAC y validación; envío idempotente, asignación, tránsito/entrega e historial; flota/mantenimiento, GPS tardío y replay; stock concurrente y ciclo de alertas; CSV seguro y descarga física desde Chromium.

La ampliación añade creación/desactivación de usuarios, normalización de email, cambios de versión, auditoría sin credenciales, revocación entre réplicas y protección del último ADMIN ante modificaciones concurrentes. Dos API conectadas a Redis comparten rate limiting y entregan un evento de outbox a sockets de ambas instancias con una única reclamación del dispatcher. Se verifican scope/token de GPS, readiness degradada, protección de métricas y error seguro ante rutas sin proveedor.

El navegador calcula rutas contra un servidor OSRM de prueba identificado en el setup; la geometría es un fixture y no representa caminos reales. Comprueba flujo logístico, usuarios/permisos y rutas en ambos viewports. El CSV se guarda y se lee desde disco. Capturas: artifacts/next-dashboard-desktop.png, next-dashboard-mobile.png, next-users-desktop.png y next-users-mobile.png. Se revisó overflow de la página; las tablas conservan scroll interno.

La herramienta gps:forward se ejecutó contra la API con una observación NDJSON. test:load ejecutó 10 solicitudes durante 10 segundos, concurrencia 1 e intervalo 1000 ms: 10 HTTP 200, cero fallos. p50 57.16 ms y p95 122.59 ms pertenecen a esa ejecución local. El caso funcional de 500 envíos/100 posiciones midió 40 consultas, concurrencia 10: p50 154 ms y p95 180 ms. Son pruebas diferentes; ninguna representa carga sostenida de producción ni latencia del motor de rutas.

El backup de ensayo se restauró como lg_1791174074369_d6416a83_restore_test: 6 roles, 0 usuarios, 3 envíos y 2 artículos; MongoDB vacío en ese ensayo. No prueba restauración de telemetría con datos reales, recuperación a un punto temporal ni RPO/RTO. Los dumps y bases de ensayo se conservan para inspección, fuera de Git.

## Construcción de imágenes y límite de red

La construcción inicial de API/web terminó y esas imágenes se arrancaron y verificaron en el navegador. Readiness de API y los tres motores resultó saludable. Se corrigió el tmpfs de Nginx con UID/GID 101 para ejecutar sin root y mantener filesystem de solo lectura.

Después se refinó el empaquetado: lockfile dedicado con pnpm deploy, contratos compartidos presentes antes de instalación, caché BuildKit, etapas secuenciales y base de build con OpenSSL. La reconstrucción final no se confirma: Docker Desktop falló al resolver auth.docker.io / registry-1.docker.io y, en intentos previos, npm devolvió EAI_AGAIN y ETIMEDOUT. El último error fue: **dial tcp: lookup registry-1.docker.io: no such host**. No se cambiaron DNS, proxy ni servicios ajenos del equipo.

Para cerrar esta verificación cuando Docker tenga conectividad:

```bash
pnpm app:build
pnpm app:migrate
pnpm app:up
```

Repetir smoke y escaneo de imágenes con el digest final. Las imágenes locales ya probadas preceden al último refinamiento; no se presentan como la construcción definitiva ni como despliegue de producción.

## Verificaciones externas pendientes

CI está preparada con instalación, lint, tipos, tests, build, e2e, navegador, auditoría y Docker build, sin publicación/despliegue; no se ejecutó en GitHub por la instrucción de no hacer push.

El usuario indicó que todavía no hay proveedores ni entorno aprobados. GPS, cartografía y rutas quedan configurables y deshabilitados si faltan sus parámetros. No se crean AWS, Terraform, Kubernetes ni microservicios independientes.

Quedan para el entorno aprobado: integración física con dispositivos, calidad del proveedor vial, TLS/gestor de secretos, red privada y privilegios SQL, backup cifrado externo y retención, revisión independiente OWASP, carga sostenida representativa, recuperación ante fallos y medición del SLO 99.9% y routing <50 ms. Consulte [operación](operations.md) y [preparación de producción](architecture/production-readiness.md).
