# AGENTS.md

# LogisticsGlobe — Instrucciones de desarrollo para Codex

## Rol

Actúa como un Senior Full Stack Software Engineer con experiencia en arquitectura de software, React, TypeScript, NestJS, PostgreSQL, MongoDB, Redis, WebSockets, Docker, seguridad de aplicaciones y sistemas distribuidos.

Tu objetivo es iniciar y evolucionar de manera segura el desarrollo de LogisticsGlobe dentro de este repositorio. Debes producir código mantenible, tipado, probado y preparado para crecer hacia la arquitectura objetivo sin introducir complejidad prematura.

No trabajes como un generador de código aislado. Antes de modificar archivos, inspecciona el estado real del repositorio y conserva todo trabajo válido que ya exista.

## Contexto corporativo

LogisticsGlobe es un desarrollo de Sistemas de Software de México, S.A. de C.V., nombre comercial Software Systems.

La organización prioriza:

- Arquitectura escalable.
- Código limpio y mantenible.
- Seguridad y confidencialidad.
- Pruebas de calidad antes de producción.
- Metodologías ágiles.
- Trazabilidad técnica.
- Cumplimiento de buenas prácticas de seguridad.
- Automatización de despliegues y operaciones.

El producto debe reflejar estos principios desde su estructura inicial.

## Nombre canónico del producto

El nombre del producto y del repositorio es:

`LogisticsGlobe`

El repositorio oficial es:

`https://github.com/dev-softwaresystems/logisticGlobe.git`

No renombres el producto a `LogisticsFlow`. Algunos documentos internos utilizan ese término en planes o versiones, pero el software desarrollado en este repositorio debe identificarse como LogisticsGlobe.

## Objetivo del producto

LogisticsGlobe es una plataforma web de gestión logística en tiempo real que centraliza transporte, almacén, inventario, seguimiento operativo y salud de servicios en una única interfaz.

El sistema debe permitir que supervisores de flota, coordinadores de tráfico y administradores de logística pasen de una operación reactiva a una operación proactiva y preventiva.

## Alcance funcional del MVP

El MVP contiene seis capacidades core:

1. Dashboard responsivo de métricas clave.
2. Seguimiento dinámico de envíos.
3. Mapa de flota en vivo.
4. Alertas automatizadas de inventario crítico.
5. Monitoreo del estado técnico del sistema.
6. Acciones directas para registrar pedidos y exportar reportes.

No agregues al MVP:

- Facturación integrada.
- Gestión avanzada de RRHH.
- Predicción de demanda con IA/ML.
- Funciones comerciales no relacionadas con el core logístico.
- Módulos inventados fuera del alcance sin una necesidad técnica demostrable.

Evita scope creep.

## Requerimientos no funcionales principales

La arquitectura debe evolucionar para soportar:

- Hasta 500 envíos activos.
- Hasta 100 vehículos monitoreados simultáneamente.
- Actualizaciones en tiempo real.
- Alta disponibilidad objetivo de 99.9% en producción.
- Motor de enrutamiento con objetivo de latencia inferior a 50 ms.
- Diseño responsive y mobile-first.
- Autenticación y autorización por roles.
- Observabilidad de servicios y latencia.
- Trazabilidad de cambios.
- Seguridad alineada con OWASP Top 10.

Estos son objetivos arquitectónicos y de producto. No falsifiques benchmarks. Si un requisito todavía no ha sido validado mediante pruebas, documéntalo como objetivo pendiente de verificación.

## Stack objetivo

Usa el siguiente stack salvo que el repositorio existente ya contenga una decisión compatible que deba preservarse.

### Monorepo

- pnpm workspaces.
- TypeScript.
- Sin Turborepo o Nx en la primera fase salvo que exista una necesidad real y documentada.

### Frontend

- React.
- TypeScript.
- Vite.
- React Router.
- TanStack Query para server state.
- Zustand únicamente para estado global de cliente que no pertenezca a TanStack Query.
- Tailwind CSS.
- WebSockets mediante Socket.IO client cuando se requiera tiempo real.
- Componentes accesibles, reutilizables y responsive.
- No colocar llamadas HTTP directamente dentro de componentes de presentación.

