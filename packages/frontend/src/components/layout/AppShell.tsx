"use client";
import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

interface AppShellProps {
  title: string;
  firingAlerts?: number;
  children: ReactNode;
}

export function AppShell({ title, firingAlerts = 0, children }: AppShellProps) {
  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar />
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        <Topbar title={title} firingAlerts={firingAlerts} />
        <main
          style={{
            flex: 1,
            overflow: "auto",
            padding: "24px 28px",
            background: "var(--bg)",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
