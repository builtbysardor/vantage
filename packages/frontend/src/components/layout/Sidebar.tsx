"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Activity, Server, FileText,
  Bell, Zap, Monitor, Container, LogOut
} from "lucide-react";
import { clearToken } from "@/lib/auth";
import { useRouter } from "next/navigation";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/metrics", label: "Metrics", icon: Activity },
  { href: "/services", label: "Services", icon: Server },
  { href: "/logs", label: "Logs", icon: FileText },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/anomalies", label: "Anomalies", icon: Zap },
  { href: "/hosts", label: "Hosts", icon: Monitor },
  { href: "/containers", label: "Containers", icon: Container },
];

export function Sidebar() {
  const path = usePathname();
  const router = useRouter();

  return (
    <aside className="w-56 shrink-0 flex flex-col bg-surface border-r border-border h-screen sticky top-0">
      <div className="px-5 py-4 border-b border-border">
        <span className="font-mono text-lg font-bold text-brand tracking-tight">VANTAGE</span>
        <p className="text-xs text-muted mt-0.5">Observability Platform</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link key={href} href={href} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${active ? "bg-elevated text-brand font-medium" : "text-text-secondary hover:text-text hover:bg-elevated/50"}`}>
              <Icon size={15} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="px-3 py-4 border-t border-border">
        <button onClick={() => { clearToken(); router.push("/login"); }}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted hover:text-critical hover:bg-elevated/50 w-full transition-colors">
          <LogOut size={15} /> Sign out
        </button>
      </div>
    </aside>
  );
}
