"use client";

type ProgressColor = "brand" | "ok" | "warn" | "crit";

const C_MAP: Record<ProgressColor, string> = {
  brand: "var(--brand)",
  ok: "var(--ok)",
  warn: "var(--warn)",
  crit: "var(--crit)",
};

interface ProgressProps {
  pct: number;
  color?: ProgressColor;
  h?: number;
}

export function VProgress({ pct, color = "brand", h = 6 }: ProgressProps) {
  const c = C_MAP[color] ?? C_MAP.brand;
  return (
    <div
      style={{
        width: "100%",
        height: h,
        background: "var(--elevated)",
        borderRadius: 3,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${Math.min(100, Math.max(0, pct))}%`,
          height: "100%",
          background: c,
          borderRadius: 3,
          transition: "width 0.3s",
        }}
      />
    </div>
  );
}
