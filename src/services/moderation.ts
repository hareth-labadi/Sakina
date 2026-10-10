/**
 * Moderation, through the API (backend/src/modules/content/moderation.ts). Moderators and admins only;
 * the API refuses everyone else. Reporters are never included.
 */
import type { PostType, Visibility } from '@/types/domain';
import { api, request } from './api';

export type HeldStory = {
  id: string;
  communityId: string;
  authorNickname: string;
  type: PostType;
  title: string;
  body: string;
  visibility: Visibility;
  heldReasons: string[];
  createdAt: string;
};

export type HeldReply = { id: string; storyId: string; storyTitle: string; authorNickname: string; text: string; heldReasons: string[]; createdAt: string };

export type OpenReport = {
  id: string;
  reason: 'unsafe' | 'harassment' | 'medical' | 'personal' | 'spam' | 'other';
  note: string;
  createdAt: string;
  target:
    | { type: 'story'; id: string; title: string; status: string; authorNickname: string }
    | { type: 'reply'; id: string; storyId: string; text: string; status: string; authorNickname: string }
    | null;
};

export type Decision = 'approve' | 'remove';

const enc = encodeURIComponent;

export const moderation = {
  async queue(): Promise<{ stories: HeldStory[]; replies: HeldReply[] }> {
    return api('/moderation/queue');
  },
  /** Approve (publish, the author is told) or remove held content. False when it was already decided. */
  async decide(kind: 'story' | 'reply', id: string, action: Decision): Promise<boolean> {
    return (await request(`/moderation/${kind === 'story' ? 'stories' : 'replies'}/${enc(id)}`, { body: { action } })).status === 204;
  },
  async reports(): Promise<OpenReport[]> {
    return (await api<{ reports: OpenReport[] }>('/moderation/reports')).reports;
  },
  async resolve(reportId: string): Promise<boolean> {
    return (await request(`/moderation/reports/${enc(reportId)}/resolve`, { body: {} })).status === 204;
  },
  /** Remove a published story or reply (kept for the record, hidden from everyone). */
  async removeContent(kind: 'story' | 'reply', id: string): Promise<boolean> {
    return (await request(`/${kind === 'story' ? 'stories' : 'replies'}/${enc(id)}`, { method: 'DELETE' })).status === 204;
  }
};
