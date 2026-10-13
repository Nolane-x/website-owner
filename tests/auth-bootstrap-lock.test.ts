import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  events: [] as string[],
  getDb: vi.fn(),
  initializeDatabase: vi.fn(async () => undefined),
  assertValidOrigin: vi.fn(() => null),
  getClientIp: vi.fn(() => '192.0.2.10'),
  rateLimitCheck: vi.fn(() => ({ allowed: true, remaining: 4, resetAt: Date.now() + 300_000 })),
  hashPassword: vi.fn(async () => 'test-password-hash'),
  createSession: vi.fn(async () => ({
    token: 'test-session-token',
    expiresAt: new Date('2026-11-01T00:00:00.000Z'),
  })),
  setSessionCookie: vi.fn(async () => undefined),
}));

vi.mock('@/lib/db', () => ({
  getDb: mocks.getDb,
  initializeDatabase: mocks.initializeDatabase,
}));
vi.mock('@/lib/auth/password', () => ({ hashPassword: mocks.hashPassword }));
vi.mock('@/lib/auth/session', () => ({
  createSession: mocks.createSession,
  setSessionCookie: mocks.setSessionCookie,
}));
vi.mock('@/lib/security/origin-guard', () => ({
  assertValidOrigin: mocks.assertValidOrigin,
}));
vi.mock('@/lib/security/rate-limit', () => ({
  getClientIp: mocks.getClientIp,
  rateLimiter: { check: mocks.rateLimitCheck },
}));

import { POST } from '@/app/api/auth/bootstrap/route';
import { NextRequest } from 'next/server';

function selectBuilder(eventPrefix: string) {
  return {
    from: vi.fn(() => ({
      limit: vi.fn(async () => {
        mocks.events.push(`${eventPrefix}:limit`);
        return [];
      }),
    })),
  };
}

describe('owner bootstrap concurrency guard', () => {
  beforeEach(() => {
    mocks.events.length = 0;
    vi.clearAllMocks();
    mocks.initializeDatabase.mockResolvedValue(undefined);
    mocks.assertValidOrigin.mockReturnValue(null);
    mocks.getClientIp.mockReturnValue('192.0.2.10');
    mocks.rateLimitCheck.mockReturnValue({
      allowed: true,
      remaining: 4,
      resetAt: Date.now() + 300_000,
    });
    mocks.hashPassword.mockResolvedValue('test-password-hash');
    mocks.createSession.mockResolvedValue({
      token: 'test-session-token',
      expiresAt: new Date('2026-11-01T00:00:00.000Z'),
    });
    mocks.setSessionCookie.mockResolvedValue(undefined);

    const tx = {
      execute: vi.fn(async (query: { queryChunks?: unknown[] }) => {
        mocks.events.push('transaction:lock');
        const chunks = query.queryChunks ?? [];
        const serialized = chunks.map((chunk) => {
          if (typeof chunk === 'string') return chunk;
          if (chunk && typeof chunk === 'object' && 'value' in chunk) {
            return String((chunk as { value: unknown }).value);
          }
          return '';
        }).join(' ');
        expect(serialized).toContain('LOCK TABLE profiles IN EXCLUSIVE MODE');
        return {};
      }),
      select: vi.fn(() => {
        mocks.events.push('transaction:select');
        return selectBuilder('transaction');
      }),
      insert: vi.fn(() => ({
        values: vi.fn(async () => {
          mocks.events.push('transaction:insert');
          return undefined;
        }),
      })),
    };

    const db = {
      select: vi.fn(() => {
        mocks.events.push('preflight:select');
        return selectBuilder('preflight');
      }),
      transaction: vi.fn(async (work: (transaction: typeof tx) => Promise<unknown>) => {
        mocks.events.push('transaction:start');
        return work(tx);
      }),
    };
    mocks.getDb.mockReturnValue(db);
  });

  it('takes an exclusive profiles lock before the in-transaction owner check', async () => {
    const request = new NextRequest('https://site.example/api/auth/bootstrap', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'https://site.example',
      },
      body: JSON.stringify({
        username: 'first-owner',
        password: 'a-strong-test-password',
        displayName: 'First Owner',
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mocks.events.indexOf('transaction:lock')).toBeGreaterThan(-1);
    expect(mocks.events.indexOf('transaction:select')).toBeGreaterThan(
      mocks.events.indexOf('transaction:lock'),
    );
  });
});
