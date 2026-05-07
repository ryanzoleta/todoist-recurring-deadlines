# syntax=docker/dockerfile:1
# Build context must be the repo root so that ../src is reachable.
# In Railway, set the service's Root Directory to "/" and the Dockerfile path to "web/Dockerfile".

FROM oven/bun:1 AS deps
WORKDIR /app/web
COPY web/package.json web/bun.lock ./
RUN bun install --frozen-lockfile

FROM oven/bun:1 AS builder
WORKDIR /app
COPY src ./src
COPY web ./web
COPY --from=deps /app/web/node_modules ./web/node_modules
WORKDIR /app/web
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run build

FROM oven/bun:1 AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/web ./web
COPY --from=builder /app/src ./src
WORKDIR /app/web
EXPOSE 3000
CMD ["bun", "run", "start"]
