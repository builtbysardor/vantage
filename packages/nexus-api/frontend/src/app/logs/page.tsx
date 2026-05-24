'use client';
import { useState, useEffect, useRef } from 'react';
import { Sidebar } from '@/components/shared/Sidebar';
import { Topbar } from '@/components/shared/Topbar';
import { Card, LogLevelBadge, PageHeader, LiveDot } from '@/components/shared/ui';
import { api } from '@/lib/api';
import { onRefresh } from '@/lib/events';
import { useWebSocket } from '@/lib/useWebSocket';
import { formatTimestamp } from '@/lib/utils';
import { Search, Filter, Pause, Play, Download } from 'lucide-react';
import type { LogEntry } from '@/types';

const LEVELS = ['ALL', 'INFO', 'OK', 'WARN', 'ERROR', 'CRITICAL'] as const;
const SOURCES = ['ALL', 'nginx', 'postgresql', 'redis', 'rabbitmq', 'api-gateway', 'mail-worker', 'system'];

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [streaming, setStreaming] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { lastMessage } = useWebSocket();

  useEffect(() => {
    let cancelled = false;
    api.getLogs(100).then(data => {
      if (!cancelled) setLogs(data);
    }).catch(() => {});
    const off = onRefresh(() => {
      api.getLogs(100).then(data => setLogs(data)).catch(() => {});
    });
    return () => { cancelled = true; off(); };
  }, []);

  useEffect(() => {
    if (!lastMessage || lastMessage.type !== 'log') return;
    if (!streaming) return;
    const entry = lastMessage.data as LogEntry;
    setLogs(prev => [entry, ...prev.slice(0, 199)]);
  }, [lastMessage, streaming]);

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const filtered = logs.filter(l => {
    const matchLevel  = levelFilter === 'ALL' || l.level === levelFilter;
    const matchSource = sourceFilter === 'ALL' || l.source === sourceFilter;
    const matchSearch = !search || l.message.toLowerCase().includes(search.toLowerCase()) || l.source.includes(search.toLowerCase()) || l.host.includes(search.toLowerCase());
    return matchLevel && matchSource && matchSearch;
  });

  const counts = { INFO: 0, OK: 0, WARN: 0, ERROR: 0, CRITICAL: 0 };
  logs.forEach(l => { if (l.level in counts) counts[l.level as keyof typeof counts]++; });

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title="System Logs" />
        <main className="flex-1 overflow-y-auto p-6 space-y-4">
          <PageHeader title="Logs" description="Live system log stream from all monitored hosts" />

          {/* Stats row */}
          <div className="flex gap-3 flex-wrap">
            {Object.entries(counts).map(([level, count]) => (
              <button
                key={level}
                onClick={() => setLevelFilter(levelFilter === level ? 'ALL' : level)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                  levelFilter === level ? 'ring-1 ring-white/20' : 'opacity-70 hover:opacity-100'
                } ${
                  level === 'CRITICAL' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                  level === 'ERROR'    ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                  level === 'WARN'     ? 'bg-amber-400/10 text-amber-400 border-amber-400/20' :
                  level === 'OK'       ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' :
                  'bg-sky-400/10 text-sky-400 border-sky-400/20'
                }`}
              >
                <span className="font-mono font-bold">{count}</span> {level}
              </button>
            ))}
          </div>

          {/* Controls */}
          <Card className="py-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-1 min-w-48 bg-slate-800 rounded-lg px-3 py-2 border border-slate-700">
                <Search className="w-3.5 h-3.5 text-slate-500" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search logs..."
                  className="flex-1 bg-transparent text-sm text-slate-300 placeholder-slate-600 outline-none"
                />
              </div>

              <select
                value={sourceFilter}
                onChange={e => setSourceFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-2 outline-none"
              >
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              <button
                onClick={() => setStreaming(!streaming)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                  streaming
                    ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20'
                    : 'bg-slate-700/50 text-slate-400 border-slate-700'
                }`}
              >
                {streaming ? <><LiveDot /><span>Streaming</span></> : <><Play className="w-3 h-3" /><span>Paused</span></>}
              </button>

              <span className="text-xs text-slate-500 font-mono ml-auto">{filtered.length} entries</span>
            </div>
          </Card>

          {/* Log stream */}
          <Card className="p-0 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span className="text-xs text-slate-600 font-mono ml-2">system.log — live stream</span>
              </div>
              <div className="flex items-center gap-2">
                {streaming && <><LiveDot /><span className="text-xs text-emerald-400 font-mono">LIVE</span></>}
              </div>
            </div>

            <div className="h-[480px] overflow-y-auto font-mono text-xs">
              {filtered.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-slate-600">No log entries match your filter.</div>
              ) : (
                filtered.map((log, i) => (
                  <div
                    key={log.id}
                    className={`flex items-start gap-3 px-4 py-2 border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors ${i === 0 && streaming ? 'slide-in' : ''}`}
                  >
                    <span className="text-slate-600 shrink-0 w-44 text-xs pt-0.5">
                      {formatTimestamp(log.timestamp)}
                    </span>
                    <LogLevelBadge level={log.level} />
                    <span className="text-sky-400/70 shrink-0 w-24 truncate">{log.source}</span>
                    <span className="text-slate-400 shrink-0 w-28 truncate">{log.host}</span>
                    <span className="text-slate-300 flex-1">{log.message}</span>
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
}
