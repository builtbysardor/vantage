"use client";
import { Circle } from "lucide-react";

export function Topbar({ title }: { title: string }) {
  return (
    <header className="h-12 border-b border-border bg-surface/80 backdrop-blur flex items-center px-6 gap-4 sticky top-0 z-10">
      <h1 className="text-sm font-semibold text-text flex-1">{title}</h1>
      <div className="flex items-center gap-1.5 text-xs text-ok">
        <Circle size={6} fill="currentColor" />
        <span>Live</span>
      </div>
    </header>
  );
}
