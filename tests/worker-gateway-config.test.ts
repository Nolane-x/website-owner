import { afterEach, describe, expect, it, vi } from 'vitest';
import worker, { getConfiguredOrigin } from '../worker/src/index';

describe('Cloudflare gateway origin safety', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    undefined,
    '',
    'not a URL',
    'http://example.com',
    'https://your-domain.com',
    'https://user:password@example.com',
    'https://example.com/base/path',
    'https://example.com/?query=1',
    'https://example.com/#fragment',
  ])('rejects an unconfigured or unsafe origin: %s', (origin) => {
    expect(getConfiguredOrigin({ ORIGIN_URL: origin })).toBeNull();
  });

  it('accepts a valid HTTPS origin without URL path, credentials, query or fragment', () => {
    expect(getConfiguredOrigin({ ORIGIN_URL: 'https://caominhquan.vercel.app' })?.origin)
      .toBe('https://caominhquan.vercel.app');
  });

  it('fails closed with 503 and never fetches the placeholder upstream', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const response = await worker.fetch(
      new Request('https://webos-security-gateway.nolane-file.workers.dev/'),
      { ORIGIN_URL: 'https://your-domain.com', ENABLE_RATE_LIMIT: 'true' },
    );

    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.text()).toContain('chưa được cấu hình');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
