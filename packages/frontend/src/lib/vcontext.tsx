"use client";
import { createContext, useContext, useState, useCallback, useRef, ReactNode } from "react";

interface VContextType {
  dark: boolean;
  setDark: (v: boolean | ((prev: boolean) => boolean)) => void;
  user: { username: string; role?: string } | null;
  setUser: (u: { username: string; role?: string } | null) => void;
  firingAlerts: number;
  setFiringAlerts: (n: number) => void;
  refreshing: boolean;
  refresh: () => void;
  registerRefresh: (fn: () => void) => void;
  collapsed: boolean;
  setCollapsed: (v: boolean | ((prev: boolean) => boolean)) => void;
}

const VCtx = createContext<VContextType | null>(null);

export function useV() {
  const ctx = useContext(VCtx);
  if (!ctx) throw new Error("useV outside VProvider");
  return ctx;
}

export function VProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(true);
  const [user, setUser] = useState<{ username: string; role?: string } | null>(null);
  const [firingAlerts, setFiringAlerts] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const refreshFnRef = useRef<(() => void) | null>(null);

  const registerRefresh = useCallback((fn: () => void) => {
    refreshFnRef.current = fn;
  }, []);

  const refresh = useCallback(() => {
    setRefreshing(true);
    refreshFnRef.current?.();
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  return (
    <VCtx.Provider value={{
      dark, setDark,
      user, setUser,
      firingAlerts, setFiringAlerts,
      refreshing, refresh, registerRefresh,
      collapsed, setCollapsed,
    }}>
      {children}
    </VCtx.Provider>
  );
}
