"use client";
import { usePathname, useRouter } from "next/navigation";
import { useV } from "@/lib/vcontext";
import { clearToken } from "@/lib/auth";
import { VLogo } from "@/components/ui/Logo";
import { VIcon } from "@/components/ui/Icons";

const NAV_GROUPS = [
  {
    label: "Main",
    items: [
      { id: "overview",   href: "/",          label: "Overview",   icon: "overview"   },
      { id: "metrics",    href: "/metrics",    label: "Metrics",    icon: "metrics"    },
    ],
  },
  {
    label: "System",
    items: [
      { id: "services",   href: "/services",   label: "Services",   icon: "services"   },
      { id: "logs",       href: "/logs",       label: "Logs",       icon: "logs"       },
      { id: "alerts",     href: "/alerts",     label: "Alerts",     icon: "alerts"     },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { id: "anomalies",  href: "/anomalies",  label: "Anomalies",  icon: "anomalies"  },
      { id: "hosts",      href: "/hosts",      label: "Hosts",      icon: "hosts"      },
      { id: "containers", href: "/containers", label: "Containers", icon: "containers" },
    ],
  },
];

export function Sidebar() {
  const { collapsed, setCollapsed } = useV();
  const pathname = usePathname();
  const router = useRouter();
  const W = collapsed ? 60 : 240;

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  function handleLogout() {
    clearToken();
    router.push("/login");
  }

  return (
    <aside
      style={{
        width: W,
        flexShrink: 0,
        height: "100vh",
        position: "sticky",
        top: 0,
        background: "var(--surface)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        transition: "width 0.2s ease",
        overflow: "hidden",
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: collapsed ? "16px 0" : "18px 18px 14px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          justifyContent: collapsed ? "center" : "flex-start",
        }}
      >
        <VLogo size={30} />
        {!collapsed && (
          <div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "var(--brand)",
                letterSpacing: "-0.02em",
              }}
            >
              VANTAGE
            </div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>
              Observability Platform
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav
        style={{
          flex: 1,
          padding: collapsed ? "8px 0" : "10px 10px",
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        {NAV_GROUPS.map((g) => (
          <div key={g.label} style={{ marginBottom: 16 }}>
            {!collapsed && (
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  padding: "0 10px",
                  marginBottom: 4,
                }}
              >
                {g.label}
              </div>
            )}
            {g.items.map(({ href, label, icon }) => {
              const active = isActive(href);
              return (
                <div
                  key={href}
                  onClick={() => router.push(href)}
                  title={collapsed ? label : undefined}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: collapsed ? "9px 0" : "8px 10px",
                    justifyContent: collapsed ? "center" : "flex-start",
                    borderRadius: collapsed ? 0 : 8,
                    borderLeft: !collapsed && active ? "3px solid var(--brand)" : "3px solid transparent",
                    background: active ? "var(--brand-dim)" : "transparent",
                    color: active ? "var(--brand)" : "var(--text-sec)",
                    fontWeight: active ? 600 : 400,
                    cursor: "pointer",
                    fontSize: 13,
                    transition: "all 0.12s",
                    marginBottom: 1,
                    whiteSpace: "nowrap",
                  }}
                >
                  <VIcon name={icon} size={15} />
                  {!collapsed && label}
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom: Live + Collapse + Logout */}
      <div
        style={{
          borderTop: "1px solid var(--border)",
          padding: collapsed ? "10px 0" : "10px 14px",
        }}
      >
        {!collapsed && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              color: "var(--ok)",
              marginBottom: 8,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--ok)",
                animation: "pulse 2s infinite",
                display: "inline-block",
              }}
            />
            Live
          </div>
        )}
        <div
          onClick={() => setCollapsed((c) => !c)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "flex-start",
            gap: 8,
            padding: collapsed ? "8px 0" : "6px 6px",
            borderRadius: 8,
            cursor: "pointer",
            color: "var(--text-muted)",
            fontSize: 12,
            marginBottom: 4,
          }}
        >
          <VIcon name={collapsed ? "chevR" : "chevL"} size={14} />
          {!collapsed && "Collapse"}
        </div>
        <div
          onClick={handleLogout}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            justifyContent: collapsed ? "center" : "flex-start",
            padding: collapsed ? "8px 0" : "6px 6px",
            borderRadius: 8,
            cursor: "pointer",
            color: "var(--text-muted)",
            fontSize: 12,
            transition: "color 0.12s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = "var(--crit)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
          }}
        >
          <VIcon name="logout" size={14} />
          {!collapsed && "Sign out"}
        </div>
      </div>
    </aside>
  );
}
