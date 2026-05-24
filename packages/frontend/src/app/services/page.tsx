"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Topbar } from "@/components/layout/Topbar";
import { nexus } from "@/lib/api/nexus";

interface Service {
  name?: string;
  status?: string;
  cpu_percent?: number;
  cpu?: number;
  memory?: string | number;
  memory_percent?: number;
  uptime?: string | number;
  [key: string]: unknown;
}

type StatusVariant = "running" | "stopped" | "unknown";

function statusVariant(status?: string): StatusVariant {
  if (!status) return "unknown";
  const s = status.toLowerCase();
  if (s === "running" || s === "active") return "running";
  if (s === "stopped" || s === "exited" || s === "dead" || s === "failed") return "stopped";
  return "unknown";
}

const statusStyles: Record<StatusVariant, string> = {
  running: "bg-ok/10 text-ok border border-ok/20",
  stopped: "bg-critical/10 text-critical border border-critical/20",
  unknown: "bg-elevated text-muted border border-border",
};

function formatUptime(uptime: string | number | undefined): string {
  if (uptime === undefined || uptime === null) return "—";
  if (typeof uptime === "string") return uptime;
  // Assume seconds
  const s = Math.floor(uptime);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h < 24 ? `${h}h ${m}m` : `${Math.floor(h / 24)}d ${h % 24}h`;
}

function formatMemory(mem: string | number | undefined): string {
  if (mem === undefined || mem === null) return "—";
  if (typeof mem === "string") return mem;
  // Assume bytes if large number, else percent
  if (mem > 1_000_000) {
    return mem > 1_073_741_824
      ? `${(mem / 1_073_741_824).toFixed(1)} GB`
      : `${(mem / 1_048_576).toFixed(1)} MB`;
  }
  return `${mem.toFixed(1)}%`;
}

function SkeletonRow() {
  return (
    <tr className="border-b border-border">
      {[...Array(5)].map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-elevated rounded animate-pulse" style={{ width: i === 0 ? "120px" : "64px" }} />
        </td>
      ))}
    </tr>
  );
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchServices = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const data = (await nexus.services()) as Service[];
      setServices(Array.isArray(data) ? data : []);
      setError(null);
      setLastUpdated(new Date());
    } catch (e) {
      setError((e as Error).message ?? "Failed to reach Nexus backend");
      setServices([]);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
    const iv = setInterval(() => fetchServices(), 5000);
    return () => clearInterval(iv);
  }, [fetchServices]);

  const isEmpty = !loading && services.length === 0;

  return (
    <AppShell>
      <Topbar title="Services" />
      <div className="p-6 space-y-6">

        {/* Header row */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-text">Service Status</h2>
            <p className="text-xs text-muted mt-0.5">
              {lastUpdated
                ? `Last updated ${lastUpdated.toLocaleTimeString()}`
                : "Polling every 5s"}
            </p>
          </div>
          <button
            onClick={() => fetchServices(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-elevated border border-border text-text hover:border-brand hover:text-brand transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw
              size={13}
              className={refreshing ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        {/* Table card */}
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          {isEmpty || error ? (
            <div className="p-10 flex flex-col items-center justify-center gap-2 text-center">
              <p className="text-sm font-medium text-critical">
                Nexus backend unreachable
              </p>
              {error && (
                <p className="text-xs text-muted max-w-sm">{error}</p>
              )}
              <button
                onClick={() => fetchServices(true)}
                className="mt-3 text-xs text-brand hover:underline"
              >
                Try again
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted uppercase tracking-wider">
                      CPU %
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted uppercase tracking-wider">
                      Memory
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted uppercase tracking-wider">
                      Uptime
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
                    : services.map((svc, idx) => {
                        const variant = statusVariant(svc.status);
                        const cpuVal = svc.cpu_percent ?? svc.cpu;
                        const memVal = svc.memory ?? svc.memory_percent;
                        return (
                          <tr
                            key={idx}
                            className="border-b border-border last:border-0 hover:bg-elevated/50 transition-colors"
                          >
                            {/* Name */}
                            <td className="px-4 py-3 font-medium text-text">
                              {svc.name ?? `service-${idx + 1}`}
                            </td>

                            {/* Status badge */}
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[variant]}`}
                              >
                                {svc.status ?? "unknown"}
                              </span>
                            </td>

                            {/* CPU */}
                            <td className="px-4 py-3 text-right font-mono text-text">
                              {cpuVal !== undefined && cpuVal !== null
                                ? `${Number(cpuVal).toFixed(1)}%`
                                : "—"}
                            </td>

                            {/* Memory */}
                            <td className="px-4 py-3 text-right font-mono text-text">
                              {formatMemory(memVal as string | number | undefined)}
                            </td>

                            {/* Uptime */}
                            <td className="px-4 py-3 text-right font-mono text-text">
                              {formatUptime(svc.uptime)}
                            </td>
                          </tr>
                        );
                      })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Count footer */}
        {!loading && !error && services.length > 0 && (
          <p className="text-xs text-muted">
            {services.length} service{services.length !== 1 ? "s" : ""} total
            {" · "}
            <span className="text-ok">
              {services.filter((s) => statusVariant(s.status) === "running").length} running
            </span>
            {" · "}
            <span className="text-critical">
              {services.filter((s) => statusVariant(s.status) === "stopped").length} stopped
            </span>
          </p>
        )}
      </div>
    </AppShell>
  );
}
