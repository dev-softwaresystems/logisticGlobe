# Datos y retención — borrador técnico

Fecha: 2026-10-07. Revisión jurídica pendiente. Fuentes oficiales consultadas: [LFPDPPP de la Cámara de Diputados](https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf) y [DOF del 20 de marzo de 2025](https://www.diariooficial.segob.gob.mx/index_100.php?day=20&month=03&year=2025). Jurídico verificará vigencia, aplicabilidad, responsable/encargado, avisos, bases, derechos y transferencias antes del piloto. Este borrador no declara cumplimiento total.

Finalidades propuestas: operación logística, seguridad/acceso, incidencias y reportes. Email, roles y coordenadas vinculadas a dispositivo/vehículo pueden identificar personas. Un UUID no anonimiza. La distribución de responsabilidades entre cliente y Software Systems depende del contrato; CTO custodia técnicamente y Jurídico valida. Proveedores cloud, mapas y GPS solo se incorporan tras aprobación.

| Datos                                    | Acceso                             | Retención propuesta; no activada                          |
| ---------------------------------------- | ---------------------------------- | --------------------------------------------------------- |
| GPS exacto e histórico                   | Roles operativos y operador mínimo | 90 días online; 365 de archivo solo si se justifica       |
| Pedidos, stock, planes e incidencias SQL | Roles funcionales                  | 365 días operativos; plazo legal/contractual por acordar  |
| Metadata/hash refresh                    | Auth y operación restringida       | Vigencia default 7 días; revocados 30 días                |
| Auditoría y recibos                      | ADMIN/auditor                      | 365 días; mantener idempotencia durante ventana de replay |
| Outbox                                   | Operación privada                  | Entregados 7 días; pendientes/DLQ sin purga automática    |
| Snapshots                                | Usuarios operativos                | 90 días por zona; datos agregados sin PII                 |
| Logs y métricas                          | DevSecOps/suplente                 | Logs 30 días; métricas 90; redactar PII                   |
| Backups                                  | Custodios aprobados                | Diarios 30 días y PITR 35; cifrado y acceso auditado      |

No se activan purgas sin política. Para atención de derechos: verificar identidad por canal aprobado, registrar folio y petición con Jurídico, localizar SQL/GPS/export/backups, evaluar conservación legal y plazo vigente, responder y auditar mínimamente. La eliminación en backups requiere retención coordinada; no prometer borrado inmediato de todas las copias.

Capturas y fixtures son sintéticos; PDFs corporativos originales permanecen fuera de Git. Secretos y datos del cliente no entran en reportes de QA o paquete.
