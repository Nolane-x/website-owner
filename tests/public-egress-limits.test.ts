import { describe, expect, it } from 'vitest';
import {
  exceedsByteLimit,
  MAX_PUBLIC_CONTENT_BYTES,
  MAX_PUBLIC_PAGE_BLOCK_BYTES,
  MAX_PUBLIC_METADATA_SUMMARY_BYTES,
  MAX_PUBLIC_METADATA_TOC_BYTES,
  MAX_PUBLIC_TAGS_BYTES,
  MAX_PUBLIC_READING_TIME_BYTES,
  MAX_PUBLIC_AUTHOR_BYTES,
  MAX_PUBLIC_LICENSE_BYTES,
  MAX_PUBLIC_CANONICAL_URL_BYTES,
  MAX_PUBLIC_RESOURCE_METADATA_BYTES,
  MAX_PUBLIC_TECH_STACK_BYTES,
  MAX_PUBLIC_NAVIGATION_BYTES,
  MAX_PUBLIC_ACCESS_CONFIG_BYTES,
} from '@/lib/security/public-egress-limits';

describe('public database egress budgets', () => {
  it('uses explicit budgets for public detail and nested metadata', () => {
    expect(MAX_PUBLIC_CONTENT_BYTES).toBe(512 * 1024);
    expect(MAX_PUBLIC_PAGE_BLOCK_BYTES).toBe(1024 * 1024);
    expect(MAX_PUBLIC_METADATA_SUMMARY_BYTES).toBe(16 * 1024);
    expect(MAX_PUBLIC_METADATA_TOC_BYTES).toBe(32 * 1024);
    expect(MAX_PUBLIC_TAGS_BYTES).toBe(8 * 1024);
    expect(MAX_PUBLIC_READING_TIME_BYTES).toBe(128);
    expect(MAX_PUBLIC_AUTHOR_BYTES).toBe(512);
    expect(MAX_PUBLIC_LICENSE_BYTES).toBe(1024);
    expect(MAX_PUBLIC_CANONICAL_URL_BYTES).toBe(4096);
    expect(MAX_PUBLIC_RESOURCE_METADATA_BYTES).toBe(4096);
    expect(MAX_PUBLIC_TECH_STACK_BYTES).toBe(8 * 1024);
    expect(MAX_PUBLIC_NAVIGATION_BYTES).toBe(64 * 1024);
    expect(MAX_PUBLIC_ACCESS_CONFIG_BYTES).toBe(16 * 1024);
  });

  it('accepts values at the exact bound and rejects values beyond it', () => {
    expect(exceedsByteLimit(512 * 1024, MAX_PUBLIC_CONTENT_BYTES)).toBe(false);
    expect(exceedsByteLimit(String(512 * 1024), MAX_PUBLIC_CONTENT_BYTES)).toBe(false);
    expect(exceedsByteLimit(512 * 1024 + 1, MAX_PUBLIC_CONTENT_BYTES)).toBe(true);
    expect(exceedsByteLimit(Number.NaN, MAX_PUBLIC_CONTENT_BYTES)).toBe(true);
    expect(exceedsByteLimit(-1, MAX_PUBLIC_CONTENT_BYTES)).toBe(true);
    expect(exceedsByteLimit(undefined, MAX_PUBLIC_CONTENT_BYTES)).toBe(true);
  });
});
