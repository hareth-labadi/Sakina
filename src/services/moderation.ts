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

export type HeldMessage = { id: string; roomId: string; authorNickname: string; text: string; heldReasons: string[]; createdAt: string };

export type OpenReport = {
  id: string;
  reason: 'unsafe' | 'harassment' | 'medical' | 'personal' | 'spam' | 'other';
  note: string;
  createdAt: string;
  target:
    | { type: 'story'; id: string; title: string; status: string; authorNickname: string }
    | { type: 'reply'; id: string; storyId: string; text: string; status: string; authorNickname: string }
    | { type: 'message'; id: string; roomId: string; text: string; status: string; authorNickname: string }
    | null;
};

export type Decision = 'approve' | 'remove';
export type ContentKind = 'story' | 'reply' | 'message';

const enc = encodeURIComponent;
const decidePath: Record<ContentKind, string> = { story: 'moderation/stories', reply: 'moderation/replies', message: 'moderation/room-messages' };
const contentPath: Record<ContentKind, string> = { story: 'stories', reply: 'replies', message: 'room-messages' };

export const moderation = {
  async queue(): Promise<{ stories: HeldStory[]; replies: HeldReply[]; messages: HeldMessage[] }> {
    return api('/moderation/queue');
  },
  /** Approve (publish, the author is told) or remove held content. False when it was already decided. */
  async decide(kind: ContentKind, id: string, action: Decision): Promise<boolean> {
    return (await request(`/${decidePath[kind]}/${enc(id)}`, { body: { action } })).status === 204;
  },
  async reports(): Promise<OpenReport[]> {
    return (await api<{ reports: OpenReport[] }>('/moderation/reports')).reports;
  },
  async resolve(reportId: string): Promise<boolean> {
    return (await request(`/moderation/reports/${enc(reportId)}/resolve`, { body: {} })).status === 204;
  },
  /** Remove a published story, reply or room message (kept for the record, hidden from everyone). */
  async removeContent(kind: ContentKind, id: string): Promise<boolean> {
    return (await request(`/${contentPath[kind]}/${enc(id)}`, { method: 'DELETE' })).status === 204;
  }
};
