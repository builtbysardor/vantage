"use client";
import { useV } from "@/lib/vcontext";
import { ReactNode } from "react";

export function ThemeApplier({ children }: { children: ReactNode }) {
  const { dark } = useV();
  return (
    <div
      className={dark ? "" : "light"}
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--text)",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {children}
    </div>
  );
}
