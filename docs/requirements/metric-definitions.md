# Métricas y comparación diaria

Zona inicial: America/Mexico_City, configurable con OPERATION_TIME_ZONE. Persistencia UTC; Temporal calcula cortes locales sin usar la zona del host.
Activos = IN_TRANSIT. Pendientes = PENDING + IN_TRANSIT; prioridad alta solo pendientes HIGH. Capacidad = suma de unidades homogéneas / capacidad; null sin capacidad. Flota disponible y mantenimiento usan estados actuales.
El historial previo no acredita cobertura completa desde el inicio: no se reconstruyen activos retrospectivos. Se captura una observación real por minuto/zona, de forma idempotente; un temporizador también captura sin visitas. Comparación: el primer corte observado de ese minuto versus el mismo minuto local del día anterior. El contador principal sigue siendo actual; la comparación identifica explícitamente sus cortes y fechas de observación.
Sin snapshot previo: N/D; base cero: diferencia absoluta y porcentaje N/D. Una hora previa ambigua o inexistente por DST es N/D. No se resta automáticamente 24 horas para representar un día local.
No hay backfill: un minuto sin ejecución queda sin registro. Cambiar la zona inicia una serie independiente; las réplicas mantienen la misma zona. Retención pendiente de política; no hay purgas automáticas.
Los nuevos envíos semanales se conservan como complemento con etiqueta distinta. Stock/flota/capacidad son estados al corte; un filtro de createdAt de reportes limita flujos de envíos, no reconstruye inventario histórico.
