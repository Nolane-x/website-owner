import { NextRequest, NextResponse } from 'next/server';
import { getDb, initializeDatabase } from '@/lib/db';
import { collections, collectionItems, contentItems } from '@/lib/db/schema';
import { eq, and, asc, isNull } from 'drizzle-orm';
import { checkPublicAccessProtection } from '@/lib/auth/guard';
import { toPublicCollection, toPublicContent } from '@/lib/api/public-serializer';

export async function GET(
  req: NextRequest,
  segmentData: { params: Promise<{ slug: string }> }
) {
  try {
    const access = await checkPublicAccessProtection();
    if (access.requirePassword && !access.hasValidGuestSession) {
      return NextResponse.json({ error: 'Yêu cầu mật mã truy cập.' }, { status: 403 });
    }

    const { slug } = await segmentData.params;
    await initializeDatabase();
    const db = getDb();

    const colResult = await db
      .select()
      .from(collections)
      .where(
        and(
          eq(collections.slug, slug),
          eq(collections.visibility, 'PUBLIC'),
          eq(collections.status, 'PUBLISHED'),
          isNull(collections.deletedAt)
        )
      )
      .limit(1);

    if (colResult.length === 0) {
      return NextResponse.json({ error: 'Bộ sưu tập không tồn tại hoặc chưa xuất bản.' }, { status: 404 });
    }

    const colRaw = colResult[0];

    // CHỈ QUERY PHẦN TỬ CÔNG KHAI, ĐÃ XUẤT BẢN VÀ CHƯA BỊ XÓA
    const rawItems = await db
      .select({
        id: contentItems.id,
        title: contentItems.title,
        slug: contentItems.slug,
        type: contentItems.type,
        description: contentItems.description,
        content: contentItems.content,
        coverImage: contentItems.coverImage,
        icon: contentItems.icon,
        tags: contentItems.tags,
        category: contentItems.category,
        metadata: contentItems.metadata,
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
          eq(contentItems.visibility, 'PUBLIC'),
          eq(contentItems.status, 'PUBLISHED'),
          isNull(contentItems.deletedAt)
        )
      )
      .where(eq(collectionItems.collectionId, colRaw.id))
      .orderBy(asc(collectionItems.sortOrder));

    const publicItems = rawItems
      .map((it) => toPublicContent(it as unknown as Record<string, unknown>))
      .filter((it): it is NonNullable<typeof it> => it !== null);

    const publicCol = toPublicCollection(
      colRaw as unknown as Record<string, unknown>,
      rawItems as unknown as Array<Record<string, unknown>>
    );

    return NextResponse.json({
      collection: publicCol,
      items: publicItems,
    });
  } catch (error) {
    console.error('Lỗi API public collection slug:', error);
    return NextResponse.json({ error: 'Không thể tải bộ sưu tập.' }, { status: 500 });
  }
}
