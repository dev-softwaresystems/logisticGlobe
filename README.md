# LogisticsGlobe

Plataforma de gestión logística de Sistemas de Software de México, S.A. de C.V. (Software Systems).
Repositorio oficial: https://github.com/dev-softwaresystems/logisticGlobe.git

## MVP local

Base local con React, TypeScript, Vite, React Router, TanStack Query, Tailwind CSS y una API modular NestJS.
Se reutilizaron las aplicaciones y las majors existentes: React 19, Vite 8, NestJS 12, TypeScript 6 y Prisma 7.
PostgreSQL es la fuente transaccional; MongoDB conserva el histórico GPS y Redis mantiene el caché efímero de últimas posiciones. Los tres cuentan con comprobaciones de salud.
El seed contiene datos de demostración identificados con `DEMO-`, almacenados en PostgreSQL.

Implementado:

- Login JWT, RBAC, renovación mediante cookie HttpOnly, rotación y revocación de sesiones.
- Dashboard con seis métricas calculadas por la API y alertas recientes de inventario.
- Salud de API, PostgreSQL, MongoDB y Redis con latencias medidas.
- Envíos: registro idempotente, filtros, paginación, detalle, asignación, transiciones e historial.
- Flota: registro, mantenimiento, ingestión GPS idempotente, últimas posiciones y consulta histórica.
- Inventario: almacenes, artículos, ajustes trazables, generación y resolución automática de alertas.
- Socket.IO autenticado, reconexión, eventos tipados y recuperación por HTTP.
- Mapa Leaflet con adaptador reemplazable, proveedor local de coordenadas o tiles configurables.
- Exportación CSV de envíos e inventario con protección ante fórmulas y límite de 10,000 registros.
- Navegación responsive para dashboard, envíos, flota, inventario, alertas, reportes y sistema.
- Administración ADMIN de usuarios y roles, desactivación, control de versión y auditoría; revocación de sesiones al cambiar permisos.
- Integración GPS normalizada con token y vehículos autorizados; rutas por adaptador OSRM configurable, deshabilitado hasta aprobar proveedor.
- Métricas Prometheus protegidas, readiness y soporte opcional de réplicas con Redis y leasing SQL.
- Contenedores de aplicación sin root, backup/restore aislado y pruebas de navegador en escritorio/móvil.

No hay despliegues AWS ni microservicios físicos. La comparación de nuevos envíos entre periodos de 7 días se muestra cuando existen al menos 14 días de registros.
La suite comprueba localmente 500 envíos activos y 100 vehículos con posiciones. La carga sostenida representativa de producción, disponibilidad 99.9% y enrutamiento <50 ms siguen pendientes de validación de producción. El alcance y las evidencias están en [cumplimiento de AGENTS.md](docs/requirements-status.md).

## Requisitos

Node.js 24 LTS, pnpm 10.24.0 (definido en `packageManager`), Docker Desktop y Git.

## Inicio local

```bash
corepack enable
pnpm install
pnpm setup:local
pnpm infra:up
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

`setup:local` crea exclusivamente archivos de entorno que no existen. Genera dos secretos JWT independientes y una contraseña aleatoria de administrador para desarrollo.
Preserva cualquier `.env` existente. Si la API todavía no tiene secretos configurados, crea `apps/api/.env.local` como configuración de desarrollo separada. API, Prisma y seed leen `.env.local` antes de `.env`; las variables exportadas en la terminal tienen prioridad. Docker lee el `.env` raíz, que también se crea sin sobrescribirlo.
La API falla con los nombres de las variables inválidas, sin mostrar sus valores. No uses `replace_me` como secreto.
Los secretos deben tener al menos 32 caracteres y ser diferentes. El access token dura como máximo 15 minutos; el refresh, 7 días.

Compose conserva el nombre de base local existente, `logistics`, y los volúmenes persistentes.
No ejecuta migraciones automáticamente ni elimina volúmenes al detenerse.

URLs:

| Servicio              | URL                                          |
| --------------------- | -------------------------------------------- |
| Frontend              | http://localhost:5173                        |
| API liveness          | http://localhost:3000/api/v1/health          |
| Salud de dependencias | http://localhost:3000/api/v1/health/services |
| Swagger de desarrollo | http://localhost:3000/api/docs               |

### Crear el administrador de desarrollo

No hay contraseña fija de administrador. `pnpm setup:local` genera una contraseña aleatoria en el archivo ignorado `apps/api/.env.local`; puedes consultarla localmente como `SEED_ADMIN_PASSWORD`. También puedes definir tu propia contraseña (12 caracteres mínimos, 72 bytes UTF-8 máximos) y opcionalmente `SEED_ADMIN_EMAIL`, luego ejecutar `pnpm db:seed`.
El email predeterminado es `admin@logisticsglobe.local`. Inicia sesión en `/login` con esa cuenta.

El seed es repetible, está deshabilitado en producción y no cambia contraseñas ni registros existentes.
Un usuario que ya existe conserva sus permisos y credenciales.

### Puertos ocupados en Windows

En este equipo, 5432 ya está ocupado por otro servicio. La verificación utilizó PostgreSQL en **5433**, conservando el `.env` del usuario que apunta a otra base.
La configuración local de esta iteración ya utiliza ese puerto. Para preparar una instalación nueva con el mismo puerto, ejecuta `pnpm setup:local --postgres-port=5433` antes de iniciar la infraestructura. También puedes sobrescribirlo desde una sesión PowerShell:

```powershell
$env:POSTGRES_PORT = '5433'
$env:DATABASE_URL = 'postgresql://postgres:postgres@localhost:5433/logistics'
pnpm infra:up
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Mantén esas variables en la misma sesión o configúralas en tus archivos locales. `setup:local` prepara los JWT en un archivo separado si tu `.env` previo solo contiene DATABASE_URL.
No ejecutes migraciones contra una base compartida sin revisar su estado. Si Prisma solicita un reset por drift, detente y revisa el esquema; no aceptes eliminar datos.

