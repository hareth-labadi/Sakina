'use client';

import { useEffect, useState } from 'react';

/** Milliseconds left until `until` (epoch ms), ticking every second. 0 when passed or null. */
export function useCountdown(until: number | null): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!until) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [until]);
  return until ? Math.max(0, until - now) : 0;
}

/** 90_000 → "1:30" */
export function formatMmSs(ms: number): string {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
