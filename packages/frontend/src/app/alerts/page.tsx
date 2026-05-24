"use client";
import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Bell, AlertTriangle, Info, CheckCircle, XCircle } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Topbar } from "@/components/layout/Topbar";
import { StatCard } from "@/components/ui/StatCard";
import { infrawatch } from "@/lib/api/infrawatch";
import { nexus } from "@/lib/api/nexus";

type AlertSeverity = "critical" | "warning" | "info";
type AlertStatus = "firing" | "resolved" | "pending";

interface NormalizedAlert {
  id: string;
  name: string;
  severity: AlertSeverity;
  status: AlertStatus;
  timestamp: Date;
  source: "infrawatch" | "nexus";
  labels?: Record<string, string>;
}

function normalizeInfrawatchAlert(raw: unknown, idx: number): NormalizedAlert {
  const a = raw as Record<string, unknown>;
  const labels = (a.labels ?? {}) as Record<string, string>;
  const severity = (labels.severity ?? a.severity ?? "info") as string;
  const status = (a.status ?? a.state ?? "firing") as string;
  const ts = a.fired_at ?? a.started_at ?? a.timestamp ?? a.created_at;

  return {
    id: `iw-${a.id ?? a.name ?? idx}`,
    name: (a.name ?? a.alert_name ?? a.alertname ?? labels.alertname ?? "Unknown Alert") as string,
    severity: (["critical", "warning", "info"].includes(severity) ? severity : "info") as AlertSeverity,
    status: (["firing", "resolved", "pending"].includes(status) ? status : "firing") as AlertStatus,
    timestamp: ts ? new Date(ts as string) : new Date(),
    source: "infrawatch",
    labels,
  };
}

function normalizeNexusAlert(raw: unknown, idx: number): NormalizedAlert {
  const a = raw as Record<string, unknown>;
  const severity = (a.severity ?? a.level ?? "info") as string;
  const status = (a.status ?? a.state ?? "firing") as string;
  const ts = a.triggered_at ?? a.created_at ?? a.timestamp ?? a.fired_at;

  return {
    id: `nx-${a.id ?? a._id ?? idx}`,
    name: (a.name ?? a.title ?? a.message ?? "Unknown Alert") as string,
    severity: (["critical", "warning", "info"].includes(severity) ? severity : "info") as AlertSeverity,
    status: (["firing", "resolved", "pending"].includes(status) ? status : "firing") as AlertStatus,
    timestamp: ts ? new Date(ts as string) : new Date(),
    source: "nexus",
  };
}

const severityConfig: Record<AlertSeverity, { label: string; classes: string; icon: typeof Bell }> = {
  critical: {
    label: "Critical",
    classes: "bg-critical/10 text-critical border border-critical/20",
    icon: XCircle,
  },
  warning: {
    label: "Warning",
    classes: "bg-warn/10 text-warn border border-warn/20",
    icon: AlertTriangle,
  },
  info: {
    label: "Info",
    classes: "bg-brand/10 text-brand border border-brand/20",
    icon: Info,
  },
};

const statusConfig: Record<AlertStatus, { label: string; classes: string }> = {
  firing: { label: "Firing", classes: "text-critical" },
  resolved: { label: "Resolved", classes: "text-ok" },
  pending: { label: "Pending", classes: "text-warn" },
};

