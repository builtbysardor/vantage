"use client";
import { useState } from "react";
import { useV } from "@/lib/vcontext";
import { VIcon } from "@/components/ui/Icons";

interface TopbarProps {
  title: string;
  firingAlerts?: number;
}

export function Topbar({ title, firingAlerts = 0 }: TopbarProps) {
  const { dark, setDark, refresh, refreshing, user } = useV();
  const [searchVal, setSearchVal] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <header
      style={{
        height: 54,
        borderBottom: "1px solid var(--border)",
        background: "var(--surface)",
        display: "flex",
        alignItems: "center",
        padding: "0 20px",
        gap: 12,
        position: "sticky",
        top: 0,
        zIndex: 10,
        flexShrink: 0,
      }}
    >
      <h1 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", flex: "0 0 auto", margin: 0 }}>
        {title}
      </h1>

      {/* Search */}
      <div style={{ flex: 1, maxWidth: 320, marginLeft: 16, position: "relative" }}>
        <VIcon
          name="search"
          size={14}
          style={{
            position: "absolute",
            left: 10,
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--text-muted)",
            pointerEvents: "none",
          }}
        />
        <input
          value={searchVal}
          onChange={(e) => setSearchVal(e.target.value)}
          placeholder="Search…"
          style={{
            width: "100%",
            height: 32,
            paddingLeft: 32,
            paddingRight: 12,
            background: "var(--elevated)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
            color: "var(--text)",
            outline: "none",
            fontFamily: "Inter, sans-serif",
          }}
        />
      </div>

      <div style={{ flex: 1 }} />

      {/* Refresh */}
      <button
        onClick={refresh}
        title="Refresh"
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          border: "1px solid var(--border)",
          background: "var(--elevated)",
          cursor: "pointer",
          color: "var(--text-sec)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <VIcon
          name="refresh"
          size={14}
          style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }}
        />
      </button>

      {/* Alerts badge */}
      <div style={{ position: "relative" }}>
        <button
          title="Alerts"
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--elevated)",
            cursor: "pointer",
            color: "var(--text-sec)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <VIcon name="alerts" size={14} />
        </button>
        {firingAlerts > 0 && (
          <span
            style={{
              position: "absolute",
              top: -3,
              right: -3,
              background: "var(--crit)",
              color: "#fff",
              borderRadius: "50%",
              width: 15,
              height: 15,
              fontSize: 9,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {firingAlerts > 9 ? "9+" : firingAlerts}
          </span>
        )}
      </div>

      {/* Dark / Light toggle */}
      <button
        onClick={() => setDark((d) => !d)}
        title={dark ? "Light mode" : "Dark mode"}
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          border: "1px solid var(--border)",
          background: "var(--elevated)",
          cursor: "pointer",
          color: "var(--text-sec)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <VIcon name={dark ? "sun" : "moon"} size={14} />
      </button>

      {/* User avatar */}
      <div style={{ position: "relative" }}>
        <div
          onClick={() => setProfileOpen((o) => !o)}
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "var(--brand)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 700,
            color: "#fff",
            flexShrink: 0,
            userSelect: "none",
          }}
        >
          {(user?.username || "A")[0].toUpperCase()}
        </div>
        {profileOpen && (
          <div
            style={{
              position: "absolute",
              top: 38,
              right: 0,
              width: 180,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: "6px",
              zIndex: 100,
              boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
            }}
          >
            <div
              style={{
                padding: "8px 10px",
                borderBottom: "1px solid var(--border)",
                marginBottom: 4,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                {user?.username || "admin"}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {user?.role || "administrator"}
              </div>
            </div>
            <div
              onClick={() => setProfileOpen(false)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 10px",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 12,
                color: "var(--text-sec)",
              }}
            >
              <VIcon name="user" size={13} /> Profile
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
