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
  /** Only on the viewer's own posts that wait for a moderator. */
  status?: 'held';
};

export type Reply = {
  id: string;
  authorNickname: string;
  authorAvatar: number;
  text: string;
  createdAt: string; // ISO 8601
  /** Set when a verified therapist wrote it. */
  therapist?: TherapistKind;
  relateCount: number;
  /** One level of nesting only. */
  replies?: Reply[];
  /** For a signed-in viewer: did they say "I relate". */
  related?: boolean;
  /** The viewer wrote it. */
  mine?: boolean;
  /** The viewer's own reply, waiting for a moderator. */
  held?: boolean;
};

/** A story as shown on its own page. */
export type Story = StorySummary & {
  body: string;
  reactions: Record<Reaction, number>;
  replies: Reply[];
  /** A members-only story seen by a guest: no body, no replies. */
  locked?: boolean;
  /** Only for a signed-in viewer. */
  viewer?: { reactions: Reaction[]; saved: boolean; isAuthor: boolean };
};

/** Live numbers of a community (its name and description are UI copy in src/data). */
export type CommunityStats = { id: string; memberCount: number; storyCount: number };

export type ReportReason = 'unsafe' | 'harassment' | 'medical' | 'personal' | 'spam' | 'other';

/** What a member sends to post a story. */
export type NewStory = {
  communityId: string;
  type: PostType;
  title: string;
  body: string;
  visibility: Visibility;
  veil: VeilTopic[];
  mood?: Mood;
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

/**
 * A discussion room (live group chat), as the API sends it. Its title and description are UI
 * copy in src/data/rooms.ts. Guided rooms meet weekly with a therapist; peer rooms are always open.
 */
export type Room = {
  id: string;
  kind: 'guided' | 'peer';
  communityId: string;
  host: { nickname: string; avatar: number; kind: TherapistKind } | null;
  /** 0 = Sunday … 6 = Saturday; "HH:MM" in Algeria's time. Guided rooms only. */
  schedule: { day: number; time: string } | null;
  /** Open for writing right now. */
  live: boolean;
  /** Signed-in members who have the room open. Never who. */
  present: number;
};

/** A room message. Members write in their own language: `text` is never translated. */
export type RoomMessage = {
  id: string;
  authorNickname: string;
  authorAvatar: number;
  text: string;
  createdAt: string;
  therapist?: TherapistKind;
  mine?: true;
  /** Waiting for a moderator: only its author gets it. */
  held?: true;
};

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
