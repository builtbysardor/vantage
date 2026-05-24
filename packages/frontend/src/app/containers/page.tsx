"use client";
import { useEffect, useState, useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Topbar } from "@/components/layout/Topbar";
import { nexus } from "@/lib/api/nexus";
import { infrawatch } from "@/lib/api/infrawatch";
import { Container, Search } from "lucide-react";

type Source = "nexus" | "infrawatch";

interface ContainerRow {
  id: string;
  name: string;
  image: string;
  status: string;
  cpu: number | null;
  memory: string | null;
  source: Source;
}

function normalizeNexus(raw: unknown, idx: number): ContainerRow {
  const c = raw as Record<string, unknown>;
  return {
    id: (c.id as string) ?? (c.container_id as string) ?? `nexus-${idx}`,
    name:
      (c.name as string) ??
      (c.Names as string[])?.join(", ") ??
      "—",
    image: (c.image as string) ?? (c.Image as string) ?? "—",
    status:
      (c.status as string) ??
      (c.State as string) ??
      (c.state as string) ??
      "unknown",
    cpu:
      typeof c.cpu === "number"
        ? c.cpu
        : typeof c.cpu_usage_percent === "number"
        ? c.cpu_usage_percent
        : null,
    memory:
      (c.memory as string) ??
      (c.memory_usage as string) ??
      (c.mem as string) ??
      null,
    source: "nexus",
  };
}

function normalizeInfrawatch(raw: unknown, idx: number): ContainerRow {
  const c = raw as Record<string, unknown>;
  return {
    id: (c.id as string) ?? (c.container_id as string) ?? `iw-${idx}`,
    name:
      (c.name as string) ??
      (c.Names as string[])?.join(", ") ??
      "—",
    image: (c.image as string) ?? (c.Image as string) ?? "—",
    status:
      (c.status as string) ??
      (c.State as string) ??
      (c.state as string) ??
      "unknown",
    cpu:
      typeof c.cpu === "number"
        ? c.cpu
        : typeof c.cpu_usage_percent === "number"
        ? c.cpu_usage_percent
        : null,
    memory:
      (c.memory as string) ??
      (c.memory_usage as string) ??
      (c.mem as string) ??
      null,
    source: "infrawatch",
  };
}

function statusMeta(status: string): { label: string; colorClass: string } {
  const s = status.toLowerCase();
  if (s === "running" || s === "up") {
    return { label: status, colorClass: "bg-ok/10 text-ok" };
  }
  if (s === "paused") {
    return { label: status, colorClass: "bg-warn/10 text-warn" };
  }
  if (
    s === "stopped" ||
    s === "exited" ||
    s === "dead" ||
    s === "removing" ||
    s === "created"
  ) {
    return { label: status, colorClass: "bg-critical/10 text-critical" };
  }
  return { label: status, colorClass: "bg-elevated text-muted" };
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3 bg-elevated rounded w-3/4" />
        </td>
      ))}
    </tr>
  );
}

