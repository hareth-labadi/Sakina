/** Entry point: read config, connect, serve, and shut down cleanly on SIGTERM/SIGINT. */
import { loadConfig } from './config.js';
import { createDb } from './db/client.js';
import { purgeExpired } from './modules/auth/cleanup.js';
import { buildServer } from './server.js';

const config = loadConfig();
const { db, pool } = createDb(config.DATABASE_URL);
const app = await buildServer(config, db);

// Hourly: drop expired sessions, tokens and stale attempt counters.
const purge = () => purgeExpired(db).catch((err: unknown) => app.log.error({ err }, 'cleanup failed'));
const purgeTimer = setInterval(purge, 3_600_000);
purgeTimer.unref();

let closing = false;
async function shutdown(signal: string) {
  if (closing) return;
  closing = true;
  app.log.info({ signal }, 'shutting down');
  clearInterval(purgeTimer);
  // Stop accepting requests, let in-flight ones finish, then release the database.
  await app.close();
  await pool.end();
}
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

await app.listen({ host: config.HOST, port: config.PORT });
void purge();
