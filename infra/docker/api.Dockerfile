FROM node:24-bookworm AS build
ENV NODE_OPTIONS=--dns-result-order=ipv4first
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@10.24.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/ packages/shared/
RUN --mount=type=cache,id=logistics-pnpm-v10,target=/pnpm/store pnpm install --frozen-lockfile --store-dir /pnpm/store --network-concurrency=4 --fetch-retries=4 --fetch-timeout=120000
COPY . .
RUN DATABASE_URL=postgresql://localhost/build pnpm db:generate && pnpm --filter @logistics-globe/api build
RUN --mount=type=cache,id=logistics-pnpm-v10,target=/pnpm/store pnpm --store-dir /pnpm/store --offline --filter @logistics-globe/api deploy --prod /out/api

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /out/api/ ./
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/api/v1/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node","dist/main.js"]
