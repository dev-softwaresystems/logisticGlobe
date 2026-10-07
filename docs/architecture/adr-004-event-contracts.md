# ADR 004 — Contratos de eventos

Estado: aceptado.

packages/shared/src/events define eventos mínimos con ID, nombre, fecha ISO y payload explícito para posiciones de flota, estados de envíos, umbrales y salud.
EventBus es una interfaz independiente de AWS. No se publican entidades internas ni se incluye el SDK AWS.
Existen productores de dominio, outbox SQL con leases y Gateway Socket.IO autenticado /operations. EventBus local/Redis publica al menos una vez; Query recupera por HTTP y evita efectos duplicados. Planes/incidencias de ruta añaden payloads mínimos. SQS/SNS y DLQ quedan para fase productiva aprobada, sin SDK AWS en dominios. Ver ADR007/008.
