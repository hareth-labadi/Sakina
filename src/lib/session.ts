'use client';

import { useSyncExternalStore } from 'react';
import type { SessionUser } from '@/types/domain';

/**
 * MOCK session for front-end development.
 * The real app will read the session from an httpOnly cookie on the server; this store is only
 * a stand-in so screens can react to "signed in" now. It never holds secrets.
 */
const KEY = 'sakina-mock-session';
const listeners = new Set<() => void>();
let memory: SessionUser | null | undefined;
let cachedRaw: string | null = null;
let cachedUser: SessionUser | null = null;

function read(): SessionUser | null {
  if (memory !== undefined) return memory;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedUser = raw ? (JSON.parse(raw) as SessionUser) : null;
    }
    return cachedUser; // stable reference while unchanged (required by useSyncExternalStore)
  } catch {
    return null;
  }
}

function emit() {
  listeners.forEach((l) => l());
}

export function setSession(user: SessionUser | null, remember = true) {
  memory = undefined;
  try {
    if (user && remember) window.localStorage.setItem(KEY, JSON.stringify(user));
    else window.localStorage.removeItem(KEY);
    if (user && !remember) memory = user; // this visit only
  } catch {
    memory = user; // storage blocked: keep for this visit
  }
  emit();
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => e.key === KEY && l();
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener('storage', onStorage);
  };
}

/** Current user, or null for guests. Server render and hydration always see a guest. */
export function useSession(): SessionUser | null {
  return useSyncExternalStore(subscribe, read, () => null);
}
