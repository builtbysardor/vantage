"use client";
import { VIcon } from "./Icons";

interface EmptyProps {
  icon?: string;
  message: string;
  sub?: string;
}

export function VEmpty({ icon, message, sub }: EmptyProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
        color: "var(--text-muted)",
      }}
    >
      <VIcon name={icon || "info"} size={32} style={{ opacity: 0.4, marginBottom: 12 }} />
      <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text-muted)" }}>{message}</p>
      {sub && (
        <p style={{ fontSize: 12, marginTop: 4, color: "var(--text-muted)", opacity: 0.7 }}>{sub}</p>
      )}
    </div>
  );
}
