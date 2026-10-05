# Revisión de seguridad de la ampliación

Revisión interna del código y pruebas locales; no equivale a una auditoría independiente.

| Superficie   | Control y evidencia                                                                                                                                                                        |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Sesiones     | Refresh hash en PostgreSQL, rotación y revocación; JWT corto en memoria; cookies HttpOnly/Strict, Secure en producción. E2e de replay, logout y permisos.                                  |
| Usuarios     | ADMIN obligatorio, DTO whitelist, límite UTF-8 de bcrypt, sin hash en select, auditoría mínima y transacciones Serializable para último ADMIN. Conflicto de versión y revocación probados. |
| GPS          | Token distinto de JWT, comparación de hashes de longitud constante, UUID de vehículos autorizados, límites y reintentos acotados, idempotencia en MongoDB.                                 |
| Routing      | Solo origen configurado por operador, sin URLs arbitrarias, redirects bloqueadas, timeout/tamaño máximos y geometría validada. Cache efímera; permisos en servidor.                        |
| Métricas     | Token dedicado, deshabilitadas por defecto; cardinalidad limitada sin URL/PII. Salud sin credenciales.                                                                                     |
| Réplicas     | Redis privado, rate limiting atómico, leasing SQL y revalidación de sockets. Pub/sub pierde mensajes si un consumidor está desconectado: cliente recupera estado HTTP.                     |
| Proxy        | Mismo origen, límites body/timeout, reemplazo de forwarded headers, CSP y encabezados de seguridad. TLS se configura en infraestructura aprobada.                                          |
| Imágenes     | Usuario no root, read-only y capacidades removidas en overlay; secretos excluidos del contexto y paquetes de producción.                                                                   |
| Recuperación | Checksums de backup, restore a nombres exclusivos, fuentes preservadas; cifrado y retención externos pendientes de política.                                                               |

Antes de abrir tráfico real: aprobar TLS, proveedores y tratamiento de GPS; implementar autenticación/TLS de bases y Redis privados; separar privilegios SQL, otorgar ADMIN con revisión; decidir SSO/MFA si la política corporativa lo exige; probar límites bajo carga y revisión independiente OWASP. Los secretos de ejemplo no sirven en producción y no se envían al frontend.

No se implementa multi-tenant ni funciones ajenas al MVP. No se cambia una contraseña existente mediante seed ni se agrega recuperación por email sin un flujo de identidad aprobado.
