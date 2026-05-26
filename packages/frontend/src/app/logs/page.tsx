"use client";
import { useState, useCallback, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { VSection } from "@/components/ui/Section";
import { VBadge } from "@/components/ui/Badge";
import { VEmpty } from "@/components/ui/Empty";
import { VIcon } from "@/components/ui/Icons";
import { nexus } from "@/lib/api/nexus";

interface LogEntry {
  id?: string;
  level?: string;
  timestamp?: string;
  source?: string;
  message?: string;
  [key: string]: unknown;
}

const LEVELS = ["all", "error", "warn", "info", "debug"];
const LEVEL_COLOR: Record<string, "crit" | "warn" | "brand" | "muted"> = {
  error: "crit",
  warn: "warn",
  info: "brand",
  debug: "muted",
};

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [level, setLevel] = useState("all");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    try {
      const params = level !== "all" ? `level=${level}` : undefined;
      const data = await nexus.logs(params);
      setLogs(Array.isArray(data) ? (data as LogEntry[]).slice(0, 200) : []);
    } catch {
      setLogs([]);
    }
    setLoading(false);
  }, [level]);

  useEffect(() => {
    setLoading(true);
    load();
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  }, [load]);

  const visible = logs.filter((log) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (log.message || "").toLowerCase().includes(q) ||
      (log.source || "").toLowerCase().includes(q)
    );
  });

  return (
    <AppShell title="Logs">
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <VSection
          title="Log Stream"
          sub="Auto-refreshes every 5s — showing up to 200 entries"
        >
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            {/* Level tabs */}
            <div
              style={{
                display: "flex",
                gap: 2,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 9,
                padding: 4,
              }}
            >
              {LEVELS.map((l) => (
                <button
                  key={l}
                  onClick={() => setLevel(l)}
                  style={{
                    padding: "4px 12px",
                    borderRadius: 6,
                    fontSize: 12,
                    cursor: "pointer",
                    background: level === l ? "var(--brand-dim)" : "transparent",
                    border: "none",
                    color: level === l ? "var(--brand)" : "var(--text-muted)",
                    fontWeight: level === l ? 600 : 400,
                  }}
                >
                  {l.charAt(0).toUpperCase() + l.slice(1)}
                </button>
              ))}
            </div>

            {/* Search */}
            <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
              <VIcon
                name="search"
                size={13}
                style={{
                  position: "absolute",
                  left: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                  pointerEvents: "none",
                }}
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search message, source…"
                style={{
                  width: "100%",
                  height: 34,
                  paddingLeft: 32,
                  paddingRight: 12,
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "var(--text)",
                  outline: "none",
                  fontFamily: "Inter, sans-serif",
                }}
              />
            </div>

            <span
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              {visible.length} {visible.length === 1 ? "entry" : "entries"}
            </span>
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
          {loading ? (
            <div
              style={{
                padding: "40px",
                textAlign: "center",
                color: "var(--text-muted)",
                fontSize: 13,
              }}
            >
              Loading logs…
            </div>
          ) : visible.length === 0 ? (
            <VEmpty
              icon="logs"
              message="No log entries"
              sub="Try adjusting the level filter or search query"
            />
          ) : (
            visible.map((log, i) => (
              <div
                key={log.id || i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "10px 16px",
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
                <VBadge
                  color={LEVEL_COLOR[log.level || "info"] || "muted"}
                  size={10}
                >
                  {(log.level || "info").toUpperCase()}
                </VBadge>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--text)",
                      lineHeight: 1.4,
                      wordBreak: "break-all",
                      margin: 0,
                    }}
                  >
                    {log.message}
                  </p>
                  <div style={{ display: "flex", gap: 10, marginTop: 3 }}>
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                        fontFamily: "JetBrains Mono, monospace",
                      }}
                    >
                      {log.timestamp
                        ? new Date(log.timestamp).toLocaleTimeString()
                        : "—"}
                    </span>
                    {log.source && (
                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--text-muted)",
                          opacity: 0.7,
                        }}
                      >
                        {log.source}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
