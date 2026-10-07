# Piloto propuesto — pendiente de acuerdo

E5 página 2 propone 14–30 días y 10–15 vehículos. Se prepara una propuesta de 21 días con 12 vehículos, sin fechas activadas. Su objetivo es validar compatibilidad y adopción de las seis capacidades; no calcular ROI sin datos.

El Director de Operaciones del cliente es autoridad propuesta, con logística, flota y almacén ejecutando pruebas. Comercial coordina; CTO/TI revisa infraestructura y datos; Director General/comité con Finanzas aprueba gasto de Software Systems. El cliente aprueba sus propios gastos. Los cargos aún no han confirmado.

Entrada: línea base, proveedores GPS/mapas/ERP, dataset y tratamiento de datos aprobados; entorno TLS y backup; roles mínimos, capacitación, soporte y perfil de rendimiento/recuperación. IDs de dispositivos y matrículas reales se mantienen fuera de Git.

Calendario propuesto: D0 compatibilidad y línea base; D1–2 capacitación; D3–9 operación observada; **D10 revisión de compatibilidad/adopción y decisión continuar, detener o corregir**; D11–20 fallos y UAT; D21 informe. Extender hasta 30 días o añadir 14 días de PoC requiere acuerdo escrito.

Línea base N/D hasta medir: minutos por registro, ajuste y consulta; alertas verdaderas/falsas y omisiones validadas manualmente; GPS válidos frente a esperados bajo cobertura acordada; retraso UTC; tareas completadas frente a intentadas. Criterios propuestos, no aceptados: todos los casos P0/P1 aprobados, continuidad GPS ≥99%, exactitud de alertas ≥95% y tareas sin error ≥95%. Routing y SLO requieren sus propias ventanas.

Capacitación: lectores 30 min sobre KPI/export/N/D; tráfico 60 min sobre ciclo; flota 60 min sobre GPS/planes/incidencias; almacén 60 min sobre versiones/importaciones/alertas; administración y operación 90 min sobre roles/revocación/proveedores/recuperación. Asistencia y evaluación requieren actas reales.

Registrar diariamente fecha UTC, caso, rol, datos anonimizados, esperado, observado, severidad, responsable y decisión. P1 escala a CTO/PM; comité si afecta gasto o alcance. El informe final compara denominadores iguales y documenta límites. No se inventan ahorro de combustible, satisfacción o aceptación.
