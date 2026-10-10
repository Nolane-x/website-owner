/**
 * Cloudflare Worker Edge Security & API Gateway
 * Personal Web OS — Defense-in-Depth Layer
 */

export interface Env {
  ORIGIN_URL?: string;
  ENABLE_RATE_LIMIT?: string;
}

// Best-effort per-isolate rate limiting. The map is explicitly bounded so a
// high-cardinality IP flood cannot grow isolate memory without limit.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const MAX_TRACKED_RATE_LIMIT_KEYS = 10_000;
let edgeRequestCount = 0;

function pruneExpiredRateLimitEntries(now: number): void {
  for (const [key, entry] of rateLimitMap.entries()) {
    if (entry.resetAt <= now) rateLimitMap.delete(key);
  }
}

function reserveRateLimitSlot(now: number): void {
  pruneExpiredRateLimitEntries(now);
  while (rateLimitMap.size >= MAX_TRACKED_RATE_LIMIT_KEYS) {
    const oldestKey = rateLimitMap.keys().next().value as string | undefined;
    if (oldestKey === undefined) break;
    rateLimitMap.delete(oldestKey);
  }
}

function checkEdgeRateLimit(ip: string, isAuthEndpoint: boolean): boolean {
  const now = Date.now();
  edgeRequestCount += 1;
  if (edgeRequestCount % 256 === 0) {
    pruneExpiredRateLimitEntries(now);
  }

  const windowMs = isAuthEndpoint ? 60 * 1000 : 30 * 1000;
  const maxRequests = isAuthEndpoint ? 5 : 60;
  const record = rateLimitMap.get(ip);
  if (!record || record.resetAt <= now) {
    if (rateLimitMap.size >= MAX_TRACKED_RATE_LIMIT_KEYS) reserveRateLimitSlot(now);
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) return false;
  record.count += 1;
  return true;
}

// Prohibited scanning paths commonly probed by malicious bots
const BLOCKED_PATTERNS = [
  /\/\.env/i,
  /\/\.git/i,
  /\/wp-admin/i,
  /\/wp-login/i,
  /\/xmlrpc\.php/i,
  /\/phpmyadmin/i,
  /\/\.\./, // Path traversal attempts
  /\/api\/actuator/i,
];

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const clientIp = request.headers.get('cf-connecting-ip') || '127.0.0.1';

    // 1. Anti-abuse: Block suspicious scanning attempts immediately at the edge
    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(url.pathname)) {
        return new Response('Access Denied: Blocked by Edge Security Gateway', {
          status: 403,
          headers: { 'Content-Type': 'text/plain' },
        });
      }
    }

    // 2. Edge Rate Limiting
    const isAuth = url.pathname.startsWith('/api/auth/login');
    const isApi = url.pathname.startsWith('/api/');

    if (env.ENABLE_RATE_LIMIT !== 'false' && (isAuth || isApi)) {
      const allowed = checkEdgeRateLimit(`${clientIp}:${isAuth ? 'auth' : 'api'}`, isAuth);
      if (!allowed) {
        return new Response(
          JSON.stringify({
            error: isAuth
              ? 'Quá nhiều yêu cầu đăng nhập. Vui lòng thử lại sau 1 phút.'
              : 'Quá nhiều yêu cầu API từ IP này. Vui lòng thử lại sau.',
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': '60',
              'X-Edge-RateLimited': 'true',
            },
          }
        );
      }
    }

    // 3. Upstream Routing / Origin Forwarding
    const origin = env.ORIGIN_URL ? new URL(env.ORIGIN_URL) : null;
    const targetUrl = origin
      ? new URL(url.pathname + url.search, origin.origin)
      : new URL(request.url);

    // Forward request preserving headers and adding security markers
    const forwardHeaders = new Headers(request.headers);
    forwardHeaders.set('x-forwarded-for', clientIp);
    forwardHeaders.set('x-edge-shield', 'webos-cloudflare-gateway');

    const originRequest = new Request(targetUrl.toString(), {
      method: request.method,
      headers: forwardHeaders,
      body: request.body,
      redirect: 'manual',
    });

    let originResponse: Response;
    try {
      originResponse = await fetch(originRequest);
    } catch {
      return new Response('Lỗi kết nối tới máy chủ nguồn (Upstream Error)', {
        status: 502,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    // 4. Inject Edge Defense-in-Depth Headers into Response
    const responseHeaders = new Headers(originResponse.headers);

    // Security headers
    responseHeaders.set('X-Frame-Options', 'DENY');
    responseHeaders.set('X-Content-Type-Options', 'nosniff');
    responseHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    responseHeaders.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    responseHeaders.set('X-XSS-Protection', '1; mode=block');
    responseHeaders.set('X-Edge-Gateway', 'WebOS-Cloudflare-Shield-v1');

    // HSTS (Strict-Transport-Security) for production HTTPS
    if (url.protocol === 'https:') {
      responseHeaders.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }

    // Strip sensitive internal server headers if present
    responseHeaders.delete('x-powered-by');
    responseHeaders.delete('server');

    return new Response(originResponse.body, {
      status: originResponse.status,
      statusText: originResponse.statusText,
      headers: responseHeaders,
    });
  },
};

export default worker;
