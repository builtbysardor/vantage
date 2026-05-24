'use client';
import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/shared/Sidebar';
import { Topbar } from '@/components/shared/Topbar';
import { Card, StatusBadge, MetricBar, PageHeader } from '@/components/shared/ui';
import { api } from '@/lib/api';
import { onRefresh } from '@/lib/events';
import { formatBytes, timeAgo, cn } from '@/lib/utils';
import { Monitor, HardDrive, Shield, Server, AlertCircle, Archive } from 'lucide-react';
import type { Host } from '@/types';

const ROLE_ICONS: Record<Host['role'], typeof Server> = {
  master: Server, worker: Monitor, db: HardDrive,
  gateway: Shield, backup: Archive,
};

const BACKUP_COLORS = {
  ok: 'text-emerald-400', warning: 'text-amber-400',
  failed: 'text-red-400', running: 'text-sky-400',
};

export default function DevicesPage() {
  const [hosts, setHosts] = useState<Host[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await api.getHosts();
        if (!cancelled) setHosts(data);
      } catch { /* keep current */ }
    };
    load();
    const off = onRefresh(load);
    const id = setInterval(load, 30_000);
    return () => { cancelled = true; off(); clearInterval(id); };
  }, []);

  const online = hosts.filter(h => h.status === 'online').length;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title="Devices & Hosts" />
        <main className="flex-1 overflow-y-auto p-6 space-y-5">
          <PageHeader title="Devices" description="Host inventory, OS, resources, and connectivity status" />

          {/* Summary */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Total Hosts', value: hosts.length, color: 'text-slate-300' },
              { label: 'Online',      value: online,                                           color: 'text-emerald-400' },
              { label: 'Maintenance', value: hosts.filter(h => h.status === 'maintenance').length, color: 'text-sky-400' },
              { label: 'Offline',     value: hosts.filter(h => h.status === 'offline').length,    color: 'text-red-400' },
            ].map(s => (
              <Card key={s.label} className="text-center py-4">
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-slate-500 mt-1 uppercase tracking-widest">{s.label}</div>
              </Card>
            ))}
          </div>

          {/* Host grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {hosts.map(host => <HostCard key={host.id} host={host} />)}
          </div>
        </main>
      </div>
    </div>
  );
}

function HostCard({ host }: { host: Host }) {
  const RoleIcon = ROLE_ICONS[host.role] || Server;
  const isDown = host.status === 'offline';
  const isMaint = host.status === 'maintenance';

  // SSL expiry warning
  const sslDaysLeft = host.sslExpiry
    ? Math.ceil((new Date(host.sslExpiry).getTime() - Date.now()) / 86400000)
    : null;
  const sslWarning = sslDaysLeft !== null && sslDaysLeft < 60;

  return (
    <Card className={cn('transition-all hover:-translate-y-0.5', {
      'border-red-500/20 bg-red-500/3': isDown,
      'border-sky-400/20 bg-sky-400/3': isMaint,
    })}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className={cn('p-2 rounded-lg', {
            'bg-emerald-400/10 text-emerald-400': !isDown && !isMaint,
            'bg-red-400/10 text-red-400': isDown,
            'bg-sky-400/10 text-sky-400': isMaint,
          })}>
            <RoleIcon className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-semibold font-mono text-slate-200">{host.hostname}</p>
            <p className="text-xs text-slate-500 font-mono">{host.ip}</p>
          </div>
        </div>
        <StatusBadge status={host.status} />
      </div>

      {/* OS & Location */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs text-slate-500">
          {host.os} {host.osVersion}
        </div>
        <div className="text-xs text-slate-600 font-mono">{host.location}</div>
      </div>

      {/* Resources */}
      {!isDown && !isMaint && (
        <div className="space-y-2.5 mb-3">
          <ResourceRow label="CPU" value={host.cpu} />
          <ResourceRow label="RAM" value={host.ram} />
          <ResourceRow label="Disk" value={host.disk} />
        </div>
      )}

      {isMaint && (
        <div className="flex items-center gap-2 py-3 px-3 rounded-lg bg-sky-400/5 border border-sky-400/15 mb-3 text-xs text-sky-400">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Host is in maintenance mode</span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2.5 border-t border-slate-800 text-xs">
        <div className="flex items-center gap-3 text-slate-500">
          <span className="font-mono">{host.services} services</span>
          <span className="capitalize text-slate-600">{host.role}</span>
        </div>
        <div className="text-slate-600 font-mono">seen {timeAgo(host.lastSeen)}</div>
      </div>

      {/* Badges row */}
      <div className="flex gap-2 mt-2.5 flex-wrap">
        {/* SSL */}
        {host.sslExpiry && (
          <div className={cn('flex items-center gap-1 text-xs px-2 py-0.5 rounded border', sslWarning
            ? 'bg-amber-400/10 text-amber-400 border-amber-400/20'
            : 'bg-slate-800 text-slate-500 border-slate-700'
          )}>
            <Shield className="w-3 h-3" />
            SSL {sslDaysLeft}d
          </div>
        )}
        {/* Backup */}
        {host.backupStatus && (
          <div className={cn('flex items-center gap-1 text-xs px-2 py-0.5 rounded border bg-slate-800 border-slate-700', BACKUP_COLORS[host.backupStatus])}>
            <Archive className="w-3 h-3" />
            backup: {host.backupStatus}
          </div>
        )}
      </div>
    </Card>
  );
}

function ResourceRow({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-500">{label}</span>
        <span className={cn('font-mono', value >= 90 ? 'text-red-400' : value >= 80 ? 'text-amber-400' : 'text-slate-400')}>
          {value}%
        </span>
      </div>
      <MetricBar value={value} />
    </div>
  );
}
