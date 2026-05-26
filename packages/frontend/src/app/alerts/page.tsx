"use client";
import { useState, useCallback, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { StatCard } from "@/components/ui/StatCard";
import { VSection } from "@/components/ui/Section";
import { VBadge } from "@/components/ui/Badge";
import { VEmpty } from "@/components/ui/Empty";
import { VIcon } from "@/components/ui/Icons";
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
  source: string;
}

function normalize(raw: unknown, source: string, idx: number): NormalizedAlert {
  const a = (raw || {}) as Record<string, unknown>;
  const lbl = (a.labels || {}) as Record<string, unknown>;
  const sev = String(a.severity || lbl.severity || a.level || "info");
  const stat = String(a.status || a.state || "firing");
  const ts = a.fired_at || a.triggered_at || a.created_at || a.timestamp || new Date().toISOString();
  return {
    id: `${source}-${a.id || a._id || idx}`,
    name: String(a.name || a.title || a.alert_name || lbl.alertname || "Unknown Alert"),
    severity: (["critical", "warning", "info"].includes(sev) ? sev : "info") as AlertSeverity,
    status: (["firing", "resolved", "pending"].includes(stat) ? stat : "firing") as AlertStatus,
    timestamp: new Date(ts as string),
    source,
  };
}

const SEV_ICON: Record<AlertSeverity, string> = {
  critical: "xcircle",
  warning: "warn",
  info: "info",
};
const SEV_COLOR: Record<AlertSeverity, "crit" | "warn" | "brand"> = {
  critical: "crit",
  warning: "warn",
  info: "brand",
};
const STAT_COLOR: Record<AlertStatus, "crit" | "ok" | "warn"> = {
  firing: "crit",
  resolved: "ok",
  pending: "warn",
};

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

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<NormalizedAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const load = useCallback(async () => {
    const [iwr, nxr] = await Promise.allSettled([infrawatch.alerts(), nexus.alerts()]);
    const merged: NormalizedAlert[] = [];
    if (iwr.status === "fulfilled") {
      const p = iwr.value as { alerts?: unknown[] } | unknown[];
      const list = Array.isArray(p) ? p : ((p as { alerts?: unknown[] }).alerts || []);
      (list as unknown[]).forEach((a, i) => merged.push(normalize(a, "infrawatch", i)));
    }
    if (nxr.status === "fulfilled") {
      const list = Array.isArray(nxr.value) ? nxr.value : [];
      list.forEach((a, i) => merged.push(normalize(a, "nexus", i)));
    }
    merged.sort((a, b) => {
      if (a.status === "firing" && b.status !== "firing") return -1;
      if (b.status === "firing" && a.status !== "firing") return 1;
      return b.timestamp.getTime() - a.timestamp.getTime();
    });
    setAlerts(merged);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, 10000);
    return () => clearInterval(iv);
  }, [load]);

  const total = alerts.length;
  const firing = alerts.filter((a) => a.status === "firing").length;
  const pending = alerts.filter((a) => a.status === "pending").length;

  const visible = alerts.filter((a) => {
    if (filter === "all") return true;
    return a.status === filter;
  });

  return (
    <AppShell title="Alerts" firingAlerts={firing}>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <VSection
          title="Alert Center"
          sub="Aggregated from InfraWatch & Nexus — refreshes every 10s"
        >
          <div style={{ display: "flex", gap: 12 }}>
            <StatCard
              label="Total Alerts"
              value={loading ? "—" : total}
              icon="alerts"
              color="brand"
            />
            <StatCard
              label="Firing"
              value={loading ? "—" : firing}
              icon="xcircle"
              color={firing > 0 ? "crit" : "ok"}
            />
            <StatCard
              label="Pending"
              value={loading ? "—" : pending}
              icon="warn"
              color={pending > 0 ? "warn" : "ok"}
            />
          </div>
        </VSection>

        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          {/* Filter bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "12px 16px",
              borderBottom: "1px solid var(--border)",
            }}
          >
            {["all", "firing", "resolved"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: "5px 14px",
                  borderRadius: 7,
                  fontSize: 12,
                  cursor: "pointer",
                  background: filter === f ? "var(--elevated)" : "transparent",
                  border: `1px solid ${filter === f ? "var(--border)" : "transparent"}`,
                  color: filter === f ? "var(--text)" : "var(--text-muted)",
                  fontWeight: filter === f ? 600 : 400,
                }}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
            <span
              style={{
                marginLeft: "auto",
                fontSize: 11,
                color: "var(--text-muted)",
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              {visible.length} result{visible.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* List */}
          {loading ? (
            <div
              style={{
                padding: "40px",
                textAlign: "center",
                color: "var(--text-muted)",
                fontSize: 13,
              }}
            >
              Loading alerts…
            </div>
          ) : visible.length === 0 ? (
            <VEmpty
              icon="check"
              message="No active alerts — all systems nominal"
              sub={filter !== "all" ? `No ${filter} alerts at this time` : ""}
            />
          ) : (
            visible.map((a) => (
              <div
                key={a.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "11px 16px",
                  borderBottom: "1px solid var(--border)",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "var(--elevated)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                }}
              >
                <VBadge color={SEV_COLOR[a.severity] || "muted"}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <VIcon name={SEV_ICON[a.severity] || "info"} size={10} />
                    {a.severity === "critical"
                      ? "Critical"
                      : a.severity === "warning"
                      ? "Warning"
                      : "Info"}
                  </span>
                </VBadge>
                <span
                  style={{
                    flex: 1,
                    fontSize: 13,
                    color: "var(--text)",
                    fontWeight: 500,
                  }}
                >
                  {a.name}
                </span>
                <VBadge color="muted">{a.source}</VBadge>
                <VBadge color={STAT_COLOR[a.status] || "muted"}>{a.status}</VBadge>
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    fontFamily: "JetBrains Mono, monospace",
                    width: 80,
                    textAlign: "right",
                  }}
                >
                  {timeAgo(a.timestamp)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
