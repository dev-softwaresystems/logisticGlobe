# Verificación de mapa y demostración local

Ejecución: 7 de octubre de 2026, America/Mexico_City. Prompt existente: `docs/prompts/modifiaciones.md`; se conservó ese nombre y su contenido. Base Git: `28386e0b8de3a5a1b3a333f28dd89e1c7ce47d86`. Cambios locales sin commit ni push.

## Diagnóstico

El seed mínimo anterior creaba vehículos sin observaciones GPS. El mensaje vacío del mapa reflejaba esa ausencia; no era una confirmación de un fallo cartográfico. La cartografía externa tampoco está configurada ni aprobada: son dos estados independientes. Se preservaron los adaptadores, ingesta, outbox, autenticación y persistencia existentes.

Se completó carga inicial, actualización y reconciliación de caché por fecha/UUID, recuperación tras reconexión, detalle del marcador, antigüedad, filtros y controles accesibles. MongoDB sigue siendo la fuente durable; Redis puede reconstruirse. Una respuesta HTTP antigua no sustituye una observación Socket.IO más reciente. Las consultas de detalle no reciben actualizaciones con forma de colección.

## Entorno y comandos ejecutados

Windows; Node 24.11.1, pnpm 10.24.0; React 19.3, Vite 8.3, NestJS 12.1, TypeScript 6.0 y Prisma 7.10 conservados. PostgreSQL 16 (5433), MongoDB 7 y Redis 7 locales. Integración usa `logistics_test`, separada de `logistics`; las suites eliminan sus propios fixtures.

| Control                                               | Resultado observado                                                                                                      |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `pnpm install --frozen-lockfile --offline`            | Correcto, sin cambios en lockfile/dependencias mayores                                                                   |
| `pnpm db:generate` / Prisma format                    | Cliente generado y schema formateado                                                                                     |
| Prisma migrate deploy en base principal y de prueba   | Sexta migración aditiva: capacidad nominal opcional del vehículo; sin borrado                                            |
| `pnpm lint`, `pnpm typecheck`                         | Correctos; repetidos al terminar los cambios de lógica y pruebas                                                         |
| `pnpm test`                                           | 59 casos: 47 API y 12 frontend; repetidos al final con un worker                                                         |
| `pnpm build`                                          | Shared, API y SPA compilados                                                                                             |
| `pnpm demo:seed` dos veces + `pnpm demo:verify`       | 20 vehículos, 80 envíos, cuatro almacenes, 24 artículos y 18 vehículos posicionados; coherencia correcta                 |
| `pnpm test:e2e`                                       | 45 casos aprobados, dos suites opcionales omitidas                                                                       |
| `pnpm test:browser`                                   | Seis casos Chromium: tres escritorio y tres móvil, aprobados                                                             |
| Compose base y overlay `config --quiet`               | Ambos válidos, sin imprimir variables privadas                                                                           |
| `node --check` / `git diff --check`                   | Correctos en controles realizados                                                                                        |
| Reconstrucción de contenedores + revisión del preview | Build Linux interrumpido por presión de memoria; preview nativo final revisado en 18 visitas, sin errores JS ni overflow |

El comando de simulación se ejecutó realmente durante integración contra una API NestJS local, con observaciones HTTP autenticadas; termina por duración sin eliminar histórico. El seed se repitió en ambas bases. La comparación antes/después de la segunda ejecución incluyó registros, historiales, movimientos, alertas y GPS, además de contraseña/roles de un ADMIN y un vehículo ajeno.

## Revisión final y condiciones del entorno

El preview compilado nativo sirve localhost:18080, con API de desarrollo localhost:3000 y readiness 200. PostgreSQL, MongoDB y Redis volvieron a healthy tras reiniciar únicamente esos motores propios. Las aplicaciones Docker de las imágenes anteriores permanecen detenidas; no se borraron imágenes, contenedores ni volúmenes. Los comandos están en la guía demo.

`node browser/demo-preview.mjs`, desde apps/api: Chromium 1280×900 y 390×844, dashboard/flota/envíos/inventario/alertas/reportes/sistema/rutas/usuarios. Carga completada sin pantallas de error, filtros por placa/estado, detalle/capacidad, 18 marcadores, ausencia de GPS, encuadre y logout. Capturas y resultado JSON: artifacts/demo/. Se inspeccionaron visualmente dashboard escritorio/móvil y flota móvil. El JSON registra capas externas no verificadas.

Se corrigió un error real de Leaflet: centrar y filtrar de inmediato dejaba una animación de zoom pendiente sobre un mapa desmontado (TypeError _leaflet_pos). Encuadres sin animación y zoomAnimation=false; el recorrido posterior pasó sin errores. La regla flex móvil heredada también alargaba el selector verticalmente; se limita su crecimiento y el recorrido verifica su altura y el overflow.

Durante app:build quedaban 542 MiB libres y los servicios degradaron sus sondas; PostgreSQL respondió 57P03, database system is in recovery mode. Se interrumpió el build y se recuperaron los motores sin borrar datos. Una repetición unitaria excedió su tiempo; el intento con threads terminó con código Windows 3221226505. La repetición final **pnpm test --maxWorkers=1 pasó los 59 casos**, sin ampliar timeouts. Build final nativo y build SPA posterior también pasaron. Reconstrucción Linux completa pendiente cuando haya recursos suficientes; no se sustituyen sus imágenes/SBOM anteriores por una afirmación de build nuevo.

