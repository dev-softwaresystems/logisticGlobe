# Contrato ERP/WMS v1 — referencia local

Estado: implementado y ensayado localmente. Compatibilidad del cliente pendiente. Fuentes: E3 p10, E5 p1–2, E6 p4–5 y prompt §10. No hay proveedor o endpoint real aprobado.

LogisticsGlobe es la autoridad local del stock. La referencia recibe una intención absoluta de ajuste con control de versión; no declara autoridad del WMS externo. Cambiarla requiere decisión de PO/cliente y política para ajustes locales. No se permite una sincronización bidireccional que oscile.

El artículo debe existir por warehouseCode y sku. La fila contiene quantity, minimumQuantity, expectedUpdatedAt, externalId estable, version creciente y observedAt ISO UTC. No se crean automáticamente clientes, pagos o catálogos desconocidos. Los pedidos reutilizan shipments y su reference idempotente; el mapeo y transporte ERP de pedidos se acuerdan antes de añadir conector.

POST /api/v1/integrations/reference/stock admite records de 1–100. POST /api/v1/integrations/reference/stock.csv recibe JSON {csv}, con hasta 95,000 caracteres y ocho columnas exactas:

```csv
externalId,version,observedAt,warehouseCode,sku,quantity,minimumQuantity,expectedUpdatedAt
```

El operador usa JWT con ADMIN, LOGISTICS_ADMIN o WAREHOUSE_MANAGER; máximo 10 lotes/min. No se reutiliza el token GPS. Un conector automático necesita credencial dedicada, scope de almacenes, rotación y TLS aprobados. No se admiten URLs del usuario o secretos VITE.

Cantidad y mínimo: enteros 0–1,000,000,000. Versión: 1–2,147,483,647. Fechas futuras superiores a 60 s son inválidas. La validación por fila aplica whitelist. SKU/almacén desconocidos no crean entidades. Resultados: accepted, duplicate, conflict o invalid, con recibo o motivo seguro. Un error de infraestructura aborta la petición; las filas ya aceptadas se recuperan mediante replay.

InventoryService.adjustInTransaction registra movimiento, alerta, outbox y recibo atómicamente. Advisory lock por externalId y Serializable controlan réplicas. Repetir (source, externalId, version) idéntico no modifica stock; contenido distinto, versión anterior, fecha obsoleta o cambio de artículo dan conflicto. expectedUpdatedAt protege ajustes locales concurrentes. Validaciones/conflictos no reservan recibo: corregir o conciliar antes de reenviar.

Frecuencia propuesta: lote manual cada 5 min en ventana acordada; no existe scheduler externo activo. Se conservan fuente, actor, versión, hash y resultado mínimo, sin credenciales. Retención por aprobar.

Conciliación: comparar cantidades/versiones, resolver autoridad, recargar versión local y generar una nueva intención justificada. No aumentar versiones para eludir conflicto. Un recibo local no acredita ERP real.

Acta pendiente: ERP/WMS y versión; endpoints/scopes; dataset autorizado; autoridad del dato; pruebas de duplicado, obsoleto, conflicto, fallo parcial, stock y alertas; evidencia; autoridad, resultado y fecha.
