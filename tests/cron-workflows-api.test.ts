import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  initializeDatabase: vi.fn(async () => undefined),
  getDb: vi.fn(() => ({ db: 'test-db' })),
  runDailyScheduledOverdueReports: vi.fn(async () => ({
    scheduleDate: '2026-10-10',
    scanned: 1,
    succeeded: 1,
    failed: 0,
    skippedAlreadyRun: 0,
  })),
}));

vi.mock('@/lib/db', () => ({
  initializeDatabase: mocks.initializeDatabase,
  getDb: mocks.getDb,
}));
vi.mock('@/lib/workflows/scheduler', () => ({
  runDailyScheduledOverdueReports: mocks.runDailyScheduledOverdueReports,
}));

import { GET } from '@/app/api/cron/workflows/route';

const makeRequest = (authorization?: string) => new NextRequest(
  'https://example.test/api/cron/workflows',
  authorization ? { headers: { authorization } } : undefined,
);

describe('cron workflow endpoint security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('CRON_SECRET', 'test-cron-secret-with-32-characters');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns 503 without configured production secret', async () => {
    vi.stubEnv('CRON_SECRET', '');
    const response = await GET(makeRequest('Bearer test-cron-secret-with-32-characters'));
    expect(response.status).toBe(503);
    expect(mocks.initializeDatabase).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated and wrong-secret requests before database access', async () => {
    const missing = await GET(makeRequest());
    const wrong = await GET(makeRequest('Bearer wrong-secret-value-that-is-long-enough'));
    expect(missing.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(mocks.initializeDatabase).not.toHaveBeenCalled();
  });

  it('runs the scheduler only after validating the bearer secret', async () => {
    const response = await GET(makeRequest('Bearer test-cron-secret-with-32-characters'));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toMatchObject({ ok: true, scheduleDate: '2026-10-10', succeeded: 1 });
    expect(mocks.initializeDatabase).toHaveBeenCalledOnce();
    expect(mocks.getDb).toHaveBeenCalledOnce();
    expect(mocks.runDailyScheduledOverdueReports).toHaveBeenCalledWith({ db: 'test-db' });
  });
});
