# LogisticsGlobe

Plataforma integral de gestión logística en tiempo real desarrollada por Sistemas de Software de México, S.A. de C.V. (Software Systems).

## Descripción

LogisticsGlobe es una plataforma web orientada a centralizar la supervisión y operación de transporte, almacenes, inventario y servicios tecnológicos en una sola interfaz.

El objetivo del sistema es reducir la fragmentación de la información logística y facilitar una operación proactiva mediante visualización de métricas, seguimiento de envíos, geolocalización de flota, alertas de inventario crítico y monitoreo del estado de los servicios backend.

La plataforma está diseñada principalmente para supervisores de flota, coordinadores de tráfico y administradores de logística que requieren información actualizada para tomar decisiones operativas con rapidez.

## Objetivos del producto

La primera versión funcional de LogisticsGlobe contempla:

1. Dashboard responsivo con métricas clave de operación.
2. Seguimiento dinámico de envíos y prioridades.
3. Mapa de flota en vivo.
4. Alertas automáticas de stock bajo por SKU.
5. Monitoreo del estado y latencia de servicios.
6. Registro de pedidos y exportación de reportes ejecutivos.

El objetivo técnico es mantener una arquitectura escalable que permita evolucionar hacia una solución distribuida orientada a eventos, con soporte para hasta 500 envíos activos y 100 vehículos monitoreados simultáneamente, alta disponibilidad y actualización de información en tiempo real.

## Arquitectura

LogisticsGlobe se desarrolla como un monorepo administrado con pnpm workspaces.

La arquitectura objetivo está compuesta por:

- Frontend SPA en React y TypeScript.
- Backend en Node.js con NestJS.
- API Gateway como punto de entrada a los servicios.
- Arquitectura orientada a eventos y preparada para microservicios.
- PostgreSQL para información relacional y transaccional.
- MongoDB para telemetría e historial de coordenadas.
- Redis para caché, estados efímeros y datos de consulta rápida.
- WebSockets para actualizaciones en tiempo real.
- Docker para entornos reproducibles.
- AWS como plataforma objetivo de despliegue.
- AWS ECS/Fargate para ejecución de contenedores.
- Amazon RDS para PostgreSQL.
- Amazon ElastiCache para Redis.
- AWS SQS/SNS como infraestructura objetivo de mensajería asíncrona.
- GitHub Actions para integración y entrega continua.

Durante las primeras etapas de desarrollo se prioriza un entorno local reproducible. La separación física de los microservicios y el despliegue completo en AWS se realizarán de forma incremental una vez que los módulos principales y sus contratos estén estabilizados.

## Stack tecnológico

| Área | Tecnología |
| --- | --- |
| Package manager | pnpm |
| Frontend | React, TypeScript, Vite |
| Routing frontend | React Router |
| Data fetching | TanStack Query |
| Estado cliente | Zustand |
| Estilos | Tailwind CSS |
| Backend | Node.js, NestJS, TypeScript |
| API | REST, WebSockets |
| ORM PostgreSQL | Prisma |
| Base de datos relacional | PostgreSQL |
| Telemetría | MongoDB |
| Caché | Redis |
| Autenticación | JWT |
| Autorización | RBAC |
| Contenedores | Docker, Docker Compose |
| Cloud objetivo | AWS |
| CI/CD | GitHub Actions |
| Testing | Vitest, Jest, Supertest |

## Estructura del repositorio

```text
logisticGlobe/
├── apps/
│   ├── web/                     # Aplicación React + TypeScript
│   └── api/                     # API principal NestJS / Gateway
├── services/
│   ├── fleet-service/           # Servicio de telemática y flota
│   ├── inventory-service/       # Servicio de inventario / WMS
│   ├── routing-service/         # Motor de enrutamiento
│   └── alerts-service/          # Servicio de alertas
├── packages/
│   └── shared/                  # Contratos, tipos, eventos y utilidades compartidas
├── infra/
│   ├── docker/                  # Recursos auxiliares para desarrollo local
│   └── aws/                     # Infraestructura y configuración cloud
├── docs/
│   ├── architecture/            # Decisiones y documentación de arquitectura
│   └── api/                     # Documentación de API
├── .github/
│   └── workflows/               # Pipelines de CI/CD
├── docker-compose.yml
├── pnpm-workspace.yaml
├── package.json
├── AGENTS.md
└── README.md
```

La estructura de `services/` representa la arquitectura objetivo. Durante la fase inicial, algunos dominios pueden implementarse como módulos claramente aislados dentro de `apps/api` y extraerse posteriormente como microservicios sin modificar sus contratos públicos.

