/**
 * Development and staging only: makes the demo accounts from the README usable, so the screens
 * can be tried with them (the sign-in page lists them in development). Safe to run again: it resets
 * those accounts to their starting state and leaves every other account alone.
 *
 *   npm run db:seed
 *
 * The sample stories and their (locked) authors come from a migration and exist everywhere; this
 * only gives the demo accounts a password, memberships, a recovery method and demo notifications.
 * Accounts are updated in place, never deleted, so their stories stay.
 *
 * Password for all: calm-river-22. Refuses to run with NODE_ENV=production, except on staging,
 * which runs the production image and opts in with SEED_DEMO_ACCOUNTS=yes. Never set that in production.
 */
import { eq, inArray } from 'drizzle-orm';
import { loadConfig } from '../config.js';
import { encrypt } from '../lib/crypto.js';
import { nicknameKey } from '../lib/nickname.js';
import { hashSecret } from '../lib/passwords.js';
import { normalizeRecoveryCode } from '../lib/recovery.js';
import { createDb } from './client.js';
import { accountCommunities, accounts, notifications, recovery } from './schema.js';

const config = loadConfig();
if (config.NODE_ENV === 'production' && process.env.SEED_DEMO_ACCOUNTS !== 'yes') {
  console.error('db:seed is for development (and staging, with SEED_DEMO_ACCOUNTS=yes) only.');
  process.exit(2);
}

const PASSWORD = 'calm-river-22';

type Demo = {
  nickname: string;
  avatar: number;
  communities: string[];
  recovery: { type: 'code'; code: string } | { type: 'email'; email: string; verified: boolean };
  role?: 'member' | 'therapist' | 'moderator';
  therapistKind?: 'psychologist' | 'psychiatrist';
  suspendedReason?: string;
};

const NO_CODE = { type: 'code', code: 'XXXX-XXXX-XXXX' } as const;

const DEMO: Demo[] = [
  { nickname: 'amal_dawn', avatar: 2, communities: ['anxiety', 'panic', 'depression'], recovery: { type: 'code', code: 'K7QM-4XPT-9HDA' } },
  { nickname: 'leaf_demo', avatar: 6, communities: [], recovery: { type: 'email', email: 'leaf.demo@example.com', verified: true } },
  { nickname: 'still_water', avatar: 3, communities: [], recovery: NO_CODE, suspendedReason: 'Shared outside contact links after a warning.' },
  // Staff, to try the therapist and moderation flows.
  { nickname: 'Huda', avatar: 4, communities: [], recovery: NO_CODE, role: 'therapist', therapistKind: 'psychologist' },
  { nickname: 'mod_noor', avatar: 7, communities: [], recovery: NO_CODE, role: 'moderator' },
  // Sample-story authors: usable in development too.
  { nickname: 'sea_glass', avatar: 1, communities: ['panic'], recovery: NO_CODE },
  { nickname: 'quiet_river', avatar: 0, communities: ['anxiety'], recovery: NO_CODE }
];

const { db, pool } = createDb(config.DATABASE_URL);
try {
  const passwordHash = await hashSecret(PASSWORD);
  await db.transaction(async (tx) => {
    for (const d of DEMO) {
      const key = nicknameKey(d.nickname);
      const fields = {
        nickname: d.nickname,
        passwordHash,
        avatar: d.avatar,
        role: d.role ?? 'member',
        therapistKind: d.therapistKind ?? null,
        status: d.suspendedReason ? ('suspended' as const) : ('active' as const),
        suspendedReason: d.suspendedReason ?? null
      };
      // Update in place (keeps their stories), or create.
      const [a] = await tx
        .insert(accounts)
        .values({ ...fields, nicknameKey: key, createdAt: new Date('2026-08-01T10:00:00Z') })
        .onConflictDoUpdate({ target: accounts.nicknameKey, set: fields })
        .returning({ id: accounts.id });
      const id = a!.id;

      await tx.delete(accountCommunities).where(eq(accountCommunities.accountId, id));
      if (d.communities.length) await tx.insert(accountCommunities).values(d.communities.map((communityId) => ({ accountId: id, communityId })));

      await tx.delete(recovery).where(eq(recovery.accountId, id));
      await tx.insert(recovery).values(
        d.recovery.type === 'code'
          ? { accountId: id, type: 'code', codeHash: await hashSecret(normalizeRecoveryCode(d.recovery.code)) }
          : { accountId: id, type: 'email', emailEncrypted: encrypt(d.recovery.email, config.DATA_ENCRYPTION_KEY), emailVerified: d.recovery.verified }
      );
    }

    // Demo notifications for amal_dawn, about their check-in s4.
    const ids = Object.fromEntries(
      (
        await tx
          .select({ id: accounts.id, key: accounts.nicknameKey })
          .from(accounts)
          .where(inArray(accounts.nicknameKey, ['amal_dawn', 'sea_glass', 'huda']))
      ).map((r) => [r.key, r.id])
    );
    if (ids.amal_dawn) {
      await tx.delete(notifications).where(eq(notifications.accountId, ids.amal_dawn));
      await tx.insert(notifications).values([
        { accountId: ids.amal_dawn, kind: 'reply', storyId: 's4', actorId: ids.sea_glass, createdAt: new Date('2026-10-08T14:20:00Z') },
        { accountId: ids.amal_dawn, kind: 'reaction', storyId: 's4', count: 3, createdAt: new Date('2026-10-08T12:00:00Z') },
        { accountId: ids.amal_dawn, kind: 'therapist', storyId: 's4', actorId: ids.huda, createdAt: new Date('2026-10-08T11:05:00Z'), readAt: new Date('2026-10-08T12:00:00Z') },
        { accountId: ids.amal_dawn, kind: 'approved', storyId: 's4', createdAt: new Date('2026-10-08T09:40:00Z'), readAt: new Date('2026-10-08T10:00:00Z') }
      ]);
    }
  });
  console.log(`Seeded ${DEMO.map((d) => d.nickname).join(', ')} (password ${PASSWORD})`);
} catch (err) {
  console.error('Seed failed:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
