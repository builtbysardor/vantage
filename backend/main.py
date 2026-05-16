import asyncio
import logging
import os
from contextlib import asynccontextmanager
from typing import Optional

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
log = logging.getLogger("infrawatch.backend")

PROMETHEUS_URL = os.getenv("PROMETHEUS_URL", "http://prometheus:9090")


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("InfraWatch backend starting — Prometheus: %s", PROMETHEUS_URL)
    yield
    log.info("InfraWatch backend shutting down")


app = FastAPI(
    title="InfraWatch Backend",
    version="1.0.0",
    description="REST API proxy for Prometheus metrics and alerts",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


# ── Internal helpers ───────────────────────────────────────────

async def _query(promql: str) -> dict:
    async with httpx.AsyncClient(timeout=10.0) as client:
        r = await client.get(
            f"{PROMETHEUS_URL}/api/v1/query", params={"query": promql}
        )
        r.raise_for_status()
        return r.json()


def _first_value(result: dict) -> Optional[float]:
    try:
        data = result.get("data", {}).get("result", [])
        return float(data[0]["value"][1]) if data else None
    except (IndexError, KeyError, ValueError):
        return None


def _prom_error(exc: Exception) -> HTTPException:
    log.error("Prometheus unreachable: %s", exc)
    return HTTPException(status_code=503, detail=f"Cannot reach Prometheus: {exc}")


# ── Endpoints ─────────────────────────────────────────────────

@app.get("/health", tags=["System"])
async def health():
    return {"status": "ok", "service": "infrawatch-backend"}


@app.get("/metrics", include_in_schema=False, response_class=PlainTextResponse)
async def prometheus_metrics():
    """Minimal Prometheus-format metrics so the prometheus scrape job shows UP."""
    return (
        "# HELP infrawatch_backend_up InfraWatch backend health\n"
        "# TYPE infrawatch_backend_up gauge\n"
        "infrawatch_backend_up 1\n"
    )


@app.get("/api/metrics", tags=["Metrics"])
async def get_metrics():
    try:
        cpu, ram, disk, net_in, net_out, uptime = await asyncio.gather(
            _query('(1 - avg by(instance)(rate(node_cpu_seconds_total{mode="idle"}[5m]))) * 100'),
            _query("(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100"),
            _query('(1 - (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"})) * 100'),
            _query('rate(node_network_receive_bytes_total{device!="lo"}[5m])'),
            _query('rate(node_network_transmit_bytes_total{device!="lo"}[5m])'),
            _query("node_time_seconds - node_boot_time_seconds"),
        )
        return {
            "cpu_usage_percent": _first_value(cpu),
            "ram_usage_percent": _first_value(ram),
            "disk_usage_percent": _first_value(disk),
            "network_in_bytes_sec": _first_value(net_in),
            "network_out_bytes_sec": _first_value(net_out),
            "uptime_seconds": _first_value(uptime),
        }
    except (httpx.RequestError, httpx.HTTPStatusError) as e:
        raise _prom_error(e)


@app.get("/api/alerts", tags=["Alerts"])
async def get_alerts():
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(f"{PROMETHEUS_URL}/api/v1/alerts")
            r.raise_for_status()
            data = r.json()
        alerts = data.get("data", {}).get("alerts", [])
        firing = [a for a in alerts if a.get("state") == "firing"]
        pending = [a for a in alerts if a.get("state") == "pending"]
        return {
            "total": len(alerts),
            "firing": len(firing),
            "pending": len(pending),
            "alerts": alerts,
        }
    except (httpx.RequestError, httpx.HTTPStatusError) as e:
        raise _prom_error(e)


@app.get("/api/status", tags=["System"])
async def get_status():
    try:
        result = await _query("up")
        targets = result.get("data", {}).get("result", [])
        return {
            "prometheus_reachable": True,
            "targets": [
                {
                    "job": t["metric"].get("job", ""),
                    "instance": t["metric"].get("instance", ""),
                    "up": t["value"][1] == "1",
                }
                for t in targets
            ],
        }
    except (httpx.RequestError, httpx.HTTPStatusError) as e:
        log.warning("Prometheus unreachable for status check: %s", e)
        return {"prometheus_reachable": False, "error": str(e), "targets": []}


@app.get("/api/containers", tags=["Containers"])
async def get_containers():
    """Per-container CPU and memory from cAdvisor metrics scraped by Prometheus."""
    try:
        cpu_res, mem_res = await asyncio.gather(
            _query('sum by(name)(rate(container_cpu_usage_seconds_total{name!=""}[5m])) * 100'),
            _query('container_memory_usage_bytes{name!=""}'),
        )
        cpu_by_name = {
            r["metric"].get("name", ""): float(r["value"][1])
            for r in cpu_res.get("data", {}).get("result", [])
        }
        mem_by_name = {
            r["metric"].get("name", ""): float(r["value"][1])
            for r in mem_res.get("data", {}).get("result", [])
        }
        names = set(cpu_by_name) | set(mem_by_name)
        containers = sorted(
            [
                {
                    "name": name,
                    "cpu_percent": round(cpu_by_name.get(name, 0.0), 2),
                    "memory_bytes": int(mem_by_name.get(name, 0)),
                }
                for name in names
            ],
            key=lambda c: c["cpu_percent"],
            reverse=True,
        )
        return {"total": len(containers), "containers": containers}
    except (httpx.RequestError, httpx.HTTPStatusError) as e:
        raise _prom_error(e)
