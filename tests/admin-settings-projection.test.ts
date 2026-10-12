import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { profiles } from '@/lib/db/schema';

const routeMocks = vi.hoisted(() => ({
  rows: [] as Array<Record<string, unknown>>,
  profileRows: [] as Array<Record<string, unknown>>,
  projection: undefined as unknown,
  currentTable: undefined as unknown,
  select: vi.fn((projection?: unknown) => {
    routeMocks.projection = projection;
    const chain: Record<string, unknown> = {};
    chain.from = vi.fn((table: unknown) => {
      routeMocks.currentTable = table;
      return chain;
    });
    chain.where = vi.fn(() => chain);
    chain.limit = vi.fn(() => chain);
    chain.then = (resolve: (value: Array<Record<string, unknown>>) => unknown, reject: (error: unknown) => unknown) =>
      Promise.resolve(routeMocks.currentTable === profiles ? routeMocks.profileRows : routeMocks.rows).then(resolve, reject);
    return chain;
  }),
  requireOwner: vi.fn(async () => ({ authorized: true, profile: { id: 'owner-1' } })),
}));

vi.mock('@/lib/auth/guard', () => ({ requireOwner: routeMocks.requireOwner }));
vi.mock('@/lib/db', () => ({
  initializeDatabase: vi.fn(async () => undefined),
  getDb: vi.fn(() => ({ select: routeMocks.select })),
}));

import { GET } from '@/app/api/admin/settings/route';

describe('admin settings key projection', () => {
  beforeEach(() => {
    routeMocks.rows = [
      { key: 'nav_config', valueJson: { items: [{ id: 'home', label: 'Home', href: '/admin' }] } },
      { key: 'theme_private', valueJson: { backgroundImage: 'data:image/jpeg;base64,very-large-payload' } },
    ];
    routeMocks.profileRows = [{
      id: 'owner-1',
      username: 'owner',
      displayName: 'Owner',
      avatarUrl: null,
      bio: null,
    }];
    routeMocks.projection = undefined;
    routeMocks.currentTable = undefined;
    routeMocks.select.mockClear();
    routeMocks.requireOwner.mockResolvedValue({ authorized: true, profile: { id: 'owner-1' } });
  });

  it('returns only requested settings keys and projects only key/value columns', async () => {
    // The SQL predicate filters in PostgreSQL; model that filtering in this DB mock.
    routeMocks.rows = [routeMocks.rows[0]];
    const response = await GET(new NextRequest('https://site.example/api/admin/settings?keys=nav_config'));
    expect(response.status).toBe(200);
    expect(routeMocks.projection).toBeDefined();
    expect(Object.keys(routeMocks.projection as Record<string, unknown>)).toEqual(['key', 'valueJson']);
    const body = await response.json();
    expect(Object.keys(body.settings)).toEqual(['nav_config']);
    expect(body.settings.nav_config.items).toHaveLength(1);
    expect(body.settings).not.toHaveProperty('theme_private');
    expect(body).not.toHaveProperty('profile');
  });

  it('keeps the full settings and profile response for the dedicated settings page', async () => {
    const response = await GET(new NextRequest('https://site.example/api/admin/settings'));
    expect(response.status).toBe(200);
    expect(routeMocks.projection).toBeUndefined();
    const body = await response.json();
    expect(body.settings).toHaveProperty('nav_config');
    expect(body.settings).toHaveProperty('theme_private');
    expect(body.profile).toHaveProperty('username', 'owner');
  });

  it('does not accidentally fall back to all settings for an empty key filter', async () => {
    const response = await GET(new NextRequest('https://site.example/api/admin/settings?keys=%20%20'));
    expect(response.status).toBe(200);
    expect(routeMocks.projection).toBeUndefined();
    const body = await response.json();
    expect(body.settings).toEqual({});
    expect(body).not.toHaveProperty('profile');
  });
});