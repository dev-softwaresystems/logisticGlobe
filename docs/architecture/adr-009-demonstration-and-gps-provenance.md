# ADR 009 — Flota demostrable y procedencia GPS

Fecha: 2026-10-07. Estado: implementación local; proveedores externos pendientes.

Se conserva el flujo GPS MongoDB → Redis recuperable → reconciliación SQL/eventos. Observaciones opcionalmente incluyen velocidad km/h, rumbo en grados, precisión y source manual/device/simulated. HTTP autenticado asigna actor interno y source manual, o simulated explícito solo fuera de producción. La integración máquina asigna device y no admite la bandera de simulación. Históricos anteriores sin origen siguen identificados como N/D; replay compatible sin alterar su procedencia original. Payloads de eventos mínimos propagan los campos públicos, sin actor.

La última posición se ordena por observedAt/UUID, tanto en persistencia como en eventos y reconciliación de respuestas HTTP. TanStack Query mantiene el único estado del servidor. La selección y encuadre son estado de interfaz. Detalles de flota tienen una forma distinta de las páginas; consumidores comprueban esa forma antes de mapear items. Recuperación HTTP tras conexión y polling cubren eventos perdidos, sin prometer entrega WebSocket durable.

La demo usa namespace LGD-V1- reclamado en AuditLog, lock de sesión PostgreSQL y casos de uso existentes para estados, movimientos, alertas/outbox. No modifica identidades ni registros existentes. La capacidad nominal opcional de vehículos es un entero kg agregado mediante migración aditiva, distinto de capacidad homogénea de almacén. No se sintetizan snapshots históricos. El simulador usa autenticación normal, solo loopback, una trayectoria declarada sintética y vehículos sin plan vigente; reiniciar parte de la última observación, sin reset. Excluir planes evita inventar desvíos/paradas sobre una trayectoria no calculada.

Leaflet/OSRM siguen detrás de adaptadores; no se elige proveedor ni se incorporan secretos/cartografía por defecto. La ausencia de capas es visible y distinta de falta de observaciones. Tiles recibidos/error se observan en interfaz; su verificación externa requiere configuración aprobada.
