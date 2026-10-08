'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'sakina-theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

/**
 * Inline script for <head>: applies the theme before first paint, so there is no flash.
 * Kept tiny and dependency-free. Storage access is wrapped because it can throw.
 */
export const themeInitScript = `(function(){try{var p=null;try{p=localStorage.getItem('${STORAGE_KEY}')}catch(e){}var d=p==='dark'||(p!=='light'&&window.matchMedia('${DARK_QUERY}').matches);document.documentElement.setAttribute('data-theme',d?'dark':'light')}catch(e){}})();`;

/* ---------- Tiny external store: localStorage + system preference ---------- */

const listeners = new Set<() => void>();
/** Fallback when storage is blocked (private mode, sandbox): the choice lasts for this visit. */
let memoryPreference: ThemePreference | null = null;

function readPreference(): ThemePreference {
  if (memoryPreference) return memoryPreference;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const mq = window.matchMedia(DARK_QUERY);
  mq.addEventListener('change', listener);
  window.addEventListener('storage', listener); // other tabs
  return () => {
    listeners.delete(listener);
    mq.removeEventListener('change', listener);
    window.removeEventListener('storage', listener);
  };
}

function getSnapshot(): string {
  const preference = readPreference();
  const resolved = preference === 'system' ? (window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light') : preference;
  return `${preference}|${resolved}`;
}

function getServerSnapshot(): string {
  return 'system|light';
}

function writePreference(p: ThemePreference) {
  memoryPreference = p;
  try {
    if (p === 'system') window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, p);
    memoryPreference = null; // storage works, read from it
  } catch {
    /* keep memoryPreference */
  }
  emit();
}

/* ---------- Public API ---------- */

export function useTheme() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [preference, resolved] = snapshot.split('|') as [ThemePreference, ResolvedTheme];
  const setPreference = useCallback((p: ThemePreference) => writePreference(p), []);
  return { preference, resolved, setPreference };
}

/** Keeps <html data-theme> in sync after hydration (the inline script handles first paint). */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { resolved } = useTheme();
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  useEffect(() => {
    if (hydrated) document.documentElement.setAttribute('data-theme', resolved);
  }, [resolved, hydrated]);
  return children;
}
