'use client';
import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/shared/Sidebar';
import { Topbar } from '@/components/shared/Topbar';
import { Card, CardHeader, SeverityBadge, PageHeader } from '@/components/shared/ui';
import { api } from '@/lib/api';
import { onRefresh, dispatchAlertsCount } from '@/lib/events';
import { formatTimestamp, timeAgo, cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle, Clock, User, Filter, Bell } from 'lucide-react';
import type { Alert, AlertSeverity, AlertStatus } from '@/types';

const SEVERITY_ORDER: AlertSeverity[] = ['critical', 'high', 'medium', 'low'];

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<AlertStatus | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | 'all'>('all');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await api.getAlerts();
        if (!cancelled) { setAlerts(data); setLoading(false); }
      } catch {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const off = onRefresh(load);
    return () => { cancelled = true; off(); };
  }, []);

  const acknowledge = async (id: string) => {
    try {
      const updated = await api.acknowledgeAlert(id);
      setAlerts(prev => {
        const next = prev.map(a => a.id === id ? updated : a);
        dispatchAlertsCount(next.filter(a => a.status === 'active').length);
        return next;
      });
    } catch { /* optimistic update already done */ }
  };
  const resolve = async (id: string) => {
    try {
      const updated = await api.resolveAlert(id);
      setAlerts(prev => {
        const next = prev.map(a => a.id === id ? updated : a);
        dispatchAlertsCount(next.filter(a => a.status === 'active').length);
        return next;
      });
    } catch { /* optimistic update already done */ }
  };

  const filtered = alerts.filter(a =>
    (statusFilter === 'all' || a.status === statusFilter) &&
    (severityFilter === 'all' || a.severity === severityFilter)
  );

  const counts = {
    active: alerts.filter(a => a.status === 'active').length,
    acknowledged: alerts.filter(a => a.status === 'acknowledged').length,
    resolved: alerts.filter(a => a.status === 'resolved').length,
    critical: alerts.filter(a => a.severity === 'critical').length,
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title="Alerts & Incidents" />
        <main className="flex-1 overflow-y-auto p-6 space-y-5">
          <PageHeader title="Alerts" description="Active incidents, acknowledgements, and resolved events" />

          {loading ? (
            <Card className="text-center py-12">
              <p className="text-slate-400 font-medium">Loading alerts…</p>
            </Card>
          ) : <>

          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Active', count: counts.active, color: 'text-red-400', border: 'border-red-500/20', bg: 'bg-red-500/5' },
              { label: 'Acknowledged', count: counts.acknowledged, color: 'text-amber-400', border: 'border-amber-400/20', bg: 'bg-amber-400/5' },
              { label: 'Resolved', count: counts.resolved, color: 'text-emerald-400', border: 'border-emerald-400/20', bg: 'bg-emerald-400/5' },
              { label: 'Critical', count: counts.critical, color: 'text-red-400', border: 'border-red-500/20', bg: 'bg-red-500/5' },
            ].map(s => (
              <Card key={s.label} className={cn('text-center py-4', s.border, s.bg)}>
                <div className={`text-2xl font-bold ${s.color}`}>{s.count}</div>
                <div className="text-xs text-slate-500 mt-1 uppercase tracking-widest">{s.label}</div>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Filter className="w-3.5 h-3.5" /> Status:
            </div>
            {(['all', 'active', 'acknowledged', 'resolved'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border capitalize transition-all', statusFilter === s
                  ? 'bg-slate-700 border-slate-600 text-slate-200'
                  : 'bg-transparent border-slate-800 text-slate-500 hover:text-slate-300'
                )}
              >{s}</button>
            ))}
            <div className="h-4 w-px bg-slate-800 mx-1" />
            <div className="flex items-center gap-1.5 text-xs text-slate-500">Severity:</div>
            {(['all', ...SEVERITY_ORDER] as const).map(s => (
              <button
                key={s}
                onClick={() => setSeverityFilter(s as any)}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border capitalize transition-all', severityFilter === s
                  ? 'bg-slate-700 border-slate-600 text-slate-200'
                  : 'bg-transparent border-slate-800 text-slate-500 hover:text-slate-300'
                )}
              >{s}</button>
            ))}
          </div>

          {/* Alert list */}
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <Card className="text-center py-12">
                <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
                <p className="text-slate-400 font-medium">No alerts match the current filter</p>
                <p className="text-slate-600 text-sm mt-1">All systems are operating normally</p>
              </Card>
            ) : filtered.map(alert => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onAcknowledge={() => acknowledge(alert.id)}
                onResolve={() => resolve(alert.id)}
              />
            ))}
          </div>

          </>}
        </main>
      </div>
    </div>
  );
}

function AlertCard({ alert, onAcknowledge, onResolve }: {
  alert: Alert; onAcknowledge: () => void; onResolve: () => void;
}) {
  const isActive = alert.status === 'active';
  const isAcked  = alert.status === 'acknowledged';

  return (
    <Card className={cn('transition-all', {
      'border-red-500/25 bg-red-500/4': alert.severity === 'critical' && isActive,
      'border-orange-500/20': alert.severity === 'high' && isActive,
      'border-slate-700': alert.status === 'resolved',
      'opacity-60': alert.status === 'resolved',
    })}>
      <div className="flex items-start gap-4">
        {/* Severity icon */}
        <div className={cn('p-2 rounded-lg shrink-0 mt-0.5', {
          'bg-red-500/10': alert.severity === 'critical',
          'bg-orange-500/10': alert.severity === 'high',
          'bg-amber-400/10': alert.severity === 'medium',
          'bg-sky-400/10': alert.severity === 'low',
        })}>
          <AlertTriangle className={cn('w-4 h-4', {
            'text-red-400': alert.severity === 'critical',
            'text-orange-400': alert.severity === 'high',
            'text-amber-400': alert.severity === 'medium',
            'text-sky-400': alert.severity === 'low',
          })} />
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap mb-1">
            <h3 className="text-sm font-semibold text-slate-200">{alert.title}</h3>
            <SeverityBadge severity={alert.severity} />
            <span className={cn('text-xs px-2 py-0.5 rounded border font-medium uppercase', {
              'bg-red-500/10 text-red-400 border-red-500/20': alert.status === 'active',
              'bg-amber-400/10 text-amber-400 border-amber-400/20': alert.status === 'acknowledged',
              'bg-emerald-400/10 text-emerald-400 border-emerald-400/20': alert.status === 'resolved',
            })}>{alert.status}</span>
          </div>

          <p className="text-sm text-slate-400 leading-relaxed mb-3">{alert.message}</p>

          <div className="flex items-center gap-4 text-xs text-slate-600 flex-wrap">
            <span className="flex items-center gap-1.5 font-mono"><Bell className="w-3 h-3" />{alert.source}</span>
            <span className="flex items-center gap-1.5 font-mono">host: {alert.host}</span>
            <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" />{timeAgo(alert.createdAt)}</span>
            <span className="text-slate-700">{formatTimestamp(alert.createdAt)}</span>
            {alert.acknowledgedBy && (
              <span className="flex items-center gap-1.5 text-amber-400/70"><User className="w-3 h-3" />Acked by {alert.acknowledgedBy}</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 shrink-0">
          {isActive && (
            <button onClick={onAcknowledge} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-400/10 text-amber-400 border border-amber-400/20 hover:bg-amber-400/20 transition-colors">
              Acknowledge
            </button>
          )}
          {(isActive || isAcked) && (
            <button onClick={onResolve} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 hover:bg-emerald-400/20 transition-colors">
              Resolve
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}
