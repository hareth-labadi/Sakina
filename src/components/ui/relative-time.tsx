'use client';

import { useFormatter, useNow } from 'next-intl';
import { useSyncExternalStore } from 'react';

/* One shared ticker for all relative times on the page (updates every 30 s). */
const listeners = new Set<() => void>();
let timer: number | undefined;
let tick = 0;

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (timer === undefined) {
    timer = window.setInterval(() => {
      tick++;
      listeners.forEach((l) => l());
    }, 30_000);
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size && timer !== undefined) {
      window.clearInterval(timer);
      timer = undefined;
    }
  };
}

/**
 * "5 minutes ago" that stays correct.
 * Server render and hydration use the request's shared `now` (identical on both sides);
 * after hydration it switches to the real clock and keeps updating. Pre-built (static)
 * pages therefore never show a stale time for long.
 */
export function RelativeTime({ date, className }: { date: string; className?: string }) {
  const format = useFormatter();
  const serverNow = useNow();
  const now = useSyncExternalStore(
    subscribe,
    () => `${tick}`, // client: re-render on each tick
    () => 'server'
  );
  const reference = now === 'server' ? serverNow : new Date();
  return (
    <time dateTime={date} className={className}>
      {format.relativeTime(new Date(date), reference)}
    </time>
  );
}
