import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const routeMocks = vi.hoisted(() => ({
  rows: [] as unknown[],
  selectProjection: undefined as unknown,
  select: vi.fn((projection: unknown) => {
    routeMocks.selectProjection = projection;
    const chain: Record<string, unknown> = {};
    chain.from = vi.fn(() => chain);
    chain.where = vi.fn(() => chain);
    chain.orderBy = vi.fn(async () => routeMocks.rows);
    return chain;
  }),
  requireOwner: vi.fn(async () => ({ authorized: true, profile: { id: 'owner-1' } })),
}));

vi.mock('@/lib/auth/guard', () => ({ requireOwner: routeMocks.requireOwner }));
vi.mock('@/lib/db', () => ({
  initializeDatabase: vi.fn(async () => undefined),
  getDb: vi.fn(() => ({ select: routeMocks.select })),
}));

import { GET } from '@/app/api/admin/content/route';

describe('admin content list payload', () => {
  beforeEach(() => {
    routeMocks.rows = [{
      id: 'content-1',
      title: 'An article',
      description: 'Short description',
      contentPreview: 'Safe preview',
      visibility: 'PRIVATE',
      status: 'DRAFT',
      tags: ['test'],
    }];
    routeMocks.selectProjection = undefined;
    routeMocks.select.mockClear();
    routeMocks.requireOwner.mockResolvedValue({ authorized: true, profile: { id: 'owner-1' } });
  });

  it('projects summary columns instead of reading full bodies, binary covers, icons, and unfiltered metadata', async () => {
    const response = await GET(new NextRequest('https://site.example/api/admin/content'));
    expect(response.status).toBe(200);
    const projection = routeMocks.selectProjection as Record<string, unknown>;
    expect(projection).toBeDefined();
    expect(projection).toHaveProperty('contentPreview');
    expect(projection).not.toHaveProperty('content');
    expect(projection).not.toHaveProperty('icon');
    expect(projection).toHaveProperty('metadata');
    expect(projection).not.toHaveProperty('shareToken');
    const body = await response.json();
    expect(body.items[0]).toHaveProperty('contentPreview', 'Safe preview');
    expect(body.items[0]).not.toHaveProperty('content');
  });
});