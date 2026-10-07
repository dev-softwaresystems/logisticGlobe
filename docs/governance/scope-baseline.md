# Línea base propuesta de alcance v1

Fecha 2026-10-07. Autorización de desarrollo local: solicitud del usuario de ejecutar el prompt de cierre. No equivale a contrato o aceptación del cliente.

Incluye seis capacidades core y sus extensiones: comparación diaria observada; exportación PDF/XLSX/CSV; ruta planificada por vehículo con varios envíos, desvíos/paradas; importación de stock de referencia y frontera ERP/WMS; salud funcional; pruebas y entrega técnica.
Preserva SPA React/Vite, API modular NestJS, persistencia híbrida y contratos independientes de AWS. Los proveedores reales aún no están aprobados.

Excluye billing, nómina, RRHH, CRM, IA/ML, multi-tenant, SSO/MFA sin política, Kubernetes y extracción obligatoria de microservicios.
Local: implementar/verificar software. Integración/piloto: proveedores, dispositivos, ERP y UAT requieren acuerdo. Producción: región, presupuesto, TLS, secretos, retención y despliegue requieren aprobación explícita.

Hitos derivados de E3 p9 (no acredita ceremonias celebradas):

| Hito propuesto                   | Estado de base                                                               |
| -------------------------------- | ---------------------------------------------------------------------------- |
| Fundaciones / datos / auth       | Código local existente; infraestructura remota pendiente                     |
| Dashboard / envíos / inventario  | MVP existente; cierre diario y reportes en esta ejecución                    |
| Telemetría / acciones proactivas | GPS y mapa existentes; planes/incidencias en esta ejecución; campo pendiente |
| Calidad / operación / entrega    | Suites y runbooks existentes, ampliación local; piloto/producción pendientes |

CPO valida alcance; CTO arquitectura; COO/PM cronograma; Comercial condiciones; cliente acepta UAT. Registro de firmas/aceptación: pendiente.
