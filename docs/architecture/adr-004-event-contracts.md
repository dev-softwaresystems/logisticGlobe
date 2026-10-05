# ADR 004 — Contratos de eventos

Estado: aceptado.

packages/shared/src/events define eventos mínimos con ID, nombre, fecha ISO y payload explícito para posiciones de flota, estados de envíos, umbrales y salud.
EventBus es una interfaz independiente de AWS. No se publican entidades internas ni se incluye el SDK AWS.
Todavía no existe un productor o gateway en este slice. Un adaptador in-process o SQS/SNS se añadirá cuando exista un flujo consumidor.
