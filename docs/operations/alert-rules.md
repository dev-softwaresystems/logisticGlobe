# Alertas propuestas — sin despliegue

Las etiquetas no contienen IDs, coordenadas, emails ni URLs. El endpoint de métricas está protegido por METRICS_TOKEN.

| Señal / ventana propuesta                              | Severidad                 | Acción y responsable propuesto                                   |
| ------------------------------------------------------ | ------------------------- | ---------------------------------------------------------------- |
| p95 de routing provider >50 ms por 3 min y volumen ≥20 | P2; P1 si bloquea el core | CTO: perfil, dataset, HTTP y cache miss; TEC-02                  |
| Readiness caída en dos sondas de 30 s                  | P1                        | DevSecOps: réplicas y motores                                    |
| Salud funcional de inventario 0 por 60 s               | P1                        | DevSecOps: SQL, módulo y readiness                               |
| GPS desconocido/degradado después de 120 s             | P2                        | Flota: cobertura, token y dispositivo; no inferir parada         |
| Outbox >100 pendientes o edad >60 s por 3 min          | P2                        | DevSecOps: leases y reintentos; conservar pendientes             |
| p95 de procesamiento >5 s por 3 min                    | P2                        | CTO: MongoDB pending y locks SQL; no es latencia del dispositivo |
| Consumo de presupuesto de error según ventana acordada | P1/P2                     | PM/CTO: evaluar pausa de release                                 |
| Hueco PITR ≥15 min o recuperación ≥2 h                 | P1                        | DevSecOps: watermarks y recuperación                             |

PromQL propuesto:

```promql
histogram_quantile(0.95,
  sum(rate(logistics_routing_duration_seconds_bucket{result="provider"}[3m])) by (le)
) > 0.05
```

Evaluación continua, for: 3m y condición de al menos 20 observaciones en la ventana. El histograma interpola; no es el percentil exacto del harness. El compromiso <50 ms requiere acuerdo de métrica y perfil.

P1 escala inmediatamente del operador a CTO/PM; comité si requiere gasto o cambio de alcance. Informar al cliente por canal autorizado. Este documento no configura alarmas ni envía mensajes.
