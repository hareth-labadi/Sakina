/**
 * Data access for the UI. Pages and components call these functions only, never fetch() directly.
 *
 * Accounts, sessions, profiles and memberships go to the API (`./api`). Communities and stories
 * are still static sample data, and saved stories and notifications are kept in this browser
 * (`./mock-db`) until their API exists; each keeps its signature when it switches.
 */
import { CONDITIONS } from '@/data/conditions';
import { SAMPLE_STORIES } from '@/data/stories';
import type { Community, StorySummary } from '@/types/domain';
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
export { savedStories, storyPages } from './reading';

export const stories = {
  async featured(): Promise<StorySummary[]> {
    return SAMPLE_STORIES.slice(0, 3);
  },
  /** Newest first. */
  async byCommunity(communityId: string): Promise<StorySummary[]> {
    return SAMPLE_STORIES.filter((s) => s.communityId === communityId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
};
