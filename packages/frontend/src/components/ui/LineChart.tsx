"use client";
import { useRef, useState, useEffect } from "react";

interface SeriesConfig {
  key: string;
  color: string;
  label: string;
}

interface DataPoint {
  [key: string]: number | string | undefined;
  _label?: string;
}

interface LineChartProps {
  data?: DataPoint[];
  series?: SeriesConfig[];
  height?: number;
  yMax?: number;
}

export function VLineChart({ data = [], series = [], yMax = 100, height = 220 }: LineChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(600);

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((e) => setW(e[0].contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const PAD = { l: 42, r: 12, t: 16, b: 24 };
  const cw = Math.max(w - PAD.l - PAD.r, 100);
  const ch = height - PAD.t - PAD.b;
  const n = data.length;
  const tx = (i: number) => PAD.l + (i / Math.max(n - 1, 1)) * cw;
  const ty = (v: number) => PAD.t + ch - (Math.min(v, yMax) / yMax) * ch;

  return (
    <div ref={ref} style={{ width: "100%" }}>
      <svg width={w} height={height} style={{ display: "block", overflow: "visible" }}>
        <defs>
          {series.map((s, si) => (
            <linearGradient key={si} id={`vg-${si}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.18" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
        {[25, 50, 75, 100].filter((v) => v <= yMax).map((v) => (
          <g key={v}>
            <line
              x1={PAD.l}
              x2={PAD.l + cw}
              y1={ty(v)}
              y2={ty(v)}
              stroke="var(--border)"
              strokeWidth={1}
              strokeDasharray="4 3"
            />
            <text
              x={PAD.l - 5}
              y={ty(v) + 4}
              fontSize={10}
              fill="var(--text-muted)"
              textAnchor="end"
              fontFamily="JetBrains Mono, monospace"
            >
              {v}%
            </text>
          </g>
        ))}
        {n > 1 &&
          series.map((s, si) => {
            const vals = data.map((d) => Number(d[s.key] ?? 0));
            const pts = vals.map((v, i) => ({ x: tx(i), y: ty(v) }));
            const line = pts
              .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
              .join(" ");
            const area = line + ` L ${pts[n - 1].x} ${PAD.t + ch} L ${pts[0].x} ${PAD.t + ch} Z`;
            return (
              <g key={si}>
                <path d={area} fill={`url(#vg-${si})`} />
                <path
                  d={line}
                  stroke={s.color}
                  strokeWidth={si === 0 ? 2.5 : 2}
                  fill="none"
                  strokeLinejoin="round"
                  strokeDasharray={si === 1 ? "8 4" : undefined}
                />
              </g>
            );
          })}
        {data.map((d, i) => {
          if (n <= 8 || i % Math.ceil(n / 8) === 0 || i === n - 1) {
            return (
              <text
                key={i}
                x={tx(i)}
                y={PAD.t + ch + 16}
                fontSize={10}
                fill="var(--text-muted)"
                textAnchor="middle"
                fontFamily="JetBrains Mono, monospace"
              >
                {d._label || ""}
              </text>
            );
          }
          return null;
        })}
      </svg>
      <div style={{ display: "flex", gap: 16, marginTop: 4, paddingLeft: PAD.l }}>
        {series.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                width: 24,
                height: 2,
                borderRadius: 2,
                background: i === 1 ? "none" : s.color,
                borderTop: i === 1 ? `2px dashed ${s.color}` : "none",
              }}
            />
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
