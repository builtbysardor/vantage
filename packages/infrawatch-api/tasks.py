import logging
import os
import subprocess
from datetime import datetime, timedelta

import httpx

from celery_app import celery_app
from database import SessionLocal
from models import AlertHistory, AnomalyEvent, MetricSnapshot

log = logging.getLogger("infrawatch.tasks")
PROMETHEUS_URL = os.getenv("PROMETHEUS_URL", "http://prometheus:9090")


def _query(promql: str) -> dict:
    with httpx.Client(timeout=10.0) as client:
        r = client.get(f"{PROMETHEUS_URL}/api/v1/query", params={"query": promql})
        r.raise_for_status()
        return r.json()


def _first_value(result: dict):
    try:
        data = result.get("data", {}).get("result", [])
        return float(data[0]["value"][1]) if data else None
    except (IndexError, KeyError, ValueError):
        return None


@celery_app.task(name="tasks.snapshot_metrics", bind=True, max_retries=3)
def snapshot_metrics(self):
    try:
        cpu = _query('(1 - avg by(instance)(rate(node_cpu_seconds_total{mode="idle"}[5m]))) * 100')
        ram = _query("(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100")
        disk = _query('(1 - (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"})) * 100')
        net_in = _query('rate(node_network_receive_bytes_total{device!="lo"}[5m])')
        net_out = _query('rate(node_network_transmit_bytes_total{device!="lo"}[5m])')
        uptime = _query("node_time_seconds - node_boot_time_seconds")

        db = SessionLocal()
        try:
            db.add(MetricSnapshot(
                cpu_usage_percent=_first_value(cpu),
                ram_usage_percent=_first_value(ram),
                disk_usage_percent=_first_value(disk),
                network_in_bytes_sec=_first_value(net_in),
                network_out_bytes_sec=_first_value(net_out),
                uptime_seconds=_first_value(uptime),
            ))
            db.commit()
            log.info("Metric snapshot saved")
        finally:
            db.close()
    except Exception as exc:
        log.error("snapshot_metrics failed: %s", exc)
        raise self.retry(exc=exc, countdown=15)


@celery_app.task(name="tasks.snapshot_alerts")
def snapshot_alerts():
    try:
        with httpx.Client(timeout=10.0) as client:
            r = client.get(f"{PROMETHEUS_URL}/api/v1/alerts")
            r.raise_for_status()
        alerts = r.json().get("data", {}).get("alerts", [])
        db = SessionLocal()
        try:
            for alert in alerts:
                labels = alert.get("labels", {})
                db.add(AlertHistory(
                    alert_name=labels.get("alertname", "unknown"),
                    severity=labels.get("severity", "none"),
                    state=alert.get("state", "unknown"),
                    instance=labels.get("instance", ""),
                    summary=alert.get("annotations", {}).get("summary", ""),
                ))
            db.commit()
            log.info("Saved %d alerts to history", len(alerts))
        finally:
            db.close()
    except Exception as exc:
        log.error("snapshot_alerts failed: %s", exc)


@celery_app.task(name="tasks.detect_anomalies", bind=True, max_retries=2)
def detect_anomalies(self):
    """Phase 6: Run ML anomaly detection on the last 6 hours of metric snapshots."""
    try:
        from anomaly import analyze_snapshots

        db = SessionLocal()
        try:
            since = datetime.utcnow() - timedelta(hours=6)
            snapshots = (
                db.query(MetricSnapshot)
                .filter(MetricSnapshot.timestamp >= since)
                .order_by(MetricSnapshot.timestamp.asc())
                .all()
            )

            if len(snapshots) < 5:
                log.info("Anomaly detection skipped — only %d snapshots", len(snapshots))
                return {"skipped": True, "reason": "insufficient_data", "count": len(snapshots)}

            result = analyze_snapshots(snapshots)

            saved = 0
            for r in result["per_metric"]:
                if r["is_anomaly"]:
                    db.add(AnomalyEvent(
                        metric=r["metric"],
                        method=",".join(r["methods_triggered"]),
                        current_value=r["current_value"],
                        score=r["combined_score"],
                        detail=f"zscore={r['zscore']}, iqr_score={r['iqr_score']}",
                    ))
                    saved += 1

            if_res = result.get("isolation_forest")
            if if_res and if_res["is_anomaly"]:
                db.add(AnomalyEvent(
                    metric="multivariate",
                    method="isolation_forest",
                    current_value=None,
                    score=if_res["score"],
                    detail="Multivariate anomaly via Isolation Forest",
                ))
                saved += 1

            db.commit()
            log.info("detect_anomalies: %d events saved (any_anomaly=%s)", saved, result["any_anomaly"])
            return {**result, "events_saved": saved}
        finally:
            db.close()
    except Exception as exc:
        log.error("detect_anomalies failed: %s", exc)
        raise self.retry(exc=exc, countdown=30)


@celery_app.task(name="tasks.check_container_health")
def check_container_health():
    """Detect unhealthy Docker containers and auto-restart them."""
    try:
        result = subprocess.run(
            ["docker", "ps", "--filter", "health=unhealthy", "--format", "{{.Names}}"],
            capture_output=True, text=True, timeout=10,
        )
        unhealthy = [n.strip() for n in result.stdout.splitlines() if n.strip()]
        for name in unhealthy:
            log.warning("Auto-remediating unhealthy container: %s", name)
            subprocess.run(["docker", "restart", name], timeout=30, check=True)
            log.info("Restarted: %s", name)
        return {"remediated": unhealthy}
    except Exception as exc:
        log.error("check_container_health failed: %s", exc)
        return {"error": str(exc)}
