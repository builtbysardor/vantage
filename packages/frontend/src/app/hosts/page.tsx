"use client";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Topbar } from "@/components/layout/Topbar";
import { nexus } from "@/lib/api/nexus";
import { Server, ShieldAlert } from "lucide-react";

interface Host {
  id?: string;
  hostname?: string;
  name?: string;
  ip?: string;
  ip_address?: string;
  cpu?: number;
  cpu_usage_percent?: number;
  ram?: number;
  ram_usage_percent?: number;
  memory_usage_percent?: number;
  status?: string;
  os?: string;
  os_info?: string;
  ssl_expiry_days?: number;
  ssl_expires_in_days?: number;
}

function statusColor(status: string | undefined) {
  switch (status?.toLowerCase()) {
    case "online":
    case "up":
      return "ok";
    case "maintenance":
      return "warn";
    case "offline":
    case "down":
      return "critical";
    default:
      return "muted";
  }
}

function statusLabel(status: string | undefined) {
  switch (status?.toLowerCase()) {
    case "online":
    case "up":
      return "online";
    case "maintenance":
      return "maintenance";
    case "offline":
    case "down":
      return "offline";
    default:
      return status ?? "unknown";
  }
}

function ProgressBar({ value, color }: { value: number; color: "ok" | "warn" | "critical" | "brand" }) {
  const clampedValue = Math.min(100, Math.max(0, value));
  const colorClass =
    color === "ok"
      ? "bg-ok"
      : color === "warn"
      ? "bg-warn"
      : color === "critical"
      ? "bg-critical"
      : "bg-brand";
  return (
    <div className="h-1.5 w-full bg-elevated rounded-full overflow-hidden">
      <div
        className={`h-full ${colorClass} rounded-full transition-all duration-500`}
        style={{ width: `${clampedValue}%` }}
      />
    </div>
  );
}

function cpuColor(pct: number): "ok" | "warn" | "critical" {
  if (pct >= 90) return "critical";
  if (pct >= 70) return "warn";
  return "ok";
}

function ramColor(pct: number): "ok" | "warn" | "critical" {
  if (pct >= 90) return "critical";
  if (pct >= 75) return "warn";
  return "ok";
}

function SkeletonCard() {
  return (
    <div className="bg-surface border border-border rounded-xl p-5 space-y-3 animate-pulse">
      <div className="h-4 bg-elevated rounded w-2/3" />
      <div className="h-3 bg-elevated rounded w-1/2" />
      <div className="space-y-2 pt-1">
        <div className="h-2 bg-elevated rounded w-full" />
        <div className="h-2 bg-elevated rounded w-full" />
      </div>
      <div className="h-5 bg-elevated rounded w-16" />
    </div>
  );
}

export default function HostsPage() {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function fetchHosts() {
    nexus
      .hosts()
      .then((data) => {
        setHosts(data as Host[]);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load hosts");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchHosts();
    const iv = setInterval(fetchHosts, 15_000);
    return () => clearInterval(iv);
  }, []);

  return (
    <AppShell>
      <Topbar title="Hosts" />
      <div className="p-6 space-y-6">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-text">Registered Hosts</h2>
            <p className="text-xs text-muted mt-0.5">Auto-refreshes every 15 seconds</p>
          </div>
          {!loading && !error && (
            <span className="text-xs font-mono text-muted bg-elevated px-2.5 py-1 rounded-lg border border-border">
              {hosts.length} host{hosts.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Error state */}
        {error && !loading && (
          <div className="bg-critical/10 border border-critical/30 rounded-xl px-4 py-3 text-sm text-critical">
            {error}
          </div>
        )}

        {/* Skeleton loading */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && hosts.length === 0 && (
          <div className="bg-surface border border-border rounded-xl p-12 flex flex-col items-center gap-3">
            <Server size={36} className="text-muted opacity-40" />
            <p className="text-sm text-muted">No hosts registered</p>
          </div>
        )}

        {/* Host grid */}
        {!loading && hosts.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {hosts.map((host, idx) => {
              const hostname = host.hostname ?? host.name ?? "Unknown";
              const ip = host.ip ?? host.ip_address ?? "";
              const cpu = host.cpu ?? host.cpu_usage_percent ?? 0;
              const ram =
                host.ram ??
                host.ram_usage_percent ??
                host.memory_usage_percent ??
                0;
              const status = host.status;
              const os = host.os ?? host.os_info;
              const sslDays =
                host.ssl_expiry_days ?? host.ssl_expires_in_days;
              const sc = statusColor(status);
              const sl = statusLabel(status);

              const statusBg =
                sc === "ok"
                  ? "bg-ok/10 text-ok"
                  : sc === "warn"
                  ? "bg-warn/10 text-warn"
                  : sc === "critical"
                  ? "bg-critical/10 text-critical"
                  : "bg-elevated text-muted";

              return (
                <div
                  key={host.id ?? idx}
                  className="bg-surface border border-border rounded-xl p-5 flex flex-col gap-3 hover:border-brand/40 transition-colors"
                >
                  {/* Hostname + status badge */}
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-sm text-text leading-snug break-all">
                      {hostname}
                    </span>
                    <span
                      className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusBg}`}
                    >
                      {sl}
                    </span>
                  </div>

                  {/* IP */}
                  {ip && (
                    <span className="font-mono text-xs text-muted -mt-1">
                      {ip}
                    </span>
                  )}

                  {/* CPU bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted">CPU</span>
                      <span className={`font-mono text-${cpuColor(cpu)}`}>
                        {cpu.toFixed(1)}%
                      </span>
                    </div>
                    <ProgressBar value={cpu} color={cpuColor(cpu)} />
                  </div>

                  {/* RAM bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted">RAM</span>
                      <span className={`font-mono text-${ramColor(ram)}`}>
                        {ram.toFixed(1)}%
                      </span>
                    </div>
                    <ProgressBar value={ram} color={ramColor(ram)} />
                  </div>

                  {/* OS info */}
                  {os && (
                    <p className="text-xs text-muted truncate" title={os}>
                      {os}
                    </p>
                  )}

                  {/* SSL expiry warning */}
                  {sslDays != null && sslDays < 30 && (
                    <div className="flex items-center gap-1.5 bg-warn/10 border border-warn/20 rounded-lg px-2.5 py-1.5 text-xs text-warn">
                      <ShieldAlert size={12} className="shrink-0" />
                      <span>
                        SSL expires in{" "}
                        <span className="font-mono font-semibold">
                          {sslDays}
                        </span>{" "}
                        day{sslDays !== 1 ? "s" : ""}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
