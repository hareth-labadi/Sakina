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
    return CONDITIONS.find((c) => c.id === id) ?? null;
  }
};

export const accounts = {
  isNicknameAvailable: auth.isNicknameAvailable,
  /** Suggestions shown when a nickname is taken. */
  suggestNicknames: auth.suggestNicknames
};

export { auth };
export { savedStories, storyPages } from './reading';

export const stories = {
  async featured(): Promise<StorySummary[]> {
    return SAMPLE_STORIES;
  }
};
