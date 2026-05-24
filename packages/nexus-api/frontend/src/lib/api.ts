/**
 * api.ts
 * Typed fetch wrappers for the Nexus Pro REST backend.
 * Reads NEXT_PUBLIC_API_URL — falls back to http://localhost:3001.
 */

import type {
  Alert, AlertThreshold, Host, LogEntry, Service, SystemMetrics, ChartData, NetworkInterface, Settings,
} from '@/types';
import { getToken } from '@/lib/auth';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

// ─── Backend response shapes ─────────────────────────────────
// These mirror what the Node backend actually returns from
// metrics/collector.js — not identical to the frontend types,
// so they get adapted at the boundary.

export interface BackendCpu {
  usage: number;
  user: number;
  system: number;
  idle: number;
  cores: number[];
  temperature: number | null;
  model: string;
  cores_count: number;
  speed: number;
}

export interface BackendMemory {
  total: number;
  used: number;
  free: number;
  usage: number;
  swapTotal: number;
  swapUsed: number;
  cached: number;
}

export interface BackendDisk {
  mount: string;
  type: string;
  total: number;
  used: number;
  free: number;
  usage: number;
  readMs: number;
  writeMs: number;
}

export interface BackendNetworkIface {
  name: string;
  ip4: string;
  mac: string;
  speed: string;
  status: 'up' | 'down';
  rxBytes: number;
  txBytes: number;
  rxSec: number;
  txSec: number;
  errors: number;
  latency: number;
}

export interface BackendSystem {
  hostname: string;
  os: string;
  kernel: string;
  arch: string;
  uptime: number;
  bootTime: string;
  processes: { all: number; running: number; sleeping: number };
}

export interface BackendSnapshot {
  cpu: BackendCpu;
  memory: BackendMemory;
  disks: BackendDisk[];
  network: BackendNetworkIface[];
  system: BackendSystem;
  timestamp: string;
}

export interface BackendHistoryPoint { time: string; value: number }
export interface BackendHistory {
  cpu: BackendHistoryPoint[];
  ram: BackendHistoryPoint[];
  netIn: BackendHistoryPoint[];
  netOut: BackendHistoryPoint[];
}

// ─── Snapshot ⇒ frontend SystemMetrics ───────────────────────
export function snapshotToMetrics(s: BackendSnapshot): SystemMetrics {
  const primaryDisk = s.disks?.[0];
  const primaryNet  = s.network?.[0];
  const cpuUsage    = s.cpu?.usage ?? 0;
  const temperature = Math.round(s.cpu?.temperature ?? 0);
  const ramUsage    = s.memory?.usage ?? 0;
  const diskUsage   = Math.round(primaryDisk?.usage ?? 0);
  // Health: penalize for high cpu / ram / disk / temperature
  const penalty =
    Math.max(0, cpuUsage  - 70) * 0.5 +
    Math.max(0, ramUsage  - 70) * 0.4 +
    Math.max(0, diskUsage - 70) * 0.3 +
    Math.max(0, temperature - 70) * 0.4;
  const healthScore = Math.max(0, Math.min(100, Math.round(100 - penalty)));

  return {
    cpu: cpuUsage,
    ram: ramUsage,
    disk: diskUsage,
    network: { in: primaryNet?.rxSec ?? 0, out: primaryNet?.txSec ?? 0 },
    uptime: Math.round(s.system?.uptime ?? 0),
    temperature,
    healthScore,
    timestamp: s.timestamp,
  };
}

// Useful extras for the dashboard (RAM/disk human-readable strings).
export interface MetricDetails {
  memoryUsedBytes: number;
  memoryTotalBytes: number;
  diskMount: string;
  diskUsedBytes: number;
  diskTotalBytes: number;
}

export function snapshotToDetails(s: BackendSnapshot): MetricDetails {
  const d = s.disks?.[0];
  return {
    memoryUsedBytes:  s.memory?.used  ?? 0,
    memoryTotalBytes: s.memory?.total ?? 0,
    diskMount:        d?.mount ?? '—',
    diskUsedBytes:    d?.used  ?? 0,
    diskTotalBytes:   d?.total ?? 0,
  };
}

// Backend network iface ⇒ frontend NetworkInterface
export function ifaceToNetworkInterface(n: BackendNetworkIface, idx: number): NetworkInterface {
  return {
    id:         n.name || `iface-${idx}`,
    name:       n.name,
    ip:         n.ip4,
    status:     n.status,
    speed:      n.speed,
    bytesIn:    n.rxBytes,
    bytesOut:   n.txBytes,
    packetsIn:  0, // not exposed by backend collector
    packetsOut: 0,
    latency:    n.latency,
    errors:     n.errors,
  };
}

// History ⇒ ChartData
export function historyToChart(h: BackendHistory): ChartData {
  const zip = (a: BackendHistoryPoint[], b: BackendHistoryPoint[]) =>
    a.map((p, i) => ({ time: p.time, in: p.value, out: b[i]?.value ?? 0 }));
  return {
    cpu:     h.cpu     ?? [],
    ram:     h.ram     ?? [],
    network: zip(h.netIn ?? [], h.netOut ?? []),
  };
}

// ─── Core fetch helper ───────────────────────────────────────
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}), ...(init?.headers ?? {}) },
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} on ${path}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ─── Public API ──────────────────────────────────────────────
export const api = {
  getSnapshot:    () => request<BackendSnapshot>('/api/metrics'),
  getHistory:     () => request<BackendHistory>('/api/metrics/history'),
  getHosts:       () => request<Host[]>('/api/hosts'),
  getServices:    () => request<Service[]>('/api/services'),
  getNetwork:     () => request<BackendNetworkIface[]>('/api/network'),
  getAlerts:      () => request<Alert[]>('/api/alerts'),
  getLogs:        (limit = 100) => request<LogEntry[]>(`/api/logs?limit=${limit}`),

  acknowledgeAlert: (id: string, user = 'admin') =>
    request<Alert>(`/api/alerts/${id}/acknowledge`, {
      method: 'PATCH',
      body: JSON.stringify({ user }),
    }),

  resolveAlert: (id: string) =>
    request<Alert>(`/api/alerts/${id}/resolve`, { method: 'PATCH' }),

  toggleHostMaintenance: (id: string) =>
    request<Host>(`/api/hosts/${id}/maintenance`, { method: 'PATCH' }),

  getThresholds: () => request<AlertThreshold[]>('/api/alerts/thresholds'),

  getSettings: () => request<Settings>('/api/settings'),

  saveSettings: (s: Partial<Settings>) =>
    request<Settings>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(s),
      headers: { 'x-api-key': process.env.NEXT_PUBLIC_API_KEY ?? '' },
    }),
};

// Re-export the base URL for places that compose URLs directly.
export const API_BASE_URL = BASE_URL;