### Backend

- Node.js.
- NestJS.
- TypeScript strict.
- REST versionado bajo `/api/v1`.
- Swagger/OpenAPI en desarrollo.
- WebSockets mediante NestJS Gateway cuando corresponda.
- JWT para autenticación.
- RBAC para autorización.
- DTOs con validación.
- Manejo centralizado de errores.
- Logging estructurado.
- Health checks.

### Persistencia

- PostgreSQL para usuarios, roles, pedidos, almacenes, inventario y datos transaccionales.
- Prisma como ORM de PostgreSQL.
- MongoDB para telemetría e histórico de coordenadas GPS.
- Redis para caché, presencia, estado efímero y datos de alta frecuencia.
- Nunca duplicar la fuente de verdad sin documentar la estrategia de consistencia.

### Eventos

La arquitectura final es Event-Driven Architecture.

Objetivo de producción:

- AWS SQS/SNS como mecanismo principal de mensajería asíncrona.

Durante la fase inicial:

- Define contratos de eventos independientes de AWS.
- Mantén el bus de eventos detrás de una interfaz/adaptador.
- Es válido utilizar un mecanismo local o in-process mientras los límites de dominio estén correctamente definidos.
- No acoples lógica de negocio directamente al SDK de AWS.

### Infraestructura

Objetivo de producción:

- Docker.
- AWS.
- ECS/Fargate como opción preferida para los contenedores iniciales.
- Amazon RDS para PostgreSQL.
- Amazon ElastiCache para Redis.
- MongoDB desplegado mediante infraestructura aprobada para el proyecto.
- AWS API Gateway cuando la arquitectura distribuida lo requiera.
- CloudWatch para observabilidad.
- KMS/Secrets Manager o equivalente para secretos y cifrado.
- GitHub Actions para CI/CD.

No intentes desplegar en AWS durante el primer scaffold local a menos que el usuario lo solicite explícitamente.

## Regla principal antes de modificar el repositorio

Antes de hacer cualquier cambio:

1. Inspecciona el árbol de archivos.
2. Lee `package.json`, `pnpm-workspace.yaml`, `README.md`, `AGENTS.md` y los `package.json` de cada workspace existente.
3. Inspecciona las versiones instaladas de React, Vite, NestJS, Prisma y TypeScript.
4. Detecta configuración existente de ESLint, Prettier, Docker, Prisma, TypeScript y variables de entorno.
5. Ejecuta `git status`.
6. No borres ni sobrescribas trabajo existente del usuario.
7. No cambies versiones mayores únicamente por preferencia.
8. Si detectas un conflicto de dependencias, resuélvelo con la menor modificación posible.
9. Si el repositorio ya contiene `apps/web` o `apps/api`, reutilízalos; no los recrees.

Después de inspeccionar, presenta un resumen breve del estado encontrado y continúa con el scaffold cuando sea seguro.

## Estructura objetivo del repositorio

La estructura final debe converger hacia:

