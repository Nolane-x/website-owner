import { sql } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { resolveDatabaseUrl } from '@/lib/db/config';

export const dynamic = 'force-dynamic';

function response(
  status: number,
  body: { status: 'ready' | 'not_ready'; databaseConfigured: boolean; databaseReachable: boolean },
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
  } catch {
    return response(503, {
      status: 'not_ready',
      databaseConfigured: true,
      databaseReachable: false,
    });
  }
}
