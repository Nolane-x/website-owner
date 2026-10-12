import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const routeMocks = vi.hoisted(() => ({
  requireOwner: vi.fn(async () => ({
    authorized: true,
    profile: { id: 'dashboard-owner', username: 'dashboard-owner', displayName: 'Test Owner' },
    session: { id: 'session-1' },
  })),
}));

vi.mock('@/lib/auth/guard', () => ({ requireOwner: routeMocks.requireOwner }));

import { GET } from '@/app/api/admin/dashboard/route';
import { getDb, initializeDatabase } from '@/lib/db';
import { contentItems, pages, profiles } from '@/lib/db/schema';

describe('owner dashboard API', () => {
  beforeAll(async () => {
    await initializeDatabase();
    const db = getDb();
    await db.insert(profiles).values({
      id: 'dashboard-owner',
      username: 'dashboard-owner',
      displayName: 'Test Owner',
    }).onConflictDoNothing();
  });

  beforeEach(async () => {
    const db = getDb();
    await db.delete(contentItems);
    await db.delete(pages);

    await db.insert(contentItems).values([
      {
        id: 'dashboard-project',
        profileId: 'dashboard-owner',
        title: 'Featured project',
        slug: 'featured-project',
        type: 'project',
        status: 'PUBLISHED',
        isPinned: true,
        content: 'x'.repeat(50_000),
        createdAt: new Date('2026-10-10T10:00:00.000Z'),
      },
      {
        id: 'dashboard-resource',
        profileId: 'dashboard-owner',
        title: 'Useful resource',
        slug: 'useful-resource',
        type: 'resource',
        status: 'DRAFT',
        metadata: { provider: 'Example', url: 'https://example.test/resource' },
        content: 'y'.repeat(25_000),
        createdAt: new Date('2026-10-11T10:00:00.000Z'),
      },
      {
        id: 'dashboard-unsafe-resource',
        profileId: 'dashboard-owner',
        title: 'Unsafe resource',
        slug: 'unsafe-resource',
        type: 'resource',
        status: 'PUBLISHED',
        metadata: { provider: 'Unsafe', url: 'javascript:alert(1)' },
        createdAt: new Date('2026-10-12T10:00:00.000Z'),
      },
      {
        id: 'dashboard-deleted',
        profileId: 'dashboard-owner',
        title: 'Deleted content',
        slug: 'deleted-content',
        type: 'note',
        status: 'PUBLISHED',
        deletedAt: new Date('2026-10-12T11:00:00.000Z'),
      },
    ]);

    await db.insert(pages).values([
      {
        id: 'dashboard-page',
        profileId: 'dashboard-owner',
        title: 'Visible page',
        slug: 'visible-dashboard-page',
      },
      {
        id: 'dashboard-deleted-page',
        profileId: 'dashboard-owner',
        title: 'Deleted page',
        slug: 'deleted-dashboard-page',
        deletedAt: new Date('2026-10-12T11:00:00.000Z'),
      },
    ]);
  });

  afterAll(async () => {
    const db = getDb();
    await db.delete(contentItems);
    await db.delete(pages);
    await db.delete(profiles).where((await import('drizzle-orm')).eq(profiles.id, 'dashboard-owner'));
  });

  it('aggregates counts and returns only bounded summaries without content bodies', async () => {
    const response = await GET();
    expect(response.status).toBe(200);

    const payload = await response.json();
    expect(payload.profile.displayName).toBe('Test Owner');
    expect(payload.stats).toEqual({
      total: 3,
      published: 2,
      drafts: 1,
      projects: 1,
      resources: 2,
      pages: 1,
    });
    expect(payload.recentItems.length).toBeLessThanOrEqual(5);
    expect(payload.recentItems.every((item: Record<string, unknown>) => !('content' in item))).toBe(true);
    expect(payload.pinnedProjects).toHaveLength(1);
    expect(payload.recentResources).toHaveLength(2);
    expect(payload.recentResources[0].metadata).toEqual({ provider: 'Unsafe' });
    expect(payload.recentResources[1].metadata).toEqual({
      provider: 'Example',
      url: 'https://example.test/resource',
    });
  });

  it('requires a verified owner session', async () => {
    routeMocks.requireOwner.mockResolvedValueOnce({
      authorized: false,
      response: new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 }) as never,
    } as never);
    const response = await GET();
    expect(response.status).toBe(401);
  });
});