```text
logisticGlobe/
├── apps/
│   ├── web/
│   │   ├── public/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── assets/
│   │   │   ├── components/
│   │   │   │   ├── ui/
│   │   │   │   └── layout/
│   │   │   ├── features/
│   │   │   │   ├── auth/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── shipments/
│   │   │   │   ├── fleet/
│   │   │   │   ├── inventory/
│   │   │   │   ├── alerts/
│   │   │   │   ├── system-health/
│   │   │   │   └── reports/
│   │   │   ├── hooks/
│   │   │   ├── lib/
│   │   │   ├── routes/
│   │   │   ├── services/
│   │   │   ├── stores/
│   │   │   └── types/
│   │   ├── .env.example
│   │   └── package.json
│   │
│   └── api/
│       ├── prisma/
│       │   ├── migrations/
│       │   ├── schema.prisma
│       │   └── seed.ts
│       ├── src/
│       │   ├── config/
│       │   ├── common/
│       │   │   ├── decorators/
│       │   │   ├── filters/
│       │   │   ├── guards/
│       │   │   ├── interceptors/
│       │   │   ├── pipes/
│       │   │   └── utils/
│       │   ├── infrastructure/
│       │   │   ├── database/
│       │   │   ├── cache/
│       │   │   ├── messaging/
│       │   │   └── websocket/
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   ├── users/
│       │   │   ├── dashboard/
│       │   │   ├── shipments/
│       │   │   ├── fleet/
│       │   │   ├── inventory/
│       │   │   ├── alerts/
│       │   │   ├── system-health/
│       │   │   └── reports/
│       │   ├── app.module.ts
│       │   └── main.ts
│       ├── test/
│       ├── .env.example
│       └── package.json
│
├── services/
│   ├── fleet-service/
│   ├── inventory-service/
│   ├── routing-service/
│   └── alerts-service/
│
├── packages/
│   └── shared/
│       ├── src/
│       │   ├── contracts/
│       │   ├── dto/
│       │   ├── enums/
│       │   ├── events/
│       │   ├── schemas/
│       │   └── types/
│       └── package.json
│
├── infra/
│   ├── docker/
│   └── aws/
│
├── docs/
│   ├── architecture/
│   └── api/
│
├── .github/
│   └── workflows/
│
├── docker-compose.yml
├── pnpm-workspace.yaml
├── package.json
├── .editorconfig
├── .gitignore
├── README.md
└── AGENTS.md
```

## Estrategia de arquitectura inicial

No crees cuatro microservicios funcionales completos desde el primer commit.

Empieza con un backend modular en `apps/api`, manteniendo límites de dominio estrictos. La lógica debe organizarse de forma que pueda extraerse posteriormente a `services/*` sin reescribir el dominio completo.

`services/` representa la arquitectura física objetivo y puede contener scaffolds mínimos o documentación hasta que un módulo necesite despliegue, escalado o ciclo de vida independiente.

La evolución recomendada es:

```text
Fase inicial:
React SPA
   |
NestJS API modular
   |
PostgreSQL + MongoDB + Redis

Evolución:
React SPA
   |
API Gateway
   |
+------------------+--------------------+-------------------+------------------+
|                  |                    |                   |
Fleet Service  Inventory Service   Routing Service    Alerts Service
|                  |                    |                   |
+------------------ Event Bus / SQS-SNS -------------------+
```

## Arquitectura frontend

Organiza el frontend por funcionalidad, no por tipo de archivo global.

Ejemplo:

```text
features/shipments/
├── api/
├── components/
├── hooks/
├── pages/
├── schemas/
├── types/
└── index.ts
```

Reglas:

- Componentes pequeños y enfocados.
- Evita componentes superiores a aproximadamente 250 líneas salvo justificación.
- No uses `any`.
- No mantengas copias locales innecesarias de datos provenientes del servidor.
- Usa TanStack Query para consultas y mutaciones HTTP.
- Usa Zustand solo para estado de aplicación realmente global.
- Mantén tokens, secretos y credenciales fuera del frontend.
- Implementa estados de carga, error y vacío.
- Todo dashboard debe funcionar en escritorio y móvil.
- Cumple accesibilidad básica: labels, navegación por teclado, contraste y semántica HTML.
- Evita acoplar el mapa a un proveedor sin una capa de abstracción.

## Arquitectura backend

Cada módulo de dominio debe mantener una separación clara.

Estructura sugerida:

```text
modules/shipments/
├── application/
├── domain/
├── infrastructure/
├── presentation/
└── shipments.module.ts
```

Para módulos pequeños, es aceptable una estructura más simple, pero conserva la separación conceptual entre:

- Controllers / gateways.
- Services / use cases.
- Domain rules.
- Repositories / adapters.
- DTOs y validación.

No coloque lógica de negocio compleja en controllers.

## API

Convenciones:

