import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  rows: [] as Array<Record<string, unknown>>,
  projection: undefined as unknown,
  select: vi.fn((projection?: unknown) => {
    mocks.projection = projection;
    const chain: Record<string, unknown> = {};
    chain.from = vi.fn(() => chain);
    chain.innerJoin = vi.fn(() => chain);
    chain.where = vi.fn(() => chain);
    chain.limit = vi.fn(async () => mocks.rows);
    return chain;
  }),
  update: vi.fn(() => ({
    set: vi.fn(() => ({ where: vi.fn(async () => undefined) })),
  })),
  initializeDatabase: vi.fn(async () => undefined),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ get: () => ({ value: 'session-token-placeholder' }) })),
}));
vi.mock('@/lib/db', () => ({
  initializeDatabase: mocks.initializeDatabase,
  getDb: vi.fn(() => ({ select: mocks.select, update: mocks.update })),
}));

import { validateSessionToken } from '@/lib/auth/session';

describe('session authentication database projection', () => {
  beforeEach(() => {
    const now = new Date();
    mocks.rows = [{
      session: {
        id: 'session-1',
        profileId: 'owner-1',
        isTrusted: true,
        expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
        createdAt: now,
        lastActiveAt: now,
        isRevoked: false,
      },
      profile: {
        id: 'owner-1',
        username: 'owner',
        displayName: 'Owner',
      },
    }];
    mocks.projection = undefined;
    mocks.select.mockClear();
    mocks.update.mockClear();
  });

  it('does not select potentially large avatar/bio or unrelated session columns on every auth check', async () => {
    const result = await validateSessionToken('session-token-placeholder');
    expect(result?.profile.id).toBe('owner-1');
    expect(result?.profile).not.toHaveProperty('avatarUrl');
    expect(result?.profile).not.toHaveProperty('bio');
    expect(result?.session).not.toHaveProperty('tokenHash');

    const projection = mocks.projection as {
      session: Record<string, unknown>;
      profile: Record<string, unknown>;
    };
    expect(Object.keys(projection.profile)).toEqual(['id', 'username', 'displayName']);
    expect(Object.keys(projection.session)).toEqual([
      'id', 'profileId', 'isTrusted', 'expiresAt', 'createdAt', 'lastActiveAt', 'isRevoked',
    ]);
    expect(mocks.update).not.toHaveBeenCalled();
  });
});