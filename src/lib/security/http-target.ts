import { lookup as dnsLookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import * as http from 'node:http';
import * as https from 'node:https';
import type { IncomingMessage } from 'node:http';

export type AddressRecord = { address: string; family: 4 | 6 };
export type AddressResolver = (hostname: string) => Promise<AddressRecord[]>;

export class OutboundTargetDeniedError extends Error {
  constructor(message = 'Bảo mật: Đích yêu cầu không thuộc mạng Internet công cộng được phép.') {
    super(message);
    this.name = 'OutboundTargetDeniedError';
  }
}

export class OutboundTargetResolutionError extends Error {
  constructor() {
    super('Không thể phân giải DNS của đích HTTP.');
    this.name = 'OutboundTargetResolutionError';
  }
}

export class OutboundRequestTimeoutError extends Error {
  constructor() {
    super('Yêu cầu tới máy chủ đích đã hết thời gian chờ.');
    this.name = 'OutboundRequestTimeoutError';
  }
}

export class OutboundResponseTooLargeError extends Error {
  constructor() {
    super('Phản hồi vượt quá giới hạn cho phép (5MB).');
    this.name = 'OutboundResponseTooLargeError';
  }
}

export class OutboundPayloadTooLargeError extends Error {
  constructor() {
    super('Dữ liệu gửi đi vượt quá giới hạn cho phép (1MB).');
    this.name = 'OutboundPayloadTooLargeError';
  }
}

export class OutboundInvalidHeaderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OutboundInvalidHeaderError';
  }
}

const IPV4_NON_PUBLIC_RANGES: ReadonlyArray<readonly [string, number]> = [
  ['0.0.0.0', 8],       // This network / unspecified
  ['10.0.0.0', 8],      // Private
  ['100.64.0.0', 10],   // Carrier-grade NAT
  ['127.0.0.0', 8],     // Loopback
  ['169.254.0.0', 16],  // Link-local / cloud metadata
  ['172.16.0.0', 12],   // Private
  ['192.0.0.0', 24],    // IETF protocol assignments
  ['192.0.2.0', 24],    // Documentation
  ['192.88.99.0', 24],  // Deprecated 6to4 relay
  ['192.168.0.0', 16],  // Private
  ['198.18.0.0', 15],   // Benchmarking
  ['198.51.100.0', 24], // Documentation
  ['203.0.113.0', 24],  // Documentation
  ['224.0.0.0', 4],     // Multicast
  ['240.0.0.0', 4],     // Reserved / broadcast
];

function ipv4ToBigInt(address: string): bigint | null {
  const parts = address.split('.');
  if (parts.length !== 4) return null;
  if (parts.some((part) => !/^\d{1,3}$/.test(part))) return null;
  const octets = parts.map(Number);
  if (octets.some((part) => part < 0 || part > 255)) return null;
  return octets.reduce((value, octet) => (value << BigInt(8)) | BigInt(octet), BigInt(0));
}

function isIPv4InRange(address: bigint, networkText: string, prefixLength: number): boolean {
  const network = ipv4ToBigInt(networkText);
  if (network === null) return false;
  const shift = BigInt(32 - prefixLength);
  return (address >> shift) === (network >> shift);
}

function ipv6ToBigInt(address: string): bigint | null {
  const normalized = address.toLowerCase();
  // Reject scoped and IPv4-embedded forms here; neither is needed for public routing.
  if (normalized.includes('%') || normalized.includes('.')) return null;

  const halves = normalized.split('::');
  if (halves.length > 2) return null;

  const left = halves[0] ? halves[0].split(':') : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const missingGroups = 8 - left.length - right.length;
  if (missingGroups < 0 || (halves.length === 1 && missingGroups !== 0)) return null;

  const groups = [...left, ...Array(missingGroups).fill('0'), ...right];
  if (groups.length !== 8 || groups.some((part) => !/^[0-9a-f]{1,4}$/.test(part))) return null;

  return groups.reduce((value, group) => (value << BigInt(16)) | BigInt('0x' + group), BigInt(0));
}

function isIPv6InRange(address: bigint, network: bigint, prefixLength: number): boolean {
  const shift = BigInt(128 - prefixLength);
  return (address >> shift) === (network >> shift);
}

/**
 * Conservatively allows only globally routable unicast addresses.
 * Special-purpose, private, link-local, documentation, multicast and transition ranges fail closed.
 */