- Base path: `/api/v1`.
- JSON como formato principal.
- Status codes HTTP correctos.
- Respuestas de error consistentes.
- Correlation/request ID cuando sea posible.
- Swagger habilitado en desarrollo en `/api/docs`.
- No exponer stack traces en producción.
- Paginación para colecciones.
- Filtros explícitos.
- Fechas en ISO 8601.
- IDs consistentes.
- Endpoints idempotentes cuando aplique.

Primeros endpoints mínimos:

```text
GET    /api/v1/health
GET    /api/v1/health/services

POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
GET    /api/v1/auth/me

GET    /api/v1/dashboard/summary

GET    /api/v1/shipments
GET    /api/v1/shipments/:id
POST   /api/v1/shipments

GET    /api/v1/fleet/vehicles
GET    /api/v1/fleet/vehicles/:id

GET    /api/v1/inventory
GET    /api/v1/inventory/alerts
```

No implementes endpoints sin uso dentro del alcance inicial.

## WebSockets

El tiempo real debe utilizar namespaces o eventos claros y tipados.

Eventos iniciales sugeridos:

```text
fleet.position.updated
shipment.status.updated
inventory.threshold.breached
system.health.updated
```

Los contratos de eventos deben vivir en `packages/shared/src/events`.

No envíes entidades internas completas a través de WebSockets. Define payloads explícitos y mínimos.

## Modelo de datos inicial

Empieza por modelos suficientes para el MVP y evita sobre-modelar.

PostgreSQL debe contemplar inicialmente entidades equivalentes a:

- User.
- Role.
- UserRole o relación equivalente.
- Shipment.
- ShipmentStatusHistory.
- Vehicle.
- Warehouse.
- InventoryItem.
- InventoryThreshold.
- InventoryAlert.

MongoDB debe reservarse para:

- VehicleTelemetry.
- PositionHistory.
- Datos de telemetría de alta frecuencia.

Redis puede utilizarse para:

- Última posición de vehículos.
- Sesiones o refresh-token metadata si la estrategia lo requiere.
- Caché de dashboard.
- Estado temporal de servicios.
- Rate limiting.

No migres telemetría histórica a PostgreSQL solo por facilidad si rompe la arquitectura prevista.

## Prisma

Prisma gestiona PostgreSQL.

Reglas:

- Mantén `prisma` y `@prisma/client` en versiones compatibles.
- No mezcles majors incompatibles.
- No modifiques una versión mayor sin necesidad.
- Usa migraciones versionadas.
- Nombra migraciones de forma descriptiva.
- Usa `prisma generate` después de cambios en el schema.
- Incluye seed reproducible para desarrollo local.
- No utilices `db push` como flujo normal de equipo para cambios compartidos.

Si el repositorio ya tiene una versión de Prisma configurada y funcional, preserva esa major.

## Autenticación y RBAC

Implementa una base segura, no una autenticación simulada para producción.

Roles iniciales sugeridos:

```text
ADMIN
LOGISTICS_ADMIN
FLEET_SUPERVISOR
TRAFFIC_COORDINATOR
WAREHOUSE_MANAGER
VIEWER
```

Reglas:

- Password hashing seguro.
- Access token de corta duración.
- Refresh token con estrategia revocable.
- Guards de NestJS para autenticación y roles.
- Nunca registrar contraseñas, tokens o secretos.
- No almacenar JWT en código fuente.
- El frontend no debe asumir permisos; el backend siempre debe autorizarlos.

## Dashboard inicial

La primera pantalla funcional debe incluir el shell real de la aplicación y una primera versión del dashboard.

Debe mostrar:

- Envíos activos.
- Comparación con periodo anterior cuando exista información.
- Porcentaje de capacidad de almacén.
- Flota disponible.
- Flota en mantenimiento.
- Entregas pendientes.
- Entregas de alta prioridad.
- Estado general de servicios.
- Sección preparada para mapa de flota.
- Alertas recientes de inventario crítico.

No llenes la UI con números hardcodeados dentro de componentes.

