# Resultado de carga local — 2026-10-07

La evidencia se conserva en artifacts/closure/sustained-load.json y sustained-metrics.prom. Revisión 6c34aef3bde6c8d344d437f199edf49944181e0f con cambios locales sin commit. Node 24.11.1, pnpm 10.24.0, Windows 10.0.26200, Intel i3-1005G1 con 4 procesadores lógicos y 12.61 GB RAM. Dos instancias NestJS en un mismo proceso de pruebas y equipo; PostgreSQL 16, MongoDB 7 y Redis 7 en Docker. No es una topología multizona.

Perfil propuesto: 500 envíos IN_TRANSIT y 100 vehículos con planes. GPS cada 5 s, concurrencia 10; cinco workers con la misma identidad/origen consultan cada 3 s, con mezcla de 25% dashboard, flota, inventario y routing. Calentamiento de 10 s y medición de 60 s. OSRM compatible **sintético, sin dataset vial**. Segunda ejecución: 07:59:59–08:01:13 UTC. Es una muestra local corta y continua; no es un ensayo contractual de larga duración.

| Operación                                         | Requests | p50 ms | p95 ms | p99 ms | Errores |
| ------------------------------------------------- | -------- | ------ | ------ | ------ | ------- |
| GPS                                               | 1180     | 163.92 | 268.84 | 371.99 | 0       |
| GPS tardío                                        | 20       | 123.48 | 169.18 | 221.57 | 0       |
| GPS replay                                        | 12       | 48.88  | 108.92 | 108.92 | 0       |
| Dashboard                                         | 25       | 115.49 | 278.26 | 353.91 | 0       |
| Flota de 100 vehículos                            | 25       | 139.88 | 313.09 | 344.91 | 0       |
| Inventario                                        | 25       | 33.72  | 109.95 | 120.06 | 0       |
| Routing HTTP cache hit                            | 11       | 30.25  | 58.04  | 58.04  | 0       |
| Routing HTTP cache miss                           | 7        | 30.10  | 64.27  | 64.27  | 0       |
| Adaptador: cache                                  | 11       | 4.26   | 7.01   | 7.01   | 0       |
| Adaptador: proveedor, incluida escritura de cache | 7        | 9.86   | 12.13  | 12.13  | 0       |

Throughput de 21.83 requests/s; cero timeouts o fallos inesperados. Se inyectaron dos 503 del proveedor y un 503 SQL posterior a MongoDB. El reintento dio 201 y la recuperación HTTP 200. Hubo dos reconexiones; al terminar no quedaron observaciones propias pendientes ni backlog del outbox. Cache hit: 55% de invocaciones, incluidos errores (11/20), o 61.1% de éxitos (11/18).

RSS máximo: 384,049,152 bytes. CPU de proceso: 26,078 ms de usuario y 8,719 ms de sistema durante 74,723 ms, incluido setup y calentamiento. CPU de motores y ocupación de pools: N/D. El retraso de procesamiento está en Prometheus; no es latencia desde el dispositivo físico.

La primera ejecución, 07:50:04–07:51:19 UTC, obtuvo p95 GPS 371.07 ms, flota 867.27 ms, dashboard 376.99 ms y adaptador de proveedor 217.15 ms. Se eliminó una lectura MongoDB de última posición antes de cada escritura GPS; basta validar el vehículo SQL. También se corrigió la clasificación hit/miss HTTP según la respuesta cached. La segunda muestra mejoró, pero el ruido y las muestras difieren: no se acredita una mejora causal aislada.

**El objetivo <50 ms no está acreditado.** HTTP cache miss p95 fue 64.27 ms; los 12.13 ms del adaptador no miden el motor interno. CTO y cliente deben aprobar proveedor, dataset, métrica, volumen y ventana. Los 45 ms documentales siguen como aspiración pendiente de DEC-08.

Próximo ensayo: perfilar transporte, SQL/driver, pools y cola GPS con tracing; usar un dataset vial aprobado, definir mezcla de cache y evaluar CPU/réplicas dentro del presupuesto. Repetir al menos 180 s y después la duración acordada. No cambiar SLA ni fuente de verdad para ajustar el resultado. Reproducción en [plan](load-test-plan.md).