`demo:verify` con DEMO_EMAIL vacío confirmó el fallback y los conteos tras la recuperación. Una URL externa sintética fue rechazada antes de inicializar el contexto, sin incluirla en el error. También se ejecutó seed con NODE_ENV=production y se comprobó su rechazo antes de inicializar el contexto. Formato: el check general advirtió el prompt del usuario; se conservó intacto. `pnpm exec prettier --check . '!docs/prompts/modifiaciones.md'` pasó las fuentes restantes. AGENTS.md y pnpm-lock.yaml permanecieron sin cambios; git diff --check pasó.

## Criterios comprobados

| Criterio del prompt                | Evidencia                                                                                                                                                                         |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Carga inicial                   | API de flota y navegador recuperan posición después de recargar; revisión demo muestra 18 marcadores                                                                              |
| 2. Observación autorizada          | Navegador registra coordenadas, velocidad y rumbo; integración valida permisos y origen manual                                                                                    |
| 3. Actualización sin recarga       | Marcador/detalle cambian por Socket.IO en escritorio y móvil                                                                                                                      |
| 4. Reconexión                      | Navegador corta conexiones WebSocket reales, registra una posición mientras están cerradas y recupera el estado al reconectar                                                     |
| 5. Inválidas, antiguas y repetidas | Validación de rangos/fecha, idempotencia y conflicto por contenido; posición antigua no retrocede el estado; tests de caché con desempate UUID                                    |
| 6. Sin posición/desactualizada     | Seed incluye dos sin GPS y tres antiguas desde el inicio; unidad comprueba límite de cinco minutos; selector/detalle verifican ausencia, antigüedad y centrado deshabilitado      |
| 7. Reinicio API                    | Integración elimina únicamente la caché Redis de su vehículo, reinicia API y recupera posición/histórico desde MongoDB                                                            |
| 8. Coherencia                      | Datos persistidos, transiciones de entrega válidas, movimientos y alertas; resumen ejecutivo coincide con SQL; CSV/PDF/XLSX descargados y leídos en navegador                     |
| 9. Seed repetido                   | Segunda ejecución conserva exactamente registros propios y ajenos; namespace reclamado y bloqueo contra comandos simultáneos                                                      |
| 10. Escritorio/móvil               | Seis casos Chromium con ambos viewports y revisión adicional de nueve páginas por viewport, completada                                                                            |
| 11. Secretos                       | Variables privadas siguen ignoradas; API usa logs estructurados sin cuerpos/headers/tokens; valores privados configurados ausentes en fuentes/bundle revisados y logs del preview |

Los fallos detectados se corrigieron y sus suites se repitieron: metadatos opcionales GPS almacenados como null provocaban conflicto en replay; el DTO ahora omite valores ausentes y la comparación normaliza null/undefined. La clasificación añadida en reportes exigió localizar la fila de fecha por su concepto. La prueba de reconexión cierra todos los sockets del cliente, incluidas conexiones por recarga/StrictMode.

## Archivos y decisiones

- `packages/shared/src/contracts/{operations,dashboard}.ts`, `events/index.ts`: capacidad/asignaciones mínimas, calidad/procedencia GPS y clasificación demo.
- `apps/api/src/fleet/`, `modules/integrations/`, `modules/dashboard/`, `modules/reports/`: ingesta y trazabilidad sin exponer actor interno, resumen derivado y clasificación de exportaciones.
- `apps/api/prisma/schema.prisma` y migración `20261007183000_vehicle_payload_capacity`: campo nullable aditivo.
- `apps/web/src/features/fleet/`, `hooks/use-realtime*`, `lib/query-client.ts`, dashboard y CSS: mapa/detalles/formulario/filtros/recuperación, diseño móvil.
- `apps/api/demo/run.mjs`, scripts raíz y ejemplo de variables: seed identificado, verificación y simulación explícita, prohibidos en producción.
- Tests nuevos de posición/estado/demo, ampliación de navegador y reportes; `apps/api/browser/demo-preview.mjs` para revisión local adicional.
- README, [guía demo](../demo/local-demonstration.md), API y [ADR 009](../architecture/adr-009-demonstration-and-gps-provenance.md).

Se conserva monolito modular, versiones y fuentes de verdad. No hay nuevas dependencias, microservicios, AWS o permisos ampliados. Seed utiliza casos de uso para conservar stock, historial y outbox; no fabrica snapshots. Prefijo LGD-V1- identifica operaciones ficticias y no normaliza los registros legados. Todas las métricas globales incluyen la base completa.

## Límites y niveles de cierre

Preparado: guía, comandos, configuración pública de tiles y adaptador de routing.

Implementado: dataset, simulador explícito, procedencia/calidad, mapa, formulario y recuperación.

Verificado: únicamente los controles ejecutados en el entorno anterior; datos y geometría de pruebas son sintéticos.

Aceptado externamente: ninguno. Pendientes proveedor cartográfico aprobado y capas cargadas realmente, routing vial real, dispositivos GPS físicos, infraestructura aprobada, CI remota, piloto/UAT y aceptación por responsables. No se acreditan latencia contractual <50 ms, SLO 99.9%, TLS o rendimiento de producción. Las suites opcionales de carga sostenida/recuperación no se repitieron en este alcance.

La clasificación demo no convierte coordenadas sintéticas en ubicación física ni una trayectoria en ruta vial. El preview de contenedores usa NODE_ENV=production y rechaza simulación HTTP; el comando opcional debe dirigirse a la API de desarrollo. No hubo despliegues remotos ni transferencias.
