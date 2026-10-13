import { describe, expect, it } from 'vitest';
import nextConfig from '../next.config';

describe('global content security policy', () => {
  it('blocks eval-based script execution and denies framing', async () => {
    const headers = await nextConfig.headers?.();
    const globalHeaders = headers?.find((entry) => entry.source === '/(.*)')?.headers ?? [];
    const policy = globalHeaders.find((entry) => entry.key.toLowerCase() === 'content-security-policy')?.value ?? '';

    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).not.toContain("'unsafe-eval'");
  });

  it('retains baseline browser security headers', async () => {
    const headers = await nextConfig.headers?.();
    const globalHeaders = headers?.find((entry) => entry.source === '/(.*)')?.headers ?? [];
    const headerMap = new Map(globalHeaders.map((entry) => [entry.key.toLowerCase(), entry.value]));

    expect(headerMap.get('x-content-type-options')).toBe('nosniff');
    expect(headerMap.get('x-frame-options')).toBe('DENY');
    expect(headerMap.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
  });
});
