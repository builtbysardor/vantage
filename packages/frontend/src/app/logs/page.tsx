"use client";
import { useEffect, useState, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Topbar } from "@/components/layout/Topbar";
import { nexus } from "@/lib/api/nexus";

type LogLevel = "error" | "warn" | "info" | "debug";

interface LogEntry {
  id?: string;
  level: LogLevel;
  timestamp: string;
  source: string;
  message: string;
}

const LEVEL_OPTIONS = ["all", "error", "warn", "info", "debug"] as const;
type LevelFilter = (typeof LEVEL_OPTIONS)[number];

const LEVEL_BADGE: Record<LogLevel, string> = {
  error: "bg-critical/10 text-critical border border-critical/20",
  warn:  "bg-warn/10 text-warn border border-warn/20",
  info:  "bg-brand/10 text-brand border border-brand/20",
  debug: "bg-muted/10 text-muted border border-border",
};

const LEVEL_LABEL: Record<LogLevel, string> = {
  error: "ERROR",
  warn:  "WARN",
  info:  "INFO",
  debug: "DEBUG",
};

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("all");
  const [search, setSearch] = useState("");

  const fetchLogs = useCallback(() => {
    const params = levelFilter !== "all" ? `level=${levelFilter}` : undefined;
    nexus
      .logs(params)
      .then((data) => {
        const entries = (data as LogEntry[]).slice(0, 100);
        setLogs(entries);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [levelFilter]);

  useEffect(() => {
    setLoading(true);
    fetchLogs();
    const iv = setInterval(fetchLogs, 5000);
    return () => clearInterval(iv);
  }, [fetchLogs]);

  const visible = logs.filter((log) => {
    if (search.trim() === "") return true;
    const q = search.toLowerCase();
    return (
      log.message?.toLowerCase().includes(q) ||
      log.source?.toLowerCase().includes(q) ||
      log.level?.toLowerCase().includes(q)
    );
  });

  return (
    <AppShell>
      <Topbar title="Logs" />
      <div className="p-6 space-y-5">
        {/* Header */}
        <div>
          <h2 className="text-base font-semibold text-text">Log Stream</h2>
          <p className="text-xs text-muted mt-0.5">
            Auto-refreshes every 5 s &mdash; showing up to 100 entries
          </p>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Level tabs */}
          <div className="flex items-center gap-1 bg-surface border border-border rounded-lg p-1">
            {LEVEL_OPTIONS.map((lvl) => (
              <button
                key={lvl}
                onClick={() => setLevelFilter(lvl)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  levelFilter === lvl
                    ? "bg-brand/15 text-brand"
                    : "text-muted hover:text-text"
                }`}
              >
                {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
              </button>
            ))}
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Search message, source…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] h-8 rounded-lg bg-surface border border-border px-3 text-xs text-text placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-brand/50"
          />

          {/* Count badge */}
          <span className="text-xs text-muted">
            {visible.length} {visible.length === 1 ? "entry" : "entries"}
          </span>
        </div>

        {/* Log list */}
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted">Loading logs…</div>
          ) : visible.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted">No logs available</div>
          ) : (
            <div className="divide-y divide-border">
              {visible.map((log, idx) => (
                <div
                  key={log.id ?? idx}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-border/20 transition-colors"
                >
                  {/* Level badge */}
                  <span
                    className={`mt-0.5 shrink-0 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${
                      LEVEL_BADGE[log.level] ?? LEVEL_BADGE.debug
                    }`}
                  >
                    {LEVEL_LABEL[log.level] ?? log.level}
                  </span>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className="text-sm text-text leading-snug break-words">
                      {log.message}
                    </p>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-muted">
                        {log.timestamp
                          ? new Date(log.timestamp).toLocaleString(undefined, {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })
                          : "—"}
                      </span>
                      {log.source && (
                        <span className="font-mono text-xs text-muted/70">
                          {log.source}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
