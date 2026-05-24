"use client";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Topbar } from "@/components/layout/Topbar";
import { StatCard } from "@/components/ui/StatCard";
import { Activity, Server, Bell, Cpu, MemoryStick, HardDrive, Wifi } from "lucide-react";
import { infrawatch } from "@/lib/api/infrawatch";
import { nexus } from "@/lib/api/nexus";

export default function OverviewPage() {
  const [metrics, setMetrics] = useState<Record<string, number> | null>(null);
  const [alerts, setAlerts] = useState<{ firing: number; total: number } | null>(null);
  const [services, setServices] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      infrawatch.metrics().then(setMetrics),
      infrawatch.alerts().then(setAlerts),
      nexus.services().then(setServices),
    ]).finally(() => setLoading(false));
    const iv = setInterval(() => {
      infrawatch.metrics().then(setMetrics).catch(() => {});
    }, 5000);
    return () => clearInterval(iv);
  }, []);

  const cpu = metrics?.cpu_usage_percent ?? 0;
  const ram = metrics?.ram_usage_percent ?? 0;
  const disk = metrics?.disk_usage_percent ?? 0;

  return (
    <AppShell>
      <Topbar title="Overview" />
      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-base font-semibold text-text">System Overview</h2>
          <p className="text-xs text-muted mt-0.5">Real-time metrics from all sources</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="CPU Usage" value={loading ? "—" : `${cpu.toFixed(1)}%`} icon={Cpu} color={cpu > 80 ? "critical" : cpu > 60 ? "warn" : "ok"} />
          <StatCard label="RAM Usage" value={loading ? "—" : `${ram.toFixed(1)}%`} icon={MemoryStick} color={ram > 85 ? "critical" : ram > 70 ? "warn" : "ok"} />
          <StatCard label="Disk Usage" value={loading ? "—" : `${disk.toFixed(1)}%`} icon={HardDrive} color={disk > 90 ? "critical" : disk > 75 ? "warn" : "brand"} />
          <StatCard label="Firing Alerts" value={loading ? "—" : alerts?.firing ?? 0} icon={Bell} color={alerts?.firing ? "critical" : "ok"} />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Net In" value={loading ? "—" : `${((metrics?.network_in_bytes_sec ?? 0) / 1024).toFixed(1)} KB/s`} icon={Wifi} color="accent" />
          <StatCard label="Net Out" value={loading ? "—" : `${((metrics?.network_out_bytes_sec ?? 0) / 1024).toFixed(1)} KB/s`} icon={Activity} color="accent" />
          <StatCard label="Services" value={loading ? "—" : (services as unknown[]).length} icon={Server} color="brand" />
          <StatCard label="Total Alerts" value={loading ? "—" : alerts?.total ?? 0} icon={Bell} color="brand" />
        </div>

        {!loading && (
          <div className="bg-surface border border-border rounded-xl p-5">
            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">Service Health</p>
            {(services as Array<{ name: string; status: string }>).length === 0 ? (
              <p className="text-sm text-muted">No service data — Nexus backend unreachable</p>
            ) : (
              <div className="space-y-2">
                {(services as Array<{ name: string; status: string }>).map((s, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <span className="text-sm text-text">{s.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${s.status === "running" ? "bg-ok/10 text-ok" : "bg-critical/10 text-critical"}`}>{s.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
