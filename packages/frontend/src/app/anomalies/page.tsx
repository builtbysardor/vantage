"use client";
import { useState, useCallback, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { StatCard } from "@/components/ui/StatCard";
import { VSection } from "@/components/ui/Section";
import { VBadge } from "@/components/ui/Badge";
import { VEmpty } from "@/components/ui/Empty";
import { VIcon } from "@/components/ui/Icons";
import { infrawatch } from "@/lib/api/infrawatch";

interface AnomalyEvent {
  id: string;
  metric: string;
  method: string;
  score: number;
  timestamp: Date;
  value?: number;
}

interface AnomalySummary {
  total?: number;
  count?: number;
  most_affected_metric?: string;
  top_metric?: string;
  detection_methods?: string[];
  [key: string]: unknown;
}

function methodColor(m: string): "brand" | "accent" | "warn" | "muted" {
  const map: Record<string, "brand" | "accent" | "warn" | "muted"> = {
    zscore: "brand",
    iqr: "accent",
    isolation_forest: "warn",
  };
  return map[(m || "").toLowerCase()] || "muted";
}

function methodLabel(m: string) {
  const map: Record<string, string> = {
    zscore: "Z-Score",
    iqr: "IQR",
    isolation_forest: "Isolation Forest",
  };
  return map[(m || "").toLowerCase()] || m;
}

function timeAgo(ts: Date) {
  try {
    const s = Math.round((Date.now() - ts.getTime()) / 1000);
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    return `${Math.floor(s / 3600)}h ago`;
  } catch {
    return "—";
  }
}

export default function AnomaliesPage() {
  const [anomalies, setAnomalies] = useState<AnomalyEvent[]>([]);
  const [summary, setSummary] = useState<AnomalySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [ar, sr] = await Promise.allSettled([
        infrawatch.anomalies(24),
        infrawatch.anomalySummary(24),
      ]);
      if (ar.status === "fulfilled") {
        const events: AnomalyEvent[] = (Array.isArray(ar.value) ? ar.value : []).map(
          (a: unknown, i: number) => {
            const obj = (a || {}) as Record<string, unknown>;
            return {
              id: `an-${obj.id ?? i}`,
              metric: String(obj.metric || obj.metric_name || "unknown"),
              method: String(obj.method || obj.detection_method || "zscore"),
              score: parseFloat(String(obj.score ?? obj.anomaly_score ?? 0)),
              timestamp: new Date(String(obj.timestamp || obj.detected_at || Date.now())),
              value: obj.value != null ? parseFloat(String(obj.value)) : undefined,
            };
          }
        );
        events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        setAnomalies(events);
      } else {
        const msg = (ar.reason as Error)?.message || "";
        if (msg.includes("501") || msg.includes("503") || msg.includes("not enabled")) {
          setError("Anomaly detection not enabled. Set DB_ENABLED=true in InfraWatch config.");
        } else {
          setError(`Failed to load anomaly data: ${msg}`);
        }
      }
      if (sr.status === "fulfilled") {
        setSummary(sr.value as AnomalySummary);
      }
    } catch (e) {
      setError((e as Error).message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const total = summary?.total ?? summary?.count ?? anomalies.length;
  const topMet =
    summary?.most_affected_metric ??
    summary?.top_metric ??
    (anomalies[0]?.metric || "—");
  const methods = (summary?.detection_methods as string[]) ?? [
    ...new Set(anomalies.map((a) => a.method)),
  ];

  return (
    <AppShell title="Anomalies">
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <VSection
          title="Anomaly Detection"
          sub="Last 24 hours — powered by InfraWatch ML engine"
        >
          {error ? (
            <div
              style={{
                background: "var(--warn-dim)",
                border: "1px solid var(--warn)",
                borderRadius: 12,
                padding: "18px 20px",
                display: "flex",
                gap: 14,
                alignItems: "flex-start",
              }}
            >
              <VIcon
                name="warn"
                size={20}
                style={{ color: "var(--warn)", flexShrink: 0 }}
              />
              <div>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--warn)",
                    margin: 0,
                  }}
                >
                  Anomaly detection unavailable
                </p>
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted)",
                    marginTop: 4,
                    marginBottom: 0,
                  }}
                >
                  {error}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
                <StatCard
                  label="Anomalies Detected"
                  value={loading ? "—" : total}
                  icon="anomalies"
                  color={total > 0 ? "warn" : "ok"}
                />
                <StatCard
                  label="Most Affected Metric"
                  value={loading ? "—" : topMet}
                  icon="barchart"
                  color="brand"
                />
                <StatCard
                  label="Detection Methods"
                  value={loading ? "—" : methods.length || "—"}
                  icon="flask"
                  color="accent"
                  sub={methods.slice(0, 2).join(", ") || undefined}
                />
              </div>

              <div
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--border)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                    }}
                  >
                    Anomaly Events
                  </span>
                  {!loading && (
                    <VBadge color="muted">
                      {anomalies.length} event{anomalies.length !== 1 ? "s" : ""}
                    </VBadge>
                  )}
                </div>

                {loading ? (
                  <div
                    style={{
                      padding: "40px",
                      textAlign: "center",
                      color: "var(--text-muted)",
                      fontSize: 13,
                    }}
                  >
                    Loading anomaly data…
                  </div>
                ) : anomalies.length === 0 ? (
                  <VEmpty
                    icon="check"
                    message="No anomalies detected in the last 24 hours"
                    sub="All metrics are within expected ranges"
                  />
                ) : (
                  anomalies.map((a) => (
                    <div
                      key={a.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "11px 16px",
                        borderBottom: "1px solid var(--border)",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background =
                          "var(--elevated)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = "transparent";
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "JetBrains Mono, monospace",
                          fontSize: 13,
                          color: "var(--text)",
                          flex: 1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {a.metric}
                      </span>
                      <VBadge color={methodColor(a.method)}>
                        {methodLabel(a.method)}
                      </VBadge>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          score
                        </span>
                        <span
                          style={{
                            fontFamily: "JetBrains Mono, monospace",
                            fontSize: 13,
                            color: "var(--warn)",
                            fontWeight: 700,
                          }}
                        >
                          {isNaN(a.score) ? "—" : a.score.toFixed(3)}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--text-muted)",
                          fontFamily: "JetBrains Mono, monospace",
                          width: 72,
                          textAlign: "right",
                        }}
                      >
                        {timeAgo(a.timestamp)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </VSection>
      </div>
    </AppShell>
  );
}
