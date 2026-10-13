import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  initializeDatabase: vi.fn(async () => undefined),
  checkPublicAccessProtection: vi.fn(async () => ({
    requirePassword: false,
    hasValidGuestSession: true,
  })),
  checkPublicApiRateLimit: vi.fn(() => null),
}));

vi.mock('@/lib/db', () => ({
  getDb: vi.fn(() => ({ select: mocks.select })),
  initializeDatabase: mocks.initializeDatabase,
}));
vi.mock('@/lib/auth/guard', () => ({
  checkPublicAccessProtection: mocks.checkPublicAccessProtection,
}));
vi.mock('@/lib/security/public-api-guard', () => ({
  checkPublicApiRateLimit: mocks.checkPublicApiRateLimit,
}));

import { GET as getPublicContent } from '@/app/api/public/content/[slug]/route';
import { GET as getPublicPage } from '@/app/api/public/pages/[slug]/route';
import { GET as getUnlisted } from '@/app/api/public/unlisted/[shareToken]/route';
import {
  MAX_PUBLIC_CONTENT_BYTES,
  MAX_PUBLIC_PAGE_BLOCK_BYTES,
} from '@/lib/security/public-egress-limits';

function queryBuilder(rows: unknown[]) {
  const chain: Record<string, unknown> = {};
  chain.from = vi.fn(() => chain);
  chain.where = vi.fn(() => chain);
  chain.orderBy = vi.fn(() => chain);
  chain.limit = vi.fn(async () => rows);
  chain.then = (resolve: (value: unknown[]) => unknown, reject: (reason: unknown) => unknown) =>
    Promise.resolve(rows).then(resolve, reject);
  return chain;
}

function setQueryRows(...rowSets: unknown[][]) {
  let index = 0;
  mocks.select.mockImplementation(() => queryBuilder(rowSets[index++] ?? []));
}

describe('public detail database egress limits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.initializeDatabase.mockResolvedValue(undefined);
    mocks.checkPublicAccessProtection.mockResolvedValue({
      requirePassword: false,
      hasValidGuestSession: true,
    });
    mocks.checkPublicApiRateLimit.mockReturnValue(null);
  });

  it('refuses oversized published article content without returning the body', async () => {
    setQueryRows([{
      id: 'content-1',
      title: 'Large article',
      slug: 'large-article',
      content: null,
      contentBytes: MAX_PUBLIC_CONTENT_BYTES + 1,
      metadata: {},
    }]);

    const response = await getPublicContent(
      new NextRequest('https://site.example/api/public/content/large-article'),
      { params: Promise.resolve({ slug: 'large-article' }) },
    );

    expect(response.status).toBe(413);
    const body = await response.json();
    expect(body.code).toBe('PUBLIC_CONTENT_TOO_LARGE');
    expect(JSON.stringify(body)).not.toContain('contentBytes');
    expect(response.headers.get('Cache-Control')).toContain('no-store');
  });

  it('refuses a Canvas page whose combined block JSON exceeds the aggregate budget', async () => {
    setQueryRows(
      [{ id: 'page-1', title: 'Large page', slug: 'large-page', description: null, isFeatured: false, publishedAt: null }],
      [{
        id: 'block-1',
        blockType: 'gallery',
        sortOrder: 0,
        totalBlockBytes: MAX_PUBLIC_PAGE_BLOCK_BYTES + 1,
        contentJson: {},
        settingsJson: {},
      }],
    );

    const response = await getPublicPage(
      new NextRequest('https://site.example/api/public/pages/large-page'),
      { params: Promise.resolve({ slug: 'large-page' }) },
    );

    expect(response.status).toBe(413);
    expect((await response.json()).code).toBe('PUBLIC_PAGE_TOO_LARGE');
    expect(response.headers.get('Cache-Control')).toContain('no-store');
  });

  it('enforces the same article body limit for an unlisted share token', async () => {
    setQueryRows([{
      id: 'content-2',
      title: 'Large shared article',
      slug: 'large-shared-article',
      content: null,
      contentBytes: String(MAX_PUBLIC_CONTENT_BYTES + 1),
      metadata: {},
    }]);

    const response = await getUnlisted(
      new NextRequest('https://site.example/api/public/unlisted/12345678'),
      { params: Promise.resolve({ shareToken: '12345678' }) },
    );

    expect(response.status).toBe(413);
    expect((await response.json()).code).toBe('PUBLIC_CONTENT_TOO_LARGE');
    expect(response.headers.get('Cache-Control')).toContain('no-store');
  });

  it('enforces the same aggregate block limit for an unlisted Canvas page', async () => {
    setQueryRows(
      [],
      [{ id: 'page-2', profileId: 'owner-1', title: 'Shared page', slug: 'shared-page', description: null, isFeatured: false, publishedAt: null }],
      [{
        id: 'block-2',
        blockType: 'gallery',
        sortOrder: 0,
        totalBlockBytes: String(MAX_PUBLIC_PAGE_BLOCK_BYTES + 1),
        contentJson: {},
        settingsJson: {},
      }],
    );

    const response = await getUnlisted(
      new NextRequest('https://site.example/api/public/unlisted/abcdefgh'),
      { params: Promise.resolve({ shareToken: 'abcdefgh' }) },
    );

    expect(response.status).toBe(413);
    expect((await response.json()).code).toBe('PUBLIC_PAGE_TOO_LARGE');
    expect(response.headers.get('Cache-Control')).toContain('no-store');
  });
});