export function isPublicInternetAddress(input: string): boolean {
  const address = input.trim().replace(/^\[|\]$/g, '');
  const family = isIP(address);

  if (family === 4) {
    const numericAddress = ipv4ToBigInt(address);
    if (numericAddress === null) return false;
    return !IPV4_NON_PUBLIC_RANGES.some(([network, prefix]) =>
      isIPv4InRange(numericAddress, network, prefix)
    );
  }

  if (family === 6) {
    const numericAddress = ipv6ToBigInt(address);
    if (numericAddress === null) return false;

    // Only 2000::/3 global-unicast space is eligible.
    if ((numericAddress >> BigInt(125)) !== BigInt(1)) return false;

    const specialIPv6Ranges: ReadonlyArray<readonly [bigint, number]> = [
      [BigInt('0x20010000000000000000000000000000'), 23], // IETF special-purpose assignments, incl. Teredo/ORCHID
      [BigInt('0x20010db8000000000000000000000000'), 32], // Documentation
      [BigInt('0x20020000000000000000000000000000'), 16], // 6to4 transition
      [BigInt('0x3fff0000000000000000000000000000'), 20], // Documentation
    ];
    return !specialIPv6Ranges.some(([network, prefix]) =>
      isIPv6InRange(numericAddress, network, prefix)
    );
  }

  return false;
}

const defaultResolver: AddressResolver = async (hostname) => {
  const records = await dnsLookup(hostname, { all: true, verbatim: true });
  return records
    .filter((record): record is typeof record & { family: 4 | 6 } => record.family === 4 || record.family === 6)
    .map((record) => ({ address: record.address, family: record.family }));
};

export interface ResolvedPublicHttpTarget {
  /** The exact IP address the socket must connect to, not the hostname. */
  address: string;
  family: 4 | 6;
  /** Omitted for IP-literal URLs; otherwise retained for TLS certificate verification/SNI. */
  servername?: string;
  port: number;
  path: string;
  protocol: 'http:' | 'https:';
  hostHeader: string;
}

function normalizeHostname(hostname: string): string {
  return hostname.replace(/^\[|\]$/g, '').toLowerCase().replace(/\.+$/, '');
}

function isLocalHostname(hostname: string): boolean {
  return hostname === 'localhost'
    || hostname.endsWith('.localhost')
    || hostname.endsWith('.local')
    || hostname.endsWith('.internal')
    || hostname.endsWith('.lan')
    || hostname.endsWith('.home')
    || hostname.endsWith('.home.arpa')
    || hostname.endsWith('.test')
    || hostname.endsWith('.invalid')
    || !hostname.includes('.');
}

/**
 * Resolves once, rejects the entire DNS answer if any address is non-public,
 * then returns a pinned IP so the connector does not perform a second DNS lookup.
 */
export async function resolvePublicHttpTarget(
  url: URL,
  resolver: AddressResolver = defaultResolver,
): Promise<ResolvedPublicHttpTarget> {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new OutboundTargetDeniedError('Chỉ hỗ trợ HTTP hoặc HTTPS.');
  }
  if (url.username || url.password) {
    throw new OutboundTargetDeniedError('Không nhúng username/password trong URL đích.');
  }
  if (url.hash) {
    throw new OutboundTargetDeniedError('URL đích không được chứa fragment.');
  }

  const hostname = normalizeHostname(url.hostname);
  if (!hostname || hostname.includes('%')) {
    throw new OutboundTargetDeniedError();
  }

  const literalFamily = isIP(hostname);
  let addresses: AddressRecord[];

  if (literalFamily) {
    if (!isPublicInternetAddress(hostname)) throw new OutboundTargetDeniedError();
    addresses = [{ address: hostname, family: literalFamily as 4 | 6 }];
  } else {
    if (isLocalHostname(hostname)) throw new OutboundTargetDeniedError();
    try {
      addresses = await resolver(hostname);
    } catch {
      throw new OutboundTargetResolutionError();
    }
    if (!addresses.length) throw new OutboundTargetResolutionError();

    // Fail closed for mixed A/AAAA answers: no public address is used if any answer is private/reserved.
    const everyAnswerIsPublic = addresses.every((entry) =>
      (entry.family === 4 || entry.family === 6)
      && isIP(entry.address) === entry.family
      && isPublicInternetAddress(entry.address)
    );
    if (!everyAnswerIsPublic) throw new OutboundTargetDeniedError();
  }

  const selected = addresses[0];
  return {
    address: selected.address,
    family: selected.family,
    servername: literalFamily ? undefined : hostname,
    port: Number(url.port || (url.protocol === 'https:' ? 443 : 80)),
    path: (url.pathname || '/') + url.search,
    protocol: url.protocol,
    hostHeader: url.host,
  };
}

const HOP_BY_HOP_OR_UNSAFE_HEADERS = new Set([
  'host',
  'connection',
  'proxy-connection',
  'keep-alive',
  'transfer-encoding',
  'content-length',
  'te',
  'trailer',
  'upgrade',
  'expect',
  'proxy-authorization',
  'proxy-authenticate',
  'accept-encoding',
]);

const HEADER_NAME_PATTERN = /^[!#$%&'*+\-.^\x60|~0-9A-Za-z]+$/;
const MAX_HEADER_BYTES = 32 * 1024;
const MAX_REQUEST_BODY_BYTES = 1024 * 1024;
const DEFAULT_MAX_RESPONSE_BYTES = 5 * 1024 * 1024;

export interface PublicHttpRequestOptions {
  url: URL;
  method: string;
  headers: Record<string, string>;
  body?: string;
  timeoutMs: number;
  maxResponseBytes?: number;
  resolver?: AddressResolver;
}

export interface PublicHttpResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  durationMs: number;
  sizeBytes: number;
}

