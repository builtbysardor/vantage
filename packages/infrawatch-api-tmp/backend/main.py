import asyncio
import json
import logging
import os
import pathlib
import time
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from typing import AsyncGenerator, List, Optional

import httpx
from fastapi import (
    Depends, FastAPI, Form, HTTPException, Request, WebSocket,
    WebSocketDisconnect,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, PlainTextResponse, StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from auth import authenticate_user, create_access_token, get_current_user, require_admin
from database import get_db, init_db
from models import AlertHistory, AnomalyEvent, AuditLog, MetricSnapshot

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
log = logging.getLogger("infrawatch.backend")

PROMETHEUS_URL = os.getenv("PROMETHEUS_URL", "http://prometheus:9090")
DB_ENABLED = os.getenv("DB_ENABLED", "true").lower() == "true"


# ── Phase 2: WebSocket connection manager ─────────────────────
class ConnectionManager:
    def __init__(self):
        self.active: List[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)
        log.info("WS client connected. Total: %d", len(self.active))

    def disconnect(self, ws: WebSocket):
        self.active.remove(ws)
        log.info("WS client disconnected. Total: %d", len(self.active))

    async def broadcast(self, data: dict):
        dead = []
        for ws in self.active:
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.active.remove(ws)


ws_manager = ConnectionManager()


# ── Lifespan ──────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("InfraWatch backend starting")
    if DB_ENABLED:
        try:
            init_db()
            log.info("Database initialized")
        except Exception as exc:
            log.warning("DB init failed (non-fatal): %s", exc)
    yield
    log.info("InfraWatch backend shutting down")


# ── App ───────────────────────────────────────────────────────
app = FastAPI(
    title="InfraWatch Backend",
    version="2.0.0",
    description=(
        "Production-grade observability API: Prometheus proxy, WebSocket streaming, "
        "JWT auth, historical analytics, and auto-remediation."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Phase 4: Audit logging middleware ─────────────────────────
@app.middleware("http")
async def audit_middleware(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000

    skip_paths = {"/health", "/metrics", "/ws/metrics"}
    if request.url.path not in skip_paths and DB_ENABLED:
        username = None
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            try:
                from auth import SECRET_KEY, ALGORITHM
                from jose import jwt as _jwt
                payload = _jwt.decode(auth_header[7:], SECRET_KEY, algorithms=[ALGORITHM])
                username = payload.get("sub")
            except Exception:
                pass

        try:
            from database import SessionLocal
            db = SessionLocal()
            db.add(AuditLog(
                username=username,
                method=request.method,
                path=str(request.url.path),
                status_code=response.status_code,
                ip_address=request.client.host if request.client else None,
                duration_ms=round(duration_ms, 2),
            ))
            db.commit()
            db.close()
        except Exception:
            pass

    return response


# ── Internal helpers ──────────────────────────────────────────
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


async def _fetch_metrics() -> dict:
    cpu, ram, disk, net_in, net_out, uptime = await asyncio.gather(
        _query('(1 - avg by(instance)(rate(node_cpu_seconds_total{mode="idle"}[5m]))) * 100'),
        _query("(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100"),
        _query('(1 - (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"})) * 100'),
        _query('rate(node_network_receive_bytes_total{device!="lo"}[5m])'),
        _query('rate(node_network_transmit_bytes_total{device!="lo"}[5m])'),
        _query("node_time_seconds - node_boot_time_seconds"),
    )
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "cpu_usage_percent": _first_value(cpu),
        "ram_usage_percent": _first_value(ram),
        "disk_usage_percent": _first_value(disk),
        "network_in_bytes_sec": _first_value(net_in),
        "network_out_bytes_sec": _first_value(net_out),
        "uptime_seconds": _first_value(uptime),
    }


# ══════════════════════════════════════════════════════════════
# PHASE 1 — Core REST endpoints
# ══════════════════════════════════════════════════════════════

@app.get("/health", tags=["System"])
async def health():
    return {"status": "ok", "service": "infrawatch-backend", "version": "2.0.0"}


@app.get("/metrics", include_in_schema=False, response_class=PlainTextResponse)
async def prometheus_metrics():
    return (
        "# HELP infrawatch_backend_up InfraWatch backend health\n"
        "# TYPE infrawatch_backend_up gauge\n"
        f"infrawatch_backend_up 1\n"
        f"infrawatch_ws_connections {len(ws_manager.active)}\n"
    )


@app.get("/api/metrics", tags=["Metrics"])
async def get_metrics():
    try:
        return await _fetch_metrics()
    except (httpx.RequestError, httpx.HTTPStatusError) as e:
        raise _prom_error(e)


@app.get("/api/alerts", tags=["Alerts"])
async def get_alerts():
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(f"{PROMETHEUS_URL}/api/v1/alerts")
            r.raise_for_status()
        alerts = r.json().get("data", {}).get("alerts", [])
        firing = [a for a in alerts if a.get("state") == "firing"]
        pending = [a for a in alerts if a.get("state") == "pending"]
        return {"total": len(alerts), "firing": len(firing), "pending": len(pending), "alerts": alerts}
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
        return {"prometheus_reachable": False, "error": str(e), "targets": []}


@app.get("/api/containers", tags=["Containers"])
async def get_containers():
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


# ══════════════════════════════════════════════════════════════
# PHASE 2 — Real-time Streaming (WebSocket + SSE)
# ══════════════════════════════════════════════════════════════

@app.websocket("/ws/metrics")
async def websocket_metrics(ws: WebSocket):
    """Live metrics stream via WebSocket. Pushes data every 2 seconds."""
    await ws_manager.connect(ws)
    try:
        while True:
            try:
                data = await _fetch_metrics()
            except Exception as exc:
                data = {"error": str(exc), "timestamp": datetime.utcnow().isoformat()}
            await ws.send_json(data)
            await asyncio.sleep(2)
    except WebSocketDisconnect:
        ws_manager.disconnect(ws)


async def _sse_generator() -> AsyncGenerator[str, None]:
    while True:
        try:
            data = await _fetch_metrics()
        except Exception as exc:
            data = {"error": str(exc), "timestamp": datetime.utcnow().isoformat()}
        yield f"data: {json.dumps(data)}\n\n"
        await asyncio.sleep(3)


@app.get("/api/stream/metrics", tags=["Streaming"])
async def sse_metrics():
    """Live metrics stream via Server-Sent Events."""
    return StreamingResponse(
        _sse_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


_DASHBOARD_PATH = pathlib.Path(__file__).parent / "dashboard.html"
DASHBOARD_HTML = (
    _DASHBOARD_PATH.read_text()
    if _DASHBOARD_PATH.exists()
    else "<h1 style='font-family:sans-serif;color:#f87171;padding:2rem'>dashboard.html not found</h1>"
)


@app.get("/dashboard", tags=["Streaming"], response_class=HTMLResponse)
async def live_dashboard():
    """Real-time live metrics dashboard (WebSocket-powered)."""
    return HTMLResponse(content=DASHBOARD_HTML)


# ══════════════════════════════════════════════════════════════
# PHASE 4 — Security & RBAC (JWT Auth)
# ══════════════════════════════════════════════════════════════

@app.post("/auth/token", tags=["Auth"])
async def login(username: str = Form(), password: str = Form()):
    """Obtain a JWT access token. Roles: admin, viewer."""
    user = authenticate_user(username, password)
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    token = create_access_token({"sub": user["username"], "role": user["role"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "username": user["username"],
        "role": user["role"],
    }


@app.get("/auth/me", tags=["Auth"])
async def me(user: dict = Depends(get_current_user)):
    return {"username": user["username"], "role": user["role"]}


@app.get("/api/admin/audit-logs", tags=["Admin"])
async def get_audit_logs(
    limit: int = 100,
    db: Session = Depends(get_db),
    _user: dict = Depends(require_admin),
):
    """Admin-only: recent audit log entries."""
    if not DB_ENABLED:
        raise HTTPException(status_code=503, detail="Database not enabled")
    logs = (
        db.query(AuditLog)
        .order_by(AuditLog.timestamp.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": l.id,
            "timestamp": l.timestamp.isoformat(),
            "username": l.username,
            "method": l.method,
            "path": l.path,
            "status_code": l.status_code,
            "ip_address": l.ip_address,
            "duration_ms": l.duration_ms,
        }
        for l in logs
    ]


# ══════════════════════════════════════════════════════════════
# PHASE 5 — Database & Historical Analytics
# ══════════════════════════════════════════════════════════════

@app.get("/api/history/metrics", tags=["Analytics"])
async def history_metrics(
    hours: int = 24,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """Historical metric snapshots from PostgreSQL (requires auth)."""
    if not DB_ENABLED:
        raise HTTPException(status_code=503, detail="Database not enabled")
    since = datetime.utcnow() - timedelta(hours=hours)
    rows = (
        db.query(MetricSnapshot)
        .filter(MetricSnapshot.timestamp >= since)
        .order_by(MetricSnapshot.timestamp.asc())
        .all()
    )
    return {
        "hours": hours,
        "count": len(rows),
        "snapshots": [
            {
                "timestamp": r.timestamp.isoformat(),
                "cpu_usage_percent": r.cpu_usage_percent,
                "ram_usage_percent": r.ram_usage_percent,
                "disk_usage_percent": r.disk_usage_percent,
                "network_in_bytes_sec": r.network_in_bytes_sec,
                "network_out_bytes_sec": r.network_out_bytes_sec,
            }
            for r in rows
        ],
    }


@app.get("/api/history/alerts", tags=["Analytics"])
async def history_alerts(
    hours: int = 48,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """Historical alert records from PostgreSQL (requires auth)."""
    if not DB_ENABLED:
        raise HTTPException(status_code=503, detail="Database not enabled")
    since = datetime.utcnow() - timedelta(hours=hours)
    rows = (
        db.query(AlertHistory)
        .filter(AlertHistory.timestamp >= since)
        .order_by(AlertHistory.timestamp.desc())
        .limit(500)
        .all()
    )
    return {
        "hours": hours,
        "count": len(rows),
        "alerts": [
            {
                "timestamp": r.timestamp.isoformat(),
                "alert_name": r.alert_name,
                "severity": r.severity,
                "state": r.state,
                "instance": r.instance,
                "summary": r.summary,
            }
            for r in rows
        ],
    }


@app.get("/api/analytics/summary", tags=["Analytics"])
async def analytics_summary(
    hours: int = 24,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """Aggregated statistics (avg/max/min) over a time window (requires auth)."""
    if not DB_ENABLED:
        raise HTTPException(status_code=503, detail="Database not enabled")
    since = datetime.utcnow() - timedelta(hours=hours)
    agg = db.query(
        func.avg(MetricSnapshot.cpu_usage_percent).label("cpu_avg"),
        func.max(MetricSnapshot.cpu_usage_percent).label("cpu_max"),
        func.min(MetricSnapshot.cpu_usage_percent).label("cpu_min"),
        func.avg(MetricSnapshot.ram_usage_percent).label("ram_avg"),
        func.max(MetricSnapshot.ram_usage_percent).label("ram_max"),
        func.avg(MetricSnapshot.disk_usage_percent).label("disk_avg"),
        func.count(MetricSnapshot.id).label("sample_count"),
    ).filter(MetricSnapshot.timestamp >= since).one()

    alert_count = (
        db.query(func.count(AlertHistory.id))
        .filter(AlertHistory.timestamp >= since)
        .scalar()
    )

    return {
        "period_hours": hours,
        "sample_count": agg.sample_count,
        "alert_count_in_period": alert_count,
        "cpu": {
            "avg_percent": round(agg.cpu_avg or 0, 2),
            "max_percent": round(agg.cpu_max or 0, 2),
            "min_percent": round(agg.cpu_min or 0, 2),
        },
        "ram": {
            "avg_percent": round(agg.ram_avg or 0, 2),
            "max_percent": round(agg.ram_max or 0, 2),
        },
        "disk": {
            "avg_percent": round(agg.disk_avg or 0, 2),
        },
    }


# ══════════════════════════════════════════════════════════════
# PHASE 6 — ML & Anomaly Detection
# ══════════════════════════════════════════════════════════════

@app.get("/api/anomalies", tags=["Anomaly Detection"])
async def get_anomalies(
    hours: int = 24,
    limit: int = 100,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """Recent anomaly events persisted by the Celery detector (requires auth)."""
    if not DB_ENABLED:
        raise HTTPException(status_code=503, detail="Database not enabled")
    since = datetime.utcnow() - timedelta(hours=hours)
    rows = (
        db.query(AnomalyEvent)
        .filter(AnomalyEvent.timestamp >= since)
        .order_by(AnomalyEvent.timestamp.desc())
        .limit(limit)
        .all()
    )
    return {
        "hours": hours,
        "count": len(rows),
        "events": [
            {
                "id": r.id,
                "timestamp": r.timestamp.isoformat(),
                "metric": r.metric,
                "method": r.method,
                "current_value": r.current_value,
                "score": r.score,
                "detail": r.detail,
            }
            for r in rows
        ],
    }


@app.get("/api/anomalies/score", tags=["Anomaly Detection"])
async def live_anomaly_score(
    hours: int = 6,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """Run anomaly detection live on recent snapshots and return the result (requires auth)."""
    if not DB_ENABLED:
        raise HTTPException(status_code=503, detail="Database not enabled")
    from anomaly import analyze_snapshots
    since = datetime.utcnow() - timedelta(hours=hours)
    snapshots = (
        db.query(MetricSnapshot)
        .filter(MetricSnapshot.timestamp >= since)
        .order_by(MetricSnapshot.timestamp.asc())
        .all()
    )
    if len(snapshots) < 5:
        return {
            "status": "insufficient_data",
            "sample_count": len(snapshots),
            "message": f"Need at least 5 snapshots, have {len(snapshots)}",
        }
    result = analyze_snapshots(snapshots)
    return {"status": "ok", **result}


@app.get("/api/anomalies/summary", tags=["Anomaly Detection"])
async def anomaly_summary(
    hours: int = 24,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """Aggregate anomaly statistics over a time window (requires auth)."""
    if not DB_ENABLED:
        raise HTTPException(status_code=503, detail="Database not enabled")
    since = datetime.utcnow() - timedelta(hours=hours)
    rows = db.query(AnomalyEvent).filter(AnomalyEvent.timestamp >= since).all()

    by_metric: dict = {}
    for r in rows:
        by_metric.setdefault(r.metric, {"count": 0, "max_score": 0.0})
        by_metric[r.metric]["count"] += 1
        if r.score and r.score > by_metric[r.metric]["max_score"]:
            by_metric[r.metric]["max_score"] = r.score

    return {
        "period_hours": hours,
        "total_anomaly_events": len(rows),
        "by_metric": by_metric,
    }
