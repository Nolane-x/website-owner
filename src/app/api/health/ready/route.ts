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
  | 'resource_exhausted'
  | 'query_failed';

type ErrorLike = {
  code?: unknown;
  errno?: unknown;
  message?: unknown;
  cause?: unknown;
  originalError?: unknown;
  parent?: unknown;
  error?: unknown;
  errors?: unknown;
};

const NETWORK_ERROR_CODES = [
  'ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED', 'ETIMEDOUT', 'EHOSTUNREACH',
  'ECONNRESET', 'EPIPE', 'ECONNABORTED', 'ENETUNREACH', 'EADDRNOTAVAIL',
  'EHOSTDOWN', 'CONNECT_TIMEOUT', 'CONNECTION_CLOSED', 'CONNECTION_DESTROYED',
  'CONNECTION_ENDED',
] as const;

const TLS_ERROR_CODES = [
  'ERR_TLS_CERT_ALTNAME_INVALID', 'CERT_HAS_EXPIRED',
  'DEPTH_ZERO_SELF_SIGNED_CERT', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
] as const;

/**
 * Drivers, ORMs and Node AggregateError may wrap the useful error at several
 * different fields. Traverse only known error links, with strict size bounds.
 */
function getErrorChain(error: unknown): ErrorLike[] {
  const chain: ErrorLike[] = [];
  const pending: unknown[] = [error];
  const seen = new Set<object>();

  while (pending.length > 0 && chain.length < 16) {
    const current = pending.shift();
    if (!current || typeof current !== 'object' || seen.has(current)) continue;
    seen.add(current);

    const candidate = current as ErrorLike;
    chain.push(candidate);

    for (const key of ['cause', 'originalError', 'parent', 'error'] as const) {
      const nested = candidate[key];
      if (nested && typeof nested === 'object') pending.push(nested);
    }

    if (Array.isArray(candidate.errors)) {
      pending.push(...candidate.errors.slice(0, 8));
    }
  }

  return chain;
}

function getErrorCodes(chain: ErrorLike[]): string[] {
  return chain.flatMap((entry) => [entry.code, entry.errno])
    .filter((code): code is string => typeof code === 'string')
    .map((code) => code.toUpperCase());
}

/**
 * Only return PostgreSQL SQLSTATE values or a narrow set of known driver codes.
 * Never serialize exception messages, hostnames, queries or connection strings.
 */
function getSafeDatabaseFailureCode(chain: ErrorLike[]): string | undefined {
  for (let index = chain.length - 1; index >= 0; index -= 1) {
    const entry = chain[index];
    for (const value of [entry.code, entry.errno]) {
      if (typeof value !== 'string') continue;
      const code = value.toUpperCase();
      if (/^[0-9A-Z]{5}$/.test(code) ||
        (NETWORK_ERROR_CODES as readonly string[]).includes(code) ||
        (TLS_ERROR_CODES as readonly string[]).includes(code) ||
        ['CONNECTION_AUTH_FAILED', 'SASL_SIGNATURE_MISMATCH'].includes(code)) {
        return code;
      }
    }
  }
  return undefined;
}

function classifyDatabaseFailure(chain: ErrorLike[]): DatabaseFailureCategory {
  const codes = getErrorCodes(chain);
  const messages = chain
    .map((entry) => typeof entry.message === 'string' ? entry.message.toLowerCase() : '')
    .filter(Boolean)
    .join(' | ');

  if (
    NETWORK_ERROR_CODES.some((code) => codes.includes(code)) ||
    codes.some((code) => code.startsWith('08')) ||
    ['57P01', '57P02', '57P03'].some((code) => codes.includes(code)) ||
    /connection terminated unexpectedly|connection not open|socket hang up/.test(messages)
  ) {
    return 'network_unreachable';
  }

  if (codes.includes('3D000') || /database .{0,80} does not exist|unknown database/.test(messages)) {
    return 'database_missing';
  }

  if (codes.some((code) => code.startsWith('28')) ||
    ['CONNECTION_AUTH_FAILED', 'SASL_SIGNATURE_MISMATCH'].some((code) => codes.includes(code)) ||
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

  if (codes.some((code) => code.startsWith('53'))) {
    return 'resource_exhausted';
  }

  if (
    TLS_ERROR_CODES.some((code) => codes.includes(code)) ||
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
    databaseFailureCode?: string;
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
 * Readiness probe for deployment diagnostics. Responses only contain boolean
 * health indicators, a fixed category, and an allow-listed SQLSTATE when available.
 * Never expose URLs, messages, queries or credentials.
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
    const chain = getErrorChain(error);
    const databaseFailure = classifyDatabaseFailure(chain);
    const safeCode = getSafeDatabaseFailureCode(chain);
    const databaseFailureCode = safeCode && /^[0-9A-Z]{5}$/.test(safeCode)
      ? safeCode
      : undefined;
    // Log only allowlisted diagnostic information, never the raw error or URL.
    console.error('Database readiness probe failed', {
      databaseFailure,
      ...(databaseFailureCode ? { databaseFailureCode } : {}),
    });
    return response(503, {
      status: 'not_ready',
      databaseConfigured: true,
      databaseReachable: false,
      databaseFailure,
      ...(databaseFailureCode ? { databaseFailureCode } : {}),
    });
  }
}