function sanitizeRequestHeaders(headers: Record<string, string>, url: URL): Record<string, string> {
  const result: Record<string, string> = {};
  let totalBytes = 0;

  for (const [rawName, rawValue] of Object.entries(headers)) {
    const name = rawName.trim().toLowerCase();
    if (!HEADER_NAME_PATTERN.test(name)) {
      throw new OutboundInvalidHeaderError('Tên HTTP header không hợp lệ.');
    }
    if (/[\u0000-\u0008\u000A-\u001F\u007F]/.test(rawValue)) {
      throw new OutboundInvalidHeaderError('HTTP header không được chứa ký tự xuống dòng.');
    }
    if (HOP_BY_HOP_OR_UNSAFE_HEADERS.has(name)) continue;

    totalBytes += Buffer.byteLength(name, 'utf8') + Buffer.byteLength(rawValue, 'utf8');
    if (totalBytes > MAX_HEADER_BYTES) {
      throw new OutboundInvalidHeaderError('Tổng kích thước HTTP headers vượt quá 32KB.');
    }
    result[name] = rawValue;
  }

  // Never trust caller-supplied Host, compression, or connection-management headers.
  result.host = url.host;
  result['accept-encoding'] = 'identity';
  result.connection = 'close';
  return result;
}

export async function requestPublicHttp(options: PublicHttpRequestOptions): Promise<PublicHttpResponse> {
  const startedAt = performance.now();
  let resolutionTimeout: ReturnType<typeof setTimeout> | undefined;
  const target = await Promise.race([
    resolvePublicHttpTarget(options.url, options.resolver),
    new Promise<never>((_resolve, reject) => {
      resolutionTimeout = setTimeout(() => reject(new OutboundRequestTimeoutError()), options.timeoutMs);
    }),
  ]).finally(() => {
    if (resolutionTimeout) clearTimeout(resolutionTimeout);
  });
  const remainingTimeoutMs = options.timeoutMs - (performance.now() - startedAt);
  if (remainingTimeoutMs <= 0) throw new OutboundRequestTimeoutError();

  const requestBody = options.body ?? '';
  if (Buffer.byteLength(requestBody, 'utf8') > MAX_REQUEST_BODY_BYTES) {
    throw new OutboundPayloadTooLargeError();
  }

  const headers = sanitizeRequestHeaders(options.headers, options.url);
  const maxResponseBytes = options.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES;
  const requestOptions = {
    hostname: target.address,
    family: target.family,
    port: target.port,
    path: target.path,
    method: options.method,
    headers,
  };

  return new Promise<PublicHttpResponse>((resolve, reject) => {
    let settled = false;
    let timedOut = false;
    let responseTooLarge = false;
    let receivedBytes = 0;
    const chunks: Buffer[] = [];
    const timeoutHandle = setTimeout(() => {
      timedOut = true;
      request.destroy(new Error('Outbound request timeout'));
    }, remainingTimeoutMs);

    const finish = (error?: Error, value?: PublicHttpResponse) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutHandle);
      if (error) reject(error);
      else if (value) resolve(value);
    };

    const handleResponse = (response: IncomingMessage) => {
      const responseHeaders: Record<string, string> = {};
      for (const [key, value] of Object.entries(response.headers)) {
        if (value !== undefined) {
          responseHeaders[key] = Array.isArray(value) ? value.join(', ') : String(value);
        }
      }

      response.on('data', (chunk: Buffer | string) => {
        if (settled) return;
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        receivedBytes += buffer.length;
        if (receivedBytes > maxResponseBytes) {
          responseTooLarge = true;
          const error = new OutboundResponseTooLargeError();
          response.destroy();
          request.destroy();
          finish(error);
          return;
        }
        chunks.push(buffer);
      });
      response.on('error', (error) => {
        if (responseTooLarge) finish(new OutboundResponseTooLargeError());
        else finish(error);
      });
      response.on('end', () => {
        if (settled) return;
        const body = Buffer.concat(chunks, receivedBytes).toString('utf8');
        finish(undefined, {
          status: response.statusCode ?? 502,
          statusText: response.statusMessage ?? '',
          headers: responseHeaders,
          body,
          durationMs: Math.round(performance.now() - startedAt),
          sizeBytes: Buffer.byteLength(body, 'utf8'),
        });
      });
    };

    const onRequestError = (error: Error) => {
      if (timedOut) finish(new OutboundRequestTimeoutError());
      else if (responseTooLarge) finish(new OutboundResponseTooLargeError());
      else finish(error);
    };

    const request = target.protocol === 'https:'
      ? https.request({
        ...requestOptions,
        ...(target.servername ? { servername: target.servername } : {}),
      }, handleResponse)
      : http.request(requestOptions, handleResponse);

    request.on('error', onRequestError);
    request.end(requestBody || undefined);
  });
}
