import { describe, expect, it } from 'vitest';
import { DATABASE_URL_KEYS, resolveDatabaseUrl } from '@/lib/db/config';

describe('PostgreSQL environment resolution', () => {
  it('prefers the documented DATABASE_URL and trims surrounding whitespace', () => {
    expect(resolveDatabaseUrl({
      DATABASE_URL: '  postgres://primary/db  ',
      POSTGRES_URL: 'postgres://secondary/db',
    })).toEqual({ url: 'postgres://primary/db', source: 'DATABASE_URL' });
  });

  it.each([
    ['POSTGRES_URL', 'postgres://pooled/db'],
    ['POSTGRES_PRISMA_URL', 'postgres://prisma/db'],
    ['DATABASE_URL_UNPOOLED', 'postgres://unpooled/db'],
    ['POSTGRES_URL_NON_POOLING', 'postgres://direct/db'],
  ] as const)('recognizes the supported deployment alias %s', (key, url) => {
    expect(resolveDatabaseUrl({ [key]: url })).toEqual({ url, source: key });
  });

  it('ignores blank values and returns no URL when no provider variable exists', () => {
    expect(DATABASE_URL_KEYS.length).toBeGreaterThanOrEqual(2);
    expect(resolveDatabaseUrl({
      DATABASE_URL: '  ',
      POSTGRES_URL: undefined,
      POSTGRES_URL_NON_POOLING: '',
    })).toEqual({ url: null, source: null });
  });

  it('does not leak values from unrelated environment variables', () => {
    expect(resolveDatabaseUrl({
      DATABASE_PASSWORD: 'must-not-be-returned',
      DATABASE_HOST: 'db.internal',
    })).toEqual({ url: null, source: null });
  });
});
