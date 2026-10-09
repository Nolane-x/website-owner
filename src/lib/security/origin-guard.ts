/**
 * CSRF / Origin Guard for State-Mutating Requests
 * Ensures that incoming mutating requests (POST, PUT, PATCH, DELETE)
 * originate from the same host or trusted origins.
 */
import { NextRequest } from 'next/server';

export function verifyRequestOrigin(request: NextRequest): boolean {
  const method = request.method.toUpperCase();
  // Safe idempotent methods don't mutate state
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return true;
  }

  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');

  if (!host) {
    return true;
  }

  // Check Origin header first if present
  if (origin) {
    try {
      const originUrl = new URL(origin);
      return originUrl.host === host;
    } catch {
      return false;
    }
  }

  // If no Origin, check Referer
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      return refererUrl.host === host;
    } catch {
      return false;
    }
  }

  return true;
}
