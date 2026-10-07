# Evaluación interna de amenazas v1

Fecha: 2026-10-07. Es revisión técnica interna, sin auditoría independiente o certificación ISO. Fronteras: navegador/API JWT-cookie; API/SQL-MongoDB-Redis; dispositivo GPS/token; configuración/proveedor; archivos/importaciones/reportes; outbox/Redis/Socket.IO. Activos: usuarios, sesiones, stock, envíos, GPS, auditoría, código y backups.

| Amenaza                                     | Control implementado                                                                      | Riesgo residual / validación                             |
| ------------------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Suplantación y sesión                       | bcrypt, JWT corto, refresh hash revocable, RBAC backend                                   | TLS, cookies Secure y rotación del entorno               |
| GPS falso o replay                          | Token separado, scope, UUID, coordenadas/tiempos/calidad validados                        | Identidad física, mapeo y cobertura pendientes           |
| Stock alterado o desorden                   | CAS, versión externa, recibo, movimiento/alerta/outbox atómicos; lote de 100              | Autoridad WMS y scope de máquina por aprobar             |
| SSRF o abuso del proveedor                  | URL backend, HTTPS productivo, redirects bloqueados, timeout 2 s, 1 MiB y 10,000 puntos   | Egress y allowlist DNS del entorno                       |
| Inyección de fórmula / abuso de exportación | Strings tipados, CSV escapado, 31 días, 1,000 filas, 8 MiB, dos generaciones y rate limit | Revisión con Office y dataset de tamaño aprobado         |
| Socket revocado / difusión indebida         | Revalidación de autorización, roles, origen, límite 16 KiB y adaptador Redis              | TLS y cuotas de conexiones productivas                   |
| Privilegios SQL excesivos                   | Queries tipadas y roles funcionales                                                       | Separar DDL de migración y DML runtime; pools y TLS      |
| Dependencias o secretos en entrega          | Lockfile congelado, audit, SBOM, allowlist y hashes                                       | Licencias, escaneo de imágenes y revisión humana         |
| Fallo entre MongoDB y SQL                   | Pending durable, reconciliador idempotente y outbox al menos una vez                      | Tardías no rehacen historia; retención por aprobar       |
| Filtración de backup                        | Fuera de Git, checksum y restore aislado                                                  | El checksum no cifra: custodia, KMS y offsite pendientes |
| PII en logs y métricas                      | Errores seguros, request ID y etiquetas acotadas                                          | Revisar logs y retención del entorno con autoridad       |

Antes de producción: HTTPS/WSS, roles SQL mínimos, autenticación/TLS MongoDB y Redis, rotación/gestor de secretos, backup cifrado externo, licencias y escaneo de imágenes, revisión independiente aprobada. TLS más discos cifrados no equivale a cifrado extremo a extremo. SSO/MFA y recuperación de identidad requieren política.

Incidente: CTO aísla y revoca, preserva evidencia mínima; PM coordina por canal autorizado y Jurídico decide notificaciones aplicables. No se envían automáticamente mensajes a terceros.
