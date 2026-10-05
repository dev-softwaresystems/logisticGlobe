# ADR 002 — API modular primero

Estado: aceptado.

Se preservan los módulos NestJS existentes en sus rutas y se añaden dashboard, system-health y alerts en src/modules.
Dashboard separa presentación, aplicación, regla de capacidad y repositorio Prisma. Los controllers delegan las reglas.
Services documenta la extracción futura; AWS, routing y cuatro procesos independientes no son necesarios para el primer slice.
No se añaden endpoints CRUD sin una interfaz consumidora en esta iteración.
El ObserveModule generado con credenciales de ejemplo se sustituye por logging JSON local, sin conectar a un SaaS con claves ficticias.
