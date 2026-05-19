'use client';
import { useState, useEffect, useMemo } from 'react';
import { Sidebar } from '@/components/shared/Sidebar';
import { Topbar } from '@/components/shared/Topbar';
import { Card, CardHeader, BigMetricCard, StatusBadge, LiveDot } from '@/components/shared/ui';
import {
  api,
  snapshotToMetrics, snapshotToDetails, historyToChart,
  type BackendSnapshot, type MetricDetails,
} from '@/lib/api';
import { useWebSocket } from '@/lib/useWebSocket';
import { onRefresh } from '@/lib/events';
import { generateMetrics, generateChartHistory, ALERTS, SERVICES } from '@/lib/mockData';
import { formatUptime, formatBytes, timeAgo, getHealthColor, cn } from '@/lib/utils';
import {
  LineChart, Line, AreaChart, Area, ResponsiveContainer,
  XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import {
  Cpu, MemoryStick, HardDrive, Clock,
  AlertTriangle, Server, Thermometer
} from 'lucide-react';
import type { SystemMetrics, ChartData, Service, Alert } from '@/types';

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [details, setDetails] = useState<MetricDetails | null>(null);
  const [chart, setChart]   = useState<ChartData | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [usingMock, setUsingMock] = useState(false);

  const { lastMessage } = useWebSocket();

  // ─── Initial REST load (fall back to mock on failure) ──────
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [snap, hist, svc, al] = await Promise.all([
          api.getSnapshot(),
          api.getHistory(),
          api.getServices(),
          api.getAlerts(),
        ]);
        if (cancelled) return;
        setMetrics(snapshotToMetrics(snap));
        setDetails(snapshotToDetails(snap));
        setChart(historyToChart(hist));
        setServices(svc);
        setAlerts(al);
        setUsingMock(false);
      } catch {
        if (cancelled) return;
        setMetrics(generateMetrics());
        setChart(generateChartHistory());
        setServices(SERVICES);
        setAlerts(ALERTS);
        setUsingMock(true);
      }
    };
    load();
    const off = onRefresh(load);
    return () => { cancelled = true; off(); };
  }, []);

  // ─── Polling fallback when WS is not delivering ─────────────
  useEffect(() => {
    if (usingMock) return;
    const id = setInterval(() => {
      api.getSnapshot()
        .then(snap => {
          setMetrics(snapshotToMetrics(snap));
          setDetails(snapshotToDetails(snap));
        })
        .catch(() => { /* WS may already be carrying data */ });
    }, 5000);
    return () => clearInterval(id);
  }, [usingMock]);

  // ─── Live WS updates ────────────────────────────────────────
  useEffect(() => {
    if (!lastMessage) return;
    if (lastMessage.type === 'metrics' || lastMessage.type === 'snapshot') {
      const snap = lastMessage.data as BackendSnapshot;
      setMetrics(snapshotToMetrics(snap));
      setDetails(snapshotToDetails(snap));
      if (lastMessage.type === 'snapshot' && lastMessage.data.services) {
        setServices(lastMessage.data.services);
      }
    } else if (lastMessage.type === 'services') {
      setServices(lastMessage.data);
    } else if (lastMessage.type === 'alerts') {
      setAlerts(lastMessage.data);
    }
  }, [lastMessage]);

  const activeAlerts    = useMemo(() => alerts.filter(a => a.status === 'active').length, [alerts]);
  const runningServices = useMemo(() => services.filter(s => s.status === 'online').length, [services]);
  const ramSub = details
    ? `${formatBytes(details.memoryUsedBytes)} / ${formatBytes(details.memoryTotalBytes)} used`
    : 'memory snapshot pending';
  const diskSub = details
    ? `${details.diskMount} · ${formatBytes(details.diskUsedBytes)} / ${formatBytes(details.diskTotalBytes)}`
    : 'disk snapshot pending';

  if (!metrics || !chart) return <LoadingScreen />;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title="System Overview" />
        <main className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Health Summary Banner */}
          <div className="flex items-center gap-4 px-5 py-4 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center gap-3">
              <div className={cn('text-3xl font-bold tabular-nums', getHealthColor(metrics.healthScore))}>
                {metrics.healthScore}
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-widest">Health Score</p>
                <p className="text-sm font-medium text-slate-300">
                  {metrics.healthScore >= 90 ? 'All systems operational' :
                   metrics.healthScore >= 70 ? 'Minor issues detected' : 'Attention required'}
                </p>
              </div>
            </div>
            <div className="h-10 w-px bg-slate-800 mx-2" />
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-400 font-mono">Uptime: {formatUptime(metrics.uptime)}</span>
            </div>
            <div className="h-10 w-px bg-slate-800 mx-2" />
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-slate-400">{runningServices}/{services.length} services running</span>
            </div>
            <div className="h-10 w-px bg-slate-800 mx-2" />
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-sm text-slate-400">{activeAlerts} active alerts</span>
            </div>
            <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
              <LiveDot />
              <span className="font-mono">
                {usingMock ? 'offline (mock)' : `Updated: ${new Date(metrics.timestamp).toLocaleTimeString('de-DE')}`}
              </span>
            </div>
          </div>

          {/* Primary Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <BigMetricCard
              label="CPU Usage"
              value={metrics.cpu}
              unit="%"
              sub={`${metrics.temperature}°C · 8 cores`}
              icon={<Cpu className="w-4 h-4" />}
              color="emerald"
              warnAt={80} critAt={92}
            />
            <BigMetricCard
              label="RAM Usage"
              value={metrics.ram}
              unit="%"
              sub={ramSub}
              icon={<MemoryStick className="w-4 h-4" />}
              color="sky"
              warnAt={85} critAt={95}
            />
            <BigMetricCard
              label="Disk Usage"
              value={metrics.disk}
              unit="%"
              sub={diskSub}
              icon={<HardDrive className="w-4 h-4" />}
              color="violet"
              warnAt={80} critAt={90}
            />
            <BigMetricCard
              label="Temperature"
              value={metrics.temperature}
              unit="°C"
              sub="Core avg · warn at 75°C"
              icon={<Thermometer className="w-4 h-4" />}
              color="amber"
              warnAt={75} critAt={85}
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader
                title="CPU Usage History"
                subtitle="Last 30 minutes"
                right={<span className="text-xs font-mono text-slate-500">{metrics.cpu}% current</span>}
              />
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={chart.cpu} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} interval={5} />
                  <YAxis tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
                    labelStyle={{ color: '#94a3b8' }}
                    itemStyle={{ color: '#10b981' }}
                    formatter={(v: number) => [`${v}%`, 'CPU']}
                  />
                  <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={1.5} fill="url(#cpuGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            <Card>
              <CardHeader
                title="Network Throughput"
                subtitle="Inbound / Outbound — Last 30 minutes"
                right={<span className="text-xs font-mono text-slate-500">{metrics.network.in} / {metrics.network.out} KB/s</span>}
              />
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={chart.network} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} interval={5} />
                  <YAxis tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
                    labelStyle={{ color: '#94a3b8' }}
                    formatter={(v: number, n: string) => [`${v} KB/s`, n === 'in' ? 'Inbound' : 'Outbound']}
                  />
                  <Line type="monotone" dataKey="in"  stroke="#38bdf8" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="out" stroke="#a78bfa" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Services + Alerts Quick View */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Services Quick */}
            <Card>
              <CardHeader title="Service Status" subtitle="All monitored services" />
              <div className="space-y-2.5">
                {services.map(svc => (
                  <div key={svc.id} className="flex items-center gap-3 py-1.5">
                    <div className={cn('w-2 h-2 rounded-full shrink-0', {
                      'bg-emerald-400 shadow-[0_0_4px_theme(colors.emerald.400)]': svc.status === 'online',
                      'bg-amber-400': svc.status === 'degraded',
                      'bg-red-400': svc.status === 'offline',
                      'bg-sky-400': svc.status === 'maintenance',
                    })} />
                    <span className="text-sm font-mono text-slate-300 flex-1">{svc.name}</span>
                    <span className="text-xs text-slate-500">{svc.uptime}% up</span>
                    <span className={cn('text-xs font-mono', svc.latency > 0 ? 'text-slate-400' : 'text-red-400')}>
                      {svc.latency > 0 ? `${svc.latency}ms` : 'N/A'}
                    </span>
                    <StatusBadge status={svc.status} />
                  </div>
                ))}
              </div>
            </Card>

            {/* Active Alerts Quick */}
            <Card>
              <CardHeader
                title="Recent Alerts"
                subtitle="Active & unacknowledged"
                right={<span className="text-xs text-red-400 font-medium">{activeAlerts} active</span>}
              />
              <div className="space-y-2.5">
                {alerts.slice(0, 5).map(alert => (
                  <div key={alert.id} className={cn('flex items-start gap-3 p-3 rounded-lg border', {
                    'bg-red-500/5 border-red-500/15': alert.severity === 'critical',
                    'bg-orange-500/5 border-orange-500/15': alert.severity === 'high',
                    'bg-amber-400/5 border-amber-400/15': alert.severity === 'medium',
                    'bg-slate-800/50 border-slate-700/50': alert.severity === 'low',
                  })}>
                    <AlertTriangle className={cn('w-4 h-4 mt-0.5 shrink-0', {
                      'text-red-400': alert.severity === 'critical',
                      'text-orange-400': alert.severity === 'high',
                      'text-amber-400': alert.severity === 'medium',
                      'text-sky-400': alert.severity === 'low',
                    })} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{alert.title}</p>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">{alert.host} · {timeAgo(alert.createdAt)}</p>
                    </div>
                    <span className={cn('text-xs px-2 py-0.5 rounded border font-semibold uppercase', {
                      'bg-green-500/10 text-green-400 border-green-500/20': alert.status === 'resolved',
                      'bg-sky-500/10 text-sky-400 border-sky-500/20': alert.status === 'acknowledged',
                      'bg-red-500/10 text-red-400 border-red-500/20': alert.status === 'active',
                    })}>{alert.status}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

        </main>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="flex h-screen overflow-hidden">
      <div className="w-60 shrink-0 bg-slate-950 border-r border-slate-800" />
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-mono">Loading system metrics...</span>
        </div>
      </div>
    </div>
  );
}
