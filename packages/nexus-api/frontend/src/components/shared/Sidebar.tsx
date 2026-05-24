'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Server, ScrollText, Bell, Monitor, Network, Settings,
  Activity, Shield, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LiveDot } from '@/components/shared/ui';
import { api } from '@/lib/api';
import { onAlertsCount } from '@/lib/events';

type NavGroup = 'main' | 'infra' | 'config';
interface NavEntry {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  group: NavGroup;
  badgeKey?: 'alerts';
}

const NAV: NavEntry[] = [
  { href: '/',           label: 'Overview',  icon: LayoutDashboard, group: 'main' },
  { href: '/services',   label: 'Services',  icon: Server,          group: 'main' },
  { href: '/logs',       label: 'Logs',      icon: ScrollText,      group: 'main' },
  { href: '/alerts',     label: 'Alerts',    icon: Bell,            group: 'main', badgeKey: 'alerts' },
  { href: '/devices',    label: 'Devices',   icon: Monitor,         group: 'infra' },
  { href: '/network',    label: 'Network',   icon: Network,         group: 'infra' },
  { href: '/settings',   label: 'Settings',  icon: Settings,        group: 'config' },
];

export function Sidebar() {
  const path = usePathname();
  const [activeAlerts, setActiveAlerts] = useState<number | null>(null);

  // Fetch alert count on mount; refresh when alerts page broadcasts changes.
  useEffect(() => {
    let cancelled = false;
    api.getAlerts()
      .then(alerts => {
        if (!cancelled) setActiveAlerts(alerts.filter(a => a.status === 'active').length);
      })
      .catch(() => {
        if (!cancelled) setActiveAlerts(null);
      });
    const off = onAlertsCount(n => setActiveAlerts(n));
    return () => { cancelled = true; off(); };
  }, []);

  const badgeFor = (key?: 'alerts'): number | undefined => {
    if (key === 'alerts' && activeAlerts && activeAlerts > 0) return activeAlerts;
    return undefined;
  };

  return (
    <aside className="w-60 shrink-0 bg-slate-950 border-r border-slate-800 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="relative w-8 h-8 flex items-center justify-center">
            <svg viewBox="0 0 32 32" fill="none" className="w-8 h-8">
              <rect width="32" height="32" rx="8" fill="rgba(16,185,129,0.08)" stroke="rgba(16,185,129,0.3)" strokeWidth="1"/>
              <circle cx="16" cy="16" r="5.5" fill="none" stroke="#10b981" strokeWidth="1.5" strokeDasharray="2.5 1.5"/>
              <circle cx="16" cy="16" r="2" fill="#10b981"/>
              <line x1="6" y1="16" x2="10" y2="16" stroke="#10b981" strokeWidth="1.2" opacity="0.5"/>
              <line x1="22" y1="16" x2="26" y2="16" stroke="#10b981" strokeWidth="1.2" opacity="0.5"/>
              <line x1="16" y1="6" x2="16" y2="10" stroke="#10b981" strokeWidth="1.2" opacity="0.5"/>
              <line x1="16" y1="22" x2="16" y2="26" stroke="#10b981" strokeWidth="1.2" opacity="0.5"/>
              <circle cx="6" cy="16" r="1.2" fill="#10b981" opacity="0.4"/>
              <circle cx="26" cy="16" r="1.2" fill="#10b981" opacity="0.4"/>
              <circle cx="16" cy="6" r="1.2" fill="#10b981" opacity="0.4"/>
              <circle cx="16" cy="26" r="1.2" fill="#10b981" opacity="0.4"/>
            </svg>
          </div>
          <div>
            <div className="text-sm font-bold text-slate-100 tracking-wide">Nexus Pro</div>
            <div className="text-xs text-slate-500 font-mono">monitoring</div>
          </div>
        </div>
      </div>

      {/* Live Status */}
      <div className="px-4 py-3 border-b border-slate-800">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-400/5 border border-emerald-400/10">
          <LiveDot />
          <span className="text-xs text-emerald-400 font-medium">System Active</span>
          <Activity className="w-3 h-3 text-emerald-400 ml-auto" />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <div className="space-y-1">
          <p className="text-xs text-slate-600 uppercase tracking-widest font-medium px-3 pb-2">Monitor</p>
          {NAV.filter(n => n.group === 'main').map(item => (
            <NavItem key={item.href} item={item} active={path === item.href} badge={badgeFor(item.badgeKey)} />
          ))}
        </div>

        <div className="space-y-1 mt-5">
          <p className="text-xs text-slate-600 uppercase tracking-widest font-medium px-3 pb-2">Infrastructure</p>
          {NAV.filter(n => n.group === 'infra').map(item => (
            <NavItem key={item.href} item={item} active={path === item.href} badge={badgeFor(item.badgeKey)} />
          ))}
        </div>

        <div className="space-y-1 mt-5">
          <p className="text-xs text-slate-600 uppercase tracking-widest font-medium px-3 pb-2">Config</p>
          {NAV.filter(n => n.group === 'config').map(item => (
            <NavItem key={item.href} item={item} active={path === item.href} badge={badgeFor(item.badgeKey)} />
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center">
            <Shield className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div>
            <p className="text-xs text-slate-300 font-medium">IT Operations</p>
            <p className="text-xs text-slate-600 font-mono">admin@sys.local</p>
          </div>
        </div>
        <p className="text-xs text-slate-700 mt-3 font-mono">nexus-pro v2.0.0</p>
      </div>
    </aside>
  );
}

function NavItem({ item, active, badge }: { item: NavEntry; active: boolean; badge?: number }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group',
        active
          ? 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/15'
          : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="flex-1 font-medium">{item.label}</span>
      {badge !== undefined && badge > 0 ? (
        <span className="bg-red-500/20 text-red-400 text-xs font-bold px-1.5 py-0.5 rounded-md border border-red-500/20">
          {badge}
        </span>
      ) : active ? (
        <ChevronRight className="w-3.5 h-3.5 opacity-50" />
      ) : null}
    </Link>
  );
}
