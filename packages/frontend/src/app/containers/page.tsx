"use client";
import { useState, useCallback, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { VSection } from "@/components/ui/Section";
import { VBadge } from "@/components/ui/Badge";
import { VTable } from "@/components/ui/Table";
import { VIcon } from "@/components/ui/Icons";
import { nexus } from "@/lib/api/nexus";
import { infrawatch } from "@/lib/api/infrawatch";

interface ContainerRow {
  id: string;
  name: string;
  image: string;
  status: string;
  cpu: number | null;
  memory: string | null;
  source: string;
  [key: string]: unknown;
}

function norm(c: Record<string, unknown>, src: string, i: number): ContainerRow {
  return {
    id: String(c.id || c.container_id || `${src}-${i}`),
    name: String(c.name || (Array.isArray(c.Names) ? (c.Names as string[]).join(", ") : "—")),
    image: String(c.image || c.Image || "—"),
    status: String(c.status || c.State || c.state || "unknown"),
    cpu: c.cpu_usage_percent != null ? Number(c.cpu_usage_percent) : c.cpu != null ? Number(c.cpu) : null,
    memory: String(c.memory || c.memory_usage || c.mem || "") || null,
    source: src,
  };
}

function statColor(s: string): "ok" | "warn" | "crit" | "muted" {
  const v = (s || "").toLowerCase();
  if (v === "running" || v === "up") return "ok";
  if (v === "paused") return "warn";
  if (v === "stopped" || v === "exited" || v === "dead") return "crit";
  return "muted";
}

export default function ContainersPage() {
  const [rows, setRows] = useState<ContainerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const load = useCallback(async () => {
    const [nxr, iwr] = await Promise.allSettled([
      nexus.containers(),
      infrawatch.containers(),
    ]);
    const combined: ContainerRow[] = [];
    const errs: string[] = [];
    if (nxr.status === "fulfilled") {
      (nxr.value as unknown[] || []).forEach((c, i) =>
        combined.push(norm(c as Record<string, unknown>, "nexus", i))
      );
    } else {
      errs.push(`Nexus: ${(nxr as PromiseRejectedResult).reason?.message || "unavailable"}`);
    }
    if (iwr.status === "fulfilled") {
      (iwr.value as unknown[] || []).forEach((c, i) =>
        combined.push(norm(c as Record<string, unknown>, "infrawatch", i))
      );
    } else {
      errs.push(`InfraWatch: ${(iwr as PromiseRejectedResult).reason?.message || "unavailable"}`);
    }
    setRows(combined);
    setErrors(errs);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, 10000);
    return () => clearInterval(iv);
  }, [load]);

  const visible = search.trim()
    ? rows.filter((r) =>
        [r.name, r.image, r.status, r.source].some((f) =>
          (f || "").toLowerCase().includes(search.toLowerCase())
        )
      )
    : rows;

  return (
    <AppShell title="Containers">
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {errors.length > 0 &&
          errors.map((e, i) => (
            <div
              key={i}
              style={{
                background: "var(--warn-dim)",
                border: "1px solid var(--warn)",
                borderRadius: 10,
                padding: "10px 16px",
                fontSize: 12,
                color: "var(--warn)",
              }}
            >
              {e}
            </div>
          ))}

        <VSection
          title="Container Fleet"
          sub="Merged from Nexus + InfraWatch — refreshes every 10s"
          action={
            !loading ? (
              <VBadge color="muted">
                {rows.length} container{rows.length !== 1 ? "s" : ""}
              </VBadge>
            ) : undefined
          }
        >
          {(rows.length > 0 || loading) && (
            <div style={{ position: "relative", maxWidth: 300, marginBottom: 16 }}>
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
                placeholder="Filter by name, image, status…"
                style={{
                  width: "100%",
                  height: 34,
                  paddingLeft: 32,
                  paddingRight: 12,
                  background: "var(--elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "var(--text)",
                  outline: "none",
                  fontFamily: "Inter, sans-serif",
                }}
              />
            </div>
          )}

          <VTable
            columns={[
              {
                key: "name",
                label: "Container",
                render: (v) => <span style={{ fontWeight: 500 }}>{String(v)}</span>,
              },
              {
                key: "image",
                label: "Image",
                render: (v) => (
                  <span
                    style={{
                      fontFamily: "JetBrains Mono, monospace",
                      fontSize: 11,
                      color: "var(--text-muted)",
                    }}
                  >
                    {String(v)}
                  </span>
                ),
              },
              {
                key: "status",
                label: "Status",
                render: (v) => <VBadge color={statColor(String(v))}>{String(v)}</VBadge>,
              },
              {
                key: "cpu",
                label: "CPU %",
                align: "right",
                render: (v) =>
                  v != null ? (
                    <span
                      style={{
                        fontFamily: "JetBrains Mono, monospace",
                        fontSize: 12,
                        color:
                          Number(v) >= 90
                            ? "var(--crit)"
                            : Number(v) >= 70
                            ? "var(--warn)"
                            : "var(--ok)",
                      }}
                    >
                      {Number(v).toFixed(1)}%
                    </span>
                  ) : (
                    <span style={{ color: "var(--text-muted)" }}>—</span>
                  ),
              },
              {
                key: "memory",
                label: "Memory",
                align: "right",
                render: (v) => (
                  <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12 }}>
                    {String(v || "—")}
                  </span>
                ),
              },
              {
                key: "source",
                label: "Source",
                render: (v) => (
                  <VBadge color={v === "nexus" ? "brand" : "accent"}>{String(v)}</VBadge>
                ),
              },
            ]}
            rows={loading ? [] : (visible as unknown as Record<string, unknown>[])}
            emptyMsg={search ? `No containers match "${search}"` : "No container data available"}
          />
        </VSection>
      </div>
    </AppShell>
  );
}
