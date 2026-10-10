import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createBackupIntegrity } from '@/lib/backup/integrity';
import { getDb, initializeDatabase } from '@/lib/db';

vi.mock('@/lib/auth/guard', () => ({
  requireOwner: vi.fn(async () => ({
    authorized: true,
    profile: { id: 'backup-preview-owner', username: 'owner', displayName: 'Owner' },
  })),
}));
vi.mock('@/lib/db', () => ({
  initializeDatabase: vi.fn(async () => undefined),
  getDb: vi.fn(() => { throw new Error('Database must not be opened during a preview.'); }),
}));
vi.mock('@/lib/security/origin-guard', () => ({ assertValidOrigin: vi.fn(() => null) }));
vi.mock('@/lib/security/audit', () => ({ logSecurityEvent: vi.fn(async () => undefined) }));

import { POST } from '@/app/api/admin/import/route';

function createRequest(payload: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/admin/import', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

describe('backup import preview', () => {
  beforeEach(() => vi.clearAllMocks());

  it('validates a signed-by-checksum payload without opening the database', async () => {
    const data = { contentItems: [{ id: 'content-a', title: 'A' }], pages: [] };
    const response = await POST(createRequest({
      version: '5.0.0',
      mode: 'preview',
      data,
      integrity: createBackupIntegrity(data),
    }));
    const body = await response.json() as { success: boolean; mode: string; integrity: string; totalRecords: number; recordCounts: Record<string, number> };
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.mode).toBe('preview');
    expect(body.integrity).toBe('verified');
    expect(body.totalRecords).toBe(1);
    expect(body.recordCounts.contentItems).toBe(1);
    expect(initializeDatabase).not.toHaveBeenCalled();
    expect(getDb).not.toHaveBeenCalled();
  });

  it('rejects a modified payload before any database work', async () => {
    const data = { contentItems: [{ id: 'content-a', title: 'Original' }] };
    const integrity = createBackupIntegrity(data);
    const response = await POST(createRequest({
      version: '5.0.0',
      mode: 'preview',
      data: { contentItems: [{ id: 'content-a', title: 'Modified' }] },
      integrity,
    }));
    const body = await response.json() as { error: string };
    expect(response.status).toBe(400);
    expect(body.error).toContain('Checksum SHA-256');
    expect(initializeDatabase).not.toHaveBeenCalled();
    expect(getDb).not.toHaveBeenCalled();
  });

  it('labels old backups as unverified instead of pretending they have a checksum', async () => {
    const response = await POST(createRequest({
      version: '5.0.0',
      mode: 'preview',
      data: { contentItems: [{ id: 'legacy-a', title: 'Legacy' }] },
    }));
    const body = await response.json() as { integrity: string; warnings: string[] };
    expect(response.status).toBe(200);
    expect(body.integrity).toBe('legacy-unverified');
    expect(body.warnings.some((warning) => warning.includes('không có manifest SHA-256'))).toBe(true);
    expect(initializeDatabase).not.toHaveBeenCalled();
    expect(getDb).not.toHaveBeenCalled();
  });

  it('rejects invalid modes and malformed arrays before database work', async () => {
    const invalidMode = await POST(createRequest({
      version: '5.0.0',
      mode: 'preview-and-delete',
      data: { contentItems: [] },
    }));
    expect(invalidMode.status).toBe(400);
    expect((await invalidMode.json() as { error: string }).error).toContain('Chế độ import');

    const malformedArray = await POST(createRequest({
      version: '5.0.0',
      mode: 'preview',
      data: { contentItems: { id: 'not-an-array' } },
    }));
    expect(malformedArray.status).toBe(400);
    expect((await malformedArray.json() as { error: string }).error).toContain('contentItems');

    expect(initializeDatabase).not.toHaveBeenCalled();
    expect(getDb).not.toHaveBeenCalled();
  });

  it('returns 400 for malformed JSON instead of a server error', async () => {
    const malformedRequest = new NextRequest('http://localhost/api/admin/import', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"version":',
    });
    const response = await POST(malformedRequest);
    expect(response.status).toBe(400);
    expect((await response.json() as { error: string }).error).toContain('JSON hợp lệ');
    expect(initializeDatabase).not.toHaveBeenCalled();
    expect(getDb).not.toHaveBeenCalled();
  });

  it('rejects invalid version types and non-object backup data', async () => {
    const invalidVersion = await POST(createRequest({
      version: 5,
      mode: 'preview',
      data: { contentItems: [] },
    }));
    expect(invalidVersion.status).toBe(400);

    const arrayData = await POST(createRequest({
      version: '5.0.0',
      mode: 'preview',
      data: [],
    }));
    expect(arrayData.status).toBe(400);
    expect(initializeDatabase).not.toHaveBeenCalled();
    expect(getDb).not.toHaveBeenCalled();
  });
});
