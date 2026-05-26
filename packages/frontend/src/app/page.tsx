"use client";
import { useState, useCallback, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { StatCard } from "@/components/ui/StatCard";
import { VSection } from "@/components/ui/Section";
import { VBadge } from "@/components/ui/Badge";
import { VTable } from "@/components/ui/Table";
import { VEmpty } from "@/components/ui/Empty";
import { VLineChart } from "@/components/ui/LineChart";
import { useV } from "@/lib/vcontext";
import { infrawatch } from "@/lib/api/infrawatch";
import { nexus } from "@/lib/api/nexus";

interface MetricsData {
  cpu_usage_percent?: number;
  ram_usage_percent?: number;
  disk_usage_percent?: number;
  network_in_bytes_sec?: number;
  network_out_bytes_sec?: number;
}

interface AlertsData {
  firing?: number;
  total?: number;
  alerts?: unknown[];
}

interface ServiceRow {
  name: string;
  status: string;
  cpu?: number;
  cpu_percent?: number;
  memory?: unknown;
  memory_percent?: unknown;
  uptime?: unknown;
  [key: string]: unknown;
}

interface HistoryPoint {
  cpu: number;
  ram: number;
  _label: string;
  [key: string]: number | string | undefined;
}

export default function OverviewPage() {
  const { setFiringAlerts } = useV();
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [alerts, setAlerts] = useState<AlertsData | null>(null);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [m, a, s, h] = await Promise.allSettled([
      infrawatch.metrics(),
      infrawatch.alerts(),
      nexus.services(),
      infrawatch.historyMetrics(6),
    ]);
    if (m.status === "fulfilled") setMetrics(m.value as MetricsData);
    if (a.status === "fulfilled") {
      const av = a.value as AlertsData;
      setAlerts(av);
      setFiringAlerts(av?.firing ?? 0);
    }
    if (s.status === "fulfilled") {
      setServices(Array.isArray(s.value) ? (s.value as ServiceRow[]) : []);
    }
    if (h.status === "fulfilled") {
      const snaps = Array.isArray(h.value) ? h.value : [];
      setHistory(
        (snaps as Record<string, unknown>[]).map((p) => ({
          cpu: Number(p.cpu_usage_percent ?? 0),
          ram: Number(p.ram_usage_percent ?? 0),
          _label: p.timestamp
            ? new Date(p.timestamp as string).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "",
        }))
      );
    }
    setLoading(false);
  }, [setFiringAlerts]);

  useEffect(() => {
    load();
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  }, [load]);

  const cpu = metrics?.cpu_usage_percent ?? 0;
  const ram = metrics?.ram_usage_percent ?? 0;
  const disk = metrics?.disk_usage_percent ?? 0;
  const netIn = ((metrics?.network_in_bytes_sec ?? 0) / 1024).toFixed(1);
  const netOut = ((metrics?.network_out_bytes_sec ?? 0) / 1024).toFixed(1);
  const firing = alerts?.firing ?? 0;

  const cpuClr = cpu > 80 ? "crit" : cpu > 60 ? "warn" : "ok";
  const ramClr = ram > 85 ? "crit" : ram > 70 ? "warn" : "ok";
  const diskClr = disk > 90 ? "crit" : disk > 75 ? "warn" : "brand";

  const running = services.filter(
    (s) => s.status === "running" || s.status === "active"
  ).length;

  return (
    <AppShell title="Overview" firingAlerts={firing}>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <VSection title="System Overview" sub="Real-time metrics from all sources">
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <StatCard
              label="CPU Usage"
              value={loading ? "—" : `${cpu.toFixed(1)}%`}
              icon="cpu"
              color={cpuClr as "ok" | "warn" | "crit"}
            />
            <StatCard
              label="RAM Usage"
              value={loading ? "—" : `${ram.toFixed(1)}%`}
              icon="ram"
              color={ramClr as "ok" | "warn" | "crit"}
            />
            <StatCard
              label="Disk Usage"
              value={loading ? "—" : `${disk.toFixed(1)}%`}
              icon="disk"
              color={diskClr as "brand" | "warn" | "crit"}
            />
            <StatCard
              label="Firing Alerts"
              value={loading ? "—" : firing}
              icon="alerts"
              color={firing > 0 ? "crit" : "ok"}
            />
          </div>
        </VSection>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <StatCard label="Net In" value={loading ? "—" : `${netIn} KB/s`} icon="wifi" color="accent" />
          <StatCard label="Net Out" value={loading ? "—" : `${netOut} KB/s`} icon="wifi" color="accent" />
          <StatCard
            label="Services"
            value={loading ? "—" : services.length}
            icon="services"
            color="brand"
          />
          <StatCard
            label="Total Alerts"
            value={loading ? "—" : alerts?.total ?? 0}
            icon="alerts"
            color="brand"
          />
        </div>

        {/* CPU & RAM Chart */}
        <VSection title="CPU & RAM — 6h" sub="Live system performance">
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "18px 20px",
            }}
          >
            {history.length === 0 ? (
              <VEmpty
                icon="metrics"
                message="No historical data yet"
                sub="Metrics will appear after the first collection interval"
              />
            ) : (
              <VLineChart
                data={history}
                series={[
                  { key: "cpu", color: "#06B6D4", label: "CPU" },
                  { key: "ram", color: "#0EA5E9", label: "RAM" },
                ]}
                height={220}
              />
            )}
          </div>
        </VSection>

        {/* Service Health */}
        <VSection
          title="Service Health"
          sub={`${running} of ${services.length} running`}
        >
          {services.length === 0 ? (
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
              }}
            >
              <VEmpty
                icon="services"
                message="No service data"
                sub="Nexus backend may be unreachable"
              />
            </div>
          ) : (
            <VTable
              columns={[
                { key: "name", label: "Service" },
                {
                  key: "status",
                  label: "Status",
                  render: (v) => {
                    const ok = v === "running" || v === "active";
                    return (
                      <VBadge color={ok ? "ok" : "crit"}>{String(v)}</VBadge>
                    );
                  },
                },
                {
                  key: "cpu",
                  label: "CPU",
                  align: "right",
                  render: (v, row) => {
                    const n = Number((row as ServiceRow).cpu_percent ?? (row as ServiceRow).cpu ?? v);
                    return (
                      <span
                        style={{
                          fontFamily: "JetBrains Mono, monospace",
                          fontSize: 12,
                        }}
                      >
                        {isNaN(n) ? "—" : `${n.toFixed(1)}%`}
                      </span>
                    );
                  },
                },
                {
                  key: "memory",
                  label: "Memory",
                  align: "right",
                  render: (v, row) => (
                    <span
                      style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12 }}
                    >
                      {String((row as ServiceRow).memory ?? (row as ServiceRow).memory_percent ?? v ?? "—")}
                    </span>
                  ),
                },
                {
                  key: "uptime",
                  label: "Uptime",
                  align: "right",
                  render: (v, row) => (
                    <span
                      style={{
                        fontFamily: "JetBrains Mono, monospace",
                        fontSize: 12,
                        color: "var(--text-muted)",
                      }}
                    >
                      {String((row as ServiceRow).uptime ?? v ?? "—")}
                    </span>
                  ),
                },
              ]}
              rows={services as unknown as Record<string, unknown>[]}
              emptyMsg="No services running"
            />
          )}
        </VSection>
      </div>
    </AppShell>
  );
}
