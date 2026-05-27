# Vantage

[![CI](https://github.com/vantage-oss/vantage/actions/workflows/ci.yml/badge.svg)](https://github.com/vantage-oss/vantage/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Python](https://img.shields.io/badge/Python-3.11-3776ab?logo=python&logoColor=white)](https://www.python.org)

**Open-source observability platform — real-time metrics, logs, alerts, and ML anomaly detection in one unified dashboard.**

![Vantage Dashboard](docs/screenshots/overview.png)

--- 

## Screenshots

| Overview | Metrics |
|----------|---------|
| ![Overview](docs/screenshots/overview.png) | ![Metrics](docs/screenshots/metrics.png) |

| Alerts | Anomalies |
|--------|-----------|
| ![Alerts](docs/screenshots/alerts.png) | ![Anomalies](docs/screenshots/anomalies.png) |

| Logs | Services |
|------|----------|
| ![Logs](docs/screenshots/logs.png) | ![Services](docs/screenshots/services.png) |

| Hosts | Containers |
|-------|------------|
| ![Hosts](docs/screenshots/hosts.png) | ![Containers](docs/screenshots/containers.png) |

---

## Features

| Infrastructure Monitoring | ML & Intelligence |
|---------------------------|-------------------|
| Real-time CPU, RAM, disk & network metrics | Isolation Forest anomaly detection |
| Container & host health tracking | Configurable alert thresholds with auto-resolve |
| Service health overview | Anomaly history and scoring |
| Log streaming with level filtering | Trend analysis across time-series data |
| Multi-source alerts (firing / resolved / acknowledged) | Celery-powered async inference tasks |
| Prometheus & Grafana integration | Redis-backed job queue |

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | Next.js 15, TypeScript, Tailwind CSS, Recharts, Lucide |
| **Nexus API** | Node.js, Express, WebSocket, JWT auth |
| **InfraWatch** | FastAPI, Celery, PostgreSQL, Redis, scikit-learn |
| **Infrastructure** | Prometheus, Grafana, Loki, cAdvisor, Docker Compose |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Browser / Client                  │
│              Next.js 15 — localhost:3000             │
└───────────┬──────────────────────────────┬──────────┘
            │ REST / WebSocket             │ REST
            ▼                             ▼
┌───────────────────┐          ┌──────────────────────┐
│    Nexus API      │          │   InfraWatch API      │
│  Node / Express   │          │  FastAPI + Celery     │
│  localhost:3001   │          │  localhost:8000       │
└───────┬───────────┘          └──────┬───────────────┘
        │                             │
        │  scrape                     │ read/write
        ▼                             ▼
┌───────────────┐           ┌─────────────────────────┐
│  Prometheus   │           │  PostgreSQL  +  Redis   │
│  :9090        │           │  :5432          :6379   │
└───────────────┘           └─────────────────────────┘
        │
        ▼
┌───────────────┐   ┌────────────┐   ┌─────────────┐
│   Grafana     │   │    Loki    │   │  cAdvisor   │
│   :3002       │   │   :3100    │   │   :8080     │
└───────────────┘   └────────────┘   └─────────────┘
```

---

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/builtbysardor/vantage.git
cd vantage

# 2. Copy and configure environment variables
cp .env.example .env

# 3. Install Node dependencies
pnpm install

# 4. Start all services (Docker Compose + dev servers)
pnpm all:up

# 5. Open the dashboard
open http://localhost:3000
```

> **Default credentials:** `admin` / `infrawatch`
>
> **Warning:** Change these credentials before deploying to any non-local environment.

---

## Port Map

| Service | Port | Description |
|---------|------|-------------|
| Frontend | `3000` | Next.js dashboard |
| Nexus API | `3001` | Node.js backend & WebSocket |
| InfraWatch | `8000` | FastAPI ML & metrics API |
| Prometheus | `9090` | Metrics scraping & storage |
| Grafana | `3002` | Prebuilt dashboards |
| Loki | `3100` | Log aggregation |
| cAdvisor | `8080` | Container metrics |
| PostgreSQL | `5432` | InfraWatch database |
| Redis | `6379` | Celery task broker |

---

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

```bash
# Run type-check
pnpm typecheck

# Run lint
pnpm lint

# Run all services in dev mode
pnpm dev
```

---

## Security

To report a vulnerability, please see [SECURITY.md](SECURITY.md).

---

## License

[MIT](LICENSE) © 2026 Vantage Contributors
