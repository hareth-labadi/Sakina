/**
 * Story pages and saved stories (mock). Same rules as `./index.ts`: swap each body for `api()` later.
 */
import { SAMPLE_STORIES } from '@/data/stories';
import { STORY_DETAILS } from '@/data/story-details';
import type { Story, StorySummary } from '@/types/domain';
import { delay, memberOf, readDb, writeDb } from './mock-db';

export const storyPages = {
  ids(): string[] {
    return SAMPLE_STORIES.map((s) => s.id);
  },
  /**
   * The real API must not send a members-only body to guests; the mock returns everything
   * and the page hides it.
   */
  async get(id: string): Promise<Story | null> {
    const s = SAMPLE_STORIES.find((x) => x.id === id);
    if (!s) return null;
    const d = STORY_DETAILS[id];
    return {
      ...s,
      body: d?.body ?? s.excerpt,
      reactions: d?.reactions ?? { relate: s.reactionTotal, strength: 0, helped: 0, thanks: 0 },
      replies: d?.replies ?? []
    };
  }
};

/** Bookmarks. Private to the member. Kept in this browser until the stories API exists (see `./mock-db`). */
export const savedStories = {
  async isSaved(nickname: string, storyId: string): Promise<boolean> {
    return memberOf(readDb(), nickname).saved?.includes(storyId) ?? false;
  },
  async setSaved(nickname: string, storyId: string, saved: boolean): Promise<{ ok: boolean }> {
    await delay(250);
    const db = readDb();
    const m = memberOf(db, nickname);
    const list = m.saved ?? [];
    m.saved = saved ? [storyId, ...list.filter((id) => id !== storyId)] : list.filter((id) => id !== storyId);
    writeDb(db);
    return { ok: true };
  },
  /** Most recently saved first. */
  async list(nickname: string): Promise<StorySummary[]> {
    await delay();
    const ids = memberOf(readDb(), nickname).saved ?? [];
    return ids.map((id) => SAMPLE_STORIES.find((s) => s.id === id)).filter((s): s is StorySummary => Boolean(s));
  }
};
