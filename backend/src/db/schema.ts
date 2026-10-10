/**
 * Database tables (Drizzle). Change a table here, then run `npm run db:generate` to write a new
 * migration into ./drizzle. Migrations are append-only: never edit one that has been merged.
 *
 * Privacy rules for this file:
 * - Secrets are stored as hashes only: passwords and recovery codes (argon2id), session and
 *   reset tokens (SHA-256 of a random value; the raw value only ever lives in the cookie/link).
 * - The optional recovery email is encrypted (AES-256-GCM, DATA_ENCRYPTION_KEY), never stored in clear.
 *
 * Member content (stories, replies) is stored as written, in one language; it is never translated.
 */
import { sql } from 'drizzle-orm';
import { boolean, index, integer, pgEnum, pgTable, primaryKey, smallint, text, timestamp, uuid, type AnyPgColumn } from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', ['member', 'therapist', 'moderator', 'admin']);
export const accountStatusEnum = pgEnum('account_status', ['active', 'suspended']);
export const recoveryTypeEnum = pgEnum('recovery_type', ['code', 'email']);
export const tokenPurposeEnum = pgEnum('token_purpose', ['password_reset', 'email_verify']);
export const therapistKindEnum = pgEnum('therapist_kind', ['psychologist', 'psychiatrist']);
export const sensitivityEnum = pgEnum('sensitivity', ['standard', 'sensitive', 'high']);
export const communityStatusEnum = pgEnum('community_status', ['active', 'archived']);
export const postTypeEnum = pgEnum('post_type', ['story', 'checkin', 'win']);
export const visibilityEnum = pgEnum('visibility', ['public', 'members']);
export const moodEnum = pgEnum('mood', ['heavy', 'low', 'okay', 'steady', 'light']);
/** published: visible to whoever may see it · held: waiting for a moderator, only the author sees it · removed: nobody. */
export const contentStatusEnum = pgEnum('content_status', ['published', 'held', 'removed']);
export const reactionEnum = pgEnum('reaction', ['relate', 'strength', 'helped', 'thanks']);
export const notificationKindEnum = pgEnum('notification_kind', ['reply', 'reaction', 'therapist', 'held', 'approved']);
export const reportReasonEnum = pgEnum('report_reason', ['unsafe', 'harassment', 'medical', 'personal', 'spam', 'other']);
export const reportStatusEnum = pgEnum('report_status', ['open', 'resolved']);

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  /** As the member typed it (shown in the UI). */
  nickname: text('nickname').notNull(),
  /** Lowercased + NFKC-normalised: what uniqueness and sign-in compare against. */
  nicknameKey: text('nickname_key').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  avatar: smallint('avatar').notNull(),
  role: roleEnum('role').notNull().default('member'),
  status: accountStatusEnum('status').notNull().default('active'),
  suspendedReason: text('suspended_reason'),
  /** Therapists only: shown next to their replies. */
  therapistKind: therapistKindEnum('therapist_kind'),
  ageRange: text('age_range'),
  country: text('country'),
  createdAt: createdAt()
});

/**
 * The curated communities. Names and descriptions are UI copy and live in the web app
 * (src/data/conditions.ts); here only what the server needs: which ids exist and how sensitive they are.
 */
export const communities = pgTable('communities', {
  id: text('id').primaryKey(),
  sensitivity: sensitivityEnum('sensitivity').notNull(),
  status: communityStatusEnum('status').notNull().default('active')
});

