# Demostración profesional local — LogisticsGlobe

Fecha: 7 de octubre de 2026. El prompt recibido está en `docs/prompts/modifiaciones.md` (nombre existente conservado). Esta guía corresponde a sus nueve fases.

## Iniciar

```bash
pnpm install --frozen-lockfile
pnpm setup:local
pnpm infra:up
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm demo:seed
pnpm demo:verify
pnpm dev
```

Los comandos demo requieren conexiones loopback a las bases locales y rechazan conexiones externas antes de escribir. El entorno existente usa PostgreSQL 5433, MongoDB 27017 y Redis 6379. API http://localhost:3000/api/v1, SPA http://localhost:5173. No sobrescribas los archivos privados. En una instalación nueva con 5432 ocupado usa `pnpm setup:local --postgres-port=5433`. Consulta README para credenciales privadas generadas y preview de contenedores.

`demo:seed` compila la API y carga mediante casos de uso de flota, envíos e inventario. Requiere un ADMIN activo existente identificado por DEMO_EMAIL, SEED_ADMIN_EMAIL o admin@logisticsglobe.local. No crea usuarios, cambia claves ni modifica roles. Las variables de entorno privadas ya existentes se leen desde apps/api/.env.local y .env, sin imprimirlas. El usuario puede sobrescribirlas desde su sesión.

## Preview compilado con recursos limitados

La revisión final utiliza los builds nativos en localhost:18080 y API localhost:3000. Los motores Docker permanecen locales; las aplicaciones API/web de las imágenes anteriores se detuvieron sin borrar contenedores, imágenes o volúmenes. La reconstrucción Linux completa se interrumpió cuando la memoria disponible cayó a unos 542 MiB y las sondas se degradaron.

Después de `pnpm build`, se puede reproducir el preview en dos terminales PowerShell:

```powershell
# Terminal API, desde apps/api
$env:NODE_ENV='development'
$env:WEB_ORIGIN='http://localhost:18080'
pnpm start:prod
```

```powershell
# Terminal web, desde la raíz
pnpm --filter @logistics-globe/web exec vite preview --host 127.0.0.1 --port 18080 --strictPort
```

El nombre start:prod indica el ejecutable compilado; NODE_ENV sigue siendo development en este preview. Vite preview no es servidor de producción. Para usar nuevamente el preview Linux, detener ambos procesos nativos y ejecutar app:build/app:up con APP_WEB_PORT=18080 y APP_WEB_ORIGIN=http://localhost:18080 cuando haya recursos suficientes. Las imágenes anteriores no representan los cambios de esta ejecución.

Los procesos ocultos dejados por esta revisión están registrados en artifacts/demo/native-processes.json. Para detener exclusivamente esos procesos, comprobando que el PID no fue reutilizado:

```powershell
Get-Content -Raw artifacts/demo/native-processes.json | ConvertFrom-Json | ForEach-Object {
  $taskPreviewProcess = Get-Process -Id $_.id -ErrorAction SilentlyContinue
  if ($taskPreviewProcess -and $taskPreviewProcess.ProcessName -eq $_.name -and
      $taskPreviewProcess.StartTime.ToUniversalTime().ToString('o') -eq $_.startedAt) {
    Stop-Process -Id $taskPreviewProcess.Id
  }
}
```

## Datos

Namespace reservado `LGD-V1-`, versión 1, región ficticia centro de México: CDMX, Toluca, Querétaro y Puebla. Se guarda una reclamación de namespace en AuditLog; sin esa reclamación, una colisión previa detiene el llenado. Un advisory lock de PostgreSQL impide dos comandos demo simultáneos contra la misma base. Los registros anteriores, incluidos el seed mínimo DEMO- y sus historiales legados, se conservan.

