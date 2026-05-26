"use client";
import { useState, useCallback, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { StatCard } from "@/components/ui/StatCard";
import { VSection } from "@/components/ui/Section";
import { VBadge } from "@/components/ui/Badge";
import { VTable } from "@/components/ui/Table";
import { VIcon } from "@/components/ui/Icons";
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

function statusVariant(s?: string): "ok" | "crit" | "muted" {
  const v = (s || "").toLowerCase();
  if (v === "running" || v === "active") return "ok";
  if (v === "stopped" || v === "exited" || v === "dead" || v === "failed") return "crit";
  return "muted";
}

function fmtUptime(u: string | number | undefined): string {
  if (!u) return "—";
  if (typeof u === "string") return u;
  const s = Math.floor(u);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h < 24 ? `${h}h ${m}m` : `${Math.floor(h / 24)}d ${h % 24}h`;
}

function fmtMem(m: string | number | undefined): string {
  if (!m) return "—";
  if (typeof m === "string") return m;
  if (m > 1073741824) return `${(m / 1073741824).toFixed(1)} GB`;
  if (m > 1048576) return `${(m / 1048576).toFixed(1)} MB`;
  return `${Number(m).toFixed(1)}%`;
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpd, setLastUpd] = useState<Date | null>(null);
  const [spinning, setSpinning] = useState(false);

  const load = useCallback(async (manual = false) => {
    if (manual) setSpinning(true);
    try {
      const data = await nexus.services();
      setServices(Array.isArray(data) ? (data as Service[]) : []);
      setError(null);
      setLastUpd(new Date());
    } catch (e) {
      setError((e as Error).message || "Nexus backend unreachable");
      setServices([]);
    } finally {
      setLoading(false);
      setSpinning(false);
    }
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(() => load(), 5000);
    return () => clearInterval(iv);
  }, [load]);

  const running = services.filter((s) => statusVariant(s.status) === "ok").length;
  const stopped = services.filter((s) => statusVariant(s.status) === "crit").length;

  return (
    <AppShell title="Services">
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <VSection
          title="Service Status"
          sub={lastUpd ? `Updated ${lastUpd.toLocaleTimeString()}` : "Polling every 5s"}
          action={
            <button
              onClick={() => load(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 14px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--elevated)",
                cursor: "pointer",
                fontSize: 12,
                color: "var(--text-sec)",
              }}
            >
              <VIcon
                name="refresh"
                size={13}
                style={{ animation: spinning ? "spin 1s linear infinite" : "none" }}
              />
              Refresh
            </button>
          }
        >
          {error ? (
            <div
              style={{
                background: "var(--crit-dim)",
                border: "1px solid var(--crit)",
                borderRadius: 12,
                padding: "14px 18px",
                fontSize: 13,
                color: "var(--crit)",
              }}
            >
              {error}
            </div>
          ) : (
            <>
              <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                <StatCard
                  label="Total"
                  value={loading ? "—" : services.length}
                  icon="services"
                  color="brand"
                />
                <StatCard
                  label="Running"
                  value={loading ? "—" : running}
                  icon="check"
                  color={running > 0 ? "ok" : "muted"}
                />
                <StatCard
                  label="Stopped"
                  value={loading ? "—" : stopped}
                  icon="xcircle"
                  color={stopped > 0 ? "crit" : "ok"}
                />
              </div>
              <VTable
                columns={[
                  { key: "name", label: "Service" },
                  {
                    key: "status",
                    label: "Status",
                    render: (v) => (
                      <VBadge color={statusVariant(String(v))}>{String(v || "unknown")}</VBadge>
                    ),
                  },
                  {
                    key: "cpu",
                    label: "CPU %",
                    align: "right",
                    render: (v, row) => {
                      const r = row as Service;
                      const n = Number(r.cpu_percent ?? r.cpu ?? v);
                      return (
                        <span
                          style={{
                            fontFamily: "JetBrains Mono, monospace",
                            fontSize: 12,
                            color:
                              n > 80
                                ? "var(--crit)"
                                : n > 60
                                ? "var(--warn)"
                                : "var(--text)",
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
                    render: (v, row) => {
                      const r = row as Service;
                      return (
                        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12 }}>
                          {fmtMem((r.memory ?? r.memory_percent ?? v) as string | number | undefined)}
                        </span>
                      );
                    },
                  },
                  {
                    key: "uptime",
                    label: "Uptime",
                    align: "right",
                    render: (v, row) => {
                      const r = row as Service;
                      return (
                        <span
                          style={{
                            fontFamily: "JetBrains Mono, monospace",
                            fontSize: 12,
                            color: "var(--text-muted)",
                          }}
                        >
                          {fmtUptime((r.uptime ?? v) as string | number | undefined)}
                        </span>
                      );
                    },
                  },
                ]}
                rows={loading ? [] : (services as unknown as Record<string, unknown>[])}
                emptyMsg="No services found"
              />
            </>
          )}
        </VSection>
      </div>
    </AppShell>
  );
}
