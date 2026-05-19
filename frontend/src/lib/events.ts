/**
 * events.ts
 * Lightweight cross-component signaling via window CustomEvents.
 * - 'nexus:refresh'   → Topbar refresh button fires it; pages listen.
 * - 'nexus:alerts'    → fired when the alerts page receives new data,
 *                       sidebar listens to keep its badge count fresh.
 */

export const REFRESH_EVENT = 'nexus:refresh';
export const ALERTS_EVENT  = 'nexus:alerts';

export function dispatchRefresh(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(REFRESH_EVENT));
}

export function onRefresh(handler: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(REFRESH_EVENT, handler);
  return () => window.removeEventListener(REFRESH_EVENT, handler);
}

export function dispatchAlertsCount(activeCount: number): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<number>(ALERTS_EVENT, { detail: activeCount }));
}

export function onAlertsCount(handler: (count: number) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const listener = (e: Event) => {
    const ce = e as CustomEvent<number>;
    if (typeof ce.detail === 'number') handler(ce.detail);
  };
  window.addEventListener(ALERTS_EVENT, listener);
  return () => window.removeEventListener(ALERTS_EVENT, listener);
}
