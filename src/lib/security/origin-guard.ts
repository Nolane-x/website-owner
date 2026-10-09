import { NextRequest, NextResponse } from 'next/server';

/**
 * CSRF / Origin Guard for State-Mutating Requests
 * Ensures that incoming mutating requests (POST, PUT, PATCH, DELETE)
 * originate from the same host or trusted origins.
 * Fail-closed policy for browser state-changing requests.
 */

export function verifyRequestOrigin(request: NextRequest): boolean {
  const method = request.method.toUpperCase();
  // Safe idempotent methods don't mutate state
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return true;
  }

  // Sec-Fetch-Site check (Modern browser defense-in-depth)
  const secFetchSite = request.headers.get('sec-fetch-site');
  if (secFetchSite === 'cross-site') {
    return false;
  }

  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  // Only trust host header; in edge proxy environments x-forwarded-host should only be used if expected
  const host = request.headers.get('host') || request.headers.get('x-forwarded-host');

  // Allowlist support from env
  const allowedOriginsEnv = process.env.ALLOWED_ORIGINS;
  const allowedOrigins = allowedOriginsEnv
    ? allowedOriginsEnv.split(',').map((o) => o.trim().toLowerCase())
    : [];

  if (origin) {
    try {
      const originUrl = new URL(origin);
      if (allowedOrigins.includes(originUrl.origin.toLowerCase())) {
        return true;
      }
      if (host && originUrl.host.toLowerCase() === host.toLowerCase()) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  if (referer) {
    try {
      const refererUrl = new URL(referer);
      if (allowedOrigins.includes(refererUrl.origin.toLowerCase())) {
        return true;
      }
      if (host && refererUrl.host.toLowerCase() === host.toLowerCase()) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  // Fail-closed in production: state-mutating requests MUST provide a valid Origin or Referer header
  if (process.env.NODE_ENV === 'production') {
    return false;
  }

  return true;
}

export function assertValidOrigin(request: NextRequest): NextResponse | null {
  if (!verifyRequestOrigin(request)) {
    return NextResponse.json(
      { error: 'Yêu cầu bị từ chối do vi phạm chính sách cùng nguồn gốc (CSRF / Origin Guard).' },
      { status: 403 }
    );
  }
  return null;
}
