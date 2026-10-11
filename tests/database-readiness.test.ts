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

  it('keeps unknown driver failures generic and secret-free', async () => {
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
      databaseFailure: 'query_failed',
    }));
    expect(body).not.toContain('private-password');
  });

  it('classifies a direct host/network failure without exposing raw driver details', async () => {
    vi.stubEnv('DATABASE_URL', '');
    vi.stubEnv('POSTGRES_URL', 'postgres://private-user:private-password@db.example/test');
    vi.mocked(getDb).mockReturnValue({
      execute: vi.fn().mockRejectedValue(Object.assign(
        new Error('private-password should never be returned'),
        { code: 'ENOTFOUND' },
      )),
    } as unknown as ReturnType<typeof getDb>);

    const response = await GET();
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      status: 'not_ready',
      databaseConfigured: true,
      databaseReachable: false,
      databaseFailure: 'network_unreachable',
    });
  });

  it('classifies network errors wrapped by the ORM or driver', async () => {
    vi.stubEnv('DATABASE_URL', 'postgres://private-user:private-password@db.example/test');
    const nestedSocketError = Object.assign(new Error('getaddrinfo ENOTFOUND hidden-host'), {
      code: 'ENOTFOUND',
    });
    const wrappedError = Object.assign(new Error('query execution failed'), {
      cause: Object.assign(new Error('connection layer failed'), { cause: nestedSocketError }),
    });
    vi.mocked(getDb).mockReturnValue({
      execute: vi.fn().mockRejectedValue(wrappedError),
    } as unknown as ReturnType<typeof getDb>);

    const response = await GET();
    expect(response.status).toBe(503);
    const body = await response.text();
    expect(JSON.parse(body)).toMatchObject({
      databaseFailure: 'network_unreachable',
      databaseConfigured: true,
      databaseReachable: false,
    });
    expect(body).not.toContain('hidden-host');
    expect(body).not.toContain('private-password');
  });

  it('classifies PostgreSQL authentication errors inside a wrapped cause', async () => {
    vi.stubEnv('DATABASE_URL', 'postgres://private-user:private-password@db.example/test');
    const postgresError = Object.assign(new Error('password authentication failed for hidden-user'), {
      code: '28P01',
    });
    const wrappedError = Object.assign(new Error('query failed'), { cause: postgresError });
    vi.mocked(getDb).mockReturnValue({
      execute: vi.fn().mockRejectedValue(wrappedError),
    } as unknown as ReturnType<typeof getDb>);

    const response = await GET();
    expect(response.status).toBe(503);
    const body = await response.text();
    expect(JSON.parse(body)).toMatchObject({
      databaseFailure: 'authentication_or_database_config',
    });
    expect(body).not.toContain('hidden-user');
    expect(body).not.toContain('private-password');
  });

  it('recognizes postgres.js connection timeout codes', async () => {
    vi.stubEnv('DATABASE_URL', 'postgres://private-user:private-password@db.example/test');
    vi.mocked(getDb).mockReturnValue({
      execute: vi.fn().mockRejectedValue(Object.assign(
        new Error('connection timeout with private endpoint details'),
        { code: 'CONNECT_TIMEOUT' },
      )),
    } as unknown as ReturnType<typeof getDb>);

    const response = await GET();
    const body = await response.text();
    expect(JSON.parse(body)).toMatchObject({
      databaseFailure: 'network_unreachable',
    });
    expect(body).not.toContain('private endpoint details');
  });
});
