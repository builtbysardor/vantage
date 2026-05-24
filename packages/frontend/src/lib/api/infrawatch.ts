import { getToken } from "../auth";

const BASE = process.env.NEXT_PUBLIC_API_INFRAWATCH_URL ?? "http://localhost:8000";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
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

export const infrawatch = {
  login: (username: string, password: string) =>
    fetch(`${BASE}/auth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ username, password }),
    }).then((r) => r.json()),

  me: () => req<{ username: string; role: string }>("/auth/me"),
  metrics: () => req<Record<string, number>>("/api/metrics"),
  alerts: () => req<{ total: number; firing: number; alerts: unknown[] }>("/api/alerts"),
  status: () => req<unknown>("/api/status"),
  containers: () => req<unknown[]>("/api/containers"),
  historyMetrics: (hours = 24) => req<unknown[]>(`/api/history/metrics?hours=${hours}`),
  historyAlerts: (hours = 48) => req<unknown[]>(`/api/history/alerts?hours=${hours}`),
  analytics: (hours = 24) => req<unknown>(`/api/analytics/summary?hours=${hours}`),
  anomalies: (hours = 24) => req<unknown[]>(`/api/anomalies?hours=${hours}`),
  anomalyScore: (hours = 6) => req<unknown>(`/api/anomalies/score?hours=${hours}`),
  anomalySummary: (hours = 24) => req<unknown>(`/api/anomalies/summary?hours=${hours}`),
  auditLogs: () => req<unknown[]>("/api/admin/audit-logs"),
};
