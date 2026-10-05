# ADR 005 — Calidad y sesiones

Estado: aceptado.

Se preserva Vitest con Supertest y oxlint en el backend: ya compilaban y pasaban las pruebas originales. Sustituirlos por Jest/ESLint añadiría un cambio de tooling sin beneficio al slice.
El frontend conserva ESLint y añade Vitest/Testing Library. Ambos usan TypeScript strict; oxlint prohíbe any.
Se reemplaza vite-tsconfig-paths por resolve.tsconfigPaths nativo, eliminando el peer conflict con TypeScript 6.

JWT HS256 utiliza secretos independientes, issuer y audience explícitos y access de máximo 15 minutos.
El refresh usa cookie HttpOnly, SameSite=Strict, Secure en producción, comprobación de Origin y hash SHA-256 en PostgreSQL.
La rotación es una actualización condicional atómica: un refresh anterior no puede renovarse dos veces.
El access incluye el identificador de sesión y se comprueba contra persistencia; logout revoca acceso inmediatamente.
La API resuelve permisos actuales desde el usuario activo. No se expone passwordHash, refresh token ni conexión de base.
Rate limiting in-process basta para un proceso local; necesita estado compartido antes de escalar a múltiples réplicas.

Se aplican overrides transitivos acotados a @prisma/config>deepmerge-ts 8 y prisma>mysql2 3.23.1 por GHSA-ggr8-5vv4-36mx, GHSA-3f6p-5ww8-9rcr y GHSA-rgwj-5xj2-c3m3.
Se preserva Prisma major 7; la verificación debe cubrir generación, validación, migración y consulta después de los overrides.
Referencias: https://github.com/advisories/GHSA-ggr8-5vv4-36mx y https://github.com/advisories/GHSA-rgwj-5xj2-c3m3.
