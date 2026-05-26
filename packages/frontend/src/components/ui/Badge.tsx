"use client";
import { ReactNode } from "react";

type BadgeColor = "ok" | "warn" | "crit" | "brand" | "muted" | "accent";

const PAL: Record<BadgeColor, [string, string]> = {
  ok:     ["var(--ok-dim)",   "var(--ok)"],
  warn:   ["var(--warn-dim)", "var(--warn)"],
  crit:   ["var(--crit-dim)", "var(--crit)"],
  brand:  ["var(--brand-dim)","var(--brand)"],
  muted:  ["rgba(100,116,139,0.12)","var(--text-muted)"],
  accent: ["rgba(14,165,233,0.12)", "#0EA5E9"],
};

interface BadgeProps {
  color?: BadgeColor;
  children: ReactNode;
  size?: number;
}

export function VBadge({ color = "muted", children, size = 11 }: BadgeProps) {
  const [bg, fg] = PAL[color] ?? PAL.muted;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: 20,
        fontSize: size,
        fontWeight: 600,
        background: bg,
        color: fg,
        whiteSpace: "nowrap",
        lineHeight: 1.4,
      }}
    >
      {children}
    </span>
  );
}
