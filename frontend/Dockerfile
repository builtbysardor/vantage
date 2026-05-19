# syntax=docker/dockerfile:1.6

# ─── Stage 1: deps ───────────────────────────────────────────
# Install ALL deps (incl. devDependencies) — needed for `next build`.
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then \
      npm ci; \
    else \
      npm install; \
    fi


# ─── Stage 2: build ──────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build


# ─── Stage 3: runtime ────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000

# Copy build artifacts + production runtime deps.
# NOTE: copying the full node_modules from `build` keeps things simple
# without requiring Next.js `output: 'standalone'`.
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
# NOTE: this project has no `frontend/public/` directory — if one is
# added later, re-enable the line below.
# COPY --from=build /app/public ./public

USER node

EXPOSE 3000

CMD ["npm", "start"]
