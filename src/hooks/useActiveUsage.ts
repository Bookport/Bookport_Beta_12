import { useCallback, useEffect, useState } from "react";

// Global module-level accumulator of active time (ms spent with the tab visible
// and foregrounded). Time only accrues while the document is visible; going
// hidden pauses accumulation but never resets it, so the metric survives screen
// switches and component remounts within a session.
let activeMs = 0;
let lastTickAt = 0;
let started = false;
const listeners = new Set<(ms: number) => void>();

function tick() {
  const now = Date.now();
  if (typeof document !== "undefined" && !document.hidden) {
    if (lastTickAt) activeMs += now - lastTickAt;
    lastTickAt = now;
  } else {
    lastTickAt = 0;
  }
  listeners.forEach((l) => l(activeMs));
}

/**
 * Idempotently starts the global accumulator (1s interval + visibilitychange).
 */
export function startActiveUsageTracking(): void {
  if (started || typeof window === "undefined") return;
  started = true;
  window.setInterval(tick, 1000);
  document.addEventListener("visibilitychange", tick);
  tick();
}

export function getActiveUsageMs(): number {
  return activeMs;
}

export function getActiveUsageSeconds(): number {
  return Math.floor(activeMs / 1000);
}

export function resetActiveUsage(): void {
  activeMs = 0;
  lastTickAt = Date.now();
  listeners.forEach((l) => l(activeMs));
}

/**
 * Subscribes to the global active-time accumulator.
 * Returns how many whole seconds the tab has been visibly active this session.
 */
export function useActiveUsage(): { activeSeconds: number; reset: () => void } {
  const [activeSeconds, setActiveSeconds] = useState<number>(0);

  useEffect(() => {
    startActiveUsageTracking();
    listeners.add(setActiveSeconds);
    setActiveSeconds(getActiveUsageSeconds());
    return () => {
      listeners.delete(setActiveSeconds);
    };
  }, []);

  const reset = useCallback(() => resetActiveUsage(), []);

  return { activeSeconds, reset };
}