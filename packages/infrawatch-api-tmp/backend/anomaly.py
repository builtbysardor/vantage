"""
Phase 6 — ML Anomaly Detection

Three detection methods run on every analysis call:
  1. Z-score          — per-metric statistical baseline (|z| > 3 = anomaly)
  2. IQR              — interquartile-range fence (robust to non-normal distributions)
  3. Isolation Forest — multivariate sklearn model (all metrics together)
"""
import logging
from typing import List, Optional, Tuple

import numpy as np
from sklearn.ensemble import IsolationForest

log = logging.getLogger("infrawatch.anomaly")

METRICS = [
    "cpu_usage_percent",
    "ram_usage_percent",
    "disk_usage_percent",
    "network_in_bytes_sec",
    "network_out_bytes_sec",
]

MIN_SAMPLES_ML = 20   # Isolation Forest needs at least this many rows
MIN_SAMPLES_STAT = 5  # Z-score / IQR minimum


def _zscore(history: List[float], current: float, threshold: float = 3.0) -> Tuple[float, bool]:
    if len(history) < MIN_SAMPLES_STAT:
        return 0.0, False
    arr = np.array(history, dtype=float)
    std = arr.std()
    if std < 1e-9:
        return 0.0, False
    z = abs((current - arr.mean()) / std)
    return float(z), z > threshold


def _iqr(history: List[float], current: float, factor: float = 1.5) -> Tuple[float, bool]:
    if len(history) < MIN_SAMPLES_STAT:
        return 0.0, False
    arr = np.array(history, dtype=float)
    q1, q3 = float(np.percentile(arr, 25)), float(np.percentile(arr, 75))
    iqr = q3 - q1
    if iqr < 1e-9:
        return 0.0, False
    lower, upper = q1 - factor * iqr, q3 + factor * iqr
    if current < lower:
        score = (lower - current) / iqr
    elif current > upper:
        score = (current - upper) / iqr
    else:
        score = 0.0
    return float(score), score > 0.0


def _isolation_forest(
    history_rows: List[List[float]], current_row: List[float]
) -> Tuple[float, bool]:
    """
    Fit IsolationForest on history, score current_row.
    sklearn score_samples() → negative; more negative = more anomalous.
    We map to [0, 1] where 1 = most anomalous.
    """
    if len(history_rows) < MIN_SAMPLES_ML:
        return 0.0, False
    X = np.array(history_rows, dtype=float)
    model = IsolationForest(contamination=0.05, n_estimators=100, random_state=42)
    model.fit(X)
    raw_score = float(model.score_samples([current_row])[0])
    score = float(np.clip(0.5 - raw_score, 0.0, 1.0))
    is_anomaly = model.predict([current_row])[0] == -1
    return score, is_anomaly


def analyze_snapshots(snapshots) -> dict:
    """
    Run all three anomaly detectors on a list of MetricSnapshot ORM objects.
    Snapshots must be ordered ASC by timestamp; the last element is current.

    Returns:
        {
            "sample_count": int,
            "any_anomaly": bool,
            "per_metric": [...],
            "isolation_forest": {...} | None,
        }
    """
    if not snapshots:
        return {"sample_count": 0, "any_anomaly": False, "per_metric": [], "isolation_forest": None}

    history = {m: [] for m in METRICS}
    for snap in snapshots[:-1]:
        for m in METRICS:
            v = getattr(snap, m, None)
            if v is not None:
                history[m].append(float(v))

    current = snapshots[-1]
    per_metric = []

    for m in METRICS:
        val = getattr(current, m, None)
        if val is None:
            continue
        val = float(val)
        hist = history[m]

        z_score, z_anom = _zscore(hist, val)
        iqr_score, iqr_anom = _iqr(hist, val)

        combined = min(1.0, (z_score / 6.0 + iqr_score / 3.0) / 2.0)
        methods = [*(["zscore"] if z_anom else []), *(["iqr"] if iqr_anom else [])]

        per_metric.append({
            "metric": m,
            "current_value": round(val, 4),
            "zscore": round(z_score, 4),
            "iqr_score": round(iqr_score, 4),
            "combined_score": round(combined, 4),
            "is_anomaly": z_anom or iqr_anom,
            "methods_triggered": methods,
        })

    # Build row matrix for Isolation Forest
    all_rows = [
        [getattr(s, m) or 0.0 for m in METRICS]
        for s in snapshots
    ]
    history_rows, current_row = all_rows[:-1], all_rows[-1]
    if_score, if_anom = _isolation_forest(history_rows, current_row)

    if_result: Optional[dict] = None
    if len(history_rows) >= MIN_SAMPLES_ML:
        if_result = {
            "score": round(if_score, 4),
            "is_anomaly": if_anom,
            "method": "isolation_forest",
        }

    any_anomaly = (
        any(r["is_anomaly"] for r in per_metric)
        or (if_result is not None and if_result["is_anomaly"])
    )

    return {
        "sample_count": len(snapshots),
        "any_anomaly": any_anomaly,
        "per_metric": per_metric,
        "isolation_forest": if_result,
    }
