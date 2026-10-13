/**
 * Bounds database-to-application egress for public, no-store detail endpoints.
 * Checks are evaluated in SQL before large JSON/text fields cross the database network.
 */
export const MAX_PUBLIC_CONTENT_BYTES = 512 * 1024;
export const MAX_PUBLIC_PAGE_BLOCK_BYTES = 1024 * 1024;
export const MAX_PUBLIC_METADATA_SUMMARY_BYTES = 16 * 1024;
export const MAX_PUBLIC_METADATA_TOC_BYTES = 32 * 1024;

export function exceedsByteLimit(value: unknown, limit: number): boolean {
  const bytes = typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim() !== ''
      ? Number(value)
      : Number.NaN;

  return !Number.isSafeInteger(bytes) || bytes < 0 || bytes > limit;
}
