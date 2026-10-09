/**
 * The signed-in member's own profile, from the API. Never contains the password, the recovery
 * code or the full email (masked only).
 */
import type { Role } from '@/types/domain';
import { request } from './api';

export type OwnProfile = {
  nickname: string;
  avatar: number;
  role: Role;
  createdAt: string;
  communities: string[];
  recovery: { type: 'code' } | { type: 'email'; masked: string; verified: boolean };
};

export const profile = {
  /** Null when not signed in (or the session just ended). */
  async get(): Promise<OwnProfile | null> {
    const res = await request<OwnProfile>('/me/profile');
    return res.status === 200 ? res.data : null;
  }
};
