# OpenClaw Portal — Vite + Hono BFF
FROM node:22-bookworm-slim AS base
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS development
COPY . .
ENV NODE_ENV=development
EXPOSE 5173 8787
CMD ["npm", "run", "dev"]

FROM base AS build
COPY . .
RUN npm run build && npm run build:server

FROM node:22-bookworm-slim AS production
WORKDIR /app
ENV NODE_ENV=production
ENV PORTAL_IDENTITY_DIR=/var/lib/openclaw-portal/identity
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server ./dist-server

# Run as a non-root user with a writable home/state dir
RUN useradd --create-home --uid 10001 portal \
  && mkdir -p /var/lib/openclaw-portal/identity \
  && chown -R portal:portal /var/lib/openclaw-portal /app
USER portal

EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8787/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist-server/index.js"]
