# syntax=docker/dockerfile:1.6

# ─── Stage 1: deps ───────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Copy manifests. If package-lock.json exists, use `npm ci` for
# reproducible installs; otherwise fall back to `npm install`.
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then \
      npm ci --omit=dev; \
    else \
      npm install --omit=dev; \
    fi


# ─── Stage 2: runtime ────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3001

# Bring in production node_modules from the deps stage.
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src

# Drop privileges to the built-in non-root `node` user.
USER node

EXPOSE 3001

# Hit /api/health if available; fall back to /.
# `wget` is bundled with node:20-alpine via busybox.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/api/health \
      || wget -qO- http://127.0.0.1:3001/ \
      || exit 1

CMD ["node", "src/server.js"]
