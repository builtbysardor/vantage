import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'online': case 'up': case 'ok': return 'text-emerald-400';
    case 'degraded': case 'warning': return 'text-amber-400';
    case 'offline': case 'down': case 'failed': return 'text-red-400';
    case 'maintenance': return 'text-sky-400';
    default: return 'text-slate-400';
  }
}

export function getStatusBg(status: string): string {
  switch (status) {
    case 'online': case 'up': case 'ok': return 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20';
    case 'degraded': case 'warning': return 'bg-amber-400/10 text-amber-400 border-amber-400/20';
    case 'offline': case 'down': case 'failed': return 'bg-red-400/10 text-red-400 border-red-400/20';
    case 'maintenance': return 'bg-sky-400/10 text-sky-400 border-sky-400/20';
    default: return 'bg-slate-400/10 text-slate-400 border-slate-400/20';
  }
}

export function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical': return 'bg-red-500/10 text-red-400 border-red-500/20';
    case 'high':     return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
    case 'medium':   return 'bg-amber-400/10 text-amber-400 border-amber-400/20';
    case 'low':      return 'bg-sky-400/10 text-sky-400 border-sky-400/20';
    default:         return 'bg-slate-400/10 text-slate-400 border-slate-400/20';
  }
}

export function getLogLevelColor(level: string): string {
  switch (level) {
    case 'CRITICAL': return 'text-red-400 bg-red-400/10';
    case 'ERROR':    return 'text-orange-400 bg-orange-400/10';
    case 'WARN':     return 'text-amber-400 bg-amber-400/10';
    case 'OK':       return 'text-emerald-400 bg-emerald-400/10';
    case 'INFO':
    default:         return 'text-sky-400 bg-sky-400/10';
  }
}

export function getHealthColor(score: number): string {
  if (score >= 90) return 'text-emerald-400';
  if (score >= 70) return 'text-amber-400';
  if (score >= 50) return 'text-orange-400';
  return 'text-red-400';
}

export function getBarColor(value: number, warnAt = 80, critAt = 90): string {
  if (value >= critAt) return 'bg-red-500';
  if (value >= warnAt) return 'bg-amber-400';
  return 'bg-emerald-500';
}
