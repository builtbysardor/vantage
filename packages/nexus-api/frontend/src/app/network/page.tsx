'use client';
import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/shared/Sidebar';
import { Topbar } from '@/components/shared/Topbar';
import { Card, CardHeader, StatusBadge, PageHeader } from '@/components/shared/ui';
import { api, ifaceToNetworkInterface } from '@/lib/api';
import { onRefresh } from '@/lib/events';
import { formatBytes, cn } from '@/lib/utils';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Network, ArrowDown, ArrowUp, AlertCircle } from 'lucide-react';
import type { NetworkInterface } from '@/types';

const rand = (min: number, max: number) => Math.round(Math.random() * (max - min) + min);

function genNetHistory() {
  return Array.from({ length: 20 }, (_, i) => ({
    time: `${i}m`,
    in: rand(50, 420),
    out: rand(20, 250),
  }));
}

export default function NetworkPage() {
  const [history, setHistory] = useState(genNetHistory());
  const [ifaces, setIfaces] = useState<NetworkInterface[]>([]);

  useEffect(() => {
    const id = setInterval(() => {
      setHistory(prev => [
        ...prev.slice(1),
        { time: 'now', in: rand(50, 420), out: rand(20, 250) },
      ]);
    }, 3000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const raw = await api.getNetwork();
        if (!cancelled) setIfaces(raw.map((n, i) => ifaceToNetworkInterface(n, i)));
      } catch { /* keep current */ }
    };
    load();
    const off = onRefresh(load);
    const id = setInterval(load, 5_000);
    return () => { cancelled = true; off(); clearInterval(id); };
  }, []);

  const totalIn  = ifaces.filter(i => i.status === 'up').reduce((s, i) => s + i.bytesIn, 0);
  const totalOut = ifaces.filter(i => i.status === 'up').reduce((s, i) => s + i.bytesOut, 0);
  const avgLatency = ifaces.filter(i => i.status === 'up' && i.latency > 0).reduce((s, i, _, a) => s + i.latency / a.length, 0);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title="Network Overview" />
        <main className="flex-1 overflow-y-auto p-6 space-y-5">
          <PageHeader title="Network" description="Interface status, bandwidth, latency, and packet rates" />

          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Total Received',  value: formatBytes(totalIn),  icon: ArrowDown, color: 'text-sky-400' },
              { label: 'Total Sent',      value: formatBytes(totalOut), icon: ArrowUp,   color: 'text-violet-400' },
              { label: 'Avg Latency',     value: `${avgLatency.toFixed(1)} ms`, icon: Network, color: 'text-emerald-400' },
              { label: 'Interfaces Up',   value: `${ifaces.filter(i => i.status === 'up').length}/${ifaces.length}`, icon: Network, color: 'text-slate-300' },
            ].map(s => (
              <Card key={s.label}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-500 uppercase tracking-widest">{s.label}</span>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <div className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</div>
              </Card>
            ))}
          </div>

          {/* Bandwidth chart */}
          <Card>
            <CardHeader title="Bandwidth — eth0" subtitle="Inbound / Outbound (Mbps)" />
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={history} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="inGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="outGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
                  formatter={(v: number, name: string) => [`${v} Mbps`, name === 'in' ? 'Inbound' : 'Outbound']}
                />
                <Area type="monotone" dataKey="in"  stroke="#38bdf8" fill="url(#inGrad)"  strokeWidth={1.5} dot={false} />
                <Area type="monotone" dataKey="out" stroke="#a78bfa" fill="url(#outGrad)" strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* Interface table */}
          <Card>
            <CardHeader title="Network Interfaces" subtitle="All monitored interfaces" />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs text-slate-500 uppercase tracking-widest">
                    <th className="text-left py-2 pr-4 font-medium">Interface</th>
                    <th className="text-left py-2 pr-4 font-medium">IP</th>
                    <th className="text-left py-2 pr-4 font-medium">Speed</th>
                    <th className="text-left py-2 pr-4 font-medium">Received</th>
                    <th className="text-left py-2 pr-4 font-medium">Sent</th>
                    <th className="text-left py-2 pr-4 font-medium">Pkts/s In</th>
                    <th className="text-left py-2 pr-4 font-medium">Latency</th>
                    <th className="text-left py-2 pr-4 font-medium">Errors</th>
                    <th className="text-left py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {ifaces.map(iface => (
                    <tr key={iface.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 pr-4 font-mono text-slate-300">{iface.name}</td>
                      <td className="py-3 pr-4 font-mono text-slate-400">{iface.ip}</td>
                      <td className="py-3 pr-4 text-slate-400">{iface.speed}</td>
                      <td className="py-3 pr-4 font-mono text-sky-400/80">{iface.status === 'up' ? formatBytes(iface.bytesIn) : '—'}</td>
                      <td className="py-3 pr-4 font-mono text-violet-400/80">{iface.status === 'up' ? formatBytes(iface.bytesOut) : '—'}</td>
                      <td className="py-3 pr-4 font-mono text-slate-400">{iface.status === 'up' ? iface.packetsIn.toLocaleString() : '—'}</td>
                      <td className="py-3 pr-4">
                        {iface.status === 'up' ? (
                          <span className={cn('font-mono', iface.latency > 1.5 ? 'text-amber-400' : 'text-emerald-400')}>
                            {iface.latency} ms
                          </span>
                        ) : '—'}
                      </td>
                      <td className="py-3 pr-4">
                        <span className={cn('font-mono', iface.errors > 0 ? 'text-amber-400' : 'text-slate-600')}>
                          {iface.errors}
                        </span>
                      </td>
                      <td className="py-3"><StatusBadge status={iface.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Topology note */}
          <Card className="border-dashed border-slate-700/60">
            <div className="flex items-center gap-3 text-slate-500">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <p className="text-sm">
                <span className="text-slate-400 font-medium">Network topology diagram</span> — available when a backend agent is connected and SNMP data is available.
              </p>
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
}
