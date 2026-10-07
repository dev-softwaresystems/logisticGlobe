# Modelo técnico parametrizado — 2026-10-07

No es cotización ni presupuesto aprobado. Finanzas y Director General/comité propuestos revisan costos; CTO y TI del cliente revisan infraestructura. El cliente autoriza sus propios gastos. Región, moneda, tipo de cambio, impuestos, proveedores y retención están pendientes. Se propone 730 horas/mes como hipótesis de cálculo.

| Rubro              | Dimensión                                    | Fórmula mensual con tarifas pendientes                                      |
| ------------------ | -------------------------------------------- | --------------------------------------------------------------------------- |
| ECS API            | Dos réplicas; vCPU/GiB según perfil          | Réplicas × horas × (vCPU × tarifa/h + GiB × tarifa/h)                       |
| Balanceador/CDN    | Unidades, GB y requests                      | Horas + unidades + tráfico × tarifa                                         |
| RDS Multi-AZ/PITR  | Clase, GB, I/O y backup de 35 días           | Cómputo + almacenamiento + I/O + backup                                     |
| Redis TLS          | Dos nodos según presupuesto                  | Horas de nodo + transferencia                                               |
| MongoDB aprobado   | Réplicas, almacenamiento y PITR              | Cómputo + almacenamiento + backup                                           |
| SQS/SNS/DLQ        | Eventos necesarios                           | Requests × tarifa + transferencia; no imponer mensajería durable a cada GPS |
| NAT/egress         | Horas y GB                                   | Gateway + GB procesados + salida                                            |
| Observabilidad     | GB logs/día, retención y métricas            | Ingesta + almacenamiento + consultas + alarmas                              |
| Backup/KMS/Secrets | GB, requests y secretos                      | Almacenamiento + cifrado + custodia                                         |
| GPS/mapas/routing  | 12 vehículos de piloto; 100 objetivo; cuotas | Dispositivo + plan + excedentes                                             |
| Hardware/SIM       | 12 o 100 dispositivos                        | CapEx unitario + datos mensuales                                            |
| Licencias/soporte  | Formación, operación y guardia               | Horas × tarifa + licencias                                                  |

Tarifas actuales: N/D. Cotizar en fuentes oficiales tras aprobar región/perfil; registrar fecha, moneda, impuestos y vigencia. No se consultaron ni inventaron precios actuales. Separar CapEx único, OpEx mensual, costo incremental de LogisticsGlobe y costo asumido por el cliente. Total anual = CapEx + 12 × OpEx, ajustado a calendario y supuestos.

Referencia **corporativa** E4: CapEx 812,627.85 MXN; OpEx mensual 770,199.00 MXN; primer año 10,055,015.85 MXN. No son costos cloud atribuibles automáticamente a LogisticsGlobe. El Canvas de E5 con 1.85 millones y el borrador de contrato de 3.5 millones más IVA requieren conciliación Comercial/Finanzas.

E6: 142,000 MXN de costos esperados; escenario de costos iniciales 260,000; ingreso en riesgo esperado 175,000, que no es reserva. Referencia de 20,000 mensuales sin suficiencia demostrada. Analizar sensibilidad de una/dos réplicas, GPS cada 5/15 s, retención y tráfico. No hay ROI, VAN o ahorro validado.