## Arquitectura y datos

```text
apps/web           SPA por funcionalidades
apps/api           API modular y adaptadores
packages/shared    Contratos HTTP y eventos independientes de AWS
services/          Documentación de extracción futura
docs/architecture/ Decisiones y límites de esta iteración
```

Se mantienen los módulos existentes de auth, users, shipments, fleet e inventory en sus rutas actuales; los módulos nuevos viven en `src/modules`.
La API usa `/api/v1`, Helmet, CORS para WEB_ORIGIN, validación con whitelist, rate limiting, errores seguros y logs JSON con request ID y duración.
Los endpoints operativos requieren JWT y un rol autorizado. Health es público y solo comunica estado, nombre de servicio y latencia.
Swagger está deshabilitado en producción.

El access token permanece en memoria; el refresh se guarda en una cookie HttpOnly, SameSite=Strict y Secure en producción.
PostgreSQL almacena solo el hash del refresh token. Logout revoca la sesión y también invalida el access token.
Los roles y la actividad del usuario se comprueban en servidor en cada petición.
Frontend y API deben compartir el mismo sitio para esta estrategia de cookie; WEB_ORIGIN controla el origen exacto.

Definición de métricas:

| Campo                    | Cálculo                                                                      |
| ------------------------ | ---------------------------------------------------------------------------- |
| activeShipments          | Envíos IN_TRANSIT                                                            |
| warehouseCapacityPercent | Suma de unidades de inventario / suma de capacidad × 100; null sin capacidad |
| availableVehicles        | Vehículos AVAILABLE                                                          |
| vehiclesInMaintenance    | Vehículos MAINTENANCE                                                        |
| pendingDeliveries        | Envíos PENDING o IN_TRANSIT                                                  |
| highPriorityDeliveries   | Envíos pendientes con prioridad HIGH                                         |

La capacidad se mide en unidades homogéneas en esta iteración; no representa volumen físico ni peso.
La lectura del dashboard y captura usa Serializable con reintentos; los reportes de solo lectura usan RepeatableRead. No mantiene una segunda fuente de verdad en Redis.

## Prisma

Prisma CLI, cliente y adaptador PostgreSQL permanecen en major 7.
El cliente se genera en `apps/api/src/generated/prisma` y se excluye de Git.
`prisma7.config.ts` conserva la configuración del repositorio; los scripts la utilizan.
Las migraciones versionadas crean usuarios, roles, sesiones revocables, envíos e historial, vehículos, almacenes, inventario, umbrales, alertas, movimientos y outbox con actor interno.

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
# Aplicar migraciones ya versionadas en un entorno preparado:
pnpm --filter @logistics-globe/api exec prisma migrate deploy
```

Para un cambio nuevo usa `pnpm --filter @logistics-globe/api exec prisma migrate dev --name descripcion_del_cambio`.
No uses `db push` como flujo del equipo. La API no migra la base al iniciar.

## Verificación

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
docker compose config --quiet
docker compose ps
pnpm audit --prod
```

Se preservan Vitest y Supertest existentes en la API; el frontend usa Vitest y Testing Library.
La instalación mantiene las majors del stack y overrides acotados para correcciones de seguridad transitivas de Prisma.
La justificación se encuentra en los ADR.

### Pruebas e2e con infraestructura real

Usa una base dedicada. Las pruebas crean registros con IDs únicos y eliminan únicamente sus propios registros.

PowerShell, con el contenedor local en 5433:

```powershell
docker compose exec -T postgres psql -U postgres -d logistics -c 'CREATE DATABASE logistics_test'
$env:TEST_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5433/logistics_test'
$env:DATABASE_URL = $env:TEST_DATABASE_URL
pnpm --filter @logistics-globe/api exec prisma migrate deploy
pnpm test:e2e
```

Crea la base solo una vez. En macOS/Linux utiliza `export TEST_DATABASE_URL=...` y `export DATABASE_URL="$TEST_DATABASE_URL"`.
La suite genera secretos temporales en memoria y verifica login, validaciones, RBAC, rotación, revocación, errores seguros, dashboard, transiciones, idempotencia, concurrencia de stock, ciclo de alertas, GPS tardío, fallback de Redis, WebSockets y CSV. Incluye el caso de 500 envíos/100 vehículos y escribe mediciones locales en `artifacts/capacity-verification.json`.
Las pruebas de componentes verifican carga, error y datos API. `pnpm test:browser` usa Chromium y una base `_test`, comprueba escritorio/móvil y descarga física de CSV. Instala Chromium con `pnpm --filter @logistics-globe/api exec playwright install chromium`. No ejecutes suites de persistencia simultáneamente en la misma base.

La CI valida instalación congelada, lint, typecheck, tests, build, e2e, navegador, auditoría y construcción de imágenes con servicios locales. No despliega.
La ejecución remota de GitHub Actions requiere que un humano publique los cambios; esta iteración no realiza commit ni push.

## Scripts

| Comando                                 | Función                                      |
| --------------------------------------- | -------------------------------------------- |
| pnpm setup:local                        | Crear configuración local sin sobrescribirla |
| pnpm dev                                | Generar Prisma e iniciar frontend y API      |
| pnpm build / lint / typecheck / test    | Verificar todos los workspaces               |
| pnpm test:e2e                           | Flujos críticos con infraestructura real     |
| pnpm format / format:check              | Formato del repositorio                      |
| pnpm infra:up / infra:down / infra:logs | Operar Compose conservando volúmenes         |
| pnpm db:generate / db:migrate / db:seed | Operar Prisma desde la raíz                  |

Los scripts adicionales `test:browser`, `test:load`, `gps:forward`, `app:build`, `app:migrate`, `app:up`, `app:down`, `ops:backup` y `ops:restore:verify` se describen en [operación y recuperación](docs/operations.md). `test:load` recibe un token de ensayo exclusivamente por entorno y genera evidencia, sin afirmar SLOs.

## Operación del MVP

1. Inicia sesión y registra un vehículo desde `/fleet`.
2. Registra un envío en `/shipments`, asigna un vehículo, inicia tránsito y confirma su entrega. El historial conserva los cambios; el vehículo vuelve a disponible al finalizar su último envío activo.
3. Desde el seguimiento del vehículo puedes registrar una observación de prueba. Un integrador GPS autorizado puede usar `POST /api/v1/fleet/vehicles/:id/positions` con UUID de observación, latitude, longitude y observedAt ISO UTC. No reutilices un UUID con contenido distinto.
4. Registra un almacén y un artículo en `/inventory`. Ajustar existencias exige motivo y versión vigente. El stock inferior al mínimo abre una alerta y la reposición la resuelve; `/alerts` conserva ambos estados.
5. Descarga CSV desde `/reports` o desde las pantallas de envíos/inventario. La exportación de envíos respeta sus filtros.

Todas las escrituras pasan por los casos de uso de la API. Modificar cantidades o estados directamente en SQL omite las reglas y el outbox. La última posición Redis es recuperable desde MongoDB; los fallos de telemetría se presentan sin ocultar la disponibilidad del catálogo.

### Cartografía configurable

Sin configuración externa, Leaflet muestra los puntos recibidos en el proveedor local de coordenadas; sin posiciones presenta un estado vacío. Configura `VITE_MAP_TILE_URL` con un endpoint público HTTPS XYZ aprobado (`{z}/{x}/{y}`) y `VITE_MAP_ATTRIBUTION` con la atribución correspondiente si se requiere cartografía. Reinicia Vite al cambiar variables. No coloques secretos privados en variables VITE. La tabla y el historial son la alternativa accesible al mapa.

### Aplicación en contenedores

`pnpm app:build`, `pnpm app:migrate` y `pnpm app:up` preparan el preview local en http://localhost:8080. API y SPA comparten origen, con proxy HTTP/WebSocket y cookies seguras en producción. No es un despliegue AWS. Las migraciones son una tarea explícita y los secretos proceden del entorno local ignorado o del gestor aprobado.

En este equipo 8080 está ocupado; se verificó el preview en 18080 exportando `APP_WEB_PORT=18080` y `APP_WEB_ORIGIN=http://localhost:18080` antes de `app:up`. No se detuvo el proceso ajeno ni se modificó `.env`.

