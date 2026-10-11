import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/health/ready/route';
import { getDb } from '@/lib/db';

vi.mock('@/lib/db', () => ({ getDb: vi.fn() }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.mocked(getDb).mockReset();
});

describe('production readiness endpoint', () => {
  it('reports missing database configuration without calling the database client', async () => {
    vi.stubEnv('DATABASE_URL', '');
    vi.stubEnv('POSTGRES_URL', '');
    vi.stubEnv('POSTGRES_PRISMA_URL', '');
    vi.stubEnv('DATABASE_URL_UNPOOLED', '');
    vi.stubEnv('POSTGRES_URL_NON_POOLING', '');

    const response = await GET();
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      status: 'not_ready',
      databaseConfigured: false,
      databaseReachable: false,
    });
    expect(getDb).not.toHaveBeenCalled();
    expect(response.headers.get('cache-control')).toContain('no-store');
  });

  it('reports readiness when the database answers and does not include connection details', async () => {
    vi.stubEnv('DATABASE_URL', 'postgres://private-user:private-password@db.example/test');
    vi.mocked(getDb).mockReturnValue({
      execute: vi.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }),
    } as unknown as ReturnType<typeof getDb>);

    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toBe(JSON.stringify({
      status: 'ready',
      databaseConfigured: true,
      databaseReachable: true,
    }));
    expect(body).not.toContain('private-password');
  });

  it('distinguishes an unreachable database without exposing the database error', async () => {
    vi.stubEnv('POSTGRES_URL', 'postgres://private-user:private-password@db.example/test');
    vi.mocked(getDb).mockReturnValue({
      execute: vi.fn().mockRejectedValue(new Error('private-password must never be returned')),
    } as unknown as ReturnType<typeof getDb>);

    const response = await GET();
    expect(response.status).toBe(503);
    const body = await response.text();
    expect(body).toBe(JSON.stringify({
      status: 'not_ready',
      databaseConfigured: true,
      databaseReachable: false,
    }));
    expect(body).not.toContain('private-password');
  });
});
