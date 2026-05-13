<div align="center">

# 📡 InfraWatch — Production Server Monitoring Stack

<p align="center">
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
  <img src="https://img.shields.io/badge/Prometheus-Latest-E6522C?style=for-the-badge&logo=prometheus&logoColor=white" />
  <img src="https://img.shields.io/badge/Grafana-Latest-F46800?style=for-the-badge&logo=grafana&logoColor=white" />
  <img src="https://img.shields.io/badge/Node_Exporter-Powered-00BFFF?style=for-the-badge&logo=linux&logoColor=white" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" />
</p>

<p align="center">
  <img src="https://img.shields.io/github/stars/builtbysardor/infrawatch-monitoring-stack?style=flat-square" />
  <img src="https://img.shields.io/github/forks/builtbysardor/infrawatch-monitoring-stack?style=flat-square" />
  <img src="https://img.shields.io/badge/Setup_Time-Under_2_min-brightgreen?style=flat-square" />
  <img src="https://img.shields.io/badge/Platform-Linux%20%7C%20macOS-lightgrey?style=flat-square" />
</p>

<br/>

> **Production-ready observability platform** — Prometheus + Grafana + Node Exporter in Docker.  
> From zero to a fully working monitoring dashboard in **one command**.

<br/>

```bash
docker compose up -d
```

