/**
 * Notifications (mock). Same rules as `./index.ts`: swap each body for `api()` later.
 * Browser only: reads the mock store.
 */
import type { AppNotification } from '@/types/domain';
import { delay, notificationsOf, readDb, writeDb } from './mock-db';

export const notifications = {
  /** Newest first. */
  async list(nickname: string): Promise<AppNotification[]> {
    await delay();
    const db = readDb();
    const a = db.accounts[nickname.toLowerCase()];
    if (!a) return [];
    const list = notificationsOf(a);
    writeDb(db); // keeps the seeded copy, so read state sticks
    return [...list].sort((x, y) => y.createdAt.localeCompare(x.createdAt));
  },
  /** Marks one (`id`) or all notifications read. Returns how many are still unread. */
  async markRead(nickname: string, id?: string): Promise<number> {
    const db = readDb();
    const a = db.accounts[nickname.toLowerCase()];
    if (!a) return 0;
    const list = notificationsOf(a);
    for (const n of list) if (!id || n.id === id) n.read = true;
    writeDb(db);
    return list.filter((n) => !n.read).length;
  }
};
