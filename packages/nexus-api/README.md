<div align="center">

# Nexus Pro

### Infrastructure Monitoring Dashboard

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-20-339933?style=for-the-badge&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/WebSocket-real--time-010101?style=for-the-badge&logo=websocket&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-ready-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" />
</p>

Real-time system metrics, service health monitoring, and threshold-based alerting — delivered over WebSocket and a typed REST API, packaged for Docker.

</div>

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-Visit_Site-00C7B7?style=for-the-badge)](https://nexus-pro-pi.vercel.app)

---

## Screenshots

Screenshots coming soon.

---

## Features

- **Real-time system metrics** — CPU, RAM, disk, network throughput, and temperature polled via `systeminformation` and broadcast every 5 seconds over WebSocket
- **WebSocket server with 6 channels** — `snapshot`, `metrics` (5 s), `services` (15 s), `alerts` (on change), `logs` (initial load), `log` (streaming)
- **REST API — 15 endpoints** — metrics, services, alerts, logs, hosts, agents, and health check
- **Threshold-based alert engine** — automatic evaluation, auto-resolve, and per-alert acknowledge/resolve actions
- **Service health checker** — HTTP endpoint polling with latency tracking and status history
- **Remote agent support** — remote hosts push metrics via `POST /api/agents/push`; the included `agent.js` client handles the push loop
- **API security** — API key auth on write endpoints, agent token auth on push, rate limiting (100 req/min global, 20/min agent push), CORS allowlist
- **Structured logging** — Pino with `pino-http` for HTTP request logs; configurable log level
- **Graceful shutdown** — `SIGTERM`/`SIGINT` handlers drain connections before exit
- **7 frontend pages** — Dashboard, Alerts, Services, Devices/Hosts, Network, Logs, Settings
- **Docker multi-stage builds** — separate optimised images for frontend and backend
- **npm workspaces** — single `npm install` and `npm run dev` at the repo root starts both services

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                         FRONTEND                             │
│          Next.js 14  ·  TypeScript  ·  Tailwind CSS          │
│                                                              │
│   Dashboard  /  Alerts  /  Services  /  Hosts                │
│   Network  /  Logs  /  Settings                              │
│                                                              │
│   lib/api.ts          — typed REST client                    │
│   lib/useWebSocket.ts — auto-reconnect WebSocket hook        │
│   lib/events.ts       — custom in-process event bus         │
└────────────────────┬─────────────────────┬───────────────────┘
                     │ REST (HTTP)          │ WebSocket
                     │ GET /api/*           │ ws://host:3001
                     │ PATCH /api/*         │
┌────────────────────▼─────────────────────▼───────────────────┐
│                         BACKEND                              │
│              Node.js 20  ·  Express  ·  ws                   │
│                                                              │
│   metrics/collector.js   — systeminformation poller          │
│   alerts/engine.js        — threshold evaluation             │
│   services/healthChecker.js — HTTP endpoint monitor          │
│   services/hosts.js       — host inventory                   │
│   agents/agent.js         — remote push client               │
│   middleware/auth.js      — API key + agent token auth       │
│   middleware/websocket.js — broadcast to all WS clients      │
│   lib/logger.js           — Pino singleton                   │
│                                                              │
│   WebSocket broadcast channels:                              │
│     snapshot   — full state on connect                       │
│     metrics    — system stats (every 5 s)                    │
│     services   — service health (every 15 s)                 │
│     alerts     — alert changes (on change)                   │
│     logs       — log history (initial load)                  │
│     log        — streaming log entries                       │
└──────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | Next.js 14 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3 |
| Charts | Recharts |
| Icons | Lucide React |
| Backend runtime | Node.js 20 |
| HTTP server | Express |
| WebSocket | ws |
| System metrics | systeminformation |
| Scheduling | node-cron |
| Logging | Pino, pino-http |
| Validation | Zod |
| Rate limiting | express-rate-limit |
| Containers | Docker (multi-stage), docker-compose |
| Monorepo | npm workspaces + concurrently |

---

## Quick Start — Docker (recommended)

```bash
git clone https://github.com/builtbysardor/nexus-pro.git
cd nexus-pro

# Copy and edit the backend environment file
cp .env.example backend/.env
# Open backend/.env and set API_KEYS and AGENT_TOKENS

docker compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api/health

---

## Quick Start — Local Development

Node.js 20 and npm 8+ are required.

```bash
git clone https://github.com/builtbysardor/nexus-pro.git
cd nexus-pro

# Installs dependencies for both workspaces in one step
npm install

cp .env.example backend/.env
# Open backend/.env and set API_KEYS and AGENT_TOKENS

# Starts backend and frontend concurrently
npm run dev
```

To run each service independently:

```bash
npm run dev:backend    # Express + WebSocket on :3001
npm run dev:frontend   # Next.js on :3000
```

---

## Environment Variables

### backend/.env

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `3001` | Port the Express server listens on |
| `API_KEYS` | Yes | — | Comma-separated API keys for write endpoints (acknowledge, resolve, maintenance) |
| `AGENT_TOKENS` | Yes | — | Comma-separated tokens accepted from remote agents |
| `AGENT_TOKEN` | No | — | Token used by the local `agent.js` push client |
| `CORS_ORIGINS` | No | `http://localhost:3000` | Comma-separated allowed CORS origins |
| `LOG_LEVEL` | No | `info` | Pino log level (`trace`, `debug`, `info`, `warn`, `error`) |

### frontend/.env.local

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | `http://localhost:3001` | Base URL of the backend REST API |
| `NEXT_PUBLIC_WS_URL` | Yes | `ws://localhost:3001` | WebSocket URL of the backend server |

---

## REST API Reference

All routes are prefixed with `/api/`.

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | None | Service health check |
| GET | `/metrics` | None | Full system snapshot |
| GET | `/metrics/history` | None | Time-series metrics history |
| GET | `/system` | None | OS and kernel information |
| GET | `/network` | None | Network interface stats |
| GET | `/services` | None | Monitored services and status |
| POST | `/services/:id/restart` | API key | Restart service (requires remote agent) |
| GET | `/alerts` | None | Alert list (filterable by state) |
| GET | `/alerts/thresholds` | None | Configured alert thresholds |
| PATCH | `/alerts/:id/acknowledge` | API key | Acknowledge an alert |
| PATCH | `/alerts/:id/resolve` | API key | Resolve an alert |
| GET | `/logs` | None | Recent log entries |
| GET | `/hosts` | None | Host inventory |
| PATCH | `/hosts/:id/maintenance` | API key | Toggle maintenance mode for a host |
| GET | `/containers` | None | Container list |
| POST | `/agents/register` | Agent token | Register a remote agent |
| POST | `/agents/push` | Agent token | Receive metrics push from remote agent |

Write endpoints authenticate via the `x-api-key` header. Agent endpoints authenticate via `x-agent-token`.

---

## Remote Agent

Nexus Pro can receive metrics from remote hosts in addition to monitoring the local system. The push client is at `backend/src/agents/agent.js`. When run on a remote host, it collects local metrics and sends them to `POST /api/agents/push` with the `x-agent-token` header.

```bash
# On the remote host
AGENT_TOKEN=your-agent-token \
NEXUS_URL=http://your-nexus-server:3001 \
node backend/src/agents/agent.js
```

The backend validates the token against `AGENT_TOKENS`, rate-limits pushes to 20 requests per minute per agent, and merges the data into the host inventory.

---

## Security

- **Write endpoints** require a valid `x-api-key` header matching one of the values in `API_KEYS`.
- **Agent push endpoint** requires a valid `x-agent-token` header matching one of the values in `AGENT_TOKENS`.
- **Rate limiting** — 100 requests/min globally, 20 requests/min on `/api/agents/push`.
- **CORS** — only origins listed in `CORS_ORIGINS` are allowed by the Express CORS middleware.
- **Structured audit logging** — every HTTP request is logged by `pino-http` with method, path, status, and response time.

---

## Project Structure

```
nexus-pro/
├── backend/
│   ├── src/
│   │   ├── server.js               # Express + WebSocket entry point
│   │   ├── routes/index.js         # All REST route definitions
│   │   ├── metrics/collector.js    # systeminformation poller
│   │   ├── alerts/engine.js        # Threshold alert engine
│   │   ├── logs/stream.js          # Log streaming
│   │   ├── services/
│   │   │   ├── healthChecker.js    # HTTP service health monitor
│   │   │   └── hosts.js            # Host inventory
│   │   ├── agents/agent.js         # Remote agent push client
│   │   ├── middleware/
│   │   │   ├── auth.js             # API key + agent token auth
│   │   │   └── websocket.js        # WebSocket broadcast helper
│   │   ├── validators/index.js     # Zod request validation schemas
│   │   └── lib/logger.js           # Pino singleton
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/                    # Next.js App Router pages
│   │   ├── components/shared/      # Sidebar, Topbar, UI primitives
│   │   ├── lib/
│   │   │   ├── api.ts              # Typed REST client
│   │   │   ├── useWebSocket.ts     # Auto-reconnect WebSocket hook
│   │   │   └── events.ts           # Custom event bus
│   │   └── types/index.ts          # Shared TypeScript types
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
├── package.json                    # npm workspaces root
└── .env.example
```

---

## Roadmap

- [ ] PostgreSQL persistence for metrics history and alert records
- [ ] JWT-based authentication and login UI
- [ ] Email and Telegram alert notifications
- [ ] Multi-server dashboard with aggregated views
- [ ] OpenAPI specification (Swagger UI)
- [ ] Mobile PWA support

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">

Built by Sardor · Samarkand, Uzbekistan

</div>
