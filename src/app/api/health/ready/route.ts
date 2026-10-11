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

type ErrorLike = {
  code?: unknown;
  errno?: unknown;
  message?: unknown;
  cause?: unknown;
};

/**
 * Drivers and ORMs may wrap the useful PostgreSQL/socket error in its cause.
 * Walk a bounded chain and classify only into a fixed, secret-free vocabulary.
 */
function getErrorChain(error: unknown): ErrorLike[] {
  const chain: ErrorLike[] = [];
  const seen = new Set<object>();
  let current: unknown = error;

  for (let depth = 0; depth < 6 && current && typeof current === 'object'; depth += 1) {
    if (seen.has(current)) break;
    seen.add(current);

    const candidate = current as ErrorLike;
    chain.push(candidate);
    current = candidate.cause;
  }

  return chain;
}

function classifyDatabaseFailure(error: unknown): DatabaseFailureCategory {
  const chain = getErrorChain(error);
  const codes = chain.flatMap((entry) => [entry.code, entry.errno])
    .filter((code): code is string => typeof code === 'string')
    .map((code) => code.toUpperCase());
  const messages = chain
    .map((entry) => typeof entry.message === 'string' ? entry.message.toLowerCase() : '')
    .filter(Boolean)
    .join(' | ');

  if ([
    'ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED', 'ETIMEDOUT', 'EHOSTUNREACH',
    'ECONNRESET', 'EPIPE', 'ECONNABORTED', 'CONNECT_TIMEOUT',
    'CONNECTION_CLOSED', 'CONNECTION_DESTROYED', 'CONNECTION_ENDED',
  ].some((code) => codes.includes(code))) {
    return 'network_unreachable';
  }

  if (codes.includes('3D000') || /database .{0,80} does not exist|unknown database/.test(messages)) {
    return 'database_missing';
  }

  if (['28P01', '28000', 'CONNECTION_AUTH_FAILED', 'SASL_SIGNATURE_MISMATCH'].some((code) => codes.includes(code)) ||
    /password authentication failed|authentication failed|no pg_hba\.conf entry|role .{1,100} does not exist|invalid connection string/.test(messages)) {
    return 'authentication_or_database_config';
  }

  if (codes.includes('42501') || /permission denied|insufficient privilege/.test(messages)) {
    return 'permission_denied';
  }

  if (['53300', '53400'].some((code) => codes.includes(code)) ||
    /too many clients|remaining connection slots|connection limit exceeded/.test(messages)) {
    return 'connection_capacity';
  }

  if (
    ['ERR_TLS_CERT_ALTNAME_INVALID', 'CERT_HAS_EXPIRED', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE'].some((code) => codes.includes(code)) ||
    /\b(ssl|tls|certificate)\b/.test(messages)
  ) {
    return 'tls_configuration';
  }

  if (/invalid url|invalid connection url|hostname is required|host is required/.test(messages)) {
    return 'authentication_or_database_config';
  }

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
    await getDb().execute(sql.raw('SELECT 1'));
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
