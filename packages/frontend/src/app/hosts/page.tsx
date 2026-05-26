"use client";
import { useState, useCallback, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { StatCard } from "@/components/ui/StatCard";
import { VEmpty } from "@/components/ui/Empty";
import { VIcon } from "@/components/ui/Icons";
import { nexus } from "@/lib/api/nexus";

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
  [key: string]: unknown;
}

function statusDot(s?: string) {
  const v = (s || "").toLowerCase();
  const c =
    v === "online" || v === "up"
      ? "#10B981"
      : v === "maintenance"
      ? "#94A3B8"
      : "#EF4444";
  return (
    <span
      style={{
        width: 7,
        height: 7,
        borderRadius: "50%",
        background: c,
        display: "inline-block",
        flexShrink: 0,
      }}
    />
  );
}

export default function HostsPage() {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await nexus.hosts();
      setHosts(Array.isArray(data) ? (data as Host[]) : []);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, 15000);
    return () => clearInterval(iv);
  }, [load]);

  const onlineCount = hosts.filter((h) =>
    ["online", "up"].includes((h.status || "").toLowerCase())
  ).length;

  return (
    <AppShell title="Hosts">
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Summary row */}
        <div style={{ display: "flex", gap: 12 }}>
          <StatCard
            label="Total Hosts"
            value={loading ? "—" : hosts.length}
            icon="hosts"
            color="brand"
          />
          <StatCard
            label="Online"
            value={loading ? "—" : onlineCount}
            icon="check"
            color="brand"
          />
          <StatCard
            label="Offline / Maint"
            value={loading ? "—" : hosts.length - onlineCount}
            icon="xcircle"
            color="brand"
          />
        </div>

        {error && (
          <div
            style={{
              background: "var(--crit-dim)",
              border: "1px solid var(--crit)",
              borderRadius: 10,
              padding: "12px 16px",
              fontSize: 13,
              color: "var(--crit)",
            }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 14,
            }}
          >
            {Array(4)
              .fill(0)
              .map((_, i) => (
                <div
                  key={i}
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    height: 180,
                    animation: "pulse 1.5s infinite",
                  }}
                />
              ))}
          </div>
        ) : hosts.length === 0 ? (
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
            }}
          >
            <VEmpty icon="hosts" message="No hosts registered" />
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 14,
            }}
          >
            {hosts.map((h, i) => {
              const name = h.hostname || h.name || "Unknown";
              const ip = h.ip || h.ip_address || "";
              const cpu = Number(h.cpu || h.cpu_usage_percent || 0);
              const ram = Number(
                h.ram || h.ram_usage_percent || h.memory_usage_percent || 0
              );
              const os = h.os || h.os_info;
              const ssl = h.ssl_expiry_days ?? h.ssl_expires_in_days;

              return (
                <div
                  key={h.id || i}
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: "18px 20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                  }}
                >
                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {statusDot(h.status)}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: "var(--text)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {name}
                      </div>
                      {ip && (
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--text-muted)",
                            fontFamily: "JetBrains Mono, monospace",
                            marginTop: 1,
                          }}
                        >
                          {ip}
                        </div>
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                        background: "var(--elevated)",
                        border: "1px solid var(--border)",
                        borderRadius: 6,
                        padding: "2px 8px",
                      }}
                    >
                      {h.status || "unknown"}
                    </span>
                  </div>

                  {/* CPU bar */}
                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 5,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--text-muted)",
                          letterSpacing: "0.05em",
                          textTransform: "uppercase",
                        }}
                      >
                        CPU
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          fontFamily: "JetBrains Mono, monospace",
                          color: cpu > 85 ? "var(--crit)" : "var(--text)",
                        }}
                      >
                        {cpu.toFixed(1)}%
                      </span>
                    </div>
                    <div
                      style={{
                        height: 5,
                        background: "var(--elevated)",
                        borderRadius: 3,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.min(100, cpu)}%`,
                          height: "100%",
                          background: cpu > 85 ? "var(--crit)" : "var(--brand)",
                          borderRadius: 3,
                          transition: "width 0.3s",
                        }}
                      />
                    </div>
                  </div>

                  {/* RAM bar */}
                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 5,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--text-muted)",
                          letterSpacing: "0.05em",
                          textTransform: "uppercase",
                        }}
                      >
                        RAM
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          fontFamily: "JetBrains Mono, monospace",
                          color: ram > 90 ? "var(--crit)" : "var(--text)",
                        }}
                      >
                        {ram.toFixed(1)}%
                      </span>
                    </div>
                    <div
                      style={{
                        height: 5,
                        background: "var(--elevated)",
                        borderRadius: 3,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.min(100, ram)}%`,
                          height: "100%",
                          background: ram > 90 ? "var(--crit)" : "var(--brand)",
                          borderRadius: 3,
                          transition: "width 0.3s",
                        }}
                      />
                    </div>
                  </div>

                  {/* OS footer */}
                  {os && (
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        borderTop: "1px solid var(--border)",
                        paddingTop: 10,
                      }}
                    >
                      {os}
                    </div>
                  )}

                  {/* SSL warning */}
                  {ssl != null && ssl < 30 && (
                    <div
                      style={{
                        background: "var(--elevated)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        padding: "7px 10px",
                        fontSize: 11,
                        color: "var(--crit)",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <VIcon name="shield" size={12} /> SSL expires in{" "}
                      <strong>{ssl}d</strong>
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
