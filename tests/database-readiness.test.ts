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

  it('keeps unknown driver failures generic and secret-free when no safe code exists', async () => {
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

  it('classifies network failures inside Node AggregateError errors arrays', async () => {
    vi.stubEnv('DATABASE_URL', 'postgres://private-user:private-password@db.example/test');
    const socketError = Object.assign(new Error('private endpoint details'), { code: 'ECONNRESET' });
    const aggregate = new AggregateError([socketError], 'multiple socket connection attempts failed');
    const wrappedError = Object.assign(new Error('database query failed'), { originalError: aggregate });
    vi.mocked(getDb).mockReturnValue({
      execute: vi.fn().mockRejectedValue(wrappedError),
    } as unknown as ReturnType<typeof getDb>);

    const response = await GET();
    const body = await response.text();
    expect(JSON.parse(body)).toMatchObject({
      databaseFailure: 'network_unreachable',
    });
    expect(body).not.toContain('private endpoint details');
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
      databaseFailureCode: '28P01',
    });
    expect(body).not.toContain('hidden-user');
    expect(body).not.toContain('private-password');
  });

  it('classifies too-many-connections precisely and reports only its SQLSTATE', async () => {
    vi.stubEnv('DATABASE_URL', 'postgres://private-user:private-password@db.example/test');
    const databaseError = Object.assign(new Error('too many clients for the database'), {
      code: '53300',
    });
    const wrappedError = Object.assign(new Error('query execution failed'), { parent: databaseError });
    vi.mocked(getDb).mockReturnValue({
      execute: vi.fn().mockRejectedValue(wrappedError),
    } as unknown as ReturnType<typeof getDb>);

    const response = await GET();
    expect(response.status).toBe(503);
    const body = await response.text();
    expect(JSON.parse(body)).toMatchObject({
      databaseFailure: 'connection_capacity',
      databaseFailureCode: '53300',
    });
    expect(body).not.toContain('too many clients');
    expect(body).not.toContain('private-password');
  });

  it('does not mislabel every SQLSTATE class 53 error as a connection limit', async () => {
    vi.stubEnv('DATABASE_URL', 'postgres://private-user:private-password@db.example/test');
    const databaseError = Object.assign(new Error('private server details'), { code: '53100' });
    vi.mocked(getDb).mockReturnValue({
      execute: vi.fn().mockRejectedValue(databaseError),
    } as unknown as ReturnType<typeof getDb>);

    const response = await GET();
    const body = await response.text();
    expect(JSON.parse(body)).toMatchObject({
      databaseFailure: 'query_failed',
      databaseFailureCode: '53100',
    });
    expect(body).not.toContain('private server details');
    expect(body).not.toContain('private-password');
  });

  it('returns a safe SQLSTATE code when the failure cannot be categorized', async () => {
    vi.stubEnv('DATABASE_URL', 'postgres://private-user:private-password@db.example/test');
    const postgresError = Object.assign(
      new Error('secret query text and server-specific details'),
      { code: 'XX000' },
    );
    const wrappedError = Object.assign(new Error('query execution failed'), { parent: postgresError });
    vi.mocked(getDb).mockReturnValue({
      execute: vi.fn().mockRejectedValue(wrappedError),
    } as unknown as ReturnType<typeof getDb>);

    const response = await GET();
    const body = await response.text();
    expect(JSON.parse(body)).toMatchObject({
      databaseFailure: 'query_failed',
      databaseFailureCode: 'XX000',
    });
    expect(body).not.toContain('secret query text');
    expect(body).not.toContain('server-specific details');
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
