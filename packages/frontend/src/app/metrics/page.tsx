"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Cpu, MemoryStick } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Topbar } from "@/components/layout/Topbar";
import { StatCard } from "@/components/ui/StatCard";
import { infrawatch } from "@/lib/api/infrawatch";

interface HistoryPoint {
  timestamp: string;
  cpu_usage_percent?: number;
  ram_usage_percent?: number;
  [key: string]: unknown;
}

interface AnalyticsSummary {
  avg_cpu?: number;
  avg_ram?: number;
  max_cpu?: number;
  max_ram?: number;
  [key: string]: unknown;
}

function SkeletonCard() {
  return (
    <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
      <div className="h-3 w-24 bg-elevated rounded animate-pulse" />
      <div className="h-7 w-16 bg-elevated rounded animate-pulse" />
    </div>
  );
}

export default function MetricsPage() {
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchData() {
    try {
      const [hist, analy] = await Promise.all([
        infrawatch.historyMetrics(24) as Promise<HistoryPoint[]>,
        infrawatch.analytics(24) as Promise<AnalyticsSummary>,
      ]);
      setHistory(hist ?? []);
      setAnalytics(analy ?? null);
      setError(null);
    } catch (e) {
      setError((e as Error).message ?? "Failed to load metrics");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    const iv = setInterval(fetchData, 5000);
    return () => clearInterval(iv);
  }, []);

  const avgCpu = analytics?.avg_cpu ?? null;
  const avgRam = analytics?.avg_ram ?? null;
  const maxCpu = analytics?.max_cpu ?? null;
  const maxRam = analytics?.max_ram ?? null;

  const chartData = history.map((p) => ({
    ...p,
    _label: p.timestamp
      ? (() => {
          try {
            return format(new Date(p.timestamp), "HH:mm");
          } catch {
            return p.timestamp;
          }
        })()
      : "",
  }));

  return (
    <AppShell>
      <Topbar title="Metrics — 24h History" />
      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-base font-semibold text-text">Analytics Summary</h2>
          <p className="text-xs text-muted mt-0.5">Aggregated over the last 24 hours</p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : (
            <>
              <StatCard
                label="Avg CPU"
                value={avgCpu !== null ? `${avgCpu.toFixed(1)}%` : "—"}
                icon={Cpu}
                color={
                  avgCpu === null
                    ? "brand"
                    : avgCpu > 80
                    ? "critical"
                    : avgCpu > 60
                    ? "warn"
                    : "ok"
                }
                sub="24h average"
              />
              <StatCard
                label="Avg RAM"
                value={avgRam !== null ? `${avgRam.toFixed(1)}%` : "—"}
                icon={MemoryStick}
                color={
                  avgRam === null
                    ? "brand"
                    : avgRam > 85
                    ? "critical"
                    : avgRam > 70
                    ? "warn"
                    : "ok"
                }
                sub="24h average"
              />
              <StatCard
                label="Max CPU"
                value={maxCpu !== null ? `${maxCpu.toFixed(1)}%` : "—"}
                icon={Cpu}
                color={
                  maxCpu === null
                    ? "brand"
                    : maxCpu > 90
                    ? "critical"
                    : maxCpu > 70
                    ? "warn"
                    : "ok"
                }
                sub="24h peak"
              />
              <StatCard
                label="Max RAM"
                value={maxRam !== null ? `${maxRam.toFixed(1)}%` : "—"}
                icon={MemoryStick}
                color={
                  maxRam === null
                    ? "brand"
                    : maxRam > 90
                    ? "critical"
                    : maxRam > 75
                    ? "warn"
                    : "ok"
                }
                sub="24h peak"
              />
            </>
          )}
        </div>

        {/* Chart */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">
            CPU &amp; RAM Over Time
          </p>

          {loading ? (
            <div className="h-[280px] bg-elevated rounded-lg animate-pulse" />
          ) : error ? (
            <div className="h-[280px] flex items-center justify-center">
              <p className="text-sm text-critical">{error}</p>
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-[280px] flex items-center justify-center">
              <p className="text-sm text-muted">No historical data yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart
                data={chartData}
                margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
              >
                <CartesianGrid stroke="#1E2D47" strokeDasharray="3 3" />
                <XAxis
                  dataKey="_label"
                  tick={{ fontSize: 11, fill: "#64748B" }}
                  axisLine={{ stroke: "#1E2D47" }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontSize: 11, fill: "#64748B" }}
                  axisLine={{ stroke: "#1E2D47" }}
                  tickLine={false}
                  width={44}
                />
                <Tooltip
                  contentStyle={{
                    background: "#0F1629",
                    border: "1px solid #1E2D47",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "#E2E8F0",
                  }}
                  formatter={(value: unknown, name: unknown) => [
                    `${(value as number).toFixed(1)}%`,
                    name === "cpu_usage_percent" ? "CPU" : "RAM",
                  ]}
                  labelFormatter={(label) => `Time: ${label}`}
                />
                <Legend
                  formatter={(value) =>
                    value === "cpu_usage_percent" ? "CPU" : "RAM"
                  }
                  wrapperStyle={{ fontSize: "12px", color: "#64748B" }}
                />
                <Line
                  type="monotone"
                  dataKey="cpu_usage_percent"
                  stroke="#06B6D4"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="ram_usage_percent"
                  stroke="#0EA5E9"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </AppShell>
  );
}
