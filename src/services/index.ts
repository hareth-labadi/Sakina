/**
 * Data access for the UI. Pages and components call these functions only, never fetch() directly.
 *
 * Today every function returns mock data. When the backend exists, set NEXT_PUBLIC_API_URL and
 * replace each body with a call through `api()` below; the signatures (and the UI) stay the same.
 */
import { CONDITIONS } from '@/data/conditions';
import { SAMPLE_STORIES } from '@/data/stories';
import type { Community, StorySummary } from '@/types/domain';
import * as auth from './auth';
import { delay, readDb, writeDb } from './mock-db';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

/** Shared fetch wrapper for the future API (JSON, credentials, typed errors). */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_URL) throw new Error('NEXT_PUBLIC_API_URL is not set');
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers }
  });
  if (!res.ok) throw new ApiError(res.status, await res.text());
  return (await res.json()) as T;
}

export class ApiError extends Error {
  constructor(public status: number, body: string) {
    super(`API ${status}: ${body}`);
  }
}

export const communities = {
  async list(): Promise<Community[]> {
    return CONDITIONS.filter((c) => c.status === 'active');
  },
  async get(id: string): Promise<Community | null> {
    return CONDITIONS.find((c) => c.id === id && c.status === 'active') ?? null;
  }
};

/** Which communities the signed-in member belongs to (browser only: reads the mock store). */
export const memberships = {
  async isMember(nickname: string, communityId: string): Promise<boolean> {
    return readDb().accounts[nickname.toLowerCase()]?.communities.includes(communityId) ?? false;
  },
  async setMember(nickname: string, communityId: string, member: boolean): Promise<{ ok: boolean }> {
    await delay(300);
    const db = readDb();
    const a = db.accounts[nickname.toLowerCase()];
    if (!a) return { ok: false };
    a.communities = member ? [...new Set([...a.communities, communityId])] : a.communities.filter((id) => id !== communityId);
    writeDb(db);
    return { ok: true };
  }
};

export const accounts = {
  isNicknameAvailable: auth.isNicknameAvailable,
  /** Suggestions shown when a nickname is taken. */
  suggestNicknames: auth.suggestNicknames
};

export { auth };

export const stories = {
  async featured(): Promise<StorySummary[]> {
    return SAMPLE_STORIES.slice(0, 3);
  },
  /** Newest first. */
  async byCommunity(communityId: string): Promise<StorySummary[]> {
    return SAMPLE_STORIES.filter((s) => s.communityId === communityId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
};
