FROM node:24-bookworm-slim AS build
ENV NODE_OPTIONS=--dns-result-order=ipv4first
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@10.24.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/ packages/shared/
RUN --mount=type=cache,id=logistics-pnpm-v10,target=/pnpm/store pnpm install --frozen-lockfile --store-dir /pnpm/store --network-concurrency=4 --fetch-retries=4 --fetch-timeout=120000
COPY . .
ARG VITE_API_URL=/api/v1
ARG VITE_WS_URL=/
ARG VITE_MAP_TILE_URL=
ARG VITE_MAP_ATTRIBUTION=
ENV VITE_API_URL=$VITE_API_URL VITE_WS_URL=$VITE_WS_URL VITE_MAP_TILE_URL=$VITE_MAP_TILE_URL VITE_MAP_ATTRIBUTION=$VITE_MAP_ATTRIBUTION
RUN pnpm --filter @logistics-globe/web build

FROM nginx:1.28-alpine AS runtime
RUN mkdir -p /tmp/nginx /var/cache/nginx && chown -R nginx:nginx /tmp/nginx /var/cache/nginx
COPY infra/docker/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /workspace/apps/web/dist /usr/share/nginx/html
USER nginx
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:8080/web-health || exit 1
CMD ["nginx","-g","daemon off;"]
