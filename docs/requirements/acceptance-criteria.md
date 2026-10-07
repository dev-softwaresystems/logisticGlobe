# Criterios de aceptación

2026-10-07, v1. Todo cierre externo necesita acta humana; los comandos locales solo acreditan ese entorno.

| Criterio            | Dado / cuando / entonces                                                                                                             | Evidencia                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| CA-DAILY/LG03       | Mismo minuto local dos días; snapshot observado, UTC y zona; faltante/DST N/D; base cero no divide                                   | daily-comparison.spec, closure.e2e, dashboard       |
| CA-EXPORT/LG13      | Lector descarga PDF/XLSX reales con seis KPI, fechas/números tipados, vacío correcto, sin fórmula ejecutable                         | closure.e2e/browser, renderPDF                      |
| CA-ROUTE/LG07–08    | Escritor asigna envíos activos; replay igual único/distinto409; dos procesadores abren un incidente; histéresis/cambio plan/historia | monitoring-domain.spec, closure.e2e                 |
| CA-ERP/LG10         | Lote válido/desconocido/stale/replay: outcomes por fila, CAS y alerta/movimiento/receipt atómicos                                    | stock-csv.spec, closure.e2e; acta cliente pendiente |
| CA-HEALTH/LG12      | Config vacía desconocida/no configurada; timeout seguro, inventario consultado, caché de 15 s solo lectura                           | unit/closure.e2e                                    |
| CA-LOAD/LG16–17     | 500/100 continuo, mezcla y duración explícitas, hit/miss/HTTP/adapter por separado, fallos y reconexión                              | sustained-load/report                               |
| CA-RECOVERY/LG24    | Datos representativos a base nueva; login/stock/envío/GPS/incidente/Redis; tiempos y watermarks medidos                              | recovery-drill/report                               |
| CA-PACKAGE/LG25–26  | Allowlist excluye secretos/originales/backups/builds; hashes verificables y extracción limpia frozen                                 | release scripts/evidence                            |
| CA-EXTERNAL/LG29–30 | Proveedores/datos/personas/infra aprobados, piloto/UAT reales, actas, SLI/PITR del entorno                                           | pendientes externos                                 |

Puerta local: instalación congelada/generate/lint/typecheck/unit/integración/browser/build/formato/Compose. Puerta release: revisión independiente, QA manual, licencias/seguridad, backup, rollback, cargos y firmas. Falla corregida se conserva en verification; no timeout oculto.
