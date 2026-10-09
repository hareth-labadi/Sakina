/**
 * Database tables (Drizzle). Change a table here, then run `npm run db:generate` to write a new
 * migration into ./drizzle. Migrations are append-only: never edit one that has been merged.
 *
 * Privacy rules for this file:
 * - Secrets are stored as hashes only: passwords and recovery codes (argon2id), session and
 *   reset tokens (SHA-256 of a random value; the raw value only ever lives in the cookie/link).
 * - The optional recovery email is encrypted (AES-256-GCM, DATA_ENCRYPTION_KEY), never stored in clear.
 */
import { sql } from 'drizzle-orm';
import { boolean, index, integer, pgEnum, pgTable, primaryKey, smallint, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', ['member', 'therapist', 'moderator', 'admin']);
export const accountStatusEnum = pgEnum('account_status', ['active', 'suspended']);
export const recoveryTypeEnum = pgEnum('recovery_type', ['code', 'email']);
export const tokenPurposeEnum = pgEnum('token_purpose', ['password_reset', 'email_verify']);

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
  ageRange: text('age_range'),
  country: text('country'),
  createdAt: createdAt()
});

export const accountCommunities = pgTable(
  'account_communities',
  {
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    communityId: text('community_id').notNull(),
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
