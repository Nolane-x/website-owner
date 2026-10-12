import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSessionFromCookies: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => ({
  getSessionFromCookies: mocks.getSessionFromCookies,
}));
vi.mock('@/lib/db', () => ({
  getDb: vi.fn(),
  initializeDatabase: vi.fn(),
}));

import { GET } from '@/app/api/auth/me/route';
import { NextRequest } from 'next/server';

describe('auth/me outage semantics', () => {
  beforeEach(() => {
    mocks.getSessionFromCookies.mockReset();
  });

  it('returns 503 when session verification fails because the data service is unavailable', async () => {
    mocks.getSessionFromCookies.mockRejectedValueOnce(new Error('private connection string and credentials'));
    const response = await GET(new NextRequest('https://site.example/api/auth/me'));
    expect(response.status).toBe(503);
    expect(response.headers.get('Cache-Control')).toContain('no-store');
    const body = await response.json();
    expect(body.code).toBe('AUTH_SERVICE_UNAVAILABLE');
    expect(JSON.stringify(body)).not.toContain('private connection string');
  });

  it('keeps a confirmed missing or expired session as 401', async () => {
    mocks.getSessionFromCookies.mockResolvedValueOnce(null);
    const response = await GET(new NextRequest('https://site.example/api/auth/me'));
    expect(response.status).toBe(401);
    expect((await response.json()).code).not.toBe('AUTH_SERVICE_UNAVAILABLE');
  });
});
