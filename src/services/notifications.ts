/**
 * Notifications. Kept in this browser until the notifications API exists (see `./mock-db`);
 * swap each body for an API call then.
 */
import type { AppNotification } from '@/types/domain';
import { delay, memberOf, notificationsOf, readDb, writeDb } from './mock-db';

export const notifications = {
  /** Newest first. */
  async list(nickname: string): Promise<AppNotification[]> {
    await delay();
    const db = readDb();
    const list = notificationsOf(nickname, memberOf(db, nickname));
    writeDb(db); // keeps the seeded copy, so read state sticks
    return [...list].sort((x, y) => y.createdAt.localeCompare(x.createdAt));
  },
  /** Marks one (`id`) or all notifications read. Returns how many are still unread. */
  async markRead(nickname: string, id?: string): Promise<number> {
    const db = readDb();
    const list = notificationsOf(nickname, memberOf(db, nickname));
    for (const n of list) if (!id || n.id === id) n.read = true;
    writeDb(db);
    return list.filter((n) => !n.read).length;
  }
};
