# Perfil de carga propuesto — RSG-TEC-02

Usar TEST_DATABASE_URL terminada en _test y tres motores locales. No ejecutar junto con builds ni otras suites. El harness crea 500 envíos IN_TRANSIT, 100 vehículos con planes y GPS continuo; elimina únicamente sus fixtures.

En PowerShell, configurar las URLs de prueba sin imprimir credenciales:

```powershell
$env:CLOSURE_LOAD='true'
$env:LOAD_SECONDS='180'
$env:LOAD_WARMUP_SECONDS='15'
$env:LOAD_GPS_MS='5000'
$env:LOAD_USERS='5'
$env:LOAD_REPLICAS='1'
pnpm test:capacity
```

Rangos: duración 30–3,600 s; calentamiento 0–120 s; GPS cada 2–60 s; usuarios 1–10 y réplicas 1–2. Las réplicas comparten proceso y máquina. Cinco lectores con una identidad/origen consultan cada 3 s; mezcla de 25% dashboard, flota de 100, inventario y routing. GPS de 100 vehículos cada 5 s, concurrencia 10. No se desactivan guards ni rate limits: 429 se registra.

La geometría y el proveedor compatible OSRM son sintéticos, sin dataset vial. Se ejercitan replay, posiciones tardías 30 s cada siete ciclos, 503 del proveedor, fallo SQL posterior a MongoDB, reintento y reconexión Socket.IO con recuperación HTTP.

La duración HTTP incluye fetch y lectura de body. La del adaptador incluye Redis, proveedor y escritura de cache; se separan hit/miss y errores. No se mide el motor interno. El informe registra CPU, RSS, hardware y métricas Prometheus; pools y CPU de bases quedan N/D si no están instrumentados.

Resultados: artifacts/closure/sustained-load.json y sustained-metrics.prom. Los criterios locales son recuperación HTTP, idempotencia, cero pendientes propios al finalizar e informe honesto. La muestra de 60 s no equivale a un soak productivo. CTO y cliente deben aprobar operación, dataset, mezcla y ventana para <50 ms. Los 45 ms de E3 requieren decisión separada.