type FilterMode = "all" | "firing" | "resolved";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<NormalizedAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterMode>("all");

  async function fetchAlerts() {
    const [iwResult, nxResult] = await Promise.allSettled([
      infrawatch.alerts(),
      nexus.alerts(),
    ]);

    const merged: NormalizedAlert[] = [];

    if (iwResult.status === "fulfilled") {
      const payload = iwResult.value as { alerts?: unknown[]; total?: number; firing?: number };
      const list = Array.isArray(payload) ? payload : (payload.alerts ?? []);
      list.forEach((a, i) => merged.push(normalizeInfrawatchAlert(a, i)));
    }

    if (nxResult.status === "fulfilled") {
      const list = Array.isArray(nxResult.value) ? nxResult.value : [];
      list.forEach((a, i) => merged.push(normalizeNexusAlert(a, i)));
    }

    // Sort: firing first, then by recency
    merged.sort((a, b) => {
      if (a.status === "firing" && b.status !== "firing") return -1;
      if (b.status === "firing" && a.status !== "firing") return 1;
      return b.timestamp.getTime() - a.timestamp.getTime();
    });

    setAlerts(merged);
    setLoading(false);
  }

  useEffect(() => {
    fetchAlerts();
    const iv = setInterval(fetchAlerts, 10_000);
    return () => clearInterval(iv);
  }, []);

  const total = alerts.length;
  const firing = alerts.filter((a) => a.status === "firing").length;
  const pending = alerts.filter((a) => a.status === "pending").length;

  const filtered = alerts.filter((a) => {
    if (filter === "all") return true;
    if (filter === "firing") return a.status === "firing";
    if (filter === "resolved") return a.status === "resolved";
    return true;
  });

  const filterButtons: { key: FilterMode; label: string }[] = [
    { key: "all", label: "All" },
    { key: "firing", label: "Firing" },
    { key: "resolved", label: "Resolved" },
  ];

  return (
    <AppShell>
      <Topbar title="Alerts" />
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-base font-semibold text-text">Alert Center</h2>
          <p className="text-xs text-muted mt-0.5">Aggregated from InfraWatch &amp; Nexus — refreshes every 10s</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            label="Total Alerts"
            value={loading ? "—" : total}
            icon={Bell}
            color="brand"
          />
          <StatCard
            label="Firing"
            value={loading ? "—" : firing}
            icon={XCircle}
            color={firing > 0 ? "critical" : "ok"}
          />
          <StatCard
            label="Pending"
            value={loading ? "—" : pending}
            icon={AlertTriangle}
            color={pending > 0 ? "warn" : "ok"}
          />
        </div>

        {/* Filter bar + list */}
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          {/* Filter buttons */}
          <div className="flex items-center gap-1 px-4 py-3 border-b border-border">
            {filterButtons.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filter === key
                    ? "bg-elevated text-brand border border-border"
                    : "text-muted hover:text-text hover:bg-elevated/50"
                }`}
              >
                {label}
              </button>
            ))}
            {!loading && (
              <span className="ml-auto text-xs text-muted font-mono">
                {filtered.length} result{filtered.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Alert list */}
          {loading ? (
            <div className="px-4 py-12 text-center text-sm text-muted">Loading alerts…</div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <CheckCircle size={28} className="text-ok mx-auto mb-3" />
              <p className="text-sm font-medium text-ok">No active alerts — all systems nominal</p>
              <p className="text-xs text-muted mt-1">
                {filter !== "all" ? `No ${filter} alerts at this time.` : "No alerts from any source."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((alert) => {
                const sev = severityConfig[alert.severity];
                const SevIcon = sev.icon;
                const stat = statusConfig[alert.status];

                return (
                  <div key={alert.id} className="flex items-center gap-4 px-4 py-3 hover:bg-elevated/30 transition-colors">
                    {/* Severity badge */}
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${sev.classes}`}>
                      <SevIcon size={11} />
                      {sev.label}
                    </span>

                    {/* Alert name */}
                    <span className="flex-1 text-sm text-text font-medium truncate">{alert.name}</span>

                    {/* Source badge */}
                    <span className="text-xs text-muted px-2 py-0.5 bg-elevated rounded-full border border-border shrink-0">
                      {alert.source}
                    </span>

                    {/* Status */}
                    <span className={`text-xs font-medium shrink-0 ${stat.classes}`}>
                      {stat.label}
                    </span>

                    {/* Time */}
                    <span className="text-xs text-muted font-mono shrink-0 w-28 text-right">
                      {(() => {
                        try {
                          return formatDistanceToNow(alert.timestamp, { addSuffix: true });
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
      </div>
    </AppShell>
  );
}