La construcción usa el lockfile y la inyección de contratos workspace para empaquetar dependencias portables; el caché de BuildKit no contiene secretos. Una red/DNS funcional es necesaria para descargar imágenes y paquetes. Consulta [verificación](docs/verification.md) para el resultado de la última construcción.

### Próximo paso de operación

Ejecutar la CI remota mediante publicación y revisión humana, aprobar el proveedor cartográfico y la integración de dispositivos, y seguir la [preparación de producción](docs/architecture/production-readiness.md). No se garantiza el SLO de disponibilidad ni el objetivo de enrutamiento sin desplegar y medir el servicio correspondiente.

La [matriz de cumplimiento](docs/requirements-status.md) y la [evidencia de verificación local](docs/verification.md) detallan lo implementado, los comandos ejecutados y los límites pendientes.

## Cierre local integral

Se añadieron snapshots diarios de activos, reporte ejecutivo PDF/XLSX con periodo y filtros, planes versionados y monitorización de desvíos/paradas, importación de stock JSON/CSV de referencia y salud funcional protegida. Los adaptadores reales permanecen configurables; no hay ERP, dispositivos ni entorno productivo aprobados.

La [trazabilidad](docs/requirements/traceability.md), [criterios](docs/requirements/acceptance-criteria.md) y [backlog](docs/requirements/backlog.md) separan implementación, verificación local y aceptación externa. Consulta [manual de usuario](docs/user/user-manual.md), [manual administrativo](docs/user/administrator-manual.md) y [Design System](docs/design/design-system.md).

OPERATION_TIME_ZONE define la zona IANA (default America/Mexico_City). El diario compara observaciones del mismo minuto local; antes de tener histórico comparable muestra N/D. ROUTING_HEALTH_PATH es opcional, solo un HEAD aprobado y no facturable; configurado sin sonda es desconocido. No guardar secretos en VITE.

Nuevos comandos: pnpm licenses:inventory, pnpm release:package y pnpm release:verify. Generan SBOM/notices, paquete source TAR.GZ con manifiesto/checksums y prueban extracción/instalación congelada/generate/types/build en directorio aislado. Artifacts permanece ignorado; cifrado/entrega real pendientes. Demo GPG: GPG_BINARY privado opcional y node scripts/encryption-demo.mjs (solo texto sintético, clave aleatoria en memoria).

pnpm test:capacity requiere CLOSURE_LOAD=true y TEST_DATABASE_URL dedicado; parámetros LOAD_SECONDS/LOAD_WARMUP_SECONDS/LOAD_GPS_MS/LOAD_USERS/LOAD_REPLICAS en [plan de carga](docs/testing/load-test-plan.md). pnpm test:recovery requiere CLOSURE_RECOVERY=true y base dedicada, Docker local, y conserva targets nuevos. No correr suites de persistencia/carga/build simultáneamente.

[Piloto](docs/testing/pilot-plan.md) y [UAT](docs/testing/uat-plan.md) son propuestas; [riesgos](docs/governance/risk-register.md), [RACI](docs/governance/responsibilities-raci.md), [operación productiva](docs/operations/production-design.md), [costos](docs/delivery/technical-cost-model.md) y [entrega](docs/delivery/delivery-checklist.md) requieren revisión humana. No firma, disponibilidad99.9%, p95motor<50ms ni RPOproductivo acreditados. Resultados actuales en [verificación](docs/verification.md).

Manual técnico consolidado: [instalación, operación y release](docs/user/technical-manual.md). Preview local verificado de esta ejecución: http://localhost:18080. El scan CVE de imágenes requiere autenticación Docker Scout; detalle y comandos en [verificación](docs/verification.md).

## Flota y presentación profesional

La guía de [demostración local](docs/demo/local-demonstration.md) prepara 20 vehículos, 80 envíos, cuatro almacenes y 24 artículos separados bajo LGD-V1-, con movimientos/historiales válidos y 18 posiciones simuladas persistidas en MongoDB. Usa pnpm demo:seed y pnpm demo:verify después de generar/migrar/crear el ADMIN local. Repetir conserva registros, usuarios, observaciones y cambios manuales.

Con pnpm dev activo, pnpm demo:simulate inicia explícitamente hasta seis vehículos demo sin plan vigente, mediante JWT privado y la ingesta normal de desarrollo; Ctrl+C detiene sin borrar histórico. No está permitido en producción. La trayectoria es sintética y no acredita routing vial.

Mapa y listado tienen selección, filtros, centrado, antigüedad y detalles GPS/operativos. El formulario manual admite fecha/hora local, precisión, velocidad y rumbo; el servidor conserva procedencia y actor interno. Sin cartografía aprobada se utiliza el plano de coordenadas y se muestra la limitación. [ADR 009](docs/architecture/adr-009-demonstration-and-gps-provenance.md) explica consistencia y aislamiento.
