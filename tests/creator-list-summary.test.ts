import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const routeMocks = vi.hoisted(() => ({
  rows: [] as unknown[],
  selectProjection: undefined as unknown,
  select: vi.fn((projection?: unknown) => {
    routeMocks.selectProjection = projection;
    const chain: Record<string, unknown> = {};
    chain.from = vi.fn(() => chain);
    chain.where = vi.fn(() => chain);
    chain.orderBy = vi.fn(async () => routeMocks.rows);
    chain.limit = vi.fn(async () => routeMocks.rows);
    return chain;
  }),
  requireOwner: vi.fn(async () => ({ authorized: true, profile: { id: 'owner-1' } })),
}));

vi.mock('@/lib/auth/guard', () => ({ requireOwner: routeMocks.requireOwner }));
vi.mock('@/lib/db', () => ({
  initializeDatabase: vi.fn(async () => undefined),
  getDb: vi.fn(() => ({ select: routeMocks.select })),
}));

import { GET } from '@/app/api/admin/creator/route';

describe('creator list payload', () => {
  beforeEach(() => {
    routeMocks.rows = [{
      id: 'draft-1',
      title: 'Long draft',
      stage: 'draft',
      channel: 'blog',
      bodyLength: 85000,
      tagsJson: ['test'],
      scheduledAt: null,
      updatedAt: '2026-10-11T00:00:00.000Z',
    }];
    routeMocks.selectProjection = undefined;
    routeMocks.select.mockClear();
    routeMocks.requireOwner.mockResolvedValue({ authorized: true, profile: { id: 'owner-1' } });
  });

  it('returns compact metadata without transferring draft body or outline', async () => {
    const response = await GET(new NextRequest('https://site.example/api/admin/creator'));
    expect(response.status).toBe(200);
    const projection = routeMocks.selectProjection as Record<string, unknown>;
    expect(projection).toHaveProperty('bodyLength');
    expect(projection).not.toHaveProperty('body');
    expect(projection).not.toHaveProperty('outline');
    const payload = await response.json();
    expect(payload.items[0]).toHaveProperty('bodyLength', 85000);
    expect(payload.items[0]).not.toHaveProperty('body');
  });

  it('returns a full draft only when a specific owner-scoped ID is requested', async () => {
    routeMocks.rows = [{
      id: 'draft-1', title: 'Long draft', stage: 'draft', channel: 'blog',
      body: 'full body', outline: 'full outline', tagsJson: [], profileId: 'owner-1',
    }];
    const response = await GET(new NextRequest('https://site.example/api/admin/creator?id=draft-1'));
    expect(response.status).toBe(200);
    expect(routeMocks.selectProjection).toBeUndefined();
    const payload = await response.json();
    expect(payload.item).toHaveProperty('body', 'full body');
    expect(payload.item).toHaveProperty('outline', 'full outline');
  });
});