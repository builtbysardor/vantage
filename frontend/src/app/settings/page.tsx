'use client';
import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/shared/Sidebar';
import { Topbar } from '@/components/shared/Topbar';
import { Card, CardHeader, PageHeader } from '@/components/shared/ui';
import { api } from '@/lib/api';
import { Bell, Mail, MessageSquare, RefreshCw, Shield, Save, AlertTriangle, Wrench } from 'lucide-react';
import type { Settings } from '@/types';
import { cn } from '@/lib/utils';

const DEFAULT: Settings = {
  refreshInterval: 15,
  thresholds: [
    { metric: 'CPU Usage',       warning: 80, critical: 90, unit: '%' },
    { metric: 'RAM Usage',       warning: 85, critical: 95, unit: '%' },
    { metric: 'Disk Usage',      warning: 75, critical: 90, unit: '%' },
    { metric: 'CPU Temperature', warning: 70, critical: 85, unit: '°C' },
  ],
  notifications: { email: false, telegram: false, emailAddress: '', telegramChatId: '' },
  maintenanceMode: false,
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT);

  useEffect(() => {
    api.getThresholds().then(thresholds => {
      setSettings(s => ({ ...s, thresholds }));
    }).catch(() => { /* keep defaults */ });
  }, []);
  const [saved, setSaved] = useState(false);

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const updateThreshold = (idx: number, key: 'warning' | 'critical', val: number) => {
    setSettings(prev => ({
      ...prev,
      thresholds: prev.thresholds.map((t, i) => i === idx ? { ...t, [key]: val } : t),
    }));
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title="Settings" />
        <main className="flex-1 overflow-y-auto p-6 space-y-5">
          <PageHeader
            title="Settings"
            description="Configure thresholds, notifications, and monitoring behaviour"
            right={
              <button
                onClick={save}
                className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all', saved
                  ? 'bg-emerald-400/20 text-emerald-400 border border-emerald-400/30'
                  : 'bg-slate-700 text-slate-300 border border-slate-600 hover:bg-slate-600'
                )}
              >
                <Save className="w-4 h-4" />
                {saved ? 'Saved!' : 'Save Changes'}
              </button>
            }
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Thresholds */}
            <Card>
              <CardHeader title="Alert Thresholds" subtitle="Warning and critical levels for each metric" />
              <div className="space-y-4">
                {settings.thresholds.map((t, i) => (
                  <div key={t.metric}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-300">{t.metric}</span>
                      <span className="text-xs text-slate-600 font-mono">{t.unit}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-amber-400 mb-1 block">Warning ≥</label>
                        <input
                          type="number"
                          value={t.warning}
                          onChange={e => updateThreshold(i, 'warning', +e.target.value)}
                          className="w-full bg-amber-400/5 border border-amber-400/15 rounded-lg px-3 py-1.5 text-sm font-mono text-amber-400 outline-none focus:border-amber-400/40 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-red-400 mb-1 block">Critical ≥</label>
                        <input
                          type="number"
                          value={t.critical}
                          onChange={e => updateThreshold(i, 'critical', +e.target.value)}
                          className="w-full bg-red-400/5 border border-red-400/15 rounded-lg px-3 py-1.5 text-sm font-mono text-red-400 outline-none focus:border-red-400/30 transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <div className="space-y-5">
              {/* Refresh interval */}
              <Card>
                <CardHeader title="Refresh Interval" subtitle="How often metrics are polled" />
                <div className="flex items-center gap-3">
                  <input
                    type="range" min={5} max={60} step={5}
                    value={settings.refreshInterval}
                    onChange={e => setSettings(s => ({ ...s, refreshInterval: +e.target.value }))}
                    className="flex-1 accent-emerald-400"
                  />
                  <span className="w-20 text-right font-mono text-emerald-400 text-sm">{settings.refreshInterval}s</span>
                </div>
                <div className="flex justify-between text-xs text-slate-600 mt-1">
                  <span>5s (realtime)</span>
                  <span>60s (low load)</span>
                </div>
              </Card>

              {/* Maintenance mode */}
              <Card className={cn('transition-all', settings.maintenanceMode && 'border-sky-400/25')}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Wrench className="w-4 h-4 text-sky-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-200">Maintenance Mode</p>
                      <p className="text-xs text-slate-500">Suppresses all alerts while active</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSettings(s => ({ ...s, maintenanceMode: !s.maintenanceMode }))}
                    className={cn('w-11 h-6 rounded-full transition-all relative', settings.maintenanceMode ? 'bg-sky-400' : 'bg-slate-700')}
                  >
                    <span className={cn('absolute top-1 w-4 h-4 rounded-full bg-white transition-all', settings.maintenanceMode ? 'left-6' : 'left-1')} />
                  </button>
                </div>
                {settings.maintenanceMode && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-sky-400 bg-sky-400/5 border border-sky-400/15 rounded-lg px-3 py-2">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Maintenance mode is active — alert notifications suppressed
                  </div>
                )}
              </Card>

              {/* Notifications */}
              <Card>
                <CardHeader title="Notifications" subtitle="Alert delivery channels" />
                <div className="space-y-4">
                  {/* Email */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-500" />
                        <span className="text-sm text-slate-300">Email Alerts</span>
                      </div>
                      <button
                        onClick={() => setSettings(s => ({ ...s, notifications: { ...s.notifications, email: !s.notifications.email } }))}
                        className={cn('w-11 h-6 rounded-full transition-all relative', settings.notifications.email ? 'bg-emerald-400' : 'bg-slate-700')}
                      >
                        <span className={cn('absolute top-1 w-4 h-4 rounded-full bg-white transition-all', settings.notifications.email ? 'left-6' : 'left-1')} />
                      </button>
                    </div>
                    {settings.notifications.email && (
                      <input
                        value={settings.notifications.emailAddress}
                        onChange={e => setSettings(s => ({ ...s, notifications: { ...s.notifications, emailAddress: e.target.value } }))}
                        placeholder="admin@example.com"
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 placeholder-slate-600 outline-none focus:border-slate-500 font-mono"
                      />
                    )}
                  </div>
                  {/* Telegram */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-slate-500" />
                        <span className="text-sm text-slate-300">Telegram Alerts</span>
                      </div>
                      <button
                        onClick={() => setSettings(s => ({ ...s, notifications: { ...s.notifications, telegram: !s.notifications.telegram } }))}
                        className={cn('w-11 h-6 rounded-full transition-all relative', settings.notifications.telegram ? 'bg-emerald-400' : 'bg-slate-700')}
                      >
                        <span className={cn('absolute top-1 w-4 h-4 rounded-full bg-white transition-all', settings.notifications.telegram ? 'left-6' : 'left-1')} />
                      </button>
                    </div>
                    {settings.notifications.telegram && (
                      <input
                        value={settings.notifications.telegramChatId}
                        onChange={e => setSettings(s => ({ ...s, notifications: { ...s.notifications, telegramChatId: e.target.value } }))}
                        placeholder="Telegram Chat ID"
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 placeholder-slate-600 outline-none focus:border-slate-500 font-mono"
                      />
                    )}
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
