import { NextResponse } from 'next/server';
import { getClientIp, rateLimiter } from '@/lib/security/rate-limit';

const GLOBAL_PUBLIC_LIMIT = 120;
const RATE_WINDOW_SECONDS = 60;

/**
 * Best-effort per-instance guard for database-backed public reads.
 * This supplements, but does not replace, provider-level edge/WAF rate limits.
 */
export function checkPublicApiRateLimit(
  request: Request,
  scope: string,
  scopeLimit = 45,
): NextResponse | null {
  const ip = getClientIp(request.headers);
  const global = rateLimiter.check(`public-api:global:${ip}`, GLOBAL_PUBLIC_LIMIT, RATE_WINDOW_SECONDS);
  const scoped = rateLimiter.check(`public-api:${scope}:${ip}`, scopeLimit, RATE_WINDOW_SECONDS);

  const denied = !global.allowed ? global : !scoped.allowed ? scoped : null;
  if (!denied) return null;

  const retryAfter = Math.max(1, Math.ceil((denied.resetAt - Date.now()) / 1000));
  return NextResponse.json(
    { error: 'Quá nhiều yêu cầu công khai. Vui lòng đợi một chút rồi thử lại.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
        'Cache-Control': 'no-store',
        'X-RateLimit-Limit': String(!global.allowed ? GLOBAL_PUBLIC_LIMIT : scopeLimit),
        'X-RateLimit-Remaining': '0',
      },
    },
  );
}
