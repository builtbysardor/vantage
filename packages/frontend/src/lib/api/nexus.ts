import { getNexusToken } from "../auth";

const BASE = process.env.NEXT_PUBLIC_API_NEXUS_URL ?? "http://localhost:3001";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getNexusToken();
  const res = await fetch(`${BASE}/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export const nexus = {
  health: () => req<{ status: string }>("/health"),
  metrics: () => req<unknown>("/metrics"),
  metricsHistory: () => req<unknown[]>("/metrics/history"),
  system: () => req<unknown>("/system"),
  network: () => req<unknown[]>("/network"),
  services: () => req<unknown[]>("/services"),
  alerts: (params?: string) => req<unknown[]>(`/alerts${params ? "?" + params : ""}`),
  alertThresholds: () => req<unknown>("/alerts/thresholds"),
  acknowledgeAlert: (id: string) => req(`/alerts/${id}/acknowledge`, { method: "PATCH" }),
  resolveAlert: (id: string) => req(`/alerts/${id}/resolve`, { method: "PATCH" }),
  settings: () => req<unknown>("/settings"),
  logs: (params?: string) => req<unknown[]>(`/logs${params ? "?" + params : ""}`),
  hosts: () => req<unknown[]>("/hosts"),
  containers: () => req<unknown[]>("/containers"),
};
