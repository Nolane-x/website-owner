import { NextRequest, NextResponse } from 'next/server';
import { getDb, initializeDatabase } from '@/lib/db';
import { contentItems, pages } from '@/lib/db/schema';
import { eq, and, or, like, isNull } from 'drizzle-orm';
import { checkPublicAccessProtection } from '@/lib/auth/guard';

export async function GET(req: NextRequest) {
  try {
    const access = await checkPublicAccessProtection();
    if (access.requirePassword && !access.hasValidGuestSession) {
      return NextResponse.json({ error: 'Yêu cầu mật mã truy cập.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');

    if (!query || query.trim() === '') {
      return NextResponse.json({ results: [] });
    }

    await initializeDatabase();
    const db = getDb();
    const q = `%${query.trim().toLowerCase()}%`;

    // 1. Tìm trong content_items: CHỈ PUBLIC VÀ PUBLISHED VÀ KHÔNG BỊ XÓA (NOT DELETED)
    const matchingItems = await db
      .select({
        id: contentItems.id,
        title: contentItems.title,
        slug: contentItems.slug,
        type: contentItems.type,
        description: contentItems.description,
        coverImage: contentItems.coverImage,
        category: contentItems.category,
        tags: contentItems.tags,
        publishedAt: contentItems.publishedAt,
      })
      .from(contentItems)
      .where(
        and(
          eq(contentItems.visibility, 'PUBLIC'),
          eq(contentItems.status, 'PUBLISHED'),
          isNull(contentItems.deletedAt),
          or(
            like(contentItems.title, q),
            like(contentItems.description, q)
          )
        )
      )
      .limit(20);

    // 2. Tìm trong pages: CHỈ PUBLIC VÀ PUBLISHED VÀ KHÔNG BỊ XÓA
    const matchingPages = await db
      .select({
        id: pages.id,
        title: pages.title,
        slug: pages.slug,
        description: pages.description,
        coverImage: pages.coverImage,
        publishedAt: pages.publishedAt,
      })
      .from(pages)
      .where(
        and(
          eq(pages.visibility, 'PUBLIC'),
          eq(pages.status, 'PUBLISHED'),
          isNull(pages.deletedAt),
          or(
            like(pages.title, q),
            like(pages.description, q)
          )
        )
      )
      .limit(10);

    const results = [
      ...matchingItems.map((i) => ({ ...i, resultType: 'content' as const })),
      ...matchingPages.map((p) => ({ ...p, type: 'page', resultType: 'page' as const })),
    ];

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Lỗi tìm kiếm công khai:', error);
    return NextResponse.json({ error: 'Không thể thực hiện tìm kiếm.' }, { status: 500 });
  }
}
