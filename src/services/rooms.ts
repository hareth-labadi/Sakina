/**
 * Discussion rooms (live group chat), through the API (backend/src/modules/content/rooms.ts).
 * Rooms come with their UI copy (src/data/rooms.ts); a room without copy isn't shown.
 */
import { roomCopy, type RoomCopy } from '@/data/rooms';
import type { Room, RoomMessage } from '@/types/domain';
import { api, request } from './api';

const enc = encodeURIComponent;

export type RoomWithCopy = Room & Omit<RoomCopy, 'id'>;
export type RoomPage = { room: RoomWithCopy; messages: RoomMessage[] };

function withCopy(room: Room): RoomWithCopy | null {
  const copy = roomCopy(room.id);
  return copy ? { ...room, title: copy.title, about: copy.about } : null;
}

export type SendResult = { ok: true; message: RoomMessage } | { ok: false; error: 'closed' | 'post_limit' | 'not_found' | 'invalid' };

export const rooms = {
  async list(): Promise<RoomWithCopy[]> {
    return (await api<{ rooms: Room[] }>('/rooms')).rooms.flatMap((r) => withCopy(r) ?? []);
  },
  /**
   * A room and its latest messages (oldest first), or null when it doesn't exist. The room page
   * calls this again every few seconds; for a signed-in member that counts them as "here now".
   */
  async get(id: string): Promise<RoomPage | null> {
    const res = await request<{ room: Room; messages: RoomMessage[] }>(`/rooms/${enc(id)}`);
    if (res.status !== 200) return null;
    const room = withCopy(res.data.room);
    return room ? { room, messages: res.data.messages } : null;
  },
  /** `message.held` when it waits for a moderator. */
  async send(roomId: string, text: string): Promise<SendResult> {
    const res = await request<{ message: RoomMessage; error?: string }>(`/rooms/${enc(roomId)}/messages`, { body: { text } });
    if (res.status === 201) return { ok: true, message: res.data.message };
    const error = res.data?.error;
    return { ok: false, error: error === 'closed' || error === 'post_limit' || error === 'not_found' ? error : 'invalid' };
  },
  /** Delete one of my messages (or, for a moderator, remove anyone's). */
  async remove(messageId: string): Promise<boolean> {
    return (await request(`/room-messages/${enc(messageId)}`, { method: 'DELETE' })).status === 204;
  },
  /** Stop seeing someone's messages and posts. They aren't told. */
  async block(nickname: string): Promise<boolean> {
    return (await request(`/me/blocks/${enc(nickname)}`, { method: 'PUT' })).status === 204;
  }
};
