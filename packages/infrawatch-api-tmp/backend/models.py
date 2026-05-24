from datetime import datetime

from sqlalchemy import Column, DateTime, Float, Integer, String, Text

from database import Base


class MetricSnapshot(Base):
    __tablename__ = "metric_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    cpu_usage_percent = Column(Float, nullable=True)
    ram_usage_percent = Column(Float, nullable=True)
    disk_usage_percent = Column(Float, nullable=True)
    network_in_bytes_sec = Column(Float, nullable=True)
    network_out_bytes_sec = Column(Float, nullable=True)
    uptime_seconds = Column(Float, nullable=True)


class AlertHistory(Base):
    __tablename__ = "alert_history"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    alert_name = Column(String(200))
    severity = Column(String(50))
    state = Column(String(50))
    instance = Column(String(200), nullable=True)
    summary = Column(Text, nullable=True)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    username = Column(String(100), nullable=True)
    method = Column(String(10))
    path = Column(String(500))
    status_code = Column(Integer)
    ip_address = Column(String(50), nullable=True)
    duration_ms = Column(Float, nullable=True)


class AnomalyEvent(Base):
    __tablename__ = "anomaly_events"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    metric = Column(String(100))        # e.g. "cpu_usage_percent" or "multivariate"
    method = Column(String(100))        # "zscore", "iqr", "zscore,iqr", "isolation_forest"
    current_value = Column(Float, nullable=True)
    score = Column(Float, nullable=True)
    detail = Column(Text, nullable=True)
