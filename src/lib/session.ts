'use client';

import { useSyncExternalStore } from 'react';
import * as auth from '@/services/auth';
import type { SessionUser } from '@/types/domain';

/**
 * Who is signed in, for the UI. The session itself is an httpOnly cookie owned by the API;
 * this store only mirrors `GET /api/auth/me` so screens can react to it.
 *
 * - `loading` until the first answer. Meanwhile `user` is the last known member (a hint kept in
 *   localStorage: nickname and avatar only, never a secret) so the header doesn't flash "Sign in".
 *   Pages that must not guess (profile, notifications) wait for `ready`.
 * - Server render and hydration always see a guest that is loading.
 */
export type SessionState = { status: 'loading' | 'ready'; user: SessionUser | null };

const HINT_KEY = 'sakina-session-hint';
const SERVER: SessionState = { status: 'loading', user: null };
const listeners = new Set<() => void>();
let state: SessionState | null = null;
let loading: Promise<void> | null = null;

function readHint(): SessionUser | null {
  try {
    const raw = window.localStorage.getItem(HINT_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

function writeHint(user: SessionUser | null) {
  try {
    if (user) window.localStorage.setItem(HINT_KEY, JSON.stringify({ ...user, unreadNotifications: 0 }));
    else window.localStorage.removeItem(HINT_KEY);
  } catch {
    /* storage blocked: no hint, the header just waits for the API */
  }
}

function current(): SessionState {
  return (state ??= { status: 'loading', user: readHint() });
}

function set(next: SessionState) {
  state = next;
  writeHint(next.user);
  listeners.forEach((l) => l());
}

/** Asks the API who is signed in. Runs once per page load (and again via `refreshSession`). */
function load() {
  loading ??= auth
    .me()
    .then((user) => set({ status: 'ready', user }))
    // API unreachable: show a guest rather than a stale member, and let the next action retry.
    .catch(() => set({ status: 'ready', user: null }))
    .finally(() => {
      loading = null;
    });
  return loading;
}

export const refreshSession = load;

/** After sign-in or sign-up: the API already set the cookie; this updates the screens. */
export function setSession(user: SessionUser | null) {
  set({ status: 'ready', user });
}

/** Ends the session on the server, then everywhere on screen. */
export async function signOut() {
  try {
    await auth.signOut();
  } finally {
    setSession(null);
  }
}

/** Change fields of the current user (e.g. the unread count) without asking the API. */
export function updateSession(patch: Partial<SessionUser>) {
  const s = current();
  if (s.user) set({ ...s, user: { ...s.user, ...patch } });
}

function subscribe(l: () => void) {
  listeners.add(l);
  if (current().status === 'loading') void load();
  // Signing in or out in another tab changes the hint: check with the API again.
  const onStorage = (e: StorageEvent) => e.key === HINT_KEY && void load();
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener('storage', onStorage);
  };
}

export function useSessionState(): SessionState {
  return useSyncExternalStore(subscribe, current, () => SERVER);
}

/** Current user, or null for guests (and while loading without a hint). */
export function useSession(): SessionUser | null {
  return useSessionState().user;
}
