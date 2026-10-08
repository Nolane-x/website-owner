import { NextRequest, NextResponse } from 'next/server';
import { getDb, initializeDatabase } from '@/lib/db';
import { pages, contentBlocks } from '@/lib/db/schema';
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

    // CHỈ QUERY TRANG CÔNG KHAI VÀ ĐÃ XUẤT BẢN
    const pageResult = await db
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
          eq(pages.slug, slug),
          eq(pages.visibility, 'PUBLIC'),
          eq(pages.status, 'PUBLISHED')
        )
      )
      .limit(1);

    if (pageResult.length === 0) {
      return NextResponse.json({ error: 'Trang không tồn tại hoặc chưa được xuất bản.' }, { status: 404 });
    }

    const page = pageResult[0];

    const blocks = await db
      .select({
        id: contentBlocks.id,
        blockType: contentBlocks.blockType,
        sortOrder: contentBlocks.sortOrder,
        content: contentBlocks.contentJson,
        settings: contentBlocks.settingsJson,
      })
      .from(contentBlocks)
      .where(eq(contentBlocks.pageId, page.id))
      .orderBy(asc(contentBlocks.sortOrder));

    return NextResponse.json({
      page,
      blocks,
    });
  } catch (error) {
    console.error('Lỗi API public page:', error);
    return NextResponse.json({ error: 'Không thể tải trang.' }, { status: 500 });
  }
}
