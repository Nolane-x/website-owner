import { NextRequest, NextResponse } from 'next/server';
import { getDb, initializeDatabase } from '@/lib/db';
import { collections, collectionItems, contentItems } from '@/lib/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { checkPublicAccessProtection } from '@/lib/auth/guard';

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
      .select({
        id: collections.id,
        name: collections.name,
        slug: collections.slug,
        description: collections.description,
        coverImage: collections.coverImage,
        icon: collections.icon,
        isFeatured: collections.isFeatured,
      })
      .from(collections)
      .where(
        and(
          eq(collections.slug, slug),
          eq(collections.visibility, 'PUBLIC'),
          eq(collections.status, 'PUBLISHED')
        )
      )
      .limit(1);

    if (colResult.length === 0) {
      return NextResponse.json({ error: 'Bộ sưu tập không tồn tại hoặc chưa xuất bản.' }, { status: 404 });
    }

    const col = colResult[0];

    // CHỈ QUERY PHẦN TỬ CÔNG KHAI VÀ ĐÃ XUẤT BẢN TRONG BỘ SƯU TẬP
    const items = await db
      .select({
        id: contentItems.id,
        title: contentItems.title,
        slug: contentItems.slug,
        type: contentItems.type,
        description: contentItems.description,
        coverImage: contentItems.coverImage,
        icon: contentItems.icon,
        tags: contentItems.tags,
        category: contentItems.category,
        metadata: contentItems.metadata,
        isFeatured: contentItems.isFeatured,
        publishedAt: contentItems.publishedAt,
      })
      .from(collectionItems)
      .innerJoin(
        contentItems,
        and(
          eq(collectionItems.contentItemId, contentItems.id),
          eq(contentItems.visibility, 'PUBLIC'),
          eq(contentItems.status, 'PUBLISHED')
        )
      )
      .where(eq(collectionItems.collectionId, col.id))
      .orderBy(asc(collectionItems.sortOrder));

    return NextResponse.json({
      collection: col,
      items,
    });
  } catch (error) {
    console.error('Lỗi API public collection slug:', error);
    return NextResponse.json({ error: 'Không thể tải bộ sưu tập.' }, { status: 500 });
  }
}
