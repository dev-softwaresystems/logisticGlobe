# Control de cambios y trabajo ágil

Solicitud mínima: ID, fecha, solicitante/fuente, requisito, valor verificable, alternativa, alcance incluido/excluido, esfuerzo/costo/plazo y supuestos, riesgos, responsables R/A, decisión/fecha y evidencia. Comercial valida impactos contractuales; comité los extraordinarios.
DEC-LOCAL-01: solicitado por usuario el cierre local del prompt; se autoriza implementar dentro del repo y preservar datos. No autoriza nube, gasto, firmas o transferencias.
Solicitud tipo CHG-____: pendiente evaluación y decisión; nunca «aprobado» por ausencia de respuesta.

Definition of Ready: historia con actor/valor, ejemplos y errores, criterio medible, fuente trazada, autoridad y dependencia conocidas, datos de ensayo permitidos y riesgos identificados.
Definition of Done local: código/contratos/migración/documentación concordantes, revisión de diff, lint/tipos/build/tests relevantes, evidencia fechada, UX desktop/móvil y errores accesibles, ausencia de secretos, decisiones externas explícitas. Done de producción agrega CI remota, imágenes por digest/escaneo, aprobación humana, operación/rollback ensayados y UAT aplicable.

Scrum propuesto: sprints de dos semanas, planning PO/PM, daily 15 minutos, review con evidencia y retrospectiva; no consta que hayan ocurrido. Backlog local importable en requirements/backlog.md.
Kanban soporte propuesto: pendiente→diagnóstico→corrección→QA→liberación; WIP diagnóstico2, corrección2, QA2; un carril urgente P1, sin saltar verificación. Ajustar con capacidad humana real.
QA manual: revisar teclado, labels, contraste, estados vacíos/errores, móvil, archivos y tareas por rol. Automatización no sustituye aceptación cliente.
