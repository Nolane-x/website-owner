import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  initializeDatabase: vi.fn(async () => undefined),
  getSessionFromCookies: vi.fn(async () => null),
  getGuestSessionFromCookies: vi.fn(async () => false),
}));

vi.mock('@/lib/db', () => ({
  getDb: mocks.getDb,
  initializeDatabase: mocks.initializeDatabase,
}));
vi.mock('@/lib/auth/session', () => ({
  getSessionFromCookies: mocks.getSessionFromCookies,
}));
vi.mock('@/lib/auth/guest-session', () => ({
  getGuestSessionFromCookies: mocks.getGuestSessionFromCookies,
}));

import { checkPublicAccessProtection } from '@/lib/auth/guard';

describe('preloaded public access protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.initializeDatabase.mockResolvedValue(undefined);
    mocks.getSessionFromCookies.mockResolvedValue(null);
    mocks.getGuestSessionFromCookies.mockResolvedValue(false);
  });

  it('uses an already-loaded public_access setting without extra database round trips', async () => {
    const result = await checkPublicAccessProtection({
      ownerProfileId: 'owner-1',
      settingValue: { requirePassword: false },
    });

    expect(result).toEqual({ requirePassword: false, hasValidGuestSession: true });
    expect(mocks.initializeDatabase).not.toHaveBeenCalled();
    expect(mocks.getDb).not.toHaveBeenCalled();
    expect(mocks.getSessionFromCookies).not.toHaveBeenCalled();
  });

  it('still checks owner and guest sessions when preloaded settings require a password', async () => {
    const result = await checkPublicAccessProtection({
      ownerProfileId: 'owner-1',
      settingValue: {
        requirePassword: true,
        passwordHash: 'test-only-password-hash',
        passwordHint: 'Hint',
      },
    });

    expect(result).toEqual({
      requirePassword: true,
      passwordHint: 'Hint',
      hasValidGuestSession: false,
    });
    expect(mocks.initializeDatabase).not.toHaveBeenCalled();
    expect(mocks.getSessionFromCookies).toHaveBeenCalledOnce();
    expect(mocks.getGuestSessionFromCookies).toHaveBeenCalledOnce();
  });

  it('preserves the database-backed fallback for callers without preloaded data', async () => {
    const settingsQuery = {
      select: vi.fn(() => settingsQuery),
      from: vi.fn(() => settingsQuery),
      where: vi.fn(() => settingsQuery),
      orderBy: vi.fn(() => settingsQuery),
      limit: vi.fn(async () => []),
    };
    mocks.getDb.mockReturnValue(settingsQuery);

    const result = await checkPublicAccessProtection();

    expect(result).toEqual({ requirePassword: false, hasValidGuestSession: true });
    expect(mocks.initializeDatabase).toHaveBeenCalledOnce();
    expect(mocks.getDb).toHaveBeenCalledOnce();
  });
});