export default function ContainersPage() {
  const [rows, setRows] = useState<ContainerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [nexusError, setNexusError] = useState<string | null>(null);
  const [infrawatchError, setInfrawatchError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  function fetchAll() {
    Promise.allSettled([
      nexus.containers(),
      infrawatch.containers(),
    ]).then(([nexusResult, infrawatchResult]) => {
      const combined: ContainerRow[] = [];

      if (nexusResult.status === "fulfilled") {
        setNexusError(null);
        (nexusResult.value as unknown[]).forEach((c, i) =>
          combined.push(normalizeNexus(c, i))
        );
      } else {
        setNexusError(
          nexusResult.reason instanceof Error
            ? nexusResult.reason.message
            : "Nexus unavailable"
        );
      }

      if (infrawatchResult.status === "fulfilled") {
        setInfrawatchError(null);
        (infrawatchResult.value as unknown[]).forEach((c, i) =>
          combined.push(normalizeInfrawatch(c, i))
        );
      } else {
        setInfrawatchError(
          infrawatchResult.reason instanceof Error
            ? infrawatchResult.reason.message
            : "Infrawatch unavailable"
        );
      }

      setRows(combined);
      setLoading(false);
    });
  }

  useEffect(() => {
    fetchAll();
    const iv = setInterval(fetchAll, 10_000);
    return () => clearInterval(iv);
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.image.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q) ||
        r.source.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const bothDown = nexusError && infrawatchError;
  const anyDown = nexusError || infrawatchError;

  return (
    <AppShell>
      <Topbar title="Containers" />
      <div className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-base font-semibold text-text">Container Fleet</h2>
            <p className="text-xs text-muted mt-0.5">
              Merged from Nexus + Infrawatch — refreshes every 10 seconds
            </p>
          </div>
          {!loading && (
            <span className="text-xs font-mono text-muted bg-elevated px-2.5 py-1 rounded-lg border border-border">
              {rows.length} container{rows.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Backend error banners */}
        {!loading && anyDown && (
          <div className="space-y-2">
            {nexusError && (
              <div className="bg-warn/10 border border-warn/20 rounded-lg px-4 py-2.5 text-xs text-warn">
                <span className="font-semibold">Nexus</span> backend degraded —{" "}
                {nexusError}
              </div>
            )}
            {infrawatchError && (
              <div className="bg-warn/10 border border-warn/20 rounded-lg px-4 py-2.5 text-xs text-warn">
                <span className="font-semibold">Infrawatch</span> backend
                degraded — {infrawatchError}
              </div>
            )}
          </div>
        )}

        {/* Search input */}
        {(!loading || rows.length > 0) && (
          <div className="relative max-w-xs">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by name, image, status…"
              className="w-full bg-elevated border border-border rounded-lg pl-8 pr-3 py-2 text-sm text-text placeholder:text-muted outline-none focus:border-brand transition-colors"
            />
          </div>
        )}

        {/* Both down — empty state */}
        {!loading && bothDown && rows.length === 0 && (
          <div className="bg-surface border border-border rounded-xl p-12 flex flex-col items-center gap-3">
            <Container size={36} className="text-muted opacity-40" />
            <p className="text-sm text-muted">No container data available</p>
            <p className="text-xs text-muted opacity-60">
              Both backends are unreachable
            </p>
          </div>
        )}

        {/* No containers (backends fine but empty) */}
        {!loading && !bothDown && rows.length === 0 && (
          <div className="bg-surface border border-border rounded-xl p-12 flex flex-col items-center gap-3">
            <Container size={36} className="text-muted opacity-40" />
            <p className="text-sm text-muted">No container data available</p>
          </div>
        )}

        {/* Table */}
        {(loading || rows.length > 0) && (
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                      Name
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                      Image
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                      CPU%
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                      Memory
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                      Source
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading &&
                    Array.from({ length: 6 }).map((_, i) => (
                      <SkeletonRow key={i} />
                    ))}
                  {!loading &&
                    filtered.map((row) => {
                      const { label, colorClass } = statusMeta(row.status);
                      return (
                        <tr
                          key={`${row.source}-${row.id}`}
                          className="hover:bg-elevated/40 transition-colors"
                        >
                          {/* Name */}
                          <td className="px-4 py-3 text-text font-medium max-w-[180px]">
                            <span
                              className="block truncate"
                              title={row.name}
                            >
                              {row.name}
                            </span>
                          </td>

                          {/* Image */}
                          <td className="px-4 py-3 max-w-[220px]">
                            <span
                              className="block truncate font-mono text-xs text-muted"
                              title={row.image}
                            >
                              {row.image}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium ${colorClass}`}
                            >
                              {label}
                            </span>
                          </td>

                          {/* CPU% */}
                          <td className="px-4 py-3">
                            {row.cpu !== null ? (
                              <span
                                className={`font-mono text-xs ${
                                  row.cpu >= 90
                                    ? "text-critical"
                                    : row.cpu >= 70
                                    ? "text-warn"
                                    : "text-ok"
                                }`}
                              >
                                {row.cpu.toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-muted text-xs">—</span>
                            )}
                          </td>

                          {/* Memory */}
                          <td className="px-4 py-3">
                            {row.memory !== null ? (
                              <span className="font-mono text-xs text-text">
                                {row.memory}
                              </span>
                            ) : (
                              <span className="text-muted text-xs">—</span>
                            )}
                          </td>

                          {/* Source badge */}
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium border ${
                                row.source === "nexus"
                                  ? "bg-brand/10 text-brand border-brand/20"
                                  : "bg-accent/10 text-accent border-accent/20"
                              }`}
                            >
                              {row.source}
                            </span>
                          </td>
                        </tr>
                      );
                    })}

                  {/* No results after filter */}
                  {!loading && rows.length > 0 && filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-sm text-muted"
                      >
                        No containers match &quot;{search}&quot;
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
