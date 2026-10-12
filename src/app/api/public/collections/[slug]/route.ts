import { NextRequest, NextResponse } from 'next/server';
import { getDb, initializeDatabase } from '@/lib/db';
import { collections, collectionItems, contentItems } from '@/lib/db/schema';
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { checkPublicAccessProtection } from '@/lib/auth/guard';
import { getPublicApiCacheHeaders } from '@/lib/security/public-api-cache';
import { checkPublicApiRateLimit } from '@/lib/security/public-api-guard';
import { toPublicCollection, toPublicContentSummary } from '@/lib/api/public-serializer';

export async function GET(
  req: NextRequest,
  segmentData: { params: Promise<{ slug: string }> },
) {
  try {
    const rateLimitResponse = checkPublicApiRateLimit(req, 'collection-detail', 60);
    if (rateLimitResponse) return rateLimitResponse;
    const access = await checkPublicAccessProtection();
    if (access.requirePassword && !access.hasValidGuestSession) {
      return NextResponse.json({ error: 'Yêu cầu mật mã truy cập.' }, { status: 403 });
    }

    const { slug } = await segmentData.params;
    await initializeDatabase();
    const db = getDb();

    const colResult = await db
      .select({
        id: collections.id,
        profileId: collections.profileId,
        name: collections.name,
        slug: collections.slug,
        description: sql<string | null>`left(${collections.description}, 320)`,
        isFeatured: collections.isFeatured,
      })
      .from(collections)
      .where(and(
        eq(collections.slug, slug),
        eq(collections.visibility, 'PUBLIC'),
        eq(collections.status, 'PUBLISHED'),
        isNull(collections.deletedAt),
      ))
      .limit(1);

    if (colResult.length === 0) {
      return NextResponse.json({ error: 'Bộ sưu tập không tồn tại hoặc chưa xuất bản.' }, { status: 404 });
    }

    const colRaw = colResult[0];

    // Collection cards display title/type/description only. Fetch neither full
    // item bodies nor potentially embedded cover images from the database.
    const rawItems = await db
      .select({
        id: contentItems.id,
        title: contentItems.title,
        slug: contentItems.slug,
        type: contentItems.type,
        description: sql<string | null>`left(${contentItems.description}, 240)`,
        tags: contentItems.tags,
        category: contentItems.category,
        sortOrder: contentItems.sortOrder,
        isFeatured: contentItems.isFeatured,
        publishedAt: contentItems.publishedAt,
        createdAt: contentItems.createdAt,
      })
      .from(collectionItems)
      .innerJoin(
        contentItems,
        and(
          eq(collectionItems.contentItemId, contentItems.id),
          eq(contentItems.profileId, colRaw.profileId),
          eq(contentItems.visibility, 'PUBLIC'),
          eq(contentItems.status, 'PUBLISHED'),
          isNull(contentItems.deletedAt),
        ),
      )
      .where(eq(collectionItems.collectionId, colRaw.id))
      .orderBy(asc(collectionItems.sortOrder))
      .limit(100);

    const publicItems = rawItems
      .map((item) => toPublicContentSummary(item as unknown as Record<string, unknown>))
      .filter((item): item is NonNullable<typeof item> => item !== null);

    // Item summaries are emitted once in the top-level "items" array below.
    const publicCollection = toPublicCollection(
      colRaw as unknown as Record<string, unknown>,
      [],
    );

    return NextResponse.json({
      collection: publicCollection ? { ...publicCollection, items: [] } : null,
      items: publicItems,
    }, { headers: getPublicApiCacheHeaders(access) });
  } catch (error) {
    console.error('Lỗi API public collection slug:', error);
    return NextResponse.json({ error: 'Không thể tải bộ sưu tập.' }, { status: 500 });
  }
}
