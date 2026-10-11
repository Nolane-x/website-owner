import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/public/explore/route';
import { checkPublicAccessProtection } from '@/lib/auth/guard';

vi.mock('@/lib/auth/guard', () => ({
  checkPublicAccessProtection: vi.fn(async () => ({ requirePassword: false, hasValidGuestSession: true })),
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.mocked(checkPublicAccessProtection).mockResolvedValue({ requirePassword: false, hasValidGuestSession: true });
});

describe('public explore feed API', () => {
  it('rejects unknown sources without making a network request', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await GET(new Request('https://site.example/api/public/explore?source=https://attacker.example'));
    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('does not bypass the site-wide guest-password gate', async () => {
    vi.mocked(checkPublicAccessProtection).mockResolvedValue({ requirePassword: true, hasValidGuestSession: false });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await GET(new Request('https://site.example/api/public/explore?source=models'));
    expect(response.status).toBe(403);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses a fixed upstream endpoint and enables server-side caching', async () => {
    const payload = [{ id: 'org/model', downloads: 12, tags: ['text-generation'] }];
    const captured: { input?: RequestInfo | URL; init?: RequestInit } = {};
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      captured.input = input;
      captured.init = init;
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const response = await GET(new Request('https://site.example/api/public/explore?source=models'));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0');
    expect(response.headers.get('vercel-cdn-cache-control')).toBe('no-store');
    expect(response.headers.get('x-explore-source')).toBe('models');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(new URL(String(captured.input)).hostname).toBe('huggingface.co');
    expect(captured.init).toMatchObject({ cache: 'force-cache' });
    expect((captured.init as RequestInit & { next?: { revalidate?: number } }).next?.revalidate).toBe(300);
    await expect(response.json()).resolves.toEqual([{
      id: 'org/model',
      downloads: 12,
      tags: ['text-generation'],
    }]);
  });

  it('compacts repository search payloads before sending them to visitors', async () => {
    const largePayload = {
      total_count: 90,
      items: Array.from({ length: 20 }, (_, index) => ({
        full_name: 'org/repo-' + index,
        html_url: 'https://github.com/org/repo-' + index,
        description: 'summary',
        stargazers_count: index,
        private: false,
        owner: { login: 'org', avatar_url: 'https://large.example/' + 'x'.repeat(1000) },
        topics: ['llm', 'ai'],
      })),
    };
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(largePayload), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })));

    const response = await GET(new Request('https://site.example/api/public/explore?source=repos'));
    const result = await response.json() as { total_count: number; items: Array<Record<string, unknown>> };
    expect(result.total_count).toBe(90);
    expect(result.items).toHaveLength(8);
    expect(result.items[0]).not.toHaveProperty('owner');
    expect(result.items[0]).not.toHaveProperty('private');
  });

  it('fails closed for upstream errors and never caches error responses', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('rate limit details', {
      status: 429,
      headers: { 'content-type': 'text/plain' },
    })));

    const response = await GET(new Request('https://site.example/api/public/explore?source=security'));
    expect(response.status).toBe(429);
    expect(response.headers.get('cache-control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual({
      error: 'Nhà cung cấp đang giới hạn yêu cầu. Dữ liệu đã lưu vẫn có thể được xem.',
    });
  });

  it('rejects non-JSON and oversized upstream responses', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('not json', {
      status: 200,
      headers: { 'content-type': 'text/html' },
    })));
    const nonJson = await GET(new Request('https://site.example/api/public/explore?source=news'));
    expect(nonJson.status).toBe(502);

    vi.stubGlobal('fetch', vi.fn(async () => new Response('[]', {
      status: 200,
      headers: { 'content-type': 'application/json', 'content-length': String(800 * 1024) },
    })));
    const oversized = await GET(new Request('https://site.example/api/public/explore?source=hle'));
    expect(oversized.status).toBe(502);
  });
});
