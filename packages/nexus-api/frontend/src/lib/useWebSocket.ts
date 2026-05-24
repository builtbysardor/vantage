/**
 * useWebSocket.ts
 * A React hook that maintains a single connection to the Nexus Pro
 * backend, exposes the last decoded message, and reconnects with
 * exponential backoff (capped at 30s).
 *
 * The backend wraps every broadcast as:
 *   { type: string; data: unknown; timestamp: string }
 *
 * Known message types (server.js + middleware/websocket.js):
 *   - 'snapshot'  → full BackendSnapshot + services (initial only)
 *   - 'metrics'   → BackendSnapshot (every 5s)
 *   - 'services'  → Service[] (every 15s)
 *   - 'alerts'    → Alert[]   (when alerts change)
 *   - 'logs'      → LogEntry[] (initial)
 *   - 'log'       → LogEntry  (streamed)
 */

'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import type { Alert, LogEntry, Service } from '@/types';
import type { BackendSnapshot } from '@/lib/api';

export type WSStatus = 'connecting' | 'open' | 'closed' | 'reconnecting';

export type WSMessage =
  | { type: 'snapshot'; data: BackendSnapshot & { services?: Service[] }; timestamp: string }
  | { type: 'metrics';  data: BackendSnapshot;                            timestamp: string }
  | { type: 'services'; data: Service[];                                  timestamp: string }
  | { type: 'alerts';   data: Alert[];                                    timestamp: string }
  | { type: 'logs';     data: LogEntry[];                                 timestamp: string }
  | { type: 'log';      data: LogEntry;                                   timestamp: string };

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:3001';
const INITIAL_DELAY = 1000;
const MAX_DELAY = 30_000;

interface UseWebSocketResult {
  lastMessage: WSMessage | null;
  status: WSStatus;
  send: (data: string | ArrayBufferLike | Blob | ArrayBufferView) => void;
}

export function useWebSocket(): UseWebSocketResult {
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const [status, setStatus] = useState<WSStatus>('connecting');

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closedByUser = useRef(false);

  const connect = useCallback(() => {
    setStatus(prev => (prev === 'open' ? prev : reconnectAttempts.current > 0 ? 'reconnecting' : 'connecting'));

    const ws = new WebSocket(WS_URL);
    socketRef.current = ws;

    ws.onopen = () => {
      reconnectAttempts.current = 0;
      setStatus('open');
    };

    ws.onmessage = (event) => {
      // Type-narrow by parsing JSON; ignore non-JSON frames.
      const raw = typeof event.data === 'string' ? event.data : null;
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as WSMessage;
        if (parsed && typeof parsed === 'object' && 'type' in parsed) {
          setLastMessage(parsed);
        }
      } catch {
        // malformed frame — ignore
      }
    };

    ws.onerror = () => {
      // Let onclose handle reconnect logic
    };

    ws.onclose = () => {
      socketRef.current = null;
      if (closedByUser.current) {
        setStatus('closed');
        return;
      }
      setStatus('reconnecting');
      const delay = Math.min(MAX_DELAY, INITIAL_DELAY * 2 ** reconnectAttempts.current);
      reconnectAttempts.current += 1;
      reconnectTimer.current = setTimeout(connect, delay);
    };
  }, []);

  useEffect(() => {
    closedByUser.current = false;
    connect();
    return () => {
      closedByUser.current = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [connect]);

  const send = useCallback<UseWebSocketResult['send']>((data) => {
    const ws = socketRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(data);
  }, []);

  return { lastMessage, status, send };
}
