# ADR 003 — Persistencia híbrida

Estado: aceptado.

PostgreSQL/Prisma 7 es fuente de verdad de usuarios, sesiones revocables, envíos, vehículos e inventario.
El adaptador PrismaPg mantiene una instancia de cliente con pool limitado y timeouts.
MongoDB se reserva para telemetría y Redis para datos efímeros; sus adaptadores actuales comprueban disponibilidad y cierran conexiones al apagar.
No se copia inventario ni historial GPS entre motores. No hay caché de dashboard todavía.
El dashboard obtiene una lectura RepeatableRead; la capacidad es una razón de sumas, admite sobrecapacidad y retorna null si no existe capacidad.
La unidad de almacenamiento es homogénea y es una simplificación explícita del MVP.
Compose conserva volúmenes y nombres existentes. Los puertos se publican solo en loopback; las credenciales de ejemplo son exclusivamente locales.