| Colección demo    | Inicialización                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------- |
| Flota             | 20 placas ficticias; ocho en ruta, nueve disponibles, tres en mantenimiento                             |
| Capacidad nominal | 12 unidades de 12,000 kg y ocho de 3,500 kg; no equivale a unidades de almacén                          |
| Envíos            | 80: 32 pendientes, 24 en tránsito, 16 entregados y ocho cancelados; 20 de prioridad alta                |
| Asignaciones      | Tránsito con vehículo; ningún vehículo en mantenimiento asignado al llenar                              |
| Historial         | PENDING → IN_TRANSIT → DELIVERED o PENDING → CANCELLED; fechas realmente registradas durante el llenado |
| Almacenes         | Cuatro de 3,000 unidades homogéneas cada uno                                                            |
| Inventario        | Seis SKU por almacén: 24 artículos, movimientos iniciales y cuatro reposiciones                         |
| Alertas           | Cuatro críticas abiertas y cuatro resueltas por reposición                                              |
| GPS               | 18 vehículos posicionados, dos sin señal; tres observaciones de 20 minutos de antigüedad inicial        |
| Comparación       | No se inventan snapshots ni periodos anteriores; N/D conserva su significado                            |

Coordenadas definidas en el generador, nunca en componentes React. Son ubicaciones simuladas, sin dispositivos o transportistas reales. Cada observación incluye source=simulated. El tiempo inicial procede de la reclamación persistida. Al pasar cinco minutos las posiciones se muestran desactualizadas; repetir el seed no las rejuvenece.

Cada reejecución omite filas existentes y observaciones existentes. No restaura cantidades, estados o posiciones editadas por el usuario. Si una ejecución se interrumpe, la siguiente completa registros faltantes sin reiniciar existentes; un registro cuya transición quedó a medias conserva el estado realmente alcanzado. `demo:verify` detecta incoherencias y nunca las corrige silenciosamente. No borres la reclamación para volver a llenar.

Las métricas globales suman todos los registros de la base, incluidos datos anteriores; no deben compararse exclusivamente con los conteos del namespace. En envíos/flota utiliza búsqueda LGD-V1-. Los nombres/SKU de inventario incluyen DEMO. PDF/XLSX incluyen clasificación cuando hay envíos LGD-V1- en la base; los CSV conservan sus referencias. Usa el mismo periodo/filtro y un corte sin escrituras concurrentes para comparar resultados. No se declara que registros anteriores del usuario hayan sido normalizados.

## Telemetría opcional

Inicia `pnpm dev` en otra terminal. Luego:

```powershell
$env:DEMO_API_URL = 'http://localhost:3000/api/v1'
$env:DEMO_SECONDS = '300'
$env:DEMO_INTERVAL_MS = '5000'
pnpm demo:simulate
```

Ctrl+C detiene el simulador sin borrar histórico; también termina al alcanzar la duración. Valores permitidos: 1–3600 s y 5–60 s entre ciclos. No se activa al arrancar la API ni con el seed. Requiere credenciales privadas DEMO_PASSWORD o SEED_ADMIN_PASSWORD y el mismo email que el llenado. JWT y cookie permanecen en memoria del proceso Node; se rota por refresh y se revoca al terminar. No se comparten con el navegador ni se guardan en archivos.

Máximo seis vehículos demo ON_ROUTE sin plan vigente. Trayectoria explícitamente sintética hacia el este, 30 km/h, región acotada, comenzando desde la última posición durable. No vuelve al inicio al reiniciar, no genera trayectos viales ni llama al proveedor de routing. Antes de cada escritura revisa estado y plan; ante plan vigente excluye el vehículo. No elimina incidentes existentes ni fabrica nuevos planes. Contratos/validación/ingesta HTTP autenticada normales, UUID nuevo por observación y mismo UUID/contenido en reintentos; errores no se ocultan.

Los comandos demo y el indicador simulated por HTTP se rechazan en producción. El preview local construido con NODE_ENV=production puede mostrar las posiciones preparadas y admitir observaciones manuales, pero no ejecutar este simulador. Para movimiento simulado usa la API de desarrollo. No se modifica esa restricción para una presentación.

## Mapa y cartografía

El mensaje “Conecta la telemetría o registra una observación desde la flota” significa que la API no devolvió posiciones para los vehículos visibles. El seed mínimo anterior no guardaba GPS. Es distinto de falta de tiles, permisos o indisponibilidad de MongoDB.

