# Cumplimiento de AGENTS.md

## Desarrollo local

Las nueve etapas de la primera iteración están implementadas: inspección y preservación del código, workspaces pnpm, Compose local, backend base, Prisma y seed, frontend responsive, dashboard PostgreSQL/API/React, health view y verificaciones.

Las seis capacidades del MVP tienen implementación local:

| Capacidad             | Implementación                                                                                                                        |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard             | Seis métricas reales, alertas, salud y comparación de envíos nuevos entre periodos de 7 días cuando hay al menos 14 días de registros |
| Seguimiento de envíos | Registro idempotente, listado paginado, filtros, detalle, transiciones, asignación e historial                                        |
| Flota en vivo         | Ingesta GPS, histórico MongoDB, caché Redis, Socket.IO y adaptador Leaflet; proveedor de coordenadas local o tiles configurables      |
| Alertas de inventario | Generación y resolución transaccional al registrar o ajustar stock, listado y actualización en vivo                                   |
| Monitoreo             | API/PostgreSQL/MongoDB/Redis, latencias, cambios de estado por eventos y polling de respaldo                                          |
| Acciones y reportes   | Registro de envíos, vehículos, almacenes y artículos; ajustes trazables; exportación CSV                                              |

La arquitectura modular conserva majors y rutas existentes. Vitest/Supertest y oxlint en API son una adaptación expresamente documentada de la configuración funcional previa; frontend usa ESLint, Vitest y Testing Library. Zustand no se añade a los flujos porque no hace falta una segunda copia global del estado del servidor.

## Verificación y límites

Se verifican instalación congelada, lint, typecheck, tests, build, Prisma y Compose. La ampliación añade 35 pruebas unitarias, 37 e2e y 6 casos de navegador, administración de usuarios, GPS configurable, routing, métricas, réplicas y restauración aislada. Los resultados y limitaciones de construcción de imágenes están en [verificación](verification.md). Los e2e usan una base dedicada y limpian únicamente sus fixtures. La suite de capacidad realiza 100 solicitudes GPS en tandas de 10, comprueba 500 envíos activos paginados y 100 últimas posiciones, y mide 40 peticiones de dashboard con concurrencia 10.

La evidencia se escribe en artifacts/capacity-verification.json (ignorado en Git). Es una prueba local de capacidad funcional, no una garantía de rendimiento sostenido. Sus tiempos pertenecen a esa ejecución y equipo; deben repetirse bajo infraestructura y carga representativas.

| Objetivo de producción de AGENTS.md            | Estado real                                                                                                                |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 500 envíos / 100 vehículos                     | Caso funcional local verificado; falta carga sostenida de dispositivos y usuarios                                          |
| Tiempo real                                    | Implementado y probado con dos réplicas locales, Redis y leasing SQL; falta validar infraestructura y carga de producción  |
| 99.9% de disponibilidad                        | Pendiente de despliegue, SLO, monitoreo externo y periodo de observación                                                   |
| Enrutamiento <50 ms                            | Adaptador OSRM configurable y pruebas de contrato/UI; proveedor real y objetivo <50 ms pendientes de aprobación y medición |
| AWS ECS/RDS/ElastiCache/SQS/SNS/CloudWatch/KMS | Arquitectura documentada; sin recursos creados ni despliegue                                                               |
| Seguridad OWASP                                | Controles base implementados y flujos críticos probados; falta revisión independiente y validación de producción           |
| CI remota                                      | Workflow completo preparado; no ejecutado remotamente porque no se hace commit/push                                        |

No se declara cumplimiento de objetivos de producción sin evidencias. AGENTS.md distingue explícitamente estos objetivos futuros del scaffold local y prohíbe desplegar AWS sin solicitud específica. No hay Kubernetes, Terraform ni microservicios físicos creados.

Consulte [preparación de producción](architecture/production-readiness.md) y [consistencia y tiempo real](architecture/adr-006-operational-consistency-and-realtime.md).
