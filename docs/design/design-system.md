# Design System derivado de la aplicación

Fuente: apps/web/src/index.css, App.css y componentes existentes. Aplicación empresarial operativa y responsive; sin rediseño de marketing.

Tokens reales: texto#1b3041, fondo#f4f7f9, secundario#617384, eyebrow#526e81, foco#3188b6. Estados críticos rojos, degradación ámbar y operativo verde siempre acompañados de texto. Focus visible3px y offset4px. QA debe medir contraste por combinación; no se declara certificación WCAG.

Tipografía: Inter instalada→Segoe UI→Arial→sans-serif. Sin fuentes web binarias redistribuidas. PDF usa métricas Helvetica estándar; XLSX indica familia Calibri, sin incluir archivos de fuente. h1 clamp1.6..2rem/line1.2/letterspacing−.04; h2~1.04rem/650; secundario.87rem/line1.65. Viewport mínimo320px; grids/paneles y tablas con scroll interno.

Componentes: AppLayout con navegación semántica y salto al contenido; Panel/KPI/Skeleton/Error/Empty; formulario con labels/fieldset; modal con Escape y retorno del foco; table/thead/caption y paginación; mapa por adaptador con configuración/atribución y alternativa textual. Query gestiona server state, sin copia global adicional.

N/D no es 0; desconocido no es operativo. Mostrar fecha/frescura, DEMO y carga/error/vacío. Error usa role=alert; éxito role=status; controles deshabilitados durante mutación. Movimiento decorativo no necesario; revisar prefers-reduced-motion.

QA: 1280×900 y 390×844, Tab/Enter/Escape, zoom 200%, contraste, estados loading/error/empty/forbidden y ausencia de overflow global. Capturas sintéticas reales en artifacts/next-dashboard-*.png; ../verification.md distingue prueba técnica de UAT.
