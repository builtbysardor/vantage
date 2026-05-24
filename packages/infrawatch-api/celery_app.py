import os

from celery import Celery

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")

celery_app = Celery(
    "infrawatch",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    worker_hijack_root_logger=False,
    beat_schedule={
        "snapshot-metrics-60s": {
            "task": "tasks.snapshot_metrics",
            "schedule": 60.0,
        },
        "snapshot-alerts-120s": {
            "task": "tasks.snapshot_alerts",
            "schedule": 120.0,
        },
        "check-container-health-30s": {
            "task": "tasks.check_container_health",
            "schedule": 30.0,
        },
        "detect-anomalies-300s": {
            "task": "tasks.detect_anomalies",
            "schedule": 300.0,
        },
    },
)
