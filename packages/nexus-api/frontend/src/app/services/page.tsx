'use client';
import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/shared/Sidebar';
import { Topbar } from '@/components/shared/Topbar';
import { Card, CardHeader, StatusBadge, MetricBar, PageHeader } from '@/components/shared/ui';
import { api } from '@/lib/api';
import { onRefresh } from '@/lib/events';
import { getHealthColor, cn } from '@/lib/utils';
import { RefreshCw, Play, Square, RotateCcw, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import type { Service } from '@/types';

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await api.getServices();
        if (!cancelled) { setServices(data); setLoading(false); }
      } catch {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const off = onRefresh(load);
    const id = setInterval(load, 30_000); // services update every 30s
    return () => { cancelled = true; off(); clearInterval(id); };
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title="Service Monitoring" />
        <main className="flex-1 overflow-y-auto p-6">
          <PageHeader
            title="Services"
            description="Health, latency, and uptime for all monitored services"
            right={
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Online</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Degraded</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Offline</span>
              </div>
            }
          />

          {loading ? (
            <Card className="text-center py-12">
              <p className="text-slate-400 font-medium">Loading services…</p>
            </Card>
          ) : <>

          {/* Summary row */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total', value: services.length, color: 'text-slate-300' },
              { label: 'Online', value: services.filter(s => s.status === 'online').length, color: 'text-emerald-400' },
              { label: 'Degraded', value: services.filter(s => s.status === 'degraded').length, color: 'text-amber-400' },
              { label: 'Offline', value: services.filter(s => s.status === 'offline').length, color: 'text-red-400' },
            ].map(s => (
              <Card key={s.label} className="text-center py-4">
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-slate-500 mt-1 uppercase tracking-widest">{s.label}</div>
              </Card>
            ))}
          </div>

          {/* Service cards */}
          <div className="space-y-3">
            {services.map(svc => (
              <ServiceCard
                key={svc.id}
                service={svc}
                expanded={expanded === svc.id}
                onToggle={() => setExpanded(expanded === svc.id ? null : svc.id)}
              />
            ))}
          </div>

          </>}
        </main>
      </div>
    </div>
  );
}

function ServiceCard({ service: s, expanded, onToggle }: {
  service: Service; expanded: boolean; onToggle: () => void;
}) {
  return (
    <Card className={cn('transition-all', {
      'border-red-500/20 bg-red-500/3': s.status === 'offline',
      'border-amber-400/20': s.status === 'degraded',
    })}>
      {/* Header row */}
      <div className="flex items-center gap-4 cursor-pointer" onClick={onToggle}>
        <div className={cn('w-2.5 h-2.5 rounded-full shrink-0', {
          'bg-emerald-400 shadow-[0_0_6px_theme(colors.emerald.400)]': s.status === 'online',
          'bg-amber-400 shadow-[0_0_6px_theme(colors.amber.400)]': s.status === 'degraded',
          'bg-red-400 shadow-[0_0_6px_theme(colors.red.400)]': s.status === 'offline',
          'bg-sky-400': s.status === 'maintenance',
        })} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-200">{s.displayName}</span>
            <span className="text-xs font-mono text-slate-600">:{s.port}</span>
            {s.version && <span className="text-xs text-slate-600">v{s.version}</span>}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{s.description}</p>
        </div>

        {/* Health score */}
        <div className="text-right w-16 shrink-0">
          <div className={cn('text-lg font-bold tabular-nums', getHealthColor(s.healthScore))}>{s.healthScore}</div>
          <div className="text-xs text-slate-600">health</div>
        </div>

        {/* Uptime */}
        <div className="text-right w-20 shrink-0">
          <div className="text-sm font-mono text-slate-300">{s.uptime}%</div>
          <div className="text-xs text-slate-600">uptime</div>
        </div>

        {/* Latency */}
        <div className="text-right w-20 shrink-0">
          <div className={cn('text-sm font-mono', s.latency > 100 ? 'text-red-400' : s.latency > 50 ? 'text-amber-400' : 'text-slate-300')}>
            {s.latency > 0 ? `${s.latency} ms` : '— ms'}
          </div>
          <div className="text-xs text-slate-600">latency</div>
        </div>

        {/* Restarts */}
        <div className="text-right w-16 shrink-0">
          <div className={cn('text-sm font-mono', s.restarts > 3 ? 'text-red-400' : s.restarts > 0 ? 'text-amber-400' : 'text-slate-300')}>
            {s.restarts}
          </div>
          <div className="text-xs text-slate-600">restarts</div>
        </div>

        <StatusBadge status={s.status} />

        <button className="text-slate-600 hover:text-slate-400 ml-1">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-slate-800">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <InfoCell label="PID" value={s.pid ? String(s.pid) : 'Not running'} mono />
            <InfoCell label="Port" value={String(s.port)} mono />
            <InfoCell label="Last Check" value={new Date(s.lastCheck).toLocaleTimeString('de-DE')} mono />
            <InfoCell label="Status" value={s.status} />
          </div>

          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-500">Health Score</span>
              <span className={getHealthColor(s.healthScore)}>{s.healthScore}/100</span>
            </div>
            <MetricBar value={s.healthScore} warnAt={70} critAt={50} />
          </div>

          {/* Action buttons - UI placeholder */}
          <div className="flex gap-2 mt-2">
            <button
              disabled={s.status === 'online'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 hover:bg-emerald-400/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Play className="w-3 h-3" /> Start
            </button>
            <button
              disabled={s.status === 'offline'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-400/10 text-red-400 border border-red-400/20 hover:bg-red-400/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Square className="w-3 h-3" /> Stop
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-400/10 text-amber-400 border border-amber-400/20 hover:bg-amber-400/20 transition-colors">
              <RotateCcw className="w-3 h-3" /> Restart
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-700/50 text-slate-400 border border-slate-700 hover:bg-slate-700 transition-colors">
              <RefreshCw className="w-3 h-3" /> Check Health
            </button>
          </div>
          <p className="text-xs text-slate-700 mt-2">⚠ Service control is available via backend agent integration</p>
        </div>
      )}
    </Card>
  );
}

function InfoCell({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-slate-600 uppercase tracking-widest mb-1">{label}</p>
      <p className={cn('text-sm text-slate-300', mono && 'font-mono')}>{value}</p>
    </div>
  );
}
