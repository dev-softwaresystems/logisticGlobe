# Backlog y cronograma derivado

Propuesta v1, 2026-10-07. E3 página 9 plantea cuatro sprints de 2 semanas / 8 semanas; código previo existe. No inferir reuniones realizadas ni activar fechas.

| Historia | Como… quiero… para…                                       | IDs/criterio          | Estado y dependencia                     | Hito / responsable propuesto |
| -------- | --------------------------------------------------------- | --------------------- | ---------------------------------------- | ---------------------------- |
| H01      | Coordinador: dashboard seguro móvil para priorizar        | LG01/02/15/19, CAauth | Base previa verificada/UI ampliada       | A/Ingeniería                 |
| H02      | Supervisor: comparar activos ayer para detectar variación | LG03/04, CA-DAILY     | Implementado, pruebas locales            | A/PO                         |
| H03      | Director: descargar métricas para revisar                 | LG13/14, CA-EXPORT    | Implementado/verificación                | A/QA                         |
| H04      | Flota: planificar y reconocer desvíos para actuar         | LG07/08, CA-ROUTE     | Software local, proveedor pendiente      | A/B/CTO                      |
| H05      | Almacén: intercambiar stock para conciliar                | LG10, CA-ERP          | Referencia, ERP del cliente pendiente    | B/CTO-cliente                |
| H06      | Operador: ver salud para escalar                          | LG12/22, CA-HEALTH    | Implementado, collector pendiente        | A/C/DevSecOps                |
| H07      | CTO: medir 500/100 para dimensionar                       | LG16/17/34, CA-LOAD   | Harness, perfil real pendiente           | B/CTO                        |
| H08      | Operador: recuperar funciones para continuidad            | LG24, CA-RECOVERY     | Ensayo local, PITR productivo pendiente  | C/DevSecOps                  |
| H09      | Comercial: paquete seguro para transferir                 | LG25–28, CA-PACKAGE   | Automatización; canal y clave pendientes | D/CTO                        |
| H10      | Director Operaciones: validar piloto para aceptar         | LG29/30, CA-EXTERNAL  | Plan, dispositivos/usuarios pendiente    | B/D/Cliente                  |
| H11      | CTO/TI: operar SLO aprobado                               | LG18/21               | Diseño, región/presupuesto pendiente     | C/CTO                        |
| H12      | PM: controlar cambios/relevo para reducir riesgo          | LG31–33/36            | Material, firmas/otra persona pendiente  | A/C/COO-CTO                  |

A (Sprint 1): revisión/cierre local; B (Sprint 2): compatibilidad/campo/perfil/PoC; C (Sprint 3): operación autorizada/PITR/observabilidad; D (Sprint 4): UAT/subsanación/paquete/acta. Replanificar desde aprobación real; contrato de 30 días no sustituido por 8 semanas. H04 → GPS y motor;H05 → mapeo/autoridad;H07 → perfil/proveedor;H08 → PITR y almacenamiento;H10 → H04/05;H11 → presupuesto;H09 → licencias/destinatario. DoR/DoD y WIP en change-control.
