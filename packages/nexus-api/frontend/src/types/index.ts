// Core metric types
export interface SystemMetrics {
  cpu: number;
  ram: number;
  disk: number;
  network: { in: number; out: number };
  uptime: number; // seconds
  temperature: number;
  healthScore: number;
  timestamp: string;
}

export interface Service {
  id: string;
  name: string;
  displayName: string;
  status: 'online' | 'degraded' | 'offline' | 'maintenance';
  latency: number; // ms
  uptime: number; // percentage
  healthScore: number;
  port: number;
  pid?: number;
  restarts: number;
  lastCheck: string;
  version?: string;
  description: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'OK' | 'WARN' | 'ERROR' | 'CRITICAL';
  source: string;
  message: string;
  host: string;
}

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';

export interface Alert {
  id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  status: AlertStatus;
  source: string;
  host: string;
  createdAt: string;
  updatedAt: string;
  acknowledgedBy?: string;
}

export interface Host {
  id: string;
  hostname: string;
  ip: string;
  os: string;
  osVersion: string;
  status: 'online' | 'offline' | 'maintenance';
  lastSeen: string;
  cpu: number;
  ram: number;
  disk: number;
  services: number;
  role: 'master' | 'worker' | 'db' | 'gateway' | 'backup';
  location: string;
  sslExpiry?: string;
  backupStatus?: 'ok' | 'warning' | 'failed' | 'running';
}

export interface NetworkInterface {
  id: string;
  name: string;
  ip: string;
  status: 'up' | 'down';
  speed: string;
  bytesIn: number;
  bytesOut: number;
  packetsIn: number;
  packetsOut: number;
  latency: number;
  errors: number;
}

export interface MetricPoint {
  time: string;
  value: number;
}

export interface ChartData {
  cpu: MetricPoint[];
  ram: MetricPoint[];
  network: { time: string; in: number; out: number }[];
}

export interface AlertThreshold {
  metric: string;
  warning: number;
  critical: number;
  unit: string;
}

export interface Settings {
  refreshInterval: number;
  thresholds: AlertThreshold[];
  notifications: {
    email: boolean;
    telegram: boolean;
    emailAddress: string;
    telegramChatId: string;
  };
  maintenanceMode: boolean;
}
