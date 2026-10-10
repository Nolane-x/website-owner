import { describe, expect, it } from 'vitest';
import { checkPublicApiRateLimit } from '@/lib/security/public-api-guard';
import { getClientIp, rateLimiter } from '@/lib/security/rate-limit';

describe('public API request limits', () => {
  it('uses the right-most valid forwarded IP instead of a caller-supplied left-most value', () => {
    const headers = new Headers({
      'x-forwarded-for': '198.51.100.44, 203.0.113.82',
      'x-real-ip': '192.0.2.20',
      'cf-connecting-ip': '192.0.2.21',
    });
    expect(getClientIp(headers)).toBe('203.0.113.82');
  });

  it('skips malformed forwarding entries and requires a valid IP address', () => {
    expect(getClientIp(new Headers({ 'x-forwarded-for': 'not-an-ip, 203.0.113.90' }))).toBe('203.0.113.90');
    expect(getClientIp(new Headers({ 'x-forwarded-for': 'attacker, invalid' }))).toBe('127.0.0.1');
    expect(getClientIp(new Headers({ 'x-real-ip': '2001:4860:4860::8888' }))).toBe('2001:4860:4860::8888');
  });

  it('returns a Retry-After 429 response after the route-specific budget is exhausted', () => {
    const ip = '192.0.2.121';
    const globalKey = 'public-api:global:' + ip;
    const scopeKey = 'public-api:rate-limit-test:' + ip;
    rateLimiter.reset(globalKey);
    rateLimiter.reset(scopeKey);
    const request = new Request('https://example.test/api/public/test', {
      headers: { 'x-forwarded-for': ip },
    });

    expect(checkPublicApiRateLimit(request, 'rate-limit-test', 2)).toBeNull();
    expect(checkPublicApiRateLimit(request, 'rate-limit-test', 2)).toBeNull();
    const response = checkPublicApiRateLimit(request, 'rate-limit-test', 2);
    expect(response?.status).toBe(429);
    expect(Number(response?.headers.get('retry-after'))).toBeGreaterThan(0);
    expect(response?.headers.get('cache-control')).toBe('no-store');
    expect(response?.headers.get('x-ratelimit-remaining')).toBe('0');
  });
});
