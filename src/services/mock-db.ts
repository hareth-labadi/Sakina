/**
 * Per-member data that has no API yet (saved stories, notifications), kept in this browser and
 * keyed by nickname. Accounts, passwords and sessions are NOT here: they live in the API.
 * Replace each use with an API call when the matching backend exists, then delete this file.
 */
import type { AppNotification } from '@/types/domain';

export type LocalMember = {
  /** Saved story ids, most recent first. */
  saved?: string[];
  notifications?: AppNotification[];
};

type Db = { members: Record<string, LocalMember> };

const KEY = 'sakina-local-v2';
/** Stores from the old all-in-browser mock (they held plain-text demo passwords): removed on sight. */
const OLD_KEYS = ['sakina-mock-db-v1', 'sakina-mock-session'];

/** Demo notifications for `amal_dawn`, all about their check-in s4. */
const SEED_NOTIFICATIONS: Record<string, AppNotification[]> = {
  amal_dawn: [
    { id: 'n1', kind: 'reply', storyId: 's4', storyTitle: 'Got out of bed, opened the curtains', actor: 'sea_glass', createdAt: '2026-10-08T14:20:00Z', read: false },
    { id: 'n2', kind: 'reaction', storyId: 's4', storyTitle: 'Got out of bed, opened the curtains', count: 21, createdAt: '2026-10-08T12:00:00Z', read: false },
    { id: 'n3', kind: 'therapist', storyId: 's4', storyTitle: 'Got out of bed, opened the curtains', createdAt: '2026-10-08T11:05:00Z', read: true },
    { id: 'n4', kind: 'approved', storyId: 's4', storyTitle: 'Got out of bed, opened the curtains', createdAt: '2026-10-08T09:40:00Z', read: true }
  ]
};

let memory: Db | null = null;

export function readDb(): Db {
  if (memory) return memory;
  try {
    for (const k of OLD_KEYS) window.localStorage.removeItem(k);
    const raw = window.localStorage.getItem(KEY);
    memory = raw ? (JSON.parse(raw) as Db) : { members: {} };
  } catch {
    memory = { members: {} };
  }
  return memory;
}

export function writeDb(db: Db) {
  memory = db;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    /* storage unavailable: data lives for this visit only */
  }
}

/** This member's local record, created on first use. */
export function memberOf(db: Db, nickname: string): LocalMember {
  return (db.members[nickname.toLowerCase()] ??= {});
}

/** A member's notifications, starting from the demo seed the first time. */
export function notificationsOf(nickname: string, m: LocalMember): AppNotification[] {
  return (m.notifications ??= structuredClone(SEED_NOTIFICATIONS[nickname.toLowerCase()] ?? []));
}

/** Simulated network latency so loading states are visible. */
export const delay = (ms = 450) => new Promise((r) => setTimeout(r, ms));