export const accountCommunities = pgTable(
  'account_communities',
  {
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    communityId: text('community_id')
      .notNull()
      .references(() => communities.id),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [primaryKey({ columns: [t.accountId, t.communityId] })]
);

/** One row per account: either a recovery code (hashed) or an email (encrypted). */
export const recovery = pgTable('recovery', {
  accountId: uuid('account_id')
    .primaryKey()
    .references(() => accounts.id, { onDelete: 'cascade' }),
  type: recoveryTypeEnum('type').notNull(),
  codeHash: text('code_hash'),
  emailEncrypted: text('email_encrypted'),
  emailVerified: boolean('email_verified').notNull().default(false),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const sessions = pgTable(
  'sessions',
  {
    /** SHA-256 of the cookie value. A database leak doesn't hand out working sessions. */
    idHash: text('id_hash').primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    /** "Remember me": a 30-day cookie; otherwise a browser-session cookie with a 12-hour server limit. */
    persistent: boolean('persistent').notNull(),
    createdAt: createdAt(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull()
  },
  (t) => [index('sessions_account_idx').on(t.accountId), index('sessions_expires_idx').on(t.expiresAt)]
);

/**
 * Failed attempts per nickname key, for sign-in and recovery-code checks ("signin:<key>",
 * "recovery:<key>"). Rows exist for nicknames that have no account too, so lockout looks the same
 * either way and nobody can learn which accounts exist.
 */
export const loginAttempts = pgTable('login_attempts', {
  key: text('key').primaryKey(),
  failed: integer('failed').notNull().default(0),
  lockedUntil: timestamp('locked_until', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

/** Single-use tokens (password reset, email verification). Deleted when used. */
export const tokens = pgTable(
  'tokens',
  {
    tokenHash: text('token_hash').primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    purpose: tokenPurposeEnum('purpose').notNull(),
    createdAt: createdAt(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull()
  },
  (t) => [index('tokens_account_idx').on(t.accountId), index('tokens_expires_idx').on(t.expiresAt)]
);

/* ---------- content ---------- */

const authorId = () =>
  uuid('author_id')
    .notNull()
    .references(() => accounts.id, { onDelete: 'cascade' });

const emptyTextArray = sql`'{}'::text[]`;

export const stories = pgTable(
  'stories',
  {
    /** Short, URL-safe (/stories/<id>). */
    id: text('id').primaryKey(),
    communityId: text('community_id')
      .notNull()
      .references(() => communities.id),
    authorId: authorId(),
    type: postTypeEnum('type').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    visibility: visibilityEnum('visibility').notNull(),
    /** Content warnings (VeilTopic); empty when none. */
    veil: text('veil').array().notNull().default(emptyTextArray),
    mood: moodEnum('mood'),
    status: contentStatusEnum('status').notNull().default('published'),
    /** Why it was held (e.g. "phone", "sensitive_community"). For moderators. */
    heldReasons: text('held_reasons').array().notNull().default(emptyTextArray),
    createdAt: createdAt()
  },
  (t) => [
    index('stories_feed_idx').on(t.communityId, t.status, t.createdAt),
    index('stories_author_idx').on(t.authorId),
    index('stories_status_idx').on(t.status, t.createdAt)
  ]
);

/** One row per person per reaction kind: toggling is insert/delete. */
export const reactions = pgTable(
  'reactions',
  {
    storyId: text('story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    kind: reactionEnum('kind').notNull(),
    createdAt: createdAt()
  },
  (t) => [primaryKey({ columns: [t.storyId, t.accountId, t.kind] })]
);

export const replies = pgTable(
  'replies',
  {
    id: text('id').primaryKey(),
    storyId: text('story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),
    /** One level of nesting only: a reply to a top-level reply. */
    parentId: text('parent_id').references((): AnyPgColumn => replies.id, { onDelete: 'cascade' }),
    authorId: authorId(),
    text: text('text').notNull(),
    status: contentStatusEnum('status').notNull().default('published'),
    heldReasons: text('held_reasons').array().notNull().default(emptyTextArray),
    createdAt: createdAt()
  },
  (t) => [index('replies_story_idx').on(t.storyId, t.createdAt), index('replies_author_idx').on(t.authorId)]
);

/** "I relate" on a reply. */
export const replyRelates = pgTable(
  'reply_relates',
  {
    replyId: text('reply_id')
      .notNull()
      .references(() => replies.id, { onDelete: 'cascade' }),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    createdAt: createdAt()
  },
  (t) => [primaryKey({ columns: [t.replyId, t.accountId] })]
);

/** Bookmarks. Private to the member. */
export const savedStories = pgTable(
  'saved_stories',
  {
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    storyId: text('story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),
    savedAt: timestamp('saved_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [primaryKey({ columns: [t.accountId, t.storyId] })]
);

/**
 * Things that happened to a member's own content. Never "who is online". Reactions are grouped:
 * one unread "reaction" row per story whose `count` grows.
 */
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    kind: notificationKindEnum('kind').notNull(),
    storyId: text('story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),
    /** Who replied (reply, therapist). */
    actorId: uuid('actor_id').references(() => accounts.id, { onDelete: 'set null' }),
    /** How many reactions (reaction). */
    count: integer('count'),
    createdAt: createdAt(),
    readAt: timestamp('read_at', { withTimezone: true })
  },
  (t) => [index('notifications_account_idx').on(t.accountId, t.createdAt)]
);

/** A member flags a story or a reply. Moderators resolve it. */
export const reports = pgTable(
  'reports',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    reporterId: uuid('reporter_id').references(() => accounts.id, { onDelete: 'set null' }),
    storyId: text('story_id').references(() => stories.id, { onDelete: 'cascade' }),
    replyId: text('reply_id').references(() => replies.id, { onDelete: 'cascade' }),
    reason: reportReasonEnum('reason').notNull(),
    note: text('note').notNull().default(''),
    status: reportStatusEnum('status').notNull().default('open'),
    createdAt: createdAt(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true })
  },
  (t) => [index('reports_status_idx').on(t.status, t.createdAt)]
);

/** A member stops seeing someone's stories and replies. The blocked person isn't told. */
export const blocks = pgTable(
  'blocks',
  {
    blockerId: uuid('blocker_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    blockedId: uuid('blocked_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    createdAt: createdAt()
  },
  (t) => [primaryKey({ columns: [t.blockerId, t.blockedId] })]
);
