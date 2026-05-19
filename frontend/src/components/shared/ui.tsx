import { cn, getStatusBg, getSeverityColor, getLogLevelColor, getBarColor } from '@/lib/utils';
import type { ReactNode } from 'react';

// ─── Card ────────────────────────────────────────────────────
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('bg-slate-900 border border-slate-800 rounded-xl p-5', className)}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-200 tracking-wide">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  );
}

// ─── StatusBadge ─────────────────────────────────────────────
export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border capitalize', getStatusBg(status))}>
      <span className={cn('w-1.5 h-1.5 rounded-full', {
        'bg-emerald-400 shadow-[0_0_4px_theme(colors.emerald.400)]': status === 'online' || status === 'up' || status === 'ok',
        'bg-amber-400': status === 'degraded' || status === 'warning',
        'bg-red-400': status === 'offline' || status === 'down' || status === 'failed',
        'bg-sky-400': status === 'maintenance',
      })} />
      {status}
    </span>
  );
}

// ─── SeverityBadge ───────────────────────────────────────────
export function SeverityBadge({ severity }: { severity: string }) {
  return (
    <span className={cn('inline-flex px-2.5 py-1 rounded-md text-xs font-semibold border uppercase tracking-wide', getSeverityColor(severity))}>
      {severity}
    </span>
  );
}

// ─── LogLevelBadge ───────────────────────────────────────────
export function LogLevelBadge({ level }: { level: string }) {
  return (
    <span className={cn('inline-flex px-2 py-0.5 rounded text-xs font-bold font-mono min-w-[68px] justify-center', getLogLevelColor(level))}>
      {level}
    </span>
  );
}

// ─── MetricBar ───────────────────────────────────────────────
export function MetricBar({ value, warnAt = 80, critAt = 90, className }: {
  value: number; warnAt?: number; critAt?: number; className?: string;
}) {
  return (
    <div className={cn('h-1.5 bg-slate-800 rounded-full overflow-hidden', className)}>
      <div
        className={cn('h-full rounded-full transition-all duration-700', getBarColor(value, warnAt, critAt))}
        style={{ width: `${Math.min(100, value)}%` }}
      />
    </div>
  );
}

// ─── BigMetricCard ───────────────────────────────────────────
export function BigMetricCard({
  label, value, unit, sub, icon, color = 'emerald', warnAt = 80, critAt = 90,
}: {
  label: string; value: number; unit: string; sub?: string;
  icon: ReactNode; color?: string; warnAt?: number; critAt?: number;
}) {
  const isWarn = value >= warnAt;
  const isCrit = value >= critAt;
  const displayColor = isCrit ? 'text-red-400' : isWarn ? 'text-amber-400' : `text-${color}-400`;

  return (
    <Card>
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs text-slate-500 uppercase tracking-widest font-medium">{label}</span>
        <span className={cn('p-2 rounded-lg', isCrit ? 'bg-red-400/10 text-red-400' : isWarn ? 'bg-amber-400/10 text-amber-400' : `bg-${color}-400/10 text-${color}-400`)}>
          {icon}
        </span>
      </div>
      <div className={cn('text-3xl font-bold tabular-nums', displayColor)}>
        {value}<span className="text-base font-normal text-slate-500 ml-1">{unit}</span>
      </div>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
      <MetricBar value={value} warnAt={warnAt} critAt={critAt} className="mt-3" />
    </Card>
  );
}

// ─── LiveDot ─────────────────────────────────────────────────
export function LiveDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
    </span>
  );
}

// ─── Section Header ──────────────────────────────────────────
export function PageHeader({ title, description, right }: {
  title: string; description?: string; right?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">{title}</h1>
        {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
      </div>
      {right}
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────
export function EmptyState({ icon, title, description }: {
  icon: ReactNode; title: string; description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-slate-600 mb-3">{icon}</div>
      <p className="text-slate-400 font-medium">{title}</p>
      <p className="text-slate-600 text-sm mt-1">{description}</p>
    </div>
  );
}

// ─── Skeleton loader ─────────────────────────────────────────
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-slate-800', className)} />;
}
