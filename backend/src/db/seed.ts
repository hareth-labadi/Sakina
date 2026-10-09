/**
 * Development only: puts the demo accounts from the README into the database, so the screens
 * can be tried with them (the sign-in page lists them in development). Safe to run again: it
 * resets those accounts to their starting state and leaves every other account alone.
 *
 *   npm run db:seed
 *
 * Password for all: calm-river-22. Refuses to run with NODE_ENV=production, except on staging,
 * which runs the production image and opts in with SEED_DEMO_ACCOUNTS=yes. Never set that in production.
 */
import { inArray } from 'drizzle-orm';
import { loadConfig } from '../config.js';
import { encrypt } from '../lib/crypto.js';
import { nicknameKey } from '../lib/nickname.js';
import { hashSecret } from '../lib/passwords.js';
import { normalizeRecoveryCode } from '../lib/recovery.js';
import { createDb } from './client.js';
import { accountCommunities, accounts, recovery } from './schema.js';

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
  suspendedReason?: string;
};

const DEMO: Demo[] = [
  { nickname: 'amal_dawn', avatar: 2, communities: ['anxiety', 'panic'], recovery: { type: 'code', code: 'K7QM-4XPT-9HDA' } },
  { nickname: 'leaf_demo', avatar: 6, communities: [], recovery: { type: 'email', email: 'leaf.demo@example.com', verified: true } },
  {
    nickname: 'still_water',
    avatar: 3,
    communities: [],
    recovery: { type: 'code', code: 'XXXX-XXXX-XXXX' },
    suspendedReason: 'Shared outside contact links after a warning.'
  },
  // Exist only so the nickname check has "taken" examples.
  { nickname: 'sea_glass', avatar: 1, communities: [], recovery: { type: 'code', code: 'XXXX-XXXX-XXXX' } },
  { nickname: 'quiet_river', avatar: 0, communities: [], recovery: { type: 'code', code: 'XXXX-XXXX-XXXX' } }
];

const { db, pool } = createDb(config.DATABASE_URL);
try {
  const passwordHash = await hashSecret(PASSWORD);
  await db.transaction(async (tx) => {
    // Recreate from scratch: their sessions, tokens and memberships go with them (cascade).
    await tx.delete(accounts).where(inArray(accounts.nicknameKey, DEMO.map((d) => nicknameKey(d.nickname))));
    for (const d of DEMO) {
      const [a] = await tx
        .insert(accounts)
        .values({
          nickname: d.nickname,
          nicknameKey: nicknameKey(d.nickname),
          passwordHash,
          avatar: d.avatar,
          createdAt: new Date('2026-08-01T10:00:00Z'),
          ...(d.suspendedReason && { status: 'suspended' as const, suspendedReason: d.suspendedReason })
        })
        .returning({ id: accounts.id });
      if (d.communities.length) await tx.insert(accountCommunities).values(d.communities.map((communityId) => ({ accountId: a!.id, communityId })));
      await tx.insert(recovery).values(
        d.recovery.type === 'code'
          ? { accountId: a!.id, type: 'code', codeHash: await hashSecret(normalizeRecoveryCode(d.recovery.code)) }
          : { accountId: a!.id, type: 'email', emailEncrypted: encrypt(d.recovery.email, config.DATA_ENCRYPTION_KEY), emailVerified: d.recovery.verified }
      );
    }
  });
  console.log(`Seeded ${DEMO.map((d) => d.nickname).join(', ')} (password ${PASSWORD})`);
} catch (err) {
  console.error('Seed failed:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
