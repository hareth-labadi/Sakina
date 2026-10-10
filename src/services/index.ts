/**
 * Data access for the UI. Pages and components call these functions only, never fetch() directly.
 *
 * Everything goes to the API (`./api`), except the communities' names and descriptions: those are
 * curated UI copy in `src/data/conditions.ts` (the API has the same ids, plus live numbers).
 */
import { CONDITIONS } from '@/data/conditions';
import type { Community, CommunityStats, NewStory, StorySummary } from '@/types/domain';
import { request } from './api';
import * as auth from './auth';

export { api, ApiError, request } from './api';

export const communities = {
  async list(): Promise<Community[]> {
    return CONDITIONS.filter((c) => c.status === 'active');
  },
  async get(id: string): Promise<Community | null> {
    return CONDITIONS.find((c) => c.id === id && c.status === 'active') ?? null;
  }
};

/** Which communities the signed-in member belongs to. */
export const memberships = {
  async isMember(communityId: string): Promise<boolean> {
    const res = await request<{ communities: string[] }>('/me/communities');
    return res.status === 200 && res.data.communities.includes(communityId);
  },
  async setMember(communityId: string, member: boolean): Promise<{ ok: boolean }> {
    const res = await request(`/me/communities/${encodeURIComponent(communityId)}`, { method: member ? 'PUT' : 'DELETE' });
    return { ok: res.status === 204 };
  }
};

export const accounts = {
  /** Availability, plus up to 3 free suggestions when taken. */
  checkNickname: auth.checkNickname
};

export { auth };
export { addReply, deleteReply, report, savedStories, setReaction, setRelate, storyPages } from './reading';

type Feed = { stories: StorySummary[]; next: string | null };

async function feed(query: string): Promise<Feed> {
  const res = await request<Feed>(`/stories?${query}`);
  return res.status === 200 ? res.data : { stories: [], next: null };
}

export type PostResult = { ok: true; story: StorySummary } | { ok: false; error: 'post_limit' | 'unknown_community' | 'invalid' };

export const stories = {
  /** The newest stories across communities (home page). */
  async featured(): Promise<StorySummary[]> {
    return (await feed('limit=3')).stories;
  },
  /** Newest first. Pass `before` (the previous page's `next`) for older ones. */
  async byCommunity(communityId: string, before?: string): Promise<Feed> {
    return feed(`community=${encodeURIComponent(communityId)}&limit=20${before ? `&before=${encodeURIComponent(before)}` : ''}`);
  },
  /** Post a story. `story.status === 'held'` when it waits for a moderator. */
  async create(input: NewStory): Promise<PostResult> {
    const res = await request<{ story: StorySummary; error?: string }>('/stories', { body: input });
    if (res.status === 201) return { ok: true, story: res.data.story };
    const error = res.data?.error;
    return { ok: false, error: error === 'post_limit' || error === 'unknown_community' ? error : 'invalid' };
  },
  async remove(id: string): Promise<boolean> {
    return (await request(`/stories/${encodeURIComponent(id)}`, { method: 'DELETE' })).status === 204;
  }
};

/** Live numbers per community: members who joined, published stories. */
export async function communityStats(): Promise<Record<string, CommunityStats>> {
  const res = await request<{ communities: CommunityStats[] }>('/communities');
  return res.status === 200 ? Object.fromEntries(res.data.communities.map((c) => [c.id, c])) : {};
}
