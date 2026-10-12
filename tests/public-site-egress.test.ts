import { describe, expect, it, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  profileRows: [{
    id: 'owner-1',
    displayName: 'Owner',
    bio: 'Profile bio',
    avatarUrl: null,
  }],
  settingsRows: [] as Array<{ key: string; valueJson: unknown }>,
  queryIndex: 0,
  select: vi.fn(() => {
    mocks.queryIndex += 1;
    const queryNumber = mocks.queryIndex;
    const chain: Record<string, unknown> = {};
    chain.from = vi.fn(() => chain);
    chain.where = vi.fn(() => chain);
    chain.orderBy = vi.fn(() => chain);
    chain.limit = vi.fn(() => chain);
    chain.then = (resolve: (rows: unknown[]) => unknown, reject: (error: unknown) => unknown) => {
      const rows = queryNumber === 1
        ? mocks.profileRows
        : mocks.settingsRows.filter((row) => row.key === 'public_navigation' || row.key === 'public_access');
      return Promise.resolve(rows).then(resolve, reject);
    };
    return chain;
  }),
}));

vi.mock('@/lib/db', () => ({
  getDb: vi.fn(() => ({ select: mocks.select })),
  initializeDatabase: vi.fn(async () => undefined),
}));
vi.mock('@/lib/db/seed', () => ({ ensureSeedData: vi.fn(async () => undefined) }));
vi.mock('@/lib/auth/guard', () => ({
  checkPublicAccessProtection: vi.fn(async () => ({
    requirePassword: false,
    hasValidGuestSession: true,
  })),
}));
vi.mock('@/lib/security/public-api-guard', () => ({
  checkPublicApiRateLimit: vi.fn(() => null),
}));

import { GET, PUBLIC_SITE_SETTING_KEYS } from '@/app/api/public/site/route';

describe('public site API egress', () => {
  beforeEach(() => {
    mocks.queryIndex = 0;
    mocks.select.mockClear();
    mocks.settingsRows = [
      { key: 'public_navigation', valueJson: { items: [{ id: 'home', label: 'Home', href: '/' }] } },
      { key: 'public_access', valueJson: { requirePassword: false } },
      { key: 'theme_public', valueJson: { backgroundImage: 'data:image/jpeg;base64,' + 'A'.repeat(200_000) } },
    ];
  });

  it('does not fetch or return unused theme_public JSON on public visits', async () => {
    expect(PUBLIC_SITE_SETTING_KEYS).toEqual(['public_navigation', 'public_access']);
    const response = await GET(new Request('https://site.example/api/public/site'));
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.navigation.items).toHaveLength(1);
    expect(payload).not.toHaveProperty('theme');
    expect(JSON.stringify(payload)).not.toContain('backgroundImage');
    expect(JSON.stringify(payload)).not.toContain('A'.repeat(500));
  });
});