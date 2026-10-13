import { NextRequest, NextResponse } from 'next/server';
import { getDb, initializeDatabase } from '@/lib/db';
import { contentItems } from '@/lib/db/schema';
import { and, desc, eq, isNull, sql, type SQL } from 'drizzle-orm';
import { checkPublicAccessProtection } from '@/lib/auth/guard';
import { getPublicApiCacheHeaders } from '@/lib/security/public-api-cache';
import { checkPublicApiRateLimit } from '@/lib/security/public-api-guard';
import { toPublicContentSummary } from '@/lib/api/public-serializer';
import { MAX_PUBLIC_TAGS_BYTES } from '@/lib/security/public-egress-limits';

export async function GET(req: NextRequest) {
  try {
    const rateLimitResponse = checkPublicApiRateLimit(req, 'content-list', 40);
    if (rateLimitResponse) return rateLimitResponse;
    const access = await checkPublicAccessProtection();
    if (access.requirePassword && !access.hasValidGuestSession) {
      return NextResponse.json(
        { error: 'Yêu cầu mật mã truy cập cho khách.' },
        { status: 403 },
      );
    }

    await initializeDatabase();
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const isFeatured = searchParams.get('isFeatured');
    const limitParam = searchParams.get('limit');
    const requestedLimit = limitParam === null || limitParam.trim() === '' ? 50 : Number(limitParam);
    const limit = Number.isSafeInteger(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 100)
      : 50;

    // Summary endpoints must not transfer full text, embedded images, or full
    // metadata blobs. The detail endpoint returns the complete body on demand.
    const conditions: SQL[] = [
      eq(contentItems.visibility, 'PUBLIC'),
      eq(contentItems.status, 'PUBLISHED'),
      isNull(contentItems.deletedAt),
    ];
    if (type) conditions.push(eq(contentItems.type, type));
    if (isFeatured === 'true') conditions.push(eq(contentItems.isFeatured, true));

    const rawItems = await db
      .select({
        id: contentItems.id,
        title: contentItems.title,
        slug: contentItems.slug,
        type: contentItems.type,
        description: sql<string | null>`left(${contentItems.description}, 320)`,
        category: contentItems.category,
        tags: sql<string[]>`CASE WHEN OCTET_LENGTH(${contentItems.tags}::text) <= ${MAX_PUBLIC_TAGS_BYTES} THEN ${contentItems.tags} ELSE '[]'::jsonb END`,
        sortOrder: contentItems.sortOrder,
        isFeatured: contentItems.isFeatured,
        publishedAt: contentItems.publishedAt,
        createdAt: contentItems.createdAt,
      })
      .from(contentItems)
      .where(and(...conditions))
      .orderBy(desc(contentItems.isPinned), desc(contentItems.publishedAt))
      .limit(limit);

    const items = rawItems
      .map((item) => toPublicContentSummary(item as unknown as Record<string, unknown>))
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return NextResponse.json({ items }, { headers: getPublicApiCacheHeaders(access) });
  } catch (error) {
    console.error('Lỗi API public content:', error);
    return NextResponse.json({ error: 'Không thể tải nội dung công khai.' }, { status: 500 });
  }
}
