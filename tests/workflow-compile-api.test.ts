import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const mocks = vi.hoisted(() => {
  const validWorkflow = {
    id: 'workflow-1',
    profileId: 'owner-a',
    name: 'Compile test',
    description: 'A test graph',
    triggerType: 'overdue_report',
    nodesJson: [
      { id: 'start', type: 'trigger', title: 'Start', description: 'Start here' },
      { id: 'report', type: 'action', title: 'Report', description: 'Read-only report' },
    ],
    edgesJson: [{ id: 'edge-1', source: 'start', target: 'report' }],
    isActive: true,
    scheduleEnabled: false,
    createdAt: new Date('2026-10-10T00:00:00.000Z'),
    updatedAt: new Date('2026-10-10T00:00:00.000Z'),
  };
  const rows: Array<Record<string, unknown>> = [validWorkflow];
  const limit = vi.fn(async () => rows);
  const where = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ where }));
  const select = vi.fn(() => ({ from }));
  const initializeDatabase = vi.fn(async () => undefined);
  const getDb = vi.fn(() => ({ select }));
  const requireOwner = vi.fn(async () => ({
    authorized: true,
    profile: { id: 'owner-a', username: 'owner', displayName: 'Owner' },
  }));
  const assertValidOrigin = vi.fn(() => null);
  return { validWorkflow, rows, limit, where, from, select, initializeDatabase, getDb, requireOwner, assertValidOrigin };
});

vi.mock('@/lib/auth/guard', () => ({ requireOwner: mocks.requireOwner }));
vi.mock('@/lib/security/origin-guard', () => ({ assertValidOrigin: mocks.assertValidOrigin }));
vi.mock('@/lib/db', () => ({
  initializeDatabase: mocks.initializeDatabase,
  getDb: mocks.getDb,
}));

import { POST } from '@/app/api/admin/workflows/compile/route';

const makeRequest = (body: unknown) => new NextRequest('http://localhost/api/admin/workflows/compile', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

describe('workflow compilation API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rows.splice(0, mocks.rows.length, mocks.validWorkflow);
    mocks.requireOwner.mockResolvedValue({
      authorized: true,
      profile: { id: 'owner-a', username: 'owner', displayName: 'Owner' },
    } as never);
    mocks.assertValidOrigin.mockReturnValue(null);
  });

  it('compiles an owned workflow and reports the currently supported executor separately', async () => {
    const response = await POST(makeRequest({ workflowId: 'workflow-1' }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      workflowId: 'workflow-1',
      compilation: {
        valid: true,
        mode: 'dag',
        order: [{ id: 'start' }, { id: 'report' }],
      },
      executionCapability: 'bounded_trigger_executor',
    });
    expect(payload.note).toContain('không đồng nghĩa');
    expect(mocks.initializeDatabase).toHaveBeenCalledOnce();
    expect(mocks.where).toHaveBeenCalledOnce();
  });

  it('rejects malformed request bodies before database access', async () => {
    const response = await POST(makeRequest({ workflowId: ' ' }));
    expect(response.status).toBe(400);
    expect(mocks.initializeDatabase).not.toHaveBeenCalled();

    const invalidShape = await POST(new NextRequest('http://localhost/api/admin/workflows/compile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '[]',
    }));
    expect(invalidShape.status).toBe(400);
    expect(mocks.initializeDatabase).not.toHaveBeenCalled();
  });

  it('rejects invalid graphs without compiling an arbitrary action', async () => {
    mocks.rows.splice(0, mocks.rows.length, {
      ...mocks.validWorkflow,
      nodesJson: [
        { id: 'start', type: 'trigger', title: 'Start' },
        { id: 'a', type: 'action', title: 'A' },
        { id: 'b', type: 'action', title: 'B' },
      ],
      edgesJson: [
        { id: 'edge-a', source: 'start', target: 'a' },
        { id: 'edge-b', source: 'a', target: 'b' },
        { id: 'edge-c', source: 'b', target: 'a' },
      ],
    });

    const response = await POST(makeRequest({ workflowId: 'workflow-1' }));
    const payload = await response.json();
    expect(response.status).toBe(422);
    expect(payload.compilation.valid).toBe(false);
    expect(payload.compilation.errors.join(' ')).toContain('chu trình');
  });

  it('does not disclose or compile another owner’s workflow', async () => {
    mocks.rows.splice(0, mocks.rows.length);
    const response = await POST(makeRequest({ workflowId: 'workflow-other-owner' }));
    expect(response.status).toBe(404);
    expect(mocks.where).toHaveBeenCalledOnce();
  });

  it('does not access the database when authentication fails', async () => {
    mocks.requireOwner.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    } as never);

    const response = await POST(makeRequest({ workflowId: 'workflow-1' }));
    expect(response.status).toBe(401);
    expect(mocks.initializeDatabase).not.toHaveBeenCalled();
  });
});
