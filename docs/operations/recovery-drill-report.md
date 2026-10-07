# Recuperación funcional local — 2026-10-07

Ensayo automatizado con CLOSURE_RECOVERY=true. Evidencia: artifacts/closure/recovery-drill.json. Incidente **simulado**: retirar la API de fixtures después de detener escrituras. Se preservaron servicios, bases fuente y volúmenes. Node 24.11.1, Windows y Docker local; revisión 6c34aef con cambios sin commit. No hubo interrupción productiva.

Inicio: 07:56:34.300 UTC. Backup: 07:56:35.485. Funciones restablecidas: 07:56:40.769. El tiempo medido de recuperación fue 6,468.60 ms e incluye dump, restore, arranque, login, readiness y validación de dominio.

Se recuperaron datos propios de prueba: un usuario, un pedido, un artículo, tres observaciones GPS y una incidencia DEVIATION. MongoDB tenía datos. Se verificaron login, readiness, envío IN_TRANSIT, stock 5, historial de la incidencia y última posición. Se eliminó únicamente la clave Redis del vehículo de prueba para comprobar recuperación desde MongoDB; las sesiones SQL se conservaron.

La última observación recuperada fue recibida a las 07:56:34.250 UTC y observada a las 07:56:34.112. El intervalo entre incidente y recepción fue 50 ms; no se perdieron las tres observaciones propias previas. Esto no representa frecuencia garantizada de backup ni RPO de tráfico productivo.

La base nueva lg_1791359795674_66f946e2_restore_test queda disponible para inspección. No se restauró encima de las fuentes ni se eliminaron volúmenes. SQL y MongoDB estaban sin nuevas escrituras; no existe transacción distribuida.

Límites: dataset sintético pequeño; sin transacciones posteriores al corte, PITR continuo, almacenamiento externo cifrado, KMS o failover productivo. Los objetivos RTO <2 h y RPO <15 min requieren diseño, custodia y ensayo del entorno aprobado. Una persona independiente debe ejecutar el procedimiento antes de aceptar el relevo.
