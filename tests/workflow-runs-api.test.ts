import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => {
  const rows = [{
    id: 'run-1',
    profileId: 'owner-a',
    workflowId: 'workflow-1',
    triggerType: 'overdue_report',
    status: 'succeeded',
    inputJson: {},
    resultJson: { result: 'Đã kiểm tra 4 task.' },
    errorMessage: null,
    startedAt: new Date('2026-10-10T05:00:00.000Z'),
    finishedAt: new Date('2026-10-10T05:00:00.100Z'),
    durationMs: 100,
    createdAt: new Date('2026-10-10T05:00:00.000Z'),
  }];
  const limit = vi.fn(async () => rows);
  const orderBy = vi.fn(() => ({ limit }));
  const where = vi.fn(() => ({ orderBy }));
  const from = vi.fn(() => ({ where }));
  const select = vi.fn(() => ({ from }));
  const initializeDatabase = vi.fn(async () => undefined);
  const getDb = vi.fn(() => ({ select }));
  const reconcileStaleWorkflowRuns = vi.fn(async () => 0);
  const requireOwner = vi.fn(async () => ({
    authorized: true,
    profile: { id: 'owner-a', username: 'owner', displayName: 'Owner' },
  }));
  return { rows, limit, orderBy, where, from, select, initializeDatabase, getDb, requireOwner, reconcileStaleWorkflowRuns };
});

vi.mock('@/lib/auth/guard', () => ({ requireOwner: mocks.requireOwner }));
vi.mock('@/lib/db', () => ({
  initializeDatabase: mocks.initializeDatabase,
  getDb: mocks.getDb,
}));
vi.mock('@/lib/workflows/run-history', () => ({
  reconcileStaleWorkflowRuns: mocks.reconcileStaleWorkflowRuns,
}));

import { GET } from '@/app/api/admin/workflows/runs/route';

describe('workflow run history API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireOwner.mockResolvedValue({
      authorized: true,
      profile: { id: 'owner-a', username: 'owner', displayName: 'Owner' },
    } as never);
    mocks.limit.mockImplementation(async () => mocks.rows);
  });

  it('returns persisted run rows with a bounded default limit', async () => {
    const response = await GET(new NextRequest('http://localhost/api/admin/workflows/runs'));
    const body = await response.json() as { runs: Array<{ id: string; status: string }>; limit: number; hasMore: boolean };

    expect(response.status).toBe(200);
    expect(body.limit).toBe(20);
    expect(body.runs[0]).toMatchObject({ id: 'run-1', status: 'succeeded' });
    expect(body.hasMore).toBe(false);
    expect(mocks.initializeDatabase).toHaveBeenCalledOnce();
    expect(mocks.reconcileStaleWorkflowRuns).toHaveBeenCalledOnce();
    expect(mocks.reconcileStaleWorkflowRuns).toHaveBeenCalledWith(expect.anything(), 'owner-a');
    expect(mocks.select).toHaveBeenCalledOnce();
    expect(mocks.limit).toHaveBeenCalledWith(20);
  });

  it('supports workflow filtering and a validated custom limit', async () => {
    const response = await GET(new NextRequest('http://localhost/api/admin/workflows/runs?workflowId=workflow-1&limit=7'));
    expect(response.status).toBe(200);
    expect(mocks.limit).toHaveBeenCalledWith(7);
    expect(mocks.where).toHaveBeenCalledOnce();
  });

  it.each(['0', '-1', '1.5', 'abc', '101'])('rejects invalid limit %s before database access', async (limit) => {
    const response = await GET(new NextRequest(`http://localhost/api/admin/workflows/runs?limit=${encodeURIComponent(limit)}`));
    expect(response.status).toBe(400);
    expect(mocks.initializeDatabase).not.toHaveBeenCalled();
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it('rejects blank or too-long workflow filters', async () => {
    const blank = await GET(new NextRequest('http://localhost/api/admin/workflows/runs?workflowId=%20%20'));
    expect(blank.status).toBe(400);

    const long = await GET(new NextRequest(`http://localhost/api/admin/workflows/runs?workflowId=${'x'.repeat(201)}`));
    expect(long.status).toBe(400);
    expect(mocks.initializeDatabase).not.toHaveBeenCalled();
  });
});
