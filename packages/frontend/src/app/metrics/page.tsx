"use client";
import { useState, useCallback, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { StatCard } from "@/components/ui/StatCard";
import { VSection } from "@/components/ui/Section";
import { VEmpty } from "@/components/ui/Empty";
import { VLineChart } from "@/components/ui/LineChart";
import { infrawatch } from "@/lib/api/infrawatch";

interface AnalyticsSummary {
  avg_cpu?: number;
  avg_ram?: number;
  max_cpu?: number;
  max_ram?: number;
  cpu?: { avg_percent?: number; max_percent?: number };
  ram?: { avg_percent?: number; max_percent?: number };
}

interface HistoryPoint {
  cpu: number;
  ram: number;
  _label: string;
  [key: string]: number | string | undefined;
}

export default function MetricsPage() {
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [hours, setHours] = useState(24);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [h, a] = await Promise.all([
        infrawatch.historyMetrics(hours),
        infrawatch.analytics(hours),
      ]);
      const snaps = Array.isArray(h) ? h : [];
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
      setAnalytics(a as AnalyticsSummary);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [hours]);

  useEffect(() => {
    setLoading(true);
    load();
    const iv = setInterval(load, 10000);
    return () => clearInterval(iv);
  }, [load]);

  const ag = analytics || {};
  const avgCpu = ag.avg_cpu ?? ag.cpu?.avg_percent ?? null;
  const avgRam = ag.avg_ram ?? ag.ram?.avg_percent ?? null;
  const maxCpu = ag.max_cpu ?? ag.cpu?.max_percent ?? null;
  const maxRam = ag.max_ram ?? ag.ram?.max_percent ?? null;

  const TimeBtn = ({ h, label }: { h: number; label: string }) => (
    <button
      onClick={() => setHours(h)}
      style={{
        padding: "5px 12px",
        borderRadius: 7,
        fontSize: 12,
        cursor: "pointer",
        background: hours === h ? "var(--brand-dim)" : "var(--elevated)",
        border: `1px solid ${hours === h ? "var(--brand)" : "var(--border)"}`,
        color: hours === h ? "var(--brand)" : "var(--text-sec)",
        fontWeight: hours === h ? 600 : 400,
      }}
    >
      {label}
    </button>
  );

  return (
    <AppShell title="Metrics">
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <VSection
          title="Analytics Summary"
          sub={`Aggregated over the last ${hours} hours`}
        >
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <StatCard
              label="Avg CPU"
              value={loading ? "—" : avgCpu != null ? `${avgCpu.toFixed(1)}%` : "—"}
              icon="cpu"
              color={
                avgCpu == null
                  ? "brand"
                  : avgCpu > 80
                  ? "crit"
                  : avgCpu > 60
                  ? "warn"
                  : "ok"
              }
              sub={`${hours}h average`}
            />
            <StatCard
              label="Avg RAM"
              value={loading ? "—" : avgRam != null ? `${avgRam.toFixed(1)}%` : "—"}
              icon="ram"
              color={
                avgRam == null
                  ? "brand"
                  : avgRam > 85
                  ? "crit"
                  : avgRam > 70
                  ? "warn"
                  : "ok"
              }
              sub={`${hours}h average`}
            />
            <StatCard
              label="Max CPU"
              value={loading ? "—" : maxCpu != null ? `${maxCpu.toFixed(1)}%` : "—"}
              icon="cpu"
              color={
                maxCpu == null
                  ? "brand"
                  : maxCpu > 90
                  ? "crit"
                  : maxCpu > 70
                  ? "warn"
                  : "ok"
              }
              sub={`${hours}h peak`}
            />
            <StatCard
              label="Max RAM"
              value={loading ? "—" : maxRam != null ? `${maxRam.toFixed(1)}%` : "—"}
              icon="ram"
              color={
                maxRam == null
                  ? "brand"
                  : maxRam > 90
                  ? "crit"
                  : maxRam > 75
                  ? "warn"
                  : "ok"
              }
              sub={`${hours}h peak`}
            />
          </div>
        </VSection>

        <VSection
          title="CPU & RAM Over Time"
          sub="Historical performance data"
          action={
            <div style={{ display: "flex", gap: 6 }}>
              <TimeBtn h={1} label="1h" />
              <TimeBtn h={6} label="6h" />
              <TimeBtn h={24} label="24h" />
            </div>
          }
        >
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "18px 20px",
            }}
          >
            {loading ? (
              <div
                style={{
                  height: 220,
                  background: "var(--elevated)",
                  borderRadius: 8,
                  animation: "pulse 1.5s infinite",
                }}
              />
            ) : error ? (
              <VEmpty icon="warn" message="Failed to load metrics" sub={error} />
            ) : history.length === 0 ? (
              <VEmpty
                icon="metrics"
                message="No historical data available"
                sub="Data will appear after collection starts"
              />
            ) : (
              <VLineChart
                data={history}
                height={240}
                series={[
                  { key: "cpu", color: "#06B6D4", label: "CPU %" },
                  { key: "ram", color: "#0EA5E9", label: "RAM %" },
                ]}
              />
            )}
          </div>
        </VSection>
      </div>
    </AppShell>
  );
}
