# ADR 008 — Cierre local configurable

Fecha: 2026-10-07. Estado: implementado localmente; producción requiere aprobación de CTO y cliente.

Los snapshots de activos son observaciones reales por minuto y zona, con clave única de zona y corte UTC. La consulta del dashboard y un temporizador de 60 s capturan el primer valor observado. La comparación usa el mismo minuto local del día anterior. Los faltantes, ambigüedades DST y porcentajes con base cero muestran N/D. El contador actual puede diferir del snapshot del minuto; la UI identifica ambos cortes. Cambiar la zona inicia una serie independiente.

PDFKit y write-excel-file producen PDF y OOXML con celdas String/Number/Date y sin fórmulas procedentes del usuario. Los reportes reutilizan el summary bajo RepeatableRead. El periodo filtra creación de envíos; stock, flota y capacidad son estados al corte. La salud se sondea fuera de la transacción y lleva fecha propia. Se limitan a 31 días, 1,000 filas por colección, 8 MiB y dos generaciones concurrentes por proceso. Los límites de duración y frecuencia reducen abuso; no prueban un SLA.

PostgreSQL guarda versiones de planes, incidencias, historial y estado derivado acotado: watermark, candidatos y ancla. Redis ofrece una proyección recuperable con TTL de 60 s; MongoDB sigue como única fuente histórica GPS. El estado SQL permite serializar procesadores y registrar outbox atómicamente. No se copia el histórico GPS a SQL. Advisory locks por vehículo, transacciones Serializable y UUID únicos controlan concurrencia. Las posiciones tardías no reescriben historia y los planes retirados no reabren incidentes. La aproximación equirectangular de segmentos requiere validación geodésica adicional para trayectos polares o extensos.

No existe transacción distribuida: MongoDB conserva monitoringPending; después se evalúa SQL de forma idempotente, se publica al menos una vez y se confirma MongoDB. Un fallo tras publicar puede repetir el mismo ID. El cliente invalida queries y recupera el estado por HTTP. Huecos o mala precisión no demuestran una parada.

La referencia ERP JSON/CSV con JWT reutiliza ajustes transaccionales, versiones, movimientos, alertas y recibos idempotentes. LogisticsGlobe mantiene autoridad local hasta una decisión de integración aprobada. La API del cliente, credenciales de máquina, mapeo y conciliación reales quedan pendientes. Se conserva el backend modular y el adaptador EventBus; SQS/SNS y DLQ corresponden a una fase cloud autorizada.

La corrección de concurrencia reconoce tanto P2034 como TransactionWriteConflict del driver Prisma 7, con tres intentos acotados. Los errores de conexión no se reintentan indiscriminadamente. Pruebas reproducen la protección del último ADMIN.