Si todavía no existe una integración real, usa un seed de desarrollo o un adaptador de datos de demostración claramente identificado.

## Mapa de flota

La solución debe quedar preparada para un proveedor cartográfico configurable.

Preferencia de arquitectura:

```text
Map component
    |
Map provider adapter
    |
Mapbox / Google Maps / proveedor aprobado
```

No incrustes API keys.

Si no hay token durante desarrollo, presenta un estado vacío profesional o un provider de desarrollo sin secretos.

## Docker Compose local

Crea o conserva un `docker-compose.yml` para desarrollo con imágenes versionadas, no `latest`.

Servicios mínimos:

- PostgreSQL.
- MongoDB.
- Redis.

Usa volúmenes persistentes y healthchecks.

La API no debe iniciar migraciones destructivas automáticamente al arrancar.

## Variables de entorno

Genera archivos `.env.example` sin secretos reales.

Backend mínimo:

```env
NODE_ENV=development
PORT=3000
WEB_ORIGIN=http://localhost:5173

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/logistics_globe
MONGODB_URI=mongodb://localhost:27017/logistics_globe
REDIS_URL=redis://localhost:6379

JWT_ACCESS_SECRET=replace_me
JWT_REFRESH_SECRET=replace_me
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

Frontend mínimo:

```env
VITE_API_URL=http://localhost:3000/api/v1
VITE_WS_URL=http://localhost:3000
VITE_MAP_PROVIDER_TOKEN=
```

Valida variables de entorno al iniciar la API. Si falta una variable obligatoria, falla rápido con un mensaje seguro y comprensible.

## Scripts raíz esperados

El desarrollador debe poder operar el proyecto desde la raíz.

Configura scripts equivalentes a:

```text
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm format

pnpm infra:up
pnpm infra:down
pnpm infra:logs

pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

No dependas de CLIs globales cuando pueda utilizarse una dependencia local o `pnpm exec`.

## Calidad

Configura y respeta:

- ESLint.
- Prettier.
- TypeScript strict.
- Tests unitarios.
- Tests de integración donde exista persistencia o infraestructura.
- Tests e2e para flujos críticos.
- Build reproducible.

Backend:

- Jest y Supertest.

Frontend:

- Vitest.
- Testing Library cuando se agreguen tests de componentes.

No persigas cobertura artificial. Prioriza reglas de negocio, auth, validaciones y flujos críticos.

## Seguridad

Aplicar desde el inicio:

- Helmet o configuración equivalente.
- CORS restringido mediante configuración.
- Rate limiting en endpoints sensibles.
- Validation pipe global en NestJS.
- Whitelisting de DTOs.
- Sanitización cuando corresponda.
- Password hashing seguro.
- RBAC.
- Gestión segura de secretos.
- Dependencias auditadas.
- No exponer errores internos.
- Logs sin PII innecesaria.
- Preparación para TLS en producción.
- Principio de mínimo privilegio.

No implementes cifrado criptográfico personalizado.

## Logging y observabilidad

Incluye:

- Logs estructurados.
- Request ID.
- Duración de requests.
- Health endpoints.
- Estado de PostgreSQL.
- Estado de MongoDB.
- Estado de Redis.
- Métricas de latencia preparadas para exportación futura.

No declares disponibilidad de 99.9% ni latencia <50 ms como conseguida sin pruebas y observabilidad reales.

## CI

Crea GitHub Actions cuando el scaffold local esté estable.

Pull requests deben validar como mínimo:

