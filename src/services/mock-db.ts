/**
 * MOCK BACKEND STORE — front-end development only.
 *
 * Simulates what the API will do, so screens can be built and tested now.
 * It keeps passwords in plain text in the browser: acceptable ONLY for a mock.
 * The real backend must hash passwords (e.g. Argon2id), encrypt recovery emails,
 * rate-limit sign-in server-side and never send secrets to the client.
 */
import type { AppNotification, Role } from '@/types/domain';

export type MockAccount = {
  nickname: string;
  password: string;
  avatar: number;
  role: Role;
  communities: string[];
  /** Saved story ids. Optional so stores written before this field existed still load. */
  saved?: string[];
  ageRange: string | null;
  country: string | null;
  recovery: { type: 'code'; code: string } | { type: 'email'; email: string; verified: boolean };
  status: 'active' | 'suspended' | 'banned';
  suspendedReason?: string;
  createdAt: string;
  failedAttempts: number;
  lockedUntil: number | null;
  /** Missing on stores written before notifications existed; see `notificationsOf`. */
  notifications?: AppNotification[];
};

type Db = { accounts: Record<string, MockAccount>; resetTokens: Record<string, string> };

const KEY = 'sakina-mock-db-v1';

/** Accounts that exist from the start (demo logins + "taken" nicknames). */
function seed(): Db {
  const base = (nickname: string, avatar: number, extra: Partial<MockAccount> = {}): MockAccount => ({
    nickname,
    password: 'not-a-real-password',
    avatar,
    role: 'member',
    communities: [],
    ageRange: null,
    country: null,
    recovery: { type: 'code', code: 'XXXX-XXXX-XXXX' },
    status: 'active',
    createdAt: '2026-08-01T10:00:00Z',
    failedAttempts: 0,
    lockedUntil: null,
    ...extra
  });
  const list = [
    base('amal_dawn', 2, { password: 'calm-river-22', communities: ['anxiety', 'panic'], recovery: { type: 'code', code: 'K7QM-4XPT-9HDA' } }),
    base('leaf_demo', 6, { password: 'calm-river-22', recovery: { type: 'email', email: 'leaf.demo@example.com', verified: true } }),
    base('still_water', 3, { password: 'calm-river-22', status: 'suspended', suspendedReason: 'Shared outside contact links after a warning.' }),
    base('sea_glass', 1),
    base('quiet_river', 0)
  ];
  return { accounts: Object.fromEntries(list.map((a) => [a.nickname.toLowerCase(), a])), resetTokens: {} };
}

/** Demo notifications for `amal_dawn`, all about their check-in s4. */
const SEED_NOTIFICATIONS: Record<string, AppNotification[]> = {
  amal_dawn: [
    { id: 'n1', kind: 'reply', storyId: 's4', storyTitle: 'Got out of bed, opened the curtains', actor: 'sea_glass', createdAt: '2026-10-08T14:20:00Z', read: false },
    { id: 'n2', kind: 'reaction', storyId: 's4', storyTitle: 'Got out of bed, opened the curtains', count: 21, createdAt: '2026-10-08T12:00:00Z', read: false },
    { id: 'n3', kind: 'therapist', storyId: 's4', storyTitle: 'Got out of bed, opened the curtains', createdAt: '2026-10-08T11:05:00Z', read: true },
    { id: 'n4', kind: 'approved', storyId: 's4', storyTitle: 'Got out of bed, opened the curtains', createdAt: '2026-10-08T09:40:00Z', read: true }
  ]
};

/** An account's notifications, falling back to the demo seed for stores saved before the field existed. */
export function notificationsOf(a: MockAccount): AppNotification[] {
  return (a.notifications ??= structuredClone(SEED_NOTIFICATIONS[a.nickname.toLowerCase()] ?? []));
}

let memory: Db | null = null;

export function readDb(): Db {
  if (memory) return memory;
  try {
    const raw = window.localStorage.getItem(KEY);
    memory = raw ? (JSON.parse(raw) as Db) : seed();
  } catch {
    memory = seed();
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

/** Simulated network latency so loading states are visible. */
export const delay = (ms = 450) => new Promise((r) => setTimeout(r, ms));

export const RESERVED_NICKNAMES = ['admin', 'sakina', 'therapist', 'moderator', 'support', 'staff', 'system'];
