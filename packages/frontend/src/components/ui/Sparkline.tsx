"use client";

interface SparklineProps {
  data: number[];
  color?: string;
  w?: string | number;
  h?: number;
}

export function VSparkline({ data, color = "var(--brand)", w = "100%", h = 32 }: SparklineProps) {
  if (!data || data.length < 2) return null;
  const mn = Math.min(...data);
  const mx = Math.max(...data);
  const r = mx - mn || 1;
  const px = (i: number, total: number, width: number) => (i / (total - 1)) * width;
  const py = (v: number, height: number) => height - ((v - mn) / r) * height;
  const pts = (width: number) =>
    data
      .map((v, i) => `${i === 0 ? "M" : "L"} ${px(i, data.length, width).toFixed(1)} ${py(v, h).toFixed(1)}`)
      .join(" ");

  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <path d={pts(300)} stroke={color} strokeWidth={1.5} fill="none" strokeLinejoin="round" />
    </svg>
  );
}
