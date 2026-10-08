/**
 * Data access for the UI. Pages and components call these functions only, never fetch() directly.
 *
 * Today every function returns mock data. When the backend exists, set NEXT_PUBLIC_API_URL and
 * replace each body with a call through `api()` below; the signatures (and the UI) stay the same.
 */
import { CONDITIONS } from '@/data/conditions';
import { SAMPLE_STORIES } from '@/data/stories';
import type { Community, StorySummary } from '@/types/domain';

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

/** Mock: nicknames already in use. The API will answer this (rate-limited, without revealing more). */
const TAKEN = new Set(['sea_glass', 'quiet_river', 'amal_dawn', 'admin', 'sakina', 'therapist', 'moderator']);

export const accounts = {
  async isNicknameAvailable(nickname: string): Promise<boolean> {
    await new Promise((r) => setTimeout(r, 350)); // simulate network
    return !TAKEN.has(nickname.trim().toLowerCase());
  },
  /** Suggestions shown when a nickname is taken. */
  suggestNicknames(base: string): string[] {
    const b = (base.replace(/[^\p{L}\p{N}_.]/gu, '') || 'calm').slice(0, 14).toLowerCase();
    return [`${b}_2`, `${b}.light`, `still_${b}`, 'soft_morning', 'blue_hour'].filter((n) => !TAKEN.has(n)).slice(0, 3);
  }
};

export const stories = {
  async featured(): Promise<StorySummary[]> {
    return SAMPLE_STORIES;
  }
};
