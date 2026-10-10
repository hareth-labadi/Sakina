// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const user = { nickname: 'amal_dawn', avatar: 2, role: 'member' as const, unreadNotifications: 4 };

/** A fresh copy of the session module (it keeps state at module level) with a fake API. */
async function load(me: () => Promise<unknown>) {
  vi.resetModules();
  vi.doMock('@/services/auth', () => ({ me: vi.fn(me), signOut: vi.fn(async () => undefined) }));
  const session = await import('./session');
  const auth = await import('@/services/auth');
  return { session, auth };
}

const hint = () => JSON.parse(localStorage.getItem('sakina-session-hint') ?? 'null');

beforeEach(() => localStorage.clear());

describe('session store', () => {
  it('keeps only a non-secret hint, without the unread count', async () => {
    const { session } = await load(async () => null);
    session.setSession(user);
    expect(hint()).toEqual({ nickname: 'amal_dawn', avatar: 2, role: 'member', unreadNotifications: 0 });
  });

  it('asks the API who is signed in and updates the hint', async () => {
    localStorage.setItem('sakina-session-hint', JSON.stringify(user));
    const { session, auth } = await load(async () => null);
    await session.refreshSession();
    expect(auth.me).toHaveBeenCalledOnce();
    expect(hint()).toBeNull(); // signed out elsewhere: the stale hint is dropped
  });

  it('falls back to a guest when the API is unreachable', async () => {
    localStorage.setItem('sakina-session-hint', JSON.stringify(user));
    const { session } = await load(async () => {
      throw new Error('offline');
    });
    await session.refreshSession();
    expect(hint()).toBeNull();
  });

  it('signs out on the server, then everywhere on screen, even if the call fails', async () => {
    const { session, auth } = await load(async () => user);
    session.setSession(user);
    vi.mocked(auth.signOut).mockRejectedValueOnce(new Error('offline'));
    await expect(session.signOut()).rejects.toThrow('offline');
    expect(auth.signOut).toHaveBeenCalledOnce();
    expect(hint()).toBeNull();
  });

  it('updates fields of the current user only when someone is signed in', async () => {
    const { session } = await load(async () => null);
    session.updateSession({ unreadNotifications: 2 });
    expect(hint()).toBeNull();
    session.setSession(user);
    session.updateSession({ avatar: 5 });
    expect(hint()).toMatchObject({ avatar: 5 });
  });
});
