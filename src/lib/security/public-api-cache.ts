type PublicAccessCacheState = { requirePassword: boolean };

/**
 * These response bodies depend on a mutable site-wide access setting. Do not
 * put them in a shared CDN cache: enabling guest-password protection must not
 * leave an older public response available until an edge TTL expires.
 *
 * Keep both browser and CDN caches disabled for all database-backed public
 * API responses. Public Open Data feeds are fetched directly by each visitor's
 * browser and use a separate bounded localStorage cache instead.
 */
export function getPublicApiCacheHeaders(access: PublicAccessCacheState): Record<string, string> {
  // Intentionally read access state for clarity; both modes deliberately use no-store
  // because the site-wide access gate can change at any time.
  void access.requirePassword;
  return {
    'Cache-Control': 'private, no-store, max-age=0',
    'CDN-Cache-Control': 'no-store',
    'Vercel-CDN-Cache-Control': 'no-store',
  };
}
