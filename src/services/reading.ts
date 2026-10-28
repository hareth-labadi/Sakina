/**
 * Story pages and what a member does on them: reactions, replies, "I relate", saving, reporting.
 * All through the API (backend/src/modules/content).
 */
import type { Reaction, Reply, ReportReason, Story, StorySummary } from '@/types/domain';
import { api, request } from './api';

const enc = encodeURIComponent;

export const storyPages = {
  /**
   * One story, or null when it doesn't exist or this viewer may not see it. A guest gets
   * members-only stories as `locked` (no text, no replies).
   */
  async get(id: string): Promise<Story | null> {
    const res = await request<Story>(`/stories/${enc(id)}`);
    return res.status === 200 ? res.data : null;
  }
};

/** Reactions: add or remove one of mine. Answers the new counts and my reactions. */
export async function setReaction(storyId: string, kind: Reaction, on: boolean) {
  return api<{ reactions: Record<Reaction, number>; mine: Reaction[] }>(`/stories/${enc(storyId)}/reactions/${kind}`, { method: on ? 'PUT' : 'DELETE' });
}

export type ReplyResult = { ok: true; reply: Reply } | { ok: false; error: 'post_limit' | 'not_found' | 'invalid' };

/** Reply to a story (or to one of its top-level replies). `reply.held` when it waits for a moderator. */
export async function addReply(storyId: string, text: string, parentId?: string): Promise<ReplyResult> {
  const res = await request<{ reply: Reply; error?: string }>(`/stories/${enc(storyId)}/replies`, { body: { text, ...(parentId && { parentId }) } });
  if (res.status === 201) return { ok: true, reply: res.data.reply };
  return { ok: false, error: res.status === 429 ? 'post_limit' : res.status === 404 ? 'not_found' : 'invalid' };
}

export async function deleteReply(replyId: string): Promise<boolean> {
  return (await request(`/replies/${enc(replyId)}`, { method: 'DELETE' })).status === 204;
}

/** "I relate" on a reply. */
export async function setRelate(replyId: string, on: boolean) {
  return api<{ relateCount: number; related: boolean }>(`/replies/${enc(replyId)}/relate`, { method: on ? 'PUT' : 'DELETE' });
}

/** Report a story, a reply or a room message to the moderators, optionally blocking its author too. */
export async function report(target: { storyId: string } | { replyId: string } | { roomMessageId: string }, r: { reason: ReportReason; note: string; block: boolean }) {
  const res = await request<{ blocked: boolean }>('/reports', { body: { ...target, ...r } });
  return { ok: res.status === 201, blocked: res.status === 201 && res.data.blocked };
}

/** Bookmarks. Private to the member. */
export const savedStories = {
  async setSaved(storyId: string, saved: boolean): Promise<{ ok: boolean }> {
    const res = await request(`/me/saved/${enc(storyId)}`, { method: saved ? 'PUT' : 'DELETE' });
    return { ok: res.status === 204 };
  },
  /** Most recently saved first. */
  async list(): Promise<StorySummary[]> {
    const res = await request<{ stories: StorySummary[] }>('/me/saved');
    return res.status === 200 ? res.data.stories : [];
  }
};
