import { describe, expect, it, vi } from 'vitest';
import {
  isPublicInternetAddress,
  resolvePublicHttpTarget,
  OutboundTargetDeniedError,
  OutboundTargetResolutionError,
  OutboundRequestTimeoutError,
  requestPublicHttp,
  type AddressResolver,
} from '@/lib/security/http-target';

describe('HTTP tester outbound destination guard', () => {
  it.each([
    '0.0.0.0',
    '0.12.34.56',
    '10.0.0.1',
    '100.64.0.1',
    '100.127.255.254',
    '127.0.0.1',
    '169.254.169.254',
    '172.16.0.1',
    '172.31.255.254',
    '192.0.0.8',
    '192.0.2.1',
    '192.88.99.1',
    '192.168.1.1',
    '198.18.0.1',
    '198.51.100.2',
    '203.0.113.10',
    '224.0.0.1',
    '240.0.0.1',
    '255.255.255.255',
    '::',
    '::1',
    'fc00::1',
    'fd12:3456::1',
    'fe80::1',
    'ff02::1',
    '2001:db8::1',
    '2001:0::1',
    '2002::1',
    '3fff::1',
    '::ffff:127.0.0.1',
  ])('blocks non-public/special IP address %s', (address) => {
    expect(isPublicInternetAddress(address)).toBe(false);
  });

  it.each([
    '1.1.1.1',
    '8.8.8.8',
    '93.184.216.34',
    '208.67.222.222',
    '2001:4860:4860::8888',
    '2606:4700:4700::1111',
  ])('allows globally routable address %s', (address) => {
    expect(isPublicInternetAddress(address)).toBe(true);
  });

  it('pins a public DNS hostname to the exact validated IP and keeps TLS hostname identity', async () => {
    const resolver = vi.fn<AddressResolver>().mockResolvedValue([
      { address: '93.184.216.34', family: 4 },
      { address: '2606:4700:4700::1111', family: 6 },
    ]);

    const target = await resolvePublicHttpTarget(
      new URL('https://api.example.com:8443/v1/items?q=one'),
      resolver,
    );

    expect(resolver).toHaveBeenCalledOnce();
    expect(resolver).toHaveBeenCalledWith('api.example.com');
    expect(target).toEqual({
      address: '93.184.216.34',
      family: 4,
      servername: 'api.example.com',
      port: 8443,
      path: '/v1/items?q=one',
      protocol: 'https:',
      hostHeader: 'api.example.com:8443',
    });
  });

  it('rejects a mixed public/private DNS response instead of selecting only its public answer', async () => {
    const resolver = vi.fn<AddressResolver>().mockResolvedValue([
      { address: '93.184.216.34', family: 4 },
      { address: '10.1.2.3', family: 4 },
    ]);

    await expect(resolvePublicHttpTarget(new URL('https://api.example.com'), resolver))
      .rejects.toBeInstanceOf(OutboundTargetDeniedError);
  });

  it.each([
    'http://localhost/',
    'http://localhost./',
    'http://127.0.0.1/',
    'http://2130706433/',
    'http://0x7f000001/',
    'http://192.168.1.1/',
    'http://[::1]/',
    'http://printer/',
    'https://service.internal/',
    'https://db.local/',
    'https://host.home.arpa/',
  ])('denies internal or non-public literal destination %s before DNS lookup', async (rawUrl) => {
    const resolver = vi.fn<AddressResolver>().mockResolvedValue([
      { address: '93.184.216.34', family: 4 },
    ]);

    await expect(resolvePublicHttpTarget(new URL(rawUrl), resolver))
      .rejects.toBeInstanceOf(OutboundTargetDeniedError);
    expect(resolver).not.toHaveBeenCalled();
  });

  it('rejects URLs with embedded credentials or fragments', async () => {
    const resolver = vi.fn<AddressResolver>().mockResolvedValue([
      { address: '93.184.216.34', family: 4 },
    ]);

    await expect(resolvePublicHttpTarget(new URL('https://user:secret@api.example.com/'), resolver))
      .rejects.toBeInstanceOf(OutboundTargetDeniedError);
    await expect(resolvePublicHttpTarget(new URL('https://api.example.com/path#fragment'), resolver))
      .rejects.toBeInstanceOf(OutboundTargetDeniedError);
    expect(resolver).not.toHaveBeenCalled();
  });

  it('returns a safe resolution error when DNS fails instead of leaking resolver details', async () => {
    const resolver = vi.fn<AddressResolver>().mockRejectedValue(new Error('private resolver detail'));

    await expect(resolvePublicHttpTarget(new URL('https://api.example.com'), resolver))
      .rejects.toBeInstanceOf(OutboundTargetResolutionError);
    await expect(resolvePublicHttpTarget(new URL('https://api.example.com'), resolver))
      .rejects.toThrow('Không thể phân giải DNS của đích HTTP.');
  });

  it('accepts a globally-routable IPv6 literal without doing a DNS lookup', async () => {
    const resolver = vi.fn<AddressResolver>();

    const target = await resolvePublicHttpTarget(new URL('https://[2606:4700:4700::1111]/health'), resolver);

    expect(resolver).not.toHaveBeenCalled();
    expect(target.address).toBe('2606:4700:4700::1111');
    expect(target.family).toBe(6);
    expect(target.servername).toBeUndefined();
    expect(target.path).toBe('/health');
  });

  it('applies the total timeout to DNS resolution before opening a socket', async () => {
    const resolver = vi.fn<AddressResolver>(() => new Promise(() => undefined));

    await expect(requestPublicHttp({
      url: new URL('https://api.example.com/health'),
      method: 'GET',
      headers: {},
      timeoutMs: 20,
      resolver,
    })).rejects.toBeInstanceOf(OutboundRequestTimeoutError);

    expect(resolver).toHaveBeenCalledOnce();
  });
});
