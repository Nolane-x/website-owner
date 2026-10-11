import { describe, expect, it } from 'vitest';
import { getPublicApiCacheHeaders } from '@/lib/security/public-api-cache';

describe('public API response caching safety', () => {
  it('disables browser, downstream CDN and Vercel CDN caches for public reads', () => {
    const headers = getPublicApiCacheHeaders({ requirePassword: false });
    expect(headers['Cache-Control']).toBe('private, no-store, max-age=0');
    expect(headers['CDN-Cache-Control']).toBe('no-store');
    expect(headers['Vercel-CDN-Cache-Control']).toBe('no-store');
  });

  it('keeps all cache layers disabled when guest-password protection is enabled', () => {
    const headers = getPublicApiCacheHeaders({ requirePassword: true });
    expect(headers['Cache-Control']).toBe('private, no-store, max-age=0');
    expect(headers['CDN-Cache-Control']).toBe('no-store');
    expect(headers['Vercel-CDN-Cache-Control']).toBe('no-store');
  });

  it('does not allow toggling the access mode to leave an old public response reusable', () => {
    const before = getPublicApiCacheHeaders({ requirePassword: false });
    const after = getPublicApiCacheHeaders({ requirePassword: true });
    expect(before).toEqual(after);
  });
});