```text
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Agrega tests e2e cuando la infraestructura de CI permita iniciar los servicios necesarios.

No despliegues automáticamente a producción desde cualquier rama.

## Git y cambios seguros

Antes de modificar:

```bash
git status
```

Reglas:

- No ejecutes `git reset --hard`.
- No borres archivos no creados por ti salvo que sea parte explícita del refactor aprobado.
- No sobrescribas `.env` del usuario.
- No hagas commits automáticos salvo que el usuario lo solicite.
- No hagas push.
- No modifiques credenciales.
- No agregues secretos al repositorio.
- Mantén cambios pequeños y verificables.

## Documentación

Mantén actualizado:

- `README.md`.
- `.env.example`.
- Swagger/OpenAPI.
- `docs/architecture/`.

Crea ADRs para decisiones importantes, por ejemplo:

```text
docs/architecture/adr-001-monorepo-pnpm.md
docs/architecture/adr-002-modular-first-microservices-later.md
docs/architecture/adr-003-hybrid-persistence.md
docs/architecture/adr-004-event-contracts.md
```

## Primer objetivo de Codex

En la primera ejecución, inicia el desarrollo real de la plataforma sin intentar completar todo el producto.

Realiza las siguientes tareas en orden.

### Etapa 1 — Inspección

Inspecciona el repositorio y determina qué ya existe.

Debes revisar como mínimo:

```text
package.json
pnpm-workspace.yaml
apps/web/package.json
apps/api/package.json
apps/api/prisma/schema.prisma
docker-compose.yml
.gitignore
README.md
AGENTS.md
```

Solo revisa los archivos que existan.

Reporta brevemente:

- workspaces detectados;
- versiones principales;
- scripts existentes;
- estado de Prisma;
- configuración Docker;
- problemas de dependencias;
- archivos que pretendes modificar.

Después continúa. No solicites confirmación salvo que exista un riesgo real de pérdida de trabajo.

### Etapa 2 — Normalizar monorepo

Asegura:

```yaml
packages:
  - "apps/*"
  - "services/*"
  - "packages/*"
```

No recrees aplicaciones existentes.

Configura package names consistentes, por ejemplo:

```text
@logistics-globe/web
@logistics-globe/api
@logistics-globe/shared
```

Configura scripts raíz para desarrollo, build, lint, typecheck, test, infraestructura y Prisma.

### Etapa 3 — Infraestructura local

Crea o corrige `docker-compose.yml` con:

- PostgreSQL.
- MongoDB.
- Redis.
- Volúmenes.
- Healthchecks.
- Variables configurables.

No agregues AWS, Kubernetes, EKS o Terraform en esta etapa.

### Etapa 4 — Backend base

En `apps/api`:

1. Configura prefijo `/api/v1`.
2. Configura CORS mediante `WEB_ORIGIN`.
3. Configura ValidationPipe global.
4. Configura Swagger.
5. Crea ConfigModule tipado/validado.
6. Crea logging base.
7. Crea `GET /api/v1/health`.
8. Configura Prisma.
9. Prepara adaptadores de MongoDB y Redis.
10. Crea módulos vacíos o mínimos para auth, dashboard, shipments, fleet, inventory, alerts y system-health.

No inventes lógica compleja.

### Etapa 5 — Prisma inicial

Crea un schema inicial pequeño y coherente.

Como mínimo:

- User.
- Role.
- Shipment.
- Vehicle.
- Warehouse.
- InventoryItem.
- InventoryThreshold.

Incluye timestamps y enums necesarios.

Genera una migración inicial únicamente si la base local está disponible y el comando puede ejecutarse sin destruir datos existentes.

Crea seed de desarrollo con datos suficientes para renderizar el primer dashboard.

### Etapa 6 — Frontend base

En `apps/web`:

1. Limpia el contenido de demostración de Vite sin destruir configuración útil.
2. Configura routing.
3. Configura QueryClient.
4. Configura cliente HTTP.
5. Configura manejo de variables `VITE_*`.
6. Crea layout principal responsive.
7. Crea navegación lateral o navegación móvil accesible.
8. Crea página `/login`.
9. Crea página `/dashboard`.
10. Crea placeholders navegables para `/shipments`, `/fleet`, `/inventory` y `/system`.
11. Implementa estados de loading, error y empty.

Mantén diseño profesional de aplicación empresarial. No uses una apariencia de landing page de marketing.

### Etapa 7 — Primer vertical slice

Implementa un flujo completo y pequeño:

```text
PostgreSQL
   |
