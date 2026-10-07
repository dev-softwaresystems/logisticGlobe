# Validación de GPS, mapas y rutas

Los proveedores y dispositivos no están aprobados. Las integraciones son configurables; sin parámetros muestran estado seguro no configurado. El servidor compatible OSRM de pruebas usa geometría sintética sin dataset vial.

GPS normalizado: UUID estable por observación, dispositivo mapeado a vehículo, latitude/longitude, observedAt UTC y accuracyMeters opcional. receivedAt lo establece el servidor. Token backend separado con scope GPS_ALLOWED_VEHICLE_IDS. Rotar/revocar configuración, reiniciar y probar que el token anterior recibe 401. El forwarder NDJSON conserva UUID en reintentos.

Frecuencia propuesta: 5 s por dispositivo; 100 vehículos equivalen a 20 observaciones/s. Confirmar cobertura, retraso y cuota. El traductor tiene timeout 5 s y tres reintentos. Las observaciones tardías permanecen en histórico y no retroceden la última posición. Si falta precisión se admite como supuesto; accuracy por encima del límite no confirma incidencias.

Routing usa ROUTING_URL del operador; bloquea redirects y URLs del usuario, limita a 2 s, 1 MiB y 10,000 puntos. Validar cobertura vial y restricciones del dataset. La sonda HEAD requiere un path aprobado sin costo.

Los tiles públicos necesitan términos y VITE_MAP_ATTRIBUTION; no introducir claves privadas. Registrar licencia, costo, cobertura, cuotas y tratamiento de coordenadas.

Checklist de campo para CTO/cliente: identificar vehículo y dispositivo; verificar ubicación conocida, reloj UTC, precisión, retraso, continuidad, caída/reconexión, replay, UUID duplicado, fuera de scope y cobertura geográfica. Conservar evidencia anonimizada o autorizada. Un fixture no acredita un recorrido físico.

Calibración propuesta: corredor 200 m, confirmación 60 s y tres observaciones; reingreso por debajo de 70% y dos observaciones; parada 300 s en radio 30 m; hueco máximo 120 s; precisión máxima 100 m y zonas autorizadas. PO, flota y usuarios aprueban estos valores tras medir.