## Requisitos previos

Antes de instalar el proyecto se requiere:

- Git.
- Node.js en una versión LTS soportada.
- pnpm 10 o superior.
- Docker Desktop con Docker Compose.
- Visual Studio Code u otro editor compatible con TypeScript.

Se recomienda habilitar Corepack para administrar la versión de pnpm definida por el proyecto:

```bash
corepack enable
```

Verifique las herramientas instaladas:

```bash
node --version
pnpm --version
git --version
docker --version
docker compose version
```

## Instalación

Clone el repositorio:

```bash
git clone https://github.com/dev-softwaresystems/logisticGlobe.git
cd logisticGlobe
```

Instale las dependencias del monorepo:

```bash
pnpm install
```

Cree los archivos de variables de entorno a partir de los ejemplos versionados.

En PowerShell:

```powershell
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env.local
```

En macOS o Linux:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

Revise los valores antes de iniciar la aplicación. Nunca almacene secretos reales en el repositorio.

## Servicios locales

PostgreSQL, MongoDB y Redis se ejecutan mediante Docker Compose.

Inicie la infraestructura:

```bash
pnpm infra:up
```

Alternativamente:

```bash
docker compose up -d
```

Verifique el estado de los contenedores:

```bash
docker compose ps
```

Para detenerlos:

```bash
pnpm infra:down
```

## Base de datos

Genere el cliente de Prisma:

```bash
pnpm db:generate
```

Ejecute las migraciones locales:

```bash
pnpm db:migrate
```

Si el proyecto incluye datos de demostración:

```bash
pnpm db:seed
```

No utilice `prisma db push` como sustituto permanente de migraciones versionadas para cambios de esquema destinados a compartirse con el equipo.

## Ejecución en desarrollo

Inicie frontend y API desde la raíz:

```bash
pnpm dev
```

Servicios esperados en el entorno local:

```text
Frontend:   http://localhost:5173
API:        http://localhost:3000
API Docs:   http://localhost:3000/api/docs
PostgreSQL: localhost:5432
MongoDB:    localhost:27017
Redis:      localhost:6379
```

Los puertos pueden modificarse mediante variables de entorno.

## Variables de entorno

La API debe contemplar, como mínimo, las siguientes variables:

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

El frontend debe utilizar únicamente variables públicas con prefijo `VITE_`:

```env
VITE_API_URL=http://localhost:3000/api/v1
VITE_WS_URL=http://localhost:3000
VITE_MAP_PROVIDER_TOKEN=
```

Los secretos de backend no deben exponerse al frontend.

## Comandos de desarrollo

Los scripts raíz deben permitir ejecutar las tareas comunes del repositorio:

```bash
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm format
pnpm infra:up
pnpm infra:down
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

## Calidad y seguridad

Todo cambio debe mantener los siguientes criterios:

- TypeScript en modo estricto.
- Validación de entradas en los límites del sistema.
- Autenticación mediante JWT y autorización mediante RBAC.
- Contraseñas almacenadas exclusivamente mediante hashing seguro.
- Secretos únicamente mediante variables de entorno o servicios de secretos.
- Revisión de dependencias y prácticas alineadas con OWASP Top 10.
- Pruebas automatizadas para lógica crítica.
- Lint, typecheck, build y pruebas exitosas antes de integrar cambios.
- Cifrado en tránsito mediante TLS en ambientes desplegados.
- Sin exposición de datos sensibles en logs.

## Metodología de desarrollo

El desarrollo activo se organiza en iteraciones Scrum. Las incidencias, mantenimiento correctivo y soporte operativo se gestionan mediante un flujo Kanban.

El alcance del MVP debe mantenerse centrado en las funcionalidades core. Facturación, gestión avanzada de recursos humanos y predicción de demanda mediante IA/ML no forman parte de la primera fase.

## Convenciones generales

- Las ramas de trabajo deben ser pequeñas y enfocadas.
- Los commits deben describir claramente el cambio realizado.
- No se deben mezclar refactors amplios con nuevas funcionalidades salvo que sea estrictamente necesario.
- Los contratos públicos entre frontend, API y servicios deben mantenerse tipados y versionados.
- Las decisiones arquitectónicas relevantes deben documentarse en `docs/architecture/`.
- No se debe acoplar la lógica de negocio a un proveedor cloud específico cuando pueda mantenerse detrás de una interfaz o adaptador.

## Repositorio

Repositorio oficial:

https://github.com/dev-softwaresystems/logisticGlobe.git

## Organización

Sistemas de Software de México, S.A. de C.V.  
Nombre comercial: Software Systems
