import { type LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: LucideIcon;
  color?: "brand" | "ok" | "warn" | "critical" | "accent";
}

const colors = {
  brand: "text-brand",
  ok: "text-ok",
  warn: "text-warn",
  critical: "text-critical",
  accent: "text-accent",
};

export function StatCard({ label, value, sub, icon: Icon, color = "brand" }: StatCardProps) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5 flex items-start justify-between gap-4">
      <div>
        <p className="text-xs text-muted uppercase tracking-wider">{label}</p>
        <p className={`font-mono text-2xl font-bold mt-1 ${colors[color]}`}>{value}</p>
        {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
      </div>
      {Icon && (
        <div className="w-9 h-9 rounded-lg bg-elevated border border-border flex items-center justify-center shrink-0">
          <Icon size={16} className={colors[color]} />
        </div>
      )}
    </div>
  );
}
