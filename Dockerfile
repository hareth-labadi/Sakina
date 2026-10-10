# Sakina web front end: production image (Next.js standalone server).
# Build:  docker build -t sakina-web .
# Run:    docker run --rm -p 3000:3000 sakina-web

ARG NODE_VERSION=24-alpine

# ---------- 1. dependencies (cached until package*.json changes) ----------
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci

# ---------- 2. build ----------
FROM node:${NODE_VERSION} AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# NEXT_PUBLIC_* values are baked into the browser bundle at build time, not read at runtime.
ARG NEXT_PUBLIC_API_URL=""
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
# Where the server forwards /api/* (see rewrites in next.config.ts). Also fixed at build time.
ARG API_INTERNAL_URL=""
ENV API_INTERNAL_URL=${API_INTERNAL_URL}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---------- 3. runtime: only the standalone server, no source or dev tools ----------
FROM node:${NODE_VERSION} AS runtime
WORKDIR /app
# Pages call the API while rendering, so the server needs its address at run time too.
ARG API_INTERNAL_URL=""
ENV API_INTERNAL_URL=${API_INTERNAL_URL}
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static

# The official image ships an unprivileged "node" user.
USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/ar || exit 1

CMD ["node", "server.js"]
