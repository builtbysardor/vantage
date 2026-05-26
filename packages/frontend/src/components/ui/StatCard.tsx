"use client";
import { VIcon } from "./Icons";
import { VSparkline } from "./Sparkline";
import { ReactNode } from "react";

type ColorKey = "brand" | "ok" | "warn" | "crit" | "accent" | "muted";

const COLOR_MAP: Record<ColorKey, string> = {
  brand: "var(--brand)",
  ok: "var(--ok)",
  warn: "var(--warn)",
  crit: "var(--crit)",
  accent: "#0EA5E9",
  muted: "var(--text-muted)",
};

const DIM_MAP: Record<ColorKey, string> = {
  brand: "var(--brand-dim)",
  ok: "var(--ok-dim)",
  warn: "var(--warn-dim)",
  crit: "var(--crit-dim)",
  accent: "rgba(14,165,233,0.12)",
  muted: "rgba(100,116,139,0.12)",
};

interface StatCardProps {
  label: string;
  value: ReactNode;
  sub?: string;
  icon?: string;
  color?: ColorKey;
  spark?: number[];
}

export function StatCard({ label, value, sub, icon, color = "brand", spark }: StatCardProps) {
  const clr = COLOR_MAP[color] ?? COLOR_MAP.brand;
  const dimClr = DIM_MAP[color] ?? DIM_MAP.brand;

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "16px 18px",
        flex: 1,
        minWidth: 140,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              fontWeight: 600,
            }}
          >
            {label}
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: clr,
              fontFamily: "JetBrains Mono, monospace",
              lineHeight: 1.1,
              marginTop: 4,
            }}
          >
            {value}
          </div>
          {sub && (
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{sub}</div>
          )}
        </div>
        {icon && (
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 9,
              background: dimClr,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: clr,
              flexShrink: 0,
            }}
          >
            <VIcon name={icon} size={16} />
          </div>
        )}
      </div>
      {spark && (
        <div style={{ marginTop: 10 }}>
          <VSparkline data={spark} color={clr} />
        </div>
      )}
    </div>
  );
}
