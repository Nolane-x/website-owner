import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSessionFromCookies: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => ({
  getSessionFromCookies: mocks.getSessionFromCookies,
}));

import { requireOwner } from '@/lib/auth/guard';

describe('requireOwner outage handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a sanitized no-store 503 when session verification throws', async () => {
    mocks.getSessionFromCookies.mockRejectedValueOnce(
      new Error('private Neon connection string, username and password'),
    );

    const result = await requireOwner();

    expect(result.authorized).toBe(false);
    if (result.authorized) throw new Error('Expected authorization to fail closed');
    expect(result.response.status).toBe(503);
    expect(result.response.headers.get('Cache-Control')).toContain('no-store');
    const body = await result.response.json();
    expect(body.code).toBe('AUTH_SERVICE_UNAVAILABLE');
    expect(JSON.stringify(body)).not.toContain('private Neon connection string');
    expect(JSON.stringify(body)).not.toContain('password');
  });

  it('keeps a confirmed absent or expired session as 401', async () => {
    mocks.getSessionFromCookies.mockResolvedValueOnce(null);

    const result = await requireOwner();

    expect(result.authorized).toBe(false);
    if (result.authorized) throw new Error('Expected authorization to fail');
    expect(result.response.status).toBe(401);
    expect((await result.response.json()).code).toBeUndefined();
  });
});