La carga inicial obtiene la última observación desde API, con MongoDB como histórico autoritativo y Redis recuperable. Socket.IO actualiza caché TanStack Query por vehículo, fecha y UUID; no duplica marcadores. Una respuesta HTTP anterior no sustituye un evento más reciente. Una reconexión invalida consultas; polling de 15 s recupera cambios perdidos. Las consultas de detalle y colección se distinguen para procesar eventos. Eventos conservan velocidad, rumbo, precisión y procedencia; el actor interno no sale del documento MongoDB.

Selector accesible, detalle textual, acción de centrar, ajuste de flota visible y filtros de matrícula/estado. El mapa muestra hasta 100 vehículos y avisa cuando hay más; no representa la página actual de la tabla como toda la flota. Un cambio de posición conserva el encuadre manual; “Mostrar flota visible” vuelve a ajustar. Verde hasta cinco minutos, ámbar por encima, ausencia de GPS solo en listado/selector. Antigüedad se actualiza con reloj de interfaz y nunca cambia observedAt.

Configuración pública del navegador, sin claves privadas:

```env
VITE_MAP_TILE_URL=
VITE_MAP_ATTRIBUTION=
VITE_API_URL=http://localhost:3000/api/v1
VITE_WS_URL=http://localhost:3000
```

Solo configura una URL XYZ con {z}/{x}/{y} y atribución de un proveedor aprobado. La atribución se considera configuración confiable del operador. Reinicia Vite o reconstruye el frontend tras cambiarla. No se ha elegido ni aprobado proveedor. Sin configuración se ve un plano local de coordenadas con explicación. Con configuración se distingue carga, tiles recibidos y error de capas; recibir un tile no acredita calidad de toda la cartografía.

Routing usa ROUTING_URL del servidor y los planes versionados existentes. Sin proveedor aprobado sigue deshabilitado y visible. La simulación de este generador no se presenta como carretera. El fixture OSRM de pruebas no acredita geometría vial real.

## Observación manual

1. Inicia sesión como ADMIN, LOGISTICS_ADMIN o FLEET_SUPERVISOR.
2. Flota → Seguimiento de un vehículo existente, o selección en el mapa.
3. Completa latitud −90..90, longitud −180..180 y fecha/hora local real de observación.
4. Opcionales: precisión 0..10,000 m, velocidad 0..200 km/h, rumbo 0..359.999°.
5. “Registrar observación” muestra envío, éxito o error. Reintentar el mismo formulario fallido conserva UUID.
6. La API convierte fechas a UTC y rechaza más de un minuto futuro. Una fecha antigua queda en histórico sin retroceder el marcador. Cambiar contenido con un UUID usado devuelve conflicto.

El origen manual y el actor se asignan en servidor. VIEWER no puede ingerir GPS. La integración máquina sigue limitada por token privado y lista de vehículos autorizados; ese token no entra al frontend.

## Recorrido

Resumen → clasificación demo/métricas/N/D → Flota (buscar LGD-V1-, seleccionar, centrar, antigüedad e histórico) → observación manual → Envíos (filtros, detalle e historial) → Inventario (almacenes, artículos, movimientos) → Alertas (abiertas/resueltas) → Reportes (CSV/PDF/XLSX con periodo) → Sistema (dependencias y salud funcional) → Rutas (estado externo real) → Usuarios (solo ADMIN). Repetir en móvil y usar Tab/Enter para selector y acciones.

## Aceptación y límites

Preparados: comandos reproducibles, configuración pública y procedimientos.
Implementados: namespace/casos de uso, simulación explícita, contrato GPS ampliado, mapa/listado/detalle, antigüedad, formulario y recuperación.
Verificados: resultados de esta ejecución en [verificación de demostración](../testing/demo-verification.md); cada comando informa evidencia real.
Aceptados externamente: ninguno en esta ejecución. Cartografía aprobada/capas externas reales, routing vial real, dispositivos físicos, CI remota, piloto/UAT y producción siguen pendientes. No hubo commit, push, despliegue remoto o transferencia.
