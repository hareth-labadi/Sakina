/**
 * The signed-in member's notifications, from the API.
 */
import type { AppNotification } from '@/types/domain';
import { api } from './api';

export const notifications = {
  /** Newest first, with how many are still unread. */
  async list(): Promise<{ notifications: AppNotification[]; unread: number }> {
    return api('/me/notifications');
  },
  /** Marks one (`id`) or all notifications read. Returns how many are still unread. */
  async markRead(id?: string): Promise<number> {
    return (await api<{ unread: number }>('/me/notifications/read', { body: id ? { id } : {} })).unread;
  }
};
