/**
 * Domain types shared by the UI and the (future) API client.
 * Keep these in step with the backend contract once it exists.
 */
import type { Tint } from '@/components/ui/tint';
import type { Locale } from '@/i18n/routing';

/** Text stored once per UI language (curated content: community names, guides). Member posts are plain strings. */
export type Localized = Record<Locale, string>;

export type Sensitivity = 'standard' | 'sensitive' | 'high';

export type Community = {
  id: string;
  name: Localized;
  description: Localized;
  tint: Tint;
  sensitivity: Sensitivity;
  status: 'active' | 'archived';
};

export type PostType = 'story' | 'checkin' | 'win';
export type Visibility = 'public' | 'members';
export type VeilTopic = 'selfharm' | 'loss' | 'violence' | 'abuse' | 'food' | 'substances';
export type Reaction = 'relate' | 'strength' | 'helped' | 'thanks';
export type Mood = 'heavy' | 'low' | 'okay' | 'steady' | 'light';

export type StorySummary = {
  id: string;
  communityId: string;
  authorNickname: string;
  authorAvatar: number;
  type: PostType;
  title: string;
  excerpt: string;
  visibility: Visibility;
  veil: VeilTopic[] | null;
  mood?: Mood;
  reactionTotal: number;
  createdAt: string; // ISO 8601
};

export type Role = 'member' | 'therapist' | 'moderator' | 'admin';

/** What the UI knows about the signed-in person. Never contains email or password. */
export type SessionUser = {
  nickname: string;
  avatar: number;
  role: Role;
  unreadNotifications: number;
};

export type RiskLevel = 'high' | 'medium' | 'low';
export type TherapistKind = 'psychologist' | 'psychiatrist';

export type NotificationKind = 'reply' | 'reaction' | 'therapist' | 'held' | 'approved';

/** Something that happened to the member's own posts. Always about content, never about who is online. */
export type AppNotification = {
  id: string;
  kind: NotificationKind;
  storyId: string;
  storyTitle: string;
  /** Who replied (kind "reply"). */
  actor?: string;
  /** How many people reacted (kind "reaction"). */
  count?: number;
  createdAt: string; // ISO 8601
  read: boolean;
};
