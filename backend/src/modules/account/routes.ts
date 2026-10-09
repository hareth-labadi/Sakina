/**
 * The signed-in member's own account: profile and community memberships.
 * Everything here needs a session and only ever touches the caller's own rows.
 */
import { and, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Config } from '../../config.js';
import type { Db } from '../../db/client.js';
import { accountCommunities, recovery } from '../../db/schema.js';
import { decrypt } from '../../lib/crypto.js';
import { maskEmail } from '../../lib/recovery.js';
import { requireAccount } from '../auth/sessions.js';

/** Community ids are the web app's slugs (src/data/conditions.ts). */
const communityParams = z.object({ id: z.string().regex(/^[a-z0-9-]{1,40}$/) });

export async function accountRoutes(app: FastifyInstance, { db, config }: { db: Db; config: Config }) {
  const communitiesOf = async (accountId: string) =>
    (await db.select({ id: accountCommunities.communityId }).from(accountCommunities).where(eq(accountCommunities.accountId, accountId))).map((r) => r.id);

  /** What the profile page shows. The recovery email only leaves masked. */
  app.get('/me/profile', async (req, reply) => {
    const s = await requireAccount(db, config, req, reply);
    if (!s) return reply;
    const a = s.account;
    const [rec] = await db.select().from(recovery).where(eq(recovery.accountId, a.id));
    return {
      nickname: a.nickname,
      avatar: a.avatar,
      role: a.role,
      createdAt: a.createdAt.toISOString(),
      communities: await communitiesOf(a.id),
      recovery:
        rec?.type === 'email' && rec.emailEncrypted
          ? { type: 'email', masked: maskEmail(decrypt(rec.emailEncrypted, config.DATA_ENCRYPTION_KEY)), verified: rec.emailVerified }
          : { type: 'code' }
    };
  });

  app.get('/me/communities', async (req, reply) => {
    const s = await requireAccount(db, config, req, reply);
    if (!s) return reply;
    return { communities: await communitiesOf(s.account.id) };
  });

  /** Join. Idempotent: joining twice is fine. */
  app.put('/me/communities/:id', async (req, reply) => {
    const s = await requireAccount(db, config, req, reply);
    if (!s) return reply;
    const parsed = communityParams.safeParse(req.params);
    if (!parsed.success) return reply.status(400).send({ error: 'invalid' });
    await db.insert(accountCommunities).values({ accountId: s.account.id, communityId: parsed.data.id }).onConflictDoNothing();
    return reply.status(204).send();
  });

  /** Leave. Idempotent too. */
  app.delete('/me/communities/:id', async (req, reply) => {
    const s = await requireAccount(db, config, req, reply);
    if (!s) return reply;
    const parsed = communityParams.safeParse(req.params);
    if (!parsed.success) return reply.status(400).send({ error: 'invalid' });
    await db
      .delete(accountCommunities)
      .where(and(eq(accountCommunities.accountId, s.account.id), eq(accountCommunities.communityId, parsed.data.id)));
    return reply.status(204).send();
  });
}
