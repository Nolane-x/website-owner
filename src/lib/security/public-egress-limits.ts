/**
 * Bounds database-to-application egress for public, no-store detail endpoints.
 * Checks are evaluated in SQL before large JSON/text fields cross the database network.
 */
export const MAX_PUBLIC_CONTENT_BYTES = 512 * 1024;
export const MAX_PUBLIC_PAGE_BLOCK_BYTES = 1024 * 1024;
export const MAX_PUBLIC_METADATA_SUMMARY_BYTES = 16 * 1024;
export const MAX_PUBLIC_METADATA_TOC_BYTES = 32 * 1024;
export const MAX_PUBLIC_TAGS_BYTES = 8 * 1024;
export const MAX_PUBLIC_READING_TIME_BYTES = 128;
export const MAX_PUBLIC_AUTHOR_BYTES = 512;
export const MAX_PUBLIC_LICENSE_BYTES = 1024;
export const MAX_PUBLIC_CANONICAL_URL_BYTES = 4096;
export const MAX_PUBLIC_RESOURCE_METADATA_BYTES = 4096;
export const MAX_PUBLIC_TECH_STACK_BYTES = 8 * 1024;
export const MAX_PUBLIC_NAVIGATION_BYTES = 64 * 1024;
export const MAX_PUBLIC_ACCESS_CONFIG_BYTES = 16 * 1024;

export function exceedsByteLimit(value: unknown, limit: number): boolean {
  const bytes = typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim() !== ''
      ? Number(value)
      : Number.NaN;

  return !Number.isSafeInteger(bytes) || bytes < 0 || bytes > limit;
}
