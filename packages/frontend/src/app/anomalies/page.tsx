"use client";
import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Zap, CheckCircle, AlertCircle, BarChart2, FlaskConical } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Topbar } from "@/components/layout/Topbar";
import { StatCard } from "@/components/ui/StatCard";
import { infrawatch } from "@/lib/api/infrawatch";

type DetectionMethod = "zscore" | "iqr" | "isolation_forest" | string;

interface AnomalyEvent {
  id: string;
  metric: string;
  method: DetectionMethod;
  score: number;
  timestamp: Date;
  value?: number;
}

interface AnomalySummary {
  total: number;
  mostAffectedMetric: string;
  methods: string[];
}

function normalizeAnomaly(raw: unknown, idx: number): AnomalyEvent {
  const a = raw as Record<string, unknown>;
  const ts = a.timestamp ?? a.detected_at ?? a.created_at ?? a.time;
  return {
    id: `an-${a.id ?? idx}`,
    metric: (a.metric ?? a.metric_name ?? a.name ?? "unknown") as string,
    method: (a.method ?? a.detection_method ?? a.algorithm ?? "zscore") as string,
    score: parseFloat(String(a.score ?? a.anomaly_score ?? a.z_score ?? 0)),
    timestamp: ts ? new Date(ts as string) : new Date(),
    value: a.value != null ? parseFloat(String(a.value)) : undefined,
  };
}

function normalizeSummary(raw: unknown, anomalies: AnomalyEvent[]): AnomalySummary {
  const s = raw as Record<string, unknown>;

  // Count per-metric occurrences from raw anomaly list for fallback
  const metricCounts: Record<string, number> = {};
  for (const a of anomalies) {
    metricCounts[a.metric] = (metricCounts[a.metric] ?? 0) + 1;
  }
  const topMetric =
    Object.entries(metricCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  const methodsFromList = [...new Set(anomalies.map((a) => a.method))];

  return {
    total: (s.total ?? s.count ?? s.total_anomalies ?? anomalies.length) as number,
    mostAffectedMetric:
      (s.most_affected_metric ?? s.top_metric ?? s.most_common_metric ?? topMetric) as string,
    methods:
      Array.isArray(s.detection_methods)
        ? (s.detection_methods as string[])
        : Array.isArray(s.methods)
        ? (s.methods as string[])
        : methodsFromList.length > 0
        ? methodsFromList
        : ["—"],
  };
}

const methodConfig: Record<string, { label: string; classes: string }> = {
  zscore: {
    label: "Z-Score",
    classes: "bg-brand/10 text-brand border border-brand/20",
  },
  iqr: {
    label: "IQR",
    classes: "bg-accent/10 text-accent border border-accent/20",
  },
  isolation_forest: {
    label: "Isolation Forest",
    classes: "bg-warn/10 text-warn border border-warn/20",
  },
};

function getMethodConfig(method: string) {
  return (
    methodConfig[method.toLowerCase()] ?? {
      label: method,
      classes: "bg-muted/10 text-muted border border-border",
    }
  );
}

export default function AnomaliesPage() {
  const [anomalies, setAnomalies] = useState<AnomalyEvent[]>([]);
  const [summary, setSummary] = useState<AnomalySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setError(null);
      try {
        const [anomalyResult, summaryResult] = await Promise.allSettled([
          infrawatch.anomalies(24),
          infrawatch.anomalySummary(24),
        ]);

        let events: AnomalyEvent[] = [];

        if (anomalyResult.status === "fulfilled") {
          const list = Array.isArray(anomalyResult.value) ? anomalyResult.value : [];
          events = list.map((a, i) => normalizeAnomaly(a, i));
          // Sort most recent first
          events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
          setAnomalies(events);
        } else {
          // Check if this is a DB_ENABLED / feature-flag style error
          const msg = (anomalyResult.reason as Error)?.message ?? "";
          if (msg.includes("501") || msg.includes("503") || msg.includes("not enabled") || msg.includes("disabled")) {
            setError("Anomaly detection is not enabled on this InfraWatch instance. Set DB_ENABLED=true to activate.");
          } else if (msg.includes("404")) {
            setError("Anomaly detection endpoint not found. Ensure InfraWatch v2+ is running.");
          } else {
            setError(`Failed to load anomaly data: ${msg}`);
          }
          setLoading(false);
          return;
        }

        if (summaryResult.status === "fulfilled") {
          setSummary(normalizeSummary(summaryResult.value, events));
        } else {
          // Build summary from anomaly list alone
          setSummary(normalizeSummary({}, events));
        }
      } catch (err) {
        setError(`Unexpected error: ${(err as Error).message}`);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const summaryData = summary ?? { total: 0, mostAffectedMetric: "—", methods: [] };

  return (
    <AppShell>
      <Topbar title="Anomalies" />
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-base font-semibold text-text">Anomaly Detection</h2>
          <p className="text-xs text-muted mt-0.5">Last 24 hours — powered by InfraWatch ML engine</p>
        </div>

        {/* Error state */}
        {error ? (
          <div className="bg-surface border border-border rounded-xl p-6 flex items-start gap-4">
            <AlertCircle size={20} className="text-warn shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-warn">Anomaly detection unavailable</p>
              <p className="text-xs text-muted mt-1">{error}</p>
            </div>
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4">
              <StatCard
                label="Anomalies Detected"
                value={loading ? "—" : summaryData.total}
                icon={Zap}
                color={summaryData.total > 0 ? "warn" : "ok"}
              />
              <StatCard
                label="Most Affected Metric"
                value={loading ? "—" : summaryData.mostAffectedMetric}
                icon={BarChart2}
                color="brand"
              />
              <StatCard
                label="Detection Methods"
                value={loading ? "—" : summaryData.methods.length > 0 ? summaryData.methods.length : "—"}
                sub={loading ? undefined : summaryData.methods.slice(0, 2).join(", ") || undefined}
                icon={FlaskConical}
                color="accent"
              />
            </div>

            {/* Anomaly list */}
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <p className="text-xs font-semibold text-muted uppercase tracking-wider">Anomaly Events</p>
                {!loading && (
                  <span className="text-xs text-muted font-mono">
                    {anomalies.length} event{anomalies.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {loading ? (
                <div className="px-4 py-12 text-center text-sm text-muted">Loading anomaly data…</div>
              ) : anomalies.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <CheckCircle size={28} className="text-ok mx-auto mb-3" />
                  <p className="text-sm font-medium text-ok">No anomalies detected in the last 24 hours</p>
                  <p className="text-xs text-muted mt-1">All metrics are within expected ranges.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {anomalies.map((anomaly) => {
                    const methodCfg = getMethodConfig(anomaly.method);
                    return (
                      <div key={anomaly.id} className="flex items-center gap-4 px-4 py-3 hover:bg-elevated/30 transition-colors">
                        {/* Metric name */}
                        <span className="font-mono text-sm text-text flex-1 truncate">{anomaly.metric}</span>

                        {/* Detection method badge */}
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${methodCfg.classes}`}>
                          {methodCfg.label}
                        </span>

                        {/* Score */}
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-xs text-muted">score</span>
                          <span className="font-mono text-sm text-warn font-semibold">
                            {isNaN(anomaly.score) ? "—" : anomaly.score.toFixed(2)}
                          </span>
                        </div>

                        {/* Timestamp */}
                        <span className="text-xs text-muted font-mono shrink-0 w-28 text-right">
                          {(() => {
                            try {
                              return formatDistanceToNow(anomaly.timestamp, { addSuffix: true });
                            } catch {
                              return "—";
                            }
                          })()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
