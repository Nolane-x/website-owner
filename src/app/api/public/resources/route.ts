import { NextResponse } from 'next/server';
import { getDb, initializeDatabase } from '@/lib/db';
import { contentItems } from '@/lib/db/schema';
import { eq, and, desc, or, isNull, type SQL, sql } from 'drizzle-orm';
import { checkPublicAccessProtection } from '@/lib/auth/guard';
import { getPublicApiCacheHeaders } from '@/lib/security/public-api-cache';
import { checkPublicApiRateLimit } from '@/lib/security/public-api-guard';
import { toPublicResource } from '@/lib/api/public-serializer';
import { MAX_PUBLIC_TAGS_BYTES } from '@/lib/security/public-egress-limits';

function boundedLimit(raw: string | null, fallback = 50): number {
  if (raw === null || raw.trim() === '') return fallback;
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed)) return fallback;
  return Math.min(100, Math.max(1, parsed));
}

export async function GET(req: Request) {
  try {
    const rateLimitResponse = checkPublicApiRateLimit(req, 'resources', 40);
    if (rateLimitResponse) return rateLimitResponse;
    const access = await checkPublicAccessProtection();
    if (access.requirePassword && !access.hasValidGuestSession) {
      return NextResponse.json({ error: 'Yêu cầu mật mã truy cập.' }, { status: 403 });
    }

    await initializeDatabase();
    const db = getDb();
    const searchParams = new URL(req.url).searchParams;
    const category = searchParams.get('category');
    const limit = boundedLimit(searchParams.get('limit'));
    const conditions: SQL[] = [
      or(eq(contentItems.type, 'resource'), eq(contentItems.type, 'link'))!,
      eq(contentItems.visibility, 'PUBLIC'),
      eq(contentItems.status, 'PUBLISHED'),
      isNull(contentItems.deletedAt),
    ];
    if (category) conditions.push(eq(contentItems.category, category));

    // Resource cards need the external link and small display metadata only.
    const rawResources = await db
      .select({
        id: contentItems.id,
        title: contentItems.title,
        slug: contentItems.slug,
        description: sql<string | null>`left(${contentItems.description}, 320)`,
        category: contentItems.category,
        tags: sql<string[]>`CASE WHEN OCTET_LENGTH(${contentItems.tags}::text) <= ${MAX_PUBLIC_TAGS_BYTES} THEN ${contentItems.tags} ELSE '[]'::jsonb END`,
        publishedAt: contentItems.publishedAt,
        metadata: sql<Record<string, unknown>>`jsonb_strip_nulls(jsonb_build_object(
          'url', ${contentItems.metadata} -> 'url',
          'provider', ${contentItems.metadata} -> 'provider',
          'downloadAllowed', ${contentItems.metadata} -> 'downloadAllowed',
          'openInNewTab', ${contentItems.metadata} -> 'openInNewTab'
        ))`,
      })
      .from(contentItems)
      .where(and(...conditions))
      .orderBy(desc(contentItems.isPinned), desc(contentItems.publishedAt))
      .limit(limit);

    const resources = rawResources
      .map((item) => toPublicResource(item as unknown as Record<string, unknown>))
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return NextResponse.json({ resources }, { headers: getPublicApiCacheHeaders(access) });
  } catch (error) {
    console.error('Lỗi API public resources:', error);
    return NextResponse.json({ error: 'Không thể tải danh sách tài nguyên.' }, { status: 500 });
  }
}