**[🚀 Installation](#-installation) • [📊 Dashboard](#️-opening-grafana) • [🏗 Architecture](#️-architecture) • [🔧 Troubleshooting](#-troubleshooting)**

</div>

---

## 📸 Dashboard Preview

<div align="center">

| System Overview | CPU & Memory |
|:---:|:---:|
| ![Overview](docs/grafana-overview.png) | ![CPU](docs/grafana-cpu.png) |
| *Full server health at a glance* | *Per-core CPU & memory trends* |

| Network Traffic | Disk I/O |
|:---:|:---:|
| ![Network](docs/grafana-network.png) | ![Disk](docs/grafana-disk.png) |
| *Inbound/outbound bandwidth history* | *Read/write throughput per partition* |

</div>

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Linux Server (Host)                    │
│                                                         │
│  ┌──────────────────┐                                   │
│  │  Node Exporter   │ ← reads /proc & /sys             │
│  │  (port 9100)     │   exposes ~1000 metrics           │
│  └────────┬─────────┘                                   │
│           │ HTTP scrape every 15s                       │
│  ┌────────▼─────────┐                                   │
│  │   Prometheus     │ ← stores time-series data        │
│  │   (port 9090)    │   runs PromQL queries             │
│  └────────┬─────────┘                                   │
│           │ PromQL queries                              │
│  ┌────────▼─────────┐                                   │
│  │    Grafana       │ ← renders dashboards             │
│  │   (port 3000)    │   in your browser                 │
│  └──────────────────┘                                   │
│                                                         │
│  All containers on isolated Docker bridge network       │
└─────────────────────────────────────────────────────────┘
```

---

## 🧩 Stack Components

| Component | Port | Role |
|-----------|------|------|
| 🔵 **Node Exporter** | 9100 | Reads Linux `/proc` & `/sys` — exposes ~1000 system metrics |
| 🟠 **Prometheus** | 9090 | Scrapes metrics every 15s, stores time-series, runs PromQL |
| 🟢 **Grafana** | 3000 | Queries Prometheus via PromQL, renders beautiful dashboards |
| 🐳 **Docker Compose** | — | Orchestrates all 3 containers on an isolated bridge network |

---

## ✅ Prerequisites

| Tool | Min Version | Check |
|------|------------|-------|
| Docker | 20.x | `docker --version` |
| Docker Compose | v2 | `docker compose version` |

### Install Docker on Ubuntu

```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-plugin
sudo usermod -aG docker $USER && newgrp docker
```

---

## 📦 Installation

```bash
# 1. Clone the repository
git clone https://github.com/builtbysardor/infrawatch-monitoring-stack.git
cd infrawatch-monitoring-stack

# 2. Start all services
docker compose up -d

# 3. Verify containers are running
docker compose ps
```

Expected output:
```
NAME                      STATUS    PORTS
infrawatch_grafana        Up        0.0.0.0:3000->3000/tcp
infrawatch_node_exporter  Up        0.0.0.0:9100->9100/tcp
infrawatch_prometheus     Up        0.0.0.0:9090->9090/tcp
```

---

## 🖥️ Opening Grafana

1. Open your browser: **http://localhost:3000**
2. Login with default credentials:

| Field | Value |
|-------|-------|
| Username | `admin` |
| Password | `infrawatch` |

> ⚠️ Change the default password on any internet-facing server!

3. Navigate to **Dashboards → InfraWatch → Linux Server Overview**

The dashboard is pre-provisioned and loads automatically. No manual setup needed. ✅

---

## 📊 Dashboard Panels

| Panel | Type | Description |
|-------|------|-------------|
| 🖥️ System Uptime | Stat | Server uptime duration |
| ⚡ CPU Usage % | Stat + Graph | Load with color thresholds |
| 🧠 RAM Usage % | Stat + Graph | Memory utilization |
| 💾 Disk Usage % | Stat | Root partition usage |
| 🌐 Network In/Out | Stat | Inbound/outbound bytes/sec |
| ⚡ CPU Over Time | Time Series | Per-core CPU history |
| 🧠 RAM Over Time | Time Series | Used/Available/Total history |
| 🌐 Network Traffic | Time Series | Bandwidth history |
| 💾 Disk by Partition | Bar Gauge | Usage % per filesystem |
| 📊 Disk I/O | Time Series | Read/write throughput |
| 🔧 Load Average | Time Series | 1m / 5m / 15m load |

---

## 📁 Project Structure

```
infrawatch-monitoring-stack/
├── docker-compose.yml                         # All 3 services defined here
├── prometheus/
│   └── prometheus.yml                         # Scrape targets config
├── grafana/
│   ├── provisioning/
│   │   ├── datasources/
│   │   │   └── prometheus.yml                # Auto-registers Prometheus
│   │   └── dashboards/
│   │       └── default.yml                   # Dashboard discovery config
│   └── dashboards/
│       └── linux-overview.json               # Pre-built Grafana dashboard
└── README.md
```

---

## 🛠️ Useful Commands

```bash
# Start the stack
docker compose up -d

# Stop the stack
docker compose down

# View live logs
docker compose logs -f

# Restart a single service
docker compose restart prometheus

# Check raw Node Exporter metrics
curl http://localhost:9100/metrics | head -50

# Reload Prometheus config (no restart needed)
curl -X POST http://localhost:9090/-/reload
```

---

## 🔌 Ports Reference

| Service | Port | URL |
|---------|------|-----|
| Grafana | 3000 | http://localhost:3000 |
| Prometheus | 9090 | http://localhost:9090 |
| Node Exporter | 9100 | http://localhost:9100/metrics |

---

## 🔧 Troubleshooting

**"No data" in Grafana?**
- Wait 1–2 min for first metrics scrape
- Check http://localhost:9090/targets — `node_exporter` should show **UP**

**Can't access on remote server?**
```bash
sudo ufw allow 3000/tcp
```

**Permission denied?**
```bash
sudo usermod -aG docker $USER && newgrp docker
```

---

## ➕ Extending InfraWatch

Add more exporters to `prometheus/prometheus.yml`:

```yaml
- job_name: "mysql"
  static_configs:
    - targets: ["mysql_exporter:9104"]
```

Popular exporters: `mysql_exporter` · `redis_exporter` · `nginx-prometheus-exporter` · `blackbox_exporter`

---

## 🔮 Roadmap

- [ ] 📧 **Email alerts** — Grafana alerting via SMTP
- [ ] 💬 **Telegram alerts** — webhook-based notifications
- [ ] ☸️ **Kubernetes support** — kube-state-metrics integration
- [ ] 🔐 **HTTPS** — TLS via reverse proxy (Traefik/NGINX)
- [ ] 📦 **More exporters** — MySQL, Redis, NGINX dashboards
- [ ] 📄 **Automated reports** — weekly PDF server health report

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

<div align="center">

**Built with ❤️ by [Sardor Buriyev](https://github.com/builtbysardor)**

*Docker · Prometheus · Grafana · Node Exporter*

⭐ **Star this repo if InfraWatch simplified your monitoring!**

</div>
