# Contratos del cierre local

Base /api/v1. Todas las operaciones salvo liveness/readiness requieren credenciales de su contrato. No incluyen URLs internas, claves ni stack traces.

| Método | Ruta                                                              | Permiso y límites                                                                                            |
| ------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| GET    | /health/operations                                                | Roles de lectura; sonda funcional de solo lectura y cache 15 s                                               |
| GET    | /reports/dashboard                                                | Lectura; JSON consolidado, 10/min                                                                            |
| GET    | /reports/dashboard.pdf y /reports/dashboard.xlsx                  | Lectura; 5/min, attachment/no-store, 31 días, 1,000 filas por colección, 8 MiB, dos generaciones por proceso |
| GET    | /routing/plans y /routing/incidents                               | Lectura; paginación y filtro vehicleId                                                                       |
| POST   | /routing/plans                                                    | ADMIN, LOGISTICS_ADMIN, FLEET_SUPERVISOR, TRAFFIC_COORDINATOR; 20/min                                        |
| POST   | /routing/incidents/:id/acknowledge                                | Mismos escritores; nota de 3–200 caracteres y expectedLastObservedAt                                         |
| POST   | /integrations/reference/stock y /integrations/reference/stock.csv | ADMIN, LOGISTICS_ADMIN, WAREHOUSE_MANAGER; 10 lotes/min, 1–100 filas                                         |

ExecutiveQuery recibe from/to ISO UTC, ordenados y no futuros, con máximo 31 días; status PENDING/IN_TRANSIT/DELIVERED/CANCELLED y priority NORMAL/HIGH. El periodo filtra creación de envíos; estado y seis métricas globales son al corte. Salud tiene fecha propia fuera de la transacción SQL. PDF/XLSX incluyen comparación diaria de activos y semanal de creación cuando hay datos, o N/D.

Plan incluye requestId UUID estable para replay, vehículo, IDs de varios envíos asignados pendientes/en tránsito, origen/destino, corredor y parámetros de confirmación/parada/calidad, con zonas autorizadas opcionales. Una versión nueva retira la previa y conserva historial. La respuesta permite consultar versión, actor, geometría y parámetros. Un payload distinto con el mismo UUID da 409.

GPS acepta accuracyMeters opcional entre 0 y 10,000 m. MongoDB conserva monitoringPending ante fallo SQL/publicación; un 503 permite reintentar el mismo UUID. Se ignoran para confirmar incidentes observaciones tardías, con tiempo repetido o precisión insuficiente. No se interpreta ausencia de señal como parada.

Eventos tipados nuevos: route.plan.updated y route.incident.updated. Los consumidores recuperan por HTTP al reconectar y toleran UUID repetidos.

Dashboard dailyActiveComparison: metric, basis, timeZone, cortes UTC, valores actual/anterior, diferencia, porcentaje, fechas observadas y razón N/D. La comparación anterior es nula sin histórico homólogo, con DST ambiguo o inexistente; solo el porcentaje es nulo ante base cero. shipmentPeriodComparison conserva los envíos creados entre semanas distintas.

Referencia ERP: [contrato de stock](../integrations/erp-wms-contract.md). Salud: operational, degraded, unavailable, not-configured y unknown con motivo seguro y fecha de sonda. Swagger de desarrollo documenta DTOs; permanece deshabilitado en producción.

## Observaciones GPS y datos de demostración

Position agrega opcionalmente source (manual/device/simulated), speedKph (0..200), headingDegrees (0..359.999) y accuracyMeters (0..10000). POST /fleet/vehicles/:id/positions conserva los roles de escritura. El servidor asigna source=manual y actor interno; simulated=true está reservado a demostración autenticada fuera de producción. POST /integrations/gps/positions sigue exigiendo token privado y scope de vehículos, asigna device y rechaza simulated. Nunca se devuelve actorId GPS ni tokens privados.

Repetir UUID y contenido devuelve la observación existente; cambiar campos opcionales o procedencia/actor de una observación ya identificada devuelve 409. Históricos anteriores sin procedencia permanecen sin identificar y admiten replay compatible, sin inventar origen. Últimas posiciones y eventos conservan los campos públicos.

Vehicle agrega capacityKg opcional y assignedShipments con ID/referencia de envíos PENDING/IN_TRANSIT. Las colecciones tienen telemetryStatus; un detalle no tiene items. DashboardSummary incluye includesDemonstrationData calculado desde registros LGD-V1-. PDF/XLSX comunican esta clasificación sin presentar la demo como operación física.
