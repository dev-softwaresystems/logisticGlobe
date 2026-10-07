# Estado de requisitos de LogisticsGlobe

Actualizado el 2026-10-07. La primera iteración de AGENTS.md y las brechas de software local del prompt de cierre están implementadas. La aceptación externa sigue pendiente; cada requisito y su evidencia están en la [matriz de trazabilidad](requirements/traceability.md).

| Capacidad     | Comportamiento local                                                                                                                           |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard     | Seis KPI desde PostgreSQL; comparación diaria de activos con snapshots observados, zona IANA y N/D; comparación semanal de creación conservada |
| Envíos        | Registro idempotente, filtros, paginación, asignación múltiple por vehículo, tránsito, entrega e historial                                     |
| Flota y rutas | MongoDB histórico GPS, Redis recuperable, Socket.IO, mapa configurable, planes versionados, desvíos/paradas, reconocimiento e historial        |
| Inventario    | Ajustes con control de versión, movimientos y alertas transaccionales; intercambio ERP/WMS de referencia JSON/CSV con resultados por fila      |
| Salud         | Liveness/readiness de los motores y diagnóstico funcional acotado de inventario, GPS, routing e intercambio de referencia                      |
| Reportes      | CSV y reporte consolidado PDF/XLSX, filtros validados, permisos, tipos y descargas físicas                                                     |

Se preservan React/Vite, NestJS modular, Prisma 7, Vitest/Supertest y oxlint de API. TanStack Query conserva el estado del servidor; no se necesita duplicarlo en Zustand. MongoDB es la fuente histórica GPS; SQL mantiene configuración e incidencias, junto con estado derivado mínimo para concurrencia. Véase [ADR 008](architecture/adr-008-integral-local-closure.md).

La instalación congelada, generación Prisma, lint, tipos, 55 pruebas unitarias y build pasan. La [verificación](verification.md) mantiene los resultados de integración, navegador, contenedores, recuperación y paquete, además de fallos corregidos y límites.

| Objetivo                   | Evidencia y límite                                                                                                                                               |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 500 envíos / 100 vehículos | Dos ejecuciones continuas locales de 60 s, GPS cada 5 s y dos API; proveedor vial sintético. El perfil contractual y prueba sostenida de campo quedan pendientes |
| Routing <50 ms             | HTTP miss p95 64.27 ms en la última muestra: objetivo no acreditado. Adaptador y HTTP se miden por separado; no se mide el motor interno real                    |
| 99.9%                      | Diseño SLI y ventana propuesta de 30 días; sin despliegue ni observación productiva                                                                              |
| RTO <2 h / RPO <15 min     | Ensayo aislado con usuarios, stock, GPS e incidencias; recuperación funcional 6.469 s. No acredita PITR ni continuidad productiva                                |
| GPS / ERP del cliente      | Adaptadores configurables y referencia verificable; dispositivos, API, mapeo y autoridad del dato por aprobar                                                    |
| Seguridad / licencias      | Revisión interna, auditoría y SBOM; 5 hallazgos de licencias requieren revisión, sin certificación jurídica u OWASP independiente                                |
| Cloud / CI / aceptación    | Diseño y workflow preparados, sin AWS, ejecución remota, piloto, UAT, firma ni transferencia                                                                     |

Los cargos de aceptación, infraestructura y presupuesto son propuestas indicadas por el usuario, pendientes de confirmación en la [RACI](governance/responsibilities-raci.md). No se han creado módulos ajenos al core, recursos remotos, commits o pushes.
