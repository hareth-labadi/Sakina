/**
 * The signed-in member's own profile (mock). Same rules as `./index.ts`: swap the body for `api()` later.
 * Browser only: reads the mock store. Never returns the password, the recovery code or the full email.
 */
import { maskEmail } from '@/lib/recovery';
import type { Role } from '@/types/domain';
import { delay, readDb } from './mock-db';

export type OwnProfile = {
  nickname: string;
  avatar: number;
  role: Role;
  createdAt: string;
  communities: string[];
  recovery: { type: 'code' } | { type: 'email'; masked: string; verified: boolean };
};

export const profile = {
  async get(nickname: string): Promise<OwnProfile | null> {
    await delay();
    const a = readDb().accounts[nickname.toLowerCase()];
    if (!a) return null;
    return {
      nickname: a.nickname,
      avatar: a.avatar,
      role: a.role,
      createdAt: a.createdAt,
      communities: a.communities,
      recovery: a.recovery.type === 'code' ? { type: 'code' } : { type: 'email', masked: maskEmail(a.recovery.email), verified: a.recovery.verified }
    };
  }
};
