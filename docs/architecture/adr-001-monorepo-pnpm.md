# ADR 001 — Monorepo pnpm

Estado: aceptado.

Se conserva pnpm 10.24.0 y los workspaces apps/_, services/_ y packages/*. Los paquetes se llaman @logistics-globe/web, /api y /shared.
Sin Nx ni Turborepo: los scripts recursivos cubren esta fase. Shared exporta contratos solo de tipos, evitando código de servidor en el bundle.
Las majors existentes se mantienen; el lockfile fija las versiones resueltas.
