Actúa como Senior Full Stack Engineer y especialista en sistemas logísticos. Trabaja en el repositorio actual de LogisticsGlobe y respeta todas las instrucciones aplicables de AGENTS.md.

Necesito preparar el sistema para una entrega profesional: que el mapa funcione, muestre los vehículos de la flota y sus posiciones, y que las pantallas existentes tengan datos coherentes, útiles y representativos de una operación logística.

No te limites a proponer cambios: inspecciona, implementa, verifica y documenta el resultado.

## 1. Inspección y conservación del proyecto

Antes de modificar archivos:

- Ejecuta git status.
- Lee AGENTS.md, README.md, los manifests y la documentación de arquitectura y verificación.
- Inspecciona el mapa, la gestión de flota, la ingesta de GPS, los eventos Socket.IO, la persistencia de telemetría y los seeds existentes.
- Identifica por qué aparece el mensaje “Conecta la telemetría o registra una observación desde la flota”.
- Comprueba si faltan posiciones, configuración cartográfica, permisos, conexión a la API o suscripción a eventos.
- Reutiliza las implementaciones funcionales existentes.
- Conserva registros, credenciales, variables de entorno y cambios del usuario.
- No recrees aplicaciones, cambies versiones mayores ni introduzcas otro stack.

Presenta un resumen breve del diagnóstico y continúa con el trabajo seguro.

## 2. Mapa de flota funcional

Implementa o completa el flujo:

Observación GPS → validación e ingesta → persistencia correspondiente → actualización de última posición → API/eventos → mapa.

El resultado debe cumplir lo siguiente:

- Mostrar los vehículos que tengan una posición válida.
- Recuperar las posiciones iniciales al abrir la pantalla.
- Recibir actualizaciones de posición mediante los eventos existentes.
- Recuperar el estado después de una desconexión o reconexión.
- Evitar marcadores duplicados, saltos por eventos antiguos y pérdida de información al recargar.
- Conservar el histórico GPS en MongoDB según la arquitectura existente.
- Mantener Redis como estado recuperable, sin convertirlo en la única fuente de verdad.
- Utilizar contratos y payloads tipados.
- Respetar autenticación, RBAC y permisos de ingesta.

Cada marcador debe permitir consultar, cuando exista información:

- Identificador y placa.
- Estado operativo.
- Fecha y hora de la última observación.
- Antigüedad de la posición.
- Velocidad y rumbo, si la observación los incluye.
- Envíos o plan de ruta asignados.

Distingue claramente entre posición reciente, desactualizada y ausencia de telemetría. No presentes una posición antigua como ubicación actual.

Agrega, si corresponde con la interfaz existente:

- Selección sincronizada entre listado y marcador.
- Acción para centrar un vehículo.
- Ajuste de vista para mostrar la flota visible.
- Filtros por estado o vehículo.
- Leyenda comprensible.
- Controles utilizables en móvil y mediante teclado.

No inventes coordenadas dentro de componentes React ni mantengas una segunda copia innecesaria del estado del servidor.

## 3. Cartografía y rutas

Conserva la abstracción y configuración del proveedor existentes.

- Utiliza un proveedor cartográfico aprobado y correctamente configurado.
- Respeta atribución, términos de uso y restricciones del proveedor.
- No incrustes claves ni secretos.
- Documenta qué configuración pública necesita el navegador.
- Si falta configuración externa, muestra un estado explicativo y documenta el pendiente.
- No declares el mapa completamente verificado si las capas cartográficas no cargaron realmente.

Para las rutas:

- Reutiliza los planes versionados y el adaptador de routing existentes.
- Muestra geometría vial obtenida del proveedor cuando esté disponible.
- No presentes una línea recta, fixture o trayectoria sintética como una ruta calculada sobre caminos reales.
- Conserva las reglas existentes de vigencia, calidad GPS, desvíos, paradas e historial.
- No generes incidentes falsos por reiniciar una simulación o reproducir eventos antiguos.

## 4. Registrar una observación desde la flota

Completa una acción accesible y funcional para registrar una observación GPS manual, si no existe o está incompleta.

Debe:

- Estar limitada a los roles autorizados.
- Seleccionar un vehículo existente.
- Validar coordenadas, fecha/hora y campos opcionales.
- Explicar qué significa registrar una observación manual.
- Mostrar estados de envío, éxito y error.
- Actualizar el mapa mediante el flujo normal de la aplicación.
- Conservar trazabilidad del origen de la observación según el contrato existente.

No introduzcas tokens privados de ingesta en el frontend ni amplíes permisos para facilitar la demostración.

## 5. Datos profesionales y coherentes

Prepara un conjunto reproducible de datos de demostración para desarrollo o una presentación autorizada.

Los datos deben parecer una operación logística profesional, pero estar identificados como demostración. No los presentes como clientes, transportistas, dispositivos ni operaciones reales.

Reutiliza o amplía los mecanismos existentes de seed y casos de uso. El llenado debe ser:

- Idempotente.
- No destructivo.
- Separado de los registros del usuario.
- Identificable mediante un namespace o mecanismo equivalente.
- Reproducible y documentado.
- Deshabilitado por defecto en producción.

Como referencia, utiliza un volumen manejable: entre 15 y 30 vehículos, 60 y 120 envíos, 3 a 5 almacenes y un catálogo suficiente para mostrar inventario y alertas. Ajusta estas cantidades si existe una razón técnica.

