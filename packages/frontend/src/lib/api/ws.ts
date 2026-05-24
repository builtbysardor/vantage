"use client";

const WS_URL = process.env.NEXT_PUBLIC_WS_NEXUS_URL ?? "ws://localhost:3001";

type Handler = (data: unknown) => void;

export function createWsConnection(onMessage: Handler, onOpen?: () => void) {
  let ws: WebSocket | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let retryDelay = 1000;
  let stopped = false;

  function connect() {
    ws = new WebSocket(WS_URL);
    ws.onopen = () => { retryDelay = 1000; onOpen?.(); };
    ws.onmessage = (e) => {
      try { onMessage(JSON.parse(e.data)); } catch {}
    };
    ws.onclose = () => {
      if (!stopped) {
        retryTimer = setTimeout(connect, retryDelay);
        retryDelay = Math.min(retryDelay * 2, 30000);
      }
    };
  }

  connect();
  return () => {
    stopped = true;
    if (retryTimer) clearTimeout(retryTimer);
    ws?.close();
  };
}
