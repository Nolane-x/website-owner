import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getDb, initializeDatabase } from '@/lib/db';
import { convertInboxItemToTask } from '@/lib/workflows/convert-inbox';

vi.mock('@/lib/auth/guard', () => ({
  requireOwner: vi.fn(async () => ({
    authorized: true,
    profile: { id: 'inbox-convert-owner', username: 'owner', displayName: 'Owner' },
  })),
}));
vi.mock('@/lib/db', () => ({
  initializeDatabase: vi.fn(async () => undefined),
  getDb: vi.fn(() => ({ mocked: true })),
}));
vi.mock('@/lib/security/origin-guard', () => ({ assertValidOrigin: vi.fn(() => null) }));
vi.mock('@/lib/workflows/convert-inbox', () => ({ convertInboxItemToTask: vi.fn() }));

import { POST } from '@/app/api/admin/inbox/[id]/convert/route';

function createRequest() {
  return new NextRequest('http://localhost/api/admin/inbox/inbox-1/convert', { method: 'POST' });
}

describe('atomic Inbox-to-Task API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the created task and confirms atomic conversion', async () => {
    const task = { id: 'task-1', title: 'Captured idea' } as never;
    vi.mocked(convertInboxItemToTask).mockResolvedValueOnce({
      status: 'created',
      task,
      inboxItemId: 'inbox-1',
    });

    const response = await POST(createRequest(), { params: Promise.resolve({ id: 'inbox-1' }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      success: true,
      status: 'created',
      inboxItemId: 'inbox-1',
      task: { id: 'task-1' },
      idempotentReplay: false,
    });
    expect(initializeDatabase).toHaveBeenCalledOnce();
    expect(convertInboxItemToTask).toHaveBeenCalledWith({ mocked: true }, 'inbox-convert-owner', 'inbox-1');
  });

  it('returns the already-linked task without creating a duplicate', async () => {
    vi.mocked(convertInboxItemToTask).mockResolvedValueOnce({
      status: 'reused',
      task: { id: 'task-existing' } as never,
      inboxItemId: 'inbox-1',
    });

    const response = await POST(createRequest(), { params: Promise.resolve({ id: 'inbox-1' }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.idempotentReplay).toBe(true);
    expect(body.task.id).toBe('task-existing');
    expect(body.message).toContain('không tạo trùng');
  });

  it('returns 404 when the source item is missing or not owned by the caller', async () => {
    vi.mocked(convertInboxItemToTask).mockResolvedValueOnce({
      status: 'not_found',
      task: null,
      inboxItemId: 'missing-item',
    });

    const response = await POST(createRequest(), { params: Promise.resolve({ id: 'missing-item' }) });
    expect(response.status).toBe(404);
    expect((await response.json()).error).toContain('Không tìm thấy');
  });

  it('rejects an unreasonable item ID before database work', async () => {
    const response = await POST(createRequest(), { params: Promise.resolve({ id: 'x'.repeat(201) }) });
    expect(response.status).toBe(400);
    expect(convertInboxItemToTask).not.toHaveBeenCalled();
    expect(initializeDatabase).not.toHaveBeenCalled();
    expect(getDb).not.toHaveBeenCalled();
  });
});
