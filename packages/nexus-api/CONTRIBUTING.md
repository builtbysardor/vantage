# Contributing to Nexus Pro

## Getting Started

```bash
git clone https://github.com/builtbysardor/nexus-pro.git
cd nexus-pro
npm install
```

## Project Structure

```
nexus-pro/
├── backend/          # Node.js + Express + WebSocket API
│   └── src/
│       ├── metrics/  # System metrics collector (CPU, RAM, disk, network)
│       ├── alerts/   # Threshold-based alert engine
│       ├── auth/     # JWT authentication
│       ├── agents/   # AI diagnostics agent
│       └── routes/   # REST API endpoints
├── frontend/         # Next.js 14 dashboard
│   └── src/
│       ├── app/      # App router pages
│       └── components/
└── docker-compose.yml
```

## Running Locally

```bash
# Backend (port 4000)
cd backend && npm install && npm run dev

# Frontend (port 3000)
cd frontend && npm install && npm run dev
```

## Running with Docker

```bash
docker-compose up --build
```

## Code Style

- **Backend**: Node.js, CommonJS modules, async/await
- **Frontend**: TypeScript, React Server Components where possible, Tailwind CSS
- **Commits**: `feat:`, `fix:`, `docs:`, `refactor:`, `test:` prefixes

## Reporting Issues

Open an issue with:
1. Steps to reproduce
2. Expected vs actual behavior
3. OS and Node.js version
