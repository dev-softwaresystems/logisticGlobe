# Verificación local de LogisticsGlobe

## Cierre local del 7 de octubre de 2026

Node 24.11.1, pnpm 10.24.0, Windows y motores Docker locales. Revisión 6c34aef3bde6c8d344d437f199edf49944181e0f con cambios sin commit. El historial del 4 de octubre se conserva debajo; sus bloqueos de imágenes fueron superados en esta ejecución.

| Comando / control                                 | Resultado real                                                                                                |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| pnpm install --frozen-lockfile --offline          | Correcto con versión declarada; sin purga de dependencias                                                     |
| pnpm db:generate / db:migrate / db:seed           | Cliente Prisma 7.10 generado; cinco migraciones aplicadas, sin drift; seed conserva registros                 |
| pnpm lint / typecheck / test / build              | Correctos; 45 pruebas API y 10 frontend                                                                       |
| pnpm test:e2e                                     | 43 casos aprobados; dos suites opcionales omitidas aquí y ejecutadas separadamente                            |
| pnpm test:browser                                 | Seis casos aprobados en escritorio/móvil: ciclo, GPS, stock, usuarios, plan versionado, PDF/XLSX/CSV y salud  |
| CLOSURE_LOAD=true pnpm test:capacity              | Dos muestras continuas de 60 s, 500 envíos y 100 vehículos, dos API y GPS cada 5 s; fixture vial identificado |
| CLOSURE_RECOVERY=true pnpm test:recovery          | Restauración aislada con MongoDB no vacío y validación funcional; fuentes y volúmenes preservados             |
| pnpm audit --prod --json                          | Cero vulnerabilidades conocidas en dependencias npm de producción                                             |
| pnpm licenses:inventory                           | 789 componentes npm, 399 de producción; cinco hallazgos de licencia pendientes de revisión                    |
| docker compose config; overlay config             | Ambos válidos; motores locales configurados con healthchecks y volúmenes                                      |
| pnpm app:build / app:up                           | API y web Linux construidas y arrancadas, con readiness; preview privado en 18080                             |
| node browser/container-smoke.mjs                  | Login, refresh por cookie, dashboard, readiness y logout en dos viewports; cero errores JS                    |
| docker scout sbom local://... --format cyclonedx  | SBOM final de API (672 componentes) y web (88) generado                                                       |
| docker scout cves local://... --format sarif      | Bloqueado: requiere Docker ID/login; no se incorporaron credenciales ni se declaró scan aprobado              |
| node scripts/encryption-demo.mjs                  | Cifrado estándar GnuPG/AES-256 de material demo, descifrado y hash iguales; clave efímera fuera del archivo   |
| pnpm release:package / release:verify             | Procedimiento preparado; resultado final en artifacts/closure/package-verification.json tras la ejecución     |
| pnpm format:check; node --check; git diff --check | Correctos; formato de fuentes, sintaxis de todos los scripts y diff sin errores                               |

Las imágenes finales locales son API sha256:03b69916343a368b9e7769de99024c1c3f2c4959149ee8cb7cef04d51fd4041e y web sha256:f6c9ffd1485e3ef0fa7e338ff0c455019425598b69f8c0190ef8d36f8089e7d5. Son builds locales, sin publicación de registry o despliegue remoto. Scout web informó que no pudo eliminar un archivo temporal bloqueado; la generación de SBOM terminó con código 0. El inventario no equivale a escaneo CVE.

La prueba adicional del outbox reproduce publicación seguida de fallo de confirmación y reintento con el mismo UUID por la segunda réplica; los diez casos de plataforma pasan.

Los seis originales E1–E6 conservaron sus SHA-256; no se modificaron archivos privados o volúmenes.

Durante la carga de build la sonda MongoDB se degradó y después recuperó estado healthy. No se modificaron DNS o servicios ajenos. El preview HTTP de loopback no acredita TLS de producción.

PDF: muestras de tres y diez páginas renderizadas, tablas extensas y acentos inspeccionados; análisis de límites de texto sin palabras fuera de página. XLSX: diez hojas con números/fechas, filtros y texto de apariencia de fórmula literal, sin fórmulas/enlaces externos. Las descargas de navegador se guardan y leen físicamente. Reportes separan flujos del periodo y estados al corte; comparación diaria y semanal llevan semántica distinta.

Se corrigió un fallo reproducible de concurrencia del último ADMIN: Prisma 7 puede entregar TransactionWriteConflict del adapter en vez de P2034. Tres reintentos acotados preservan la regla; errores de conexión no se reintentan indiscriminadamente. La suite completa vuelve a pasar. Un fallo anterior de navegador 429 se corrigió integrando verificaciones en flujos existentes, sin desactivar rate limiting. La ejecución unitaria se serializa por workspace para evitar saturación de workers del equipo.

Resultados medidos y límites: [routing](testing/routing-performance-report.md), [recuperación](operations/recovery-drill-report.md) y [licencias](security/dependency-license-review.md). HTTP miss p95 64.27 ms no acredita <50 ms; proveedor sintético y muestra corta. Recuperación funcional 6,468.60 ms, intervalo recuperado 50 ms y cero observaciones propias previas perdidas; no demuestra PITR/RPO productivo.

No se ejecutaron CI remota, dispositivos físicos, API ERP del cliente, piloto/UAT, relevo por una segunda persona, revisión independiente, SLO 99.9% o despliegue AWS. No hubo firmas, transferencias, commits ni pushes. Cargos y políticas son propuestas pendientes.

## Historial del 4 de octubre de 2026

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

## Completar escaneo de imágenes

Después de que una persona autorice e inicie sesión en Docker, ejecutar sobre estas imágenes verificadas:

```powershell
docker scout cves local://logisticglobe-api:latest --format sarif --output artifacts/closure/api-image-cves.sarif
docker scout cves local://logisticglobe-web:latest --format sarif --output artifacts/closure/web-image-cves.sarif
```

Error observado en ambos: “Log in with your Docker ID or email address to use docker scout.” Revisar CVE por digest antes de release; no publicar estas imágenes ni suponer un resultado limpio.

## Consistencia del CSS del paquete

La primera extracción limpia instaló con lockfile congelado, generó Prisma, verificó tipos y compiló. Al comparar salidas se detectó que Tailwind incorporaba tokens de documentación/SBOM en CSS (56.52 KiB frente a 17.24 KiB). Se limita la detección a src e index.html mediante source(none) y @source, siguiendo la [documentación oficial de Tailwind](https://tailwindcss.com/docs/detecting-classes-in-source-files). Se repite el build del paquete y la imagen web; comparar el hash CSS final, sin atribuir el primer resultado al archivo final.
