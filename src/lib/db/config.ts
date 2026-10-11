/**
 * Resolve PostgreSQL connection strings used by this app and common Vercel
 * managed-Postgres integrations. Never log the selected connection string.
 *
 * DATABASE_URL is preferred; aliases are fallbacks so an integration that
 * only provides POSTGRES_URL does not silently make the whole app unavailable.
 */
export const DATABASE_URL_KEYS = [
  'DATABASE_URL',
  'POSTGRES_URL',
  'POSTGRES_PRISMA_URL',
  'DATABASE_URL_UNPOOLED',
  'POSTGRES_URL_NON_POOLING',
] as const;

export type DatabaseUrlKey = (typeof DATABASE_URL_KEYS)[number];

export interface DatabaseUrlResolution {
  url: string | null;
  source: DatabaseUrlKey | null;
}

export function resolveDatabaseUrl(
  environment: Record<string, string | undefined> = process.env,
): DatabaseUrlResolution {
  for (const key of DATABASE_URL_KEYS) {
    const value = environment[key]?.trim();
    if (value) return { url: value, source: key };
  }
  return { url: null, source: null };
}
