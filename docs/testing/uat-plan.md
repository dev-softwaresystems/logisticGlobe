# Plan UAT v1 — preparado

El Director de Operaciones del cliente es autoridad propuesta. Ejecutan logística, flota y almacén; los cargos deben confirmar. Ingeniería facilita y aporta evidencia, sin firmar por el comprador.

| Caso / requisitos  | Datos y pasos                                                                              | Resultado esperado                                                      | Severidad / decisor    |
| ------------------ | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- | ---------------------- |
| UAT01 / LG15       | ADMIN y VIEWER; login, refresh, desactivar, logout y escritura                             | Sesión revocable y 401/403 autorizados en backend                       | P1 / CTO y Operaciones |
| UAT02 / LG02–04    | Envíos IN_TRANSIT, stock y capacidad; observar cortes homólogos durante dos días           | Seis KPI SQL, N/D explícito, comparación diaria y semanal diferenciadas | P1 / Logística         |
| UAT03 / LG05       | Referencia única y vehículo; asignar, iniciar, entregar, repetir y editar versión obsoleta | Ciclo, historial e idempotencia; conflicto seguro                       | P1 / Tráfico           |
| UAT04 / LG06       | Dispositivo aprobado con 100 muestras; desconectar y repetir UUID                          | Posición física, reloj, cobertura y recuperación HTTP                   | P1 / Flota             |
| UAT05 / LG07–08    | Corredor, ruido, desvío, parada, zona autorizada, hueco, tardías y nueva versión           | Histéresis, reconocimiento, historial; silencio no es parada            | P1 / Flota             |
| UAT06 / LG09       | Stock 10 y mínimo 10; bajar a 9 y reponer a 12; lector y almacén                           | Alerta única y resolución, movimiento y control de versión              | P1 / Almacén           |
| UAT07 / LG10       | ERP mapeado y CSV conocido/desconocido, replay, obsoleto y fallo parcial                   | Resultado por fila y autoridad de dato sin oscilación                   | P1 / ERP y Almacén     |
| UAT08 / LG11–12    | Fallos de motores, proveedor y GPS; recuperación                                           | Estados seguros con antigüedad; liveness diferenciada                   | P1 / TI                |
| UAT09 / LG13–14    | Lector, vacío, acentos y texto con apariencia de fórmula; PDF/XLSX/CSV                     | MIME, tipos, cortes, paginación y ausencia de fórmula ejecutable        | P2 / Operaciones       |
| UAT10 / LG16–18/24 | Perfil aprobado 500/100; backup, incidente y reapertura                                    | p95 acordado, pérdida medida, RTO <2 h y RPO <15 min                    | P1 / CTO y TI          |
| UAT11 / LG19       | Escritorio 1280 y móvil 390; Tab, Enter, Escape y zoom 200%                                | Labels, foco, error/vacío y ausencia de overflow global                 | P2 / QA y usuarios     |

Cada caso registra build y manifest, entorno, datos autorizados, persona/cargo, UTC, pasos, esperado, observado, evidencia, severidad, responsable de corrección, retest y decisión.

Entrada: alcance, datos, roles y entorno aprobados; build identificado; capacitación; ningún P1 abierto. P1 cubre seguridad, pérdida de datos o bloqueo core; P2 permite alternativa funcional; P3 es estética. Salida: todos los casos P0/P1 aprobados y reservas P2 expresamente aceptadas con plan. La inactividad no es aceptación.

Calendario relativo E5: entrega a firma +30 días naturales; UAT de 20 hábiles desde entrega definida; subsanación de 20 hábiles desde notificación; garantía de 60 naturales desde aceptación. Acordar feriados, avisos y superposiciones. La fecha de un borrador no activa plazos.
