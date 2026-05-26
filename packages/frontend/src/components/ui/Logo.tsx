"use client";

interface VLogoProps {
  size?: number;
}

export function VLogo({ size = 30 }: VLogoProps) {
  return (
    <div style={{ animation: "vl-float 3.5s ease-in-out infinite", display: "inline-block", flexShrink: 0 }}>
      <svg width={size} height={size} viewBox="0 0 30 30" fill="none" style={{ display: "block" }}>
        <defs>
          <linearGradient id="vl-bg" x1="0" y1="0" x2="30" y2="30" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#091828" />
            <stop offset="100%" stopColor="#050D18" />
          </linearGradient>
          <linearGradient id="vl-top" x1="6" y1="3" x2="24" y2="14" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#67E8F9" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
          <linearGradient id="vl-left" x1="6" y1="9" x2="15" y2="26" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0EA5E9" />
            <stop offset="100%" stopColor="#075985" />
          </linearGradient>
          <linearGradient id="vl-right" x1="15" y1="9" x2="24" y2="26" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0369A1" />
            <stop offset="100%" stopColor="#0C2340" />
          </linearGradient>
          <filter id="vl-glow">
            <feGaussianBlur stdDeviation="0.8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect width="30" height="30" rx="7" fill="url(#vl-bg)" />
        <polygon points="15,3.5 24,8.5 15,13.5 6,8.5" fill="url(#vl-top)" />
        <polygon points="6,8.5 15,13.5 15,25.5 6,20.5" fill="url(#vl-left)" />
        <polygon points="15,13.5 24,8.5 24,20.5 15,25.5" fill="url(#vl-right)" />
        <polyline
          points="6,8.5 15,3.5 24,8.5"
          stroke="rgba(255,255,255,0.45)"
          strokeWidth="0.6"
          fill="none"
          filter="url(#vl-glow)"
        />
        <line x1="15" y1="13.5" x2="15" y2="25.5" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" />
      </svg>
    </div>
  );
}