Incluye:

### Flota

Vehículos disponibles, en ruta y en mantenimiento; placas y capacidades ficticias coherentes; asignaciones compatibles con su estado; posiciones válidas dentro de una región operativa definida.

### Envíos

Referencias profesionales, orígenes y destinos consistentes, prioridades variadas, fechas compatibles, estados e historiales válidos y asignaciones coherentes.

No marques un envío como entregado sin una secuencia válida ni asignes una ruta operativa a un vehículo en mantenimiento.

### Almacenes e inventario

Almacenes con capacidad definida, artículos con SKU, existencias y umbrales coherentes; movimientos trazables y escenarios normales, críticos y resueltos.

Utiliza los casos de uso existentes cuando sea necesario para preservar movimientos, alertas, control de concurrencia y outbox. Evita insertar estados derivados que contradigan las reglas del sistema.

### Dashboard y reportes

Los indicadores deben resultar de los registros persistidos. Las tablas, tarjetas, filtros y exportaciones deben coincidir para el mismo periodo y corte.

No fabriques comparativas históricas. Si faltan snapshots realmente observados o una base válida, conserva N/D y explica su significado.

No modifiques contraseñas ni permisos de usuarios existentes para llenar pantallas.

## 6. Demostración de telemetría

Si no hay dispositivos físicos conectados, prepara un simulador opcional para el entorno local.

El simulador debe:

- Activarse explícitamente mediante un comando documentado.
- Utilizar los contratos y la ingesta existentes.
- Identificar las observaciones como simuladas.
- Mover un subconjunto de vehículos con intervalos y velocidades plausibles.
- Respetar timestamps, orden, idempotencia y controles de calidad.
- Poder detenerse sin borrar el histórico.
- Mantener sus credenciales fuera del navegador y del repositorio.
- Evitar llamadas excesivas o facturables al proveedor de rutas.

Cuando exista geometría vial configurada, puede utilizarla para la trayectoria. Si utiliza un fixture, debe declararlo expresamente.

No actives simuladores automáticamente en producción ni los confundas con integración GPS real.

## 7. Presentación profesional del sistema

Revisa todas las pantallas y flujos implementados dentro del alcance actual.

Corrige:

- Textos provisionales o poco claros.
- Botones que aparentan funcionar pero no ejecutan una acción.
- Tablas, filtros y detalles inconsistentes.
- Estados de carga, error, vacío y datos desactualizados.
- Desbordamientos y problemas de navegación en móvil.
- Formatos de fechas, unidades y etiquetas.
- Problemas de contraste, labels, foco y navegación por teclado.
- Mensajes técnicos internos expuestos al usuario.

Mantén un diseño empresarial consistente con el sistema existente.

Las funciones que dependan de proveedores o acuerdos externos deben mostrar su estado real y una explicación útil. No simules disponibilidad para mejorar la apariencia.

No agregues facturación, RRHH, IA ni módulos ajenos al alcance aprobado.

## 8. Verificación

Ejecuta los comandos disponibles y pertinentes de lint, typecheck, pruebas y build. Realiza verificaciones de integración y navegador sobre infraestructura local cuando esté disponible.

Comprueba especialmente:

1. Carga inicial de vehículos y posiciones.
2. Registro autorizado de una observación.
3. Actualización del marcador sin recargar.
4. Reconexión y recuperación del estado.
5. Rechazo o tratamiento correcto de observaciones inválidas, antiguas o repetidas.
6. Presentación de vehículos sin posición o con telemetría desactualizada.
7. Persistencia después de reiniciar la API.
8. Coherencia entre dashboard, inventario, envíos y reportes.
9. Reejecución del seed sin duplicar ni alterar datos ajenos.
10. Funcionamiento en escritorio y móvil.
11. Ausencia de secretos en código, logs y bundles del frontend.

Añade pruebas significativas cuando cubran reglas o fallos que no estén protegidos actualmente.

No afirmes que un flujo está verificado si no lo ejecutaste. Las pruebas con datos sintéticos no acreditan integración física, rendimiento contractual ni disponibilidad de producción.

## 9. Documentación y entrega

Actualiza la documentación necesaria e incluye una guía breve con:

- Comandos para iniciar el entorno.
- Comando de llenado de demostración.
- Comando para iniciar y detener la telemetría simulada.
- Configuración cartográfica y de routing.
- Procedimiento para registrar una observación manual.
- Recorrido de demostración por los flujos principales.
- Limitaciones y dependencias externas pendientes.

Al finalizar, informa:

- Causa del problema del mapa y solución implementada.
- Archivos creados y modificados.
- Datos preparados y cómo reproducirlos.
- Comandos ejecutados y resultados.
- Flujos comprobados en navegador.
- Verificaciones que no pudieron ejecutarse y su causa.
- Pendientes para integrar proveedores y dispositivos reales.

Distingue entre preparado, implementado, verificado en el entorno descrito y aceptado externamente.

No hagas commit, push, despliegues ni transferencias automáticas.

## Criterio final

La entrega local debe permitir iniciar LogisticsGlobe, acceder con un usuario autorizado, recorrer sus pantallas con datos coherentes, visualizar la flota con posiciones válidas, registrar o recibir observaciones y comprobar las actualizaciones del mapa.

Debe poder demostrarse profesionalmente, con trazabilidad y sin aparentar capacidades que todavía no estén implementadas o verificadas.