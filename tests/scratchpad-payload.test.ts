import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  rows: [] as Array<Record<string, unknown>>,
  projection: undefined as unknown,
  select: vi.fn((projection?: unknown) => {
    mocks.projection = projection;
    const chain: Record<string, unknown> = {};
    chain.from = vi.fn(() => chain);
    chain.where = vi.fn(() => chain);
    chain.orderBy = vi.fn(() => chain);
    chain.limit = vi.fn(() => chain);
    chain.then = (
      resolve: (rows: Array<Record<string, unknown>>) => unknown,
      reject: (error: unknown) => unknown,
    ) => Promise.resolve(mocks.rows).then(resolve, reject);
    return chain;
  }),
  requireOwner: vi.fn(async () => ({ authorized: true, profile: { id: 'owner-1' } })),
}));

vi.mock('@/lib/auth/guard', () => ({ requireOwner: mocks.requireOwner }));
vi.mock('@/lib/db', () => ({
  initializeDatabase: vi.fn(async () => undefined),
  getDb: vi.fn(() => ({ select: mocks.select })),
}));

import { GET as listScratchpads } from '@/app/api/admin/scratchpads/route';
import { GET as getScratchpad } from '@/app/api/admin/scratchpads/[id]/route';

describe('scratchpad API payloads', () => {
  beforeEach(() => {
    mocks.rows = [{
      id: 'note-1',
      title: 'Research notes',
      content: 'P'.repeat(180),
      color: 'amber',
      isPinned: false,
      sortOrder: 0,
      createdAt: '2026-10-12T00:00:00.000Z',
      updatedAt: '2026-10-12T00:00:00.000Z',
    }];
    mocks.projection = undefined;
    mocks.select.mockClear();
    mocks.requireOwner.mockResolvedValue({ authorized: true, profile: { id: 'owner-1' } });
  });

  it('returns only sidebar fields and a bounded preview in the list endpoint', async () => {
    const response = await listScratchpads();
    expect(response.status).toBe(200);
    const projection = mocks.projection as Record<string, unknown>;
    expect(Object.keys(projection)).toEqual([
      'id', 'title', 'content', 'color', 'isPinned', 'sortOrder', 'createdAt', 'updatedAt',
    ]);
    expect(projection).not.toHaveProperty('profileId');
    const body = await response.json();
    expect(body.scratchpads[0].content).toHaveLength(180);
    expect(body.scratchpads[0]).not.toHaveProperty('profileId');
  });

  it('loads the full body only for the selected owner-scoped note ID', async () => {
    const fullBody = 'FULL-NOTE-CONTENT-'.repeat(1000);
    mocks.rows = [{
      id: 'note-1',
      profileId: 'owner-1',
      title: 'Research notes',
      content: fullBody,
      color: 'amber',
      isPinned: false,
      sortOrder: 0,
      createdAt: '2026-10-12T00:00:00.000Z',
      updatedAt: '2026-10-12T00:00:00.000Z',
    }];

    const response = await getScratchpad(
      new NextRequest('https://site.example/api/admin/scratchpads/note-1'),
      { params: Promise.resolve({ id: 'note-1' }) },
    );
    expect(response.status).toBe(200);
    expect(mocks.projection).toBeUndefined();
    const body = await response.json();
    expect(body.scratchpad.content).toBe(fullBody);
  });
});