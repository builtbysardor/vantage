"use client";
import { ReactNode } from "react";

interface SectionProps {
  title: string;
  sub?: string;
  action?: ReactNode;
  children: ReactNode;
}

export function VSection({ title, sub, action, children }: SectionProps) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", margin: 0 }}>{title}</h2>
          {sub && (
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2, marginBottom: 0 }}>{sub}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
