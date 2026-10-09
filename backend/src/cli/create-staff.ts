/**
 * Creates a therapist, moderator or admin account. Staff never sign up through the website.
 * Prints a generated password and recovery code ONCE; hand them over privately and ask the
 * person to change the password at first sign-in.
 *
 *   dev:    npx tsx --env-file=.env src/cli/create-staff.ts <nickname> <therapist|moderator|admin>
 *   image:  docker compose run --rm api node dist/cli/create-staff.js <nickname> <role>
 *
 * Staff may take reserved names (e.g. "moderator"); members can't.
 */
import { randomBytes } from 'node:crypto';
import { loadDatabaseUrl } from '../config.js';
import { createDb } from '../db/client.js';
import { accounts, recovery } from '../db/schema.js';
import { NICKNAME_PATTERN, nicknameKey } from '../lib/nickname.js';
import { hashSecret } from '../lib/passwords.js';
import { generateRecoveryCode, normalizeRecoveryCode } from '../lib/recovery.js';

const ROLES = ['therapist', 'moderator', 'admin'] as const;
type StaffRole = (typeof ROLES)[number];

const [nickname = '', role = ''] = process.argv.slice(2);
if (!NICKNAME_PATTERN.test(nickname) || !ROLES.includes(role as StaffRole)) {
  console.error(`Usage: create-staff <nickname> <${ROLES.join('|')}>\nNickname: 3 to 20 letters, digits, "_" or ".".`);
  process.exit(2);
}

const password = randomBytes(18).toString('base64url'); // 24 characters
const code = generateRecoveryCode();
const { db, pool } = createDb(loadDatabaseUrl());

try {
  await db.transaction(async (tx) => {
    const [a] = await tx
      .insert(accounts)
      .values({ nickname, nicknameKey: nicknameKey(nickname), passwordHash: await hashSecret(password), avatar: 0, role: role as StaffRole })
      .returning({ id: accounts.id });
    await tx.insert(recovery).values({ accountId: a!.id, type: 'code', codeHash: await hashSecret(normalizeRecoveryCode(code)) });
  });
  console.log(`Created ${role} "${nickname}". Shown once, hand over privately:\n  password:      ${password}\n  recovery code: ${code}`);
} catch (err) {
  const e = err as { code?: string; cause?: { code?: string } };
  console.error(e.code === '23505' || e.cause?.code === '23505' ? `"${nickname}" is already taken.` : `Failed: ${err instanceof Error ? err.message : err}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
