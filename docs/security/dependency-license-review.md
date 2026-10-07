# Revisión interna de licencias

Fecha: 2026-10-07. pnpm 10.24.0 licenses list --json y --prod alimentan scripts/license-inventory.mjs. Se genera CycloneDX 1.6, revisión y atribuciones en artifacts/closure/licenses: 789 componentes instalados y 399 de producción, directos/transitivos, versiones del lockfile, scope y hash del lockfile. El inventario npm se obtuvo en Windows; no sustituye el inventario de paquetes del sistema operativo en imágenes Linux.

PDFKit 0.20.2, write-excel-file 4.1.1 y Temporal 0.5.1 declaran MIT. read-excel-file 9.3.10 solo se usa para QA en desarrollo. Producen archivos reales y cortes temporales sin cambiar majors ni introducir jobs o cloud prematuramente. La metadata no es un dictamen legal.

| Hallazgo                                                            | Ámbito                              | Acción propuesta                                                                                |
| ------------------------------------------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------- |
| lightningcss 1.32.0/1.33.0 y sus variantes nativas Windows: MPL-2.0 | Desarrollo; 4 registros             | Jurídico debe revisar obligaciones por archivo, redistribución y cláusula E5                    |
| pause 0.0.1: Unknown                                                | Producción; 1 registro              | Confirmar licencia de la versión fuente y atribución antes de garantía contractual              |
| Node/Debian, Nginx/Alpine, PostgreSQL, MongoDB y Redis              | Imágenes e infraestructura          | Inventariar por digest y revisar términos de cada componente, no una sola licencia por imagen   |
| Lucide y Leaflet                                                    | Frontend                            | Preservar atribuciones del inventario y del proveedor                                           |
| Inter/Segoe UI/Arial/Calibri/Helvetica                              | Familias del sistema y PDF estándar | No se redistribuyen binarios de fuentes personalizadas; revisar términos antes de incorporarlos |
| Tiles, GPS y dataset de rutas                                       | Proveedores externos                | Aprobar licencia, datos, atribuciones y costos; los fixtures locales son sintéticos             |

El paquete incluye SBOM, revisión, atribuciones y checksums. UNLICENSED en el workspace no acredita compatibilidad. La auditoría de seguridad es separada: cero vulnerabilidades conocidas no elimina obligaciones de licencia. Comercial y Jurídico deben resolver copyleft, cesión y alternativa SaaS/licencia exclusiva; el agente no acepta contratos.

Los resultados de imágenes finales y cualquier bloqueo de escaneo se registran en [verificación](../verification.md). El cierre jurídico permanece pendiente.
