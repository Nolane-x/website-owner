import { sql } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { resolveDatabaseUrl } from '@/lib/db/config';

export const dynamic = 'force-dynamic';

type DatabaseFailureCategory =
  | 'network_unreachable'
  | 'authentication_or_database_config'
  | 'database_missing'
  | 'permission_denied'
  | 'tls_configuration'
  | 'connection_capacity'
  | 'query_failed';

function classifyDatabaseFailure(error: unknown): DatabaseFailureCategory {
  const failure = error && typeof error === 'object' ? error as { code?: unknown; message?: unknown } : {};
  const code = typeof failure.code === 'string' ? failure.code.toUpperCase() : '';
  const message = typeof failure.message === 'string' ? failure.message.toLowerCase() : '';

  if (['ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED', 'ETIMEDOUT', 'EHOSTUNREACH', 'ECONNRESET', 'EPIPE', 'ECONNABORTED'].includes(code)) {
    return 'network_unreachable';
  }
  if (code === '28P01' || code === '28000') return 'authentication_or_database_config';
  if (code === '3D000') return 'database_missing';
  if (code === '42501') return 'permission_denied';
  if (code === '53300' || code === '53400') return 'connection_capacity';
  if (
    ['ERR_TLS_CERT_ALTNAME_INVALID', 'CERT_HAS_EXPIRED', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE'].includes(code) ||
    /\b(ssl|tls|certificate)\b/.test(message)
  ) return 'tls_configuration';
  return 'query_failed';
}

function response(
  status: number,
  body: {
    status: 'ready' | 'not_ready';
    databaseConfigured: boolean;
    databaseReachable: boolean;
    databaseFailure?: DatabaseFailureCategory | null;
  },
): Response {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'CDN-Cache-Control': 'no-store',
      'Vercel-CDN-Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

/**
 * Readiness probe for deployment diagnostics.
 * It deliberately returns only boolean database health indicators, never URLs,
 * environment variable values, exception messages or credentials.
 */
export async function GET(): Promise<Response> {
  const configured = resolveDatabaseUrl().url !== null;
  if (!configured) {
    return response(503, {
      status: 'not_ready',
      databaseConfigured: false,
      databaseReachable: false,
    });
  }

  try {
    await getDb().execute(sql`SELECT 1`);
    return response(200, {
      status: 'ready',
      databaseConfigured: true,
      databaseReachable: true,
    });
  } catch (error) {
    const databaseFailure = classifyDatabaseFailure(error);
    // Log only the safe category, never the raw error or connection URL.
    console.error('Database readiness probe failed', { databaseFailure });
    return response(503, {
      status: 'not_ready',
      databaseConfigured: true,
      databaseReachable: false,
      databaseFailure,
    });
  }
}