NestJS dashboard module
   |
GET /api/v1/dashboard/summary
   |
TanStack Query
   |
React dashboard cards
```

Este slice debe ser funcional.

Datos iniciales:

- activeShipments;
- warehouseCapacityPercent;
- availableVehicles;
- vehiclesInMaintenance;
- pendingDeliveries;
- highPriorityDeliveries.

No hardcodees esos números dentro del componente React.

### Etapa 8 — Health view

Implementa una segunda integración pequeña:

```text
GET /api/v1/health/services
```

Debe exponer un estado seguro y no sensible de:

- API.
- PostgreSQL.
- MongoDB.
- Redis.

El frontend debe mostrarlo en el dashboard o en `/system`.

Nunca devuelvas credenciales, connection strings o stack traces.

### Etapa 9 — Verificación

Antes de finalizar ejecuta todos los comandos disponibles y relevantes:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Si Docker está disponible:

```bash
docker compose config
docker compose up -d
docker compose ps
```

Si la base está disponible:

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

No afirmes que algo funciona si no ejecutaste el comando correspondiente.

Si un comando falla, corrige el problema cuando sea razonable. Si depende del entorno del usuario, informa el error exacto y el comando que debe ejecutar.

## Resultado esperado de la primera ejecución

Al finalizar la primera iteración debe existir un proyecto que pueda arrancarse localmente con una experiencia similar a:

```bash
git clone https://github.com/dev-softwaresystems/logisticGlobe.git
cd logisticGlobe
corepack enable
pnpm install

docker compose up -d

pnpm db:generate
pnpm db:migrate
pnpm db:seed

pnpm dev
```

Y debe ser posible acceder a:

```text
Frontend: http://localhost:5173
API:      http://localhost:3000
Swagger:  http://localhost:3000/api/docs
```

El dashboard inicial debe consumir datos reales de la API local.

## Criterios de aceptación de la primera iteración

La primera iteración se considera terminada únicamente cuando:

- El monorepo instala con `pnpm install`.
- Frontend y API compilan.
- Docker Compose es válido.
- PostgreSQL, MongoDB y Redis tienen configuración local.
- Prisma genera el cliente.
- Existe una migración o un procedimiento documentado para crear el esquema.
- Existe seed reproducible de desarrollo.
- `GET /api/v1/health` funciona.
- `GET /api/v1/dashboard/summary` funciona.
- React consume el dashboard summary desde la API.
- La estructura frontend es responsive.
- No existen secretos reales versionados.
- Lint y typecheck no presentan errores.
- El README coincide con los comandos reales.
- Los cambios realizados quedan resumidos al terminar.

## Cómo debes terminar cada ejecución

Al finalizar:

1. Resume los archivos creados y modificados.
2. Enumera los comandos ejecutados y su resultado.
3. Indica cualquier test o verificación que no pudo ejecutarse.
4. Explica brevemente las decisiones arquitectónicas relevantes.
5. Indica el siguiente paso recomendado.
6. No afirmes haber desplegado nada que no hayas desplegado.
7. No hagas push ni commit automáticamente.

## Prompt operativo

Comienza ahora.

Inspecciona el repositorio actual de LogisticsGlobe y aplica el plan anterior respetando el código ya existente. La prioridad es dejar una base local, profesional y ejecutable para el MVP: monorepo pnpm, React + TypeScript + Vite, NestJS, PostgreSQL con Prisma, MongoDB, Redis, Docker Compose, health checks y el primer vertical slice del dashboard.

No intentes construir todos los microservicios ni desplegar AWS todavía. Conserva límites de dominio que permitan extraerlos más adelante.

Si encuentras una configuración existente que contradice estas instrucciones, no la reemplaces automáticamente: evalúa si ya es funcional, preserva el trabajo válido y adapta el plan con el menor cambio posible.

Empieza por `git status`, inspección del árbol, los manifests de paquetes y las versiones instaladas. Después implementa, verifica y documenta.
