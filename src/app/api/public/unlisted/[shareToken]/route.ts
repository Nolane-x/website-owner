import { NextRequest, NextResponse } from 'next/server';
import { getDb, initializeDatabase } from '@/lib/db';
import { contentItems, pages } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  req: NextRequest,
  segmentData: { params: Promise<{ shareToken: string }> }
) {
  try {
    const { shareToken } = await segmentData.params;
    if (!shareToken || shareToken.length < 8) {
      return NextResponse.json({ error: 'Liên kết không hợp lệ.' }, { status: 404 });
    }

    await initializeDatabase();
    const db = getDb();

    // 1. Thử tìm trong contentItems với visibility='UNLISTED'
    const items = await db
      .select({
        id: contentItems.id,
        title: contentItems.title,
        slug: contentItems.slug,
        type: contentItems.type,
        description: contentItems.description,
        content: contentItems.content,
        coverImage: contentItems.coverImage,
        tags: contentItems.tags,
        category: contentItems.category,
        metadata: contentItems.metadata,
        createdAt: contentItems.createdAt,
      })
      .from(contentItems)
      .where(
        and(
          eq(contentItems.shareToken, shareToken),
          eq(contentItems.visibility, 'UNLISTED')
        )
      )
      .limit(1);

    if (items.length > 0) {
      return NextResponse.json({ item: items[0], itemType: 'content' });
    }

    // 2. Thử tìm trong pages
    const pageItems = await db
      .select({
        id: pages.id,
        title: pages.title,
        slug: pages.slug,
        description: pages.description,
        coverImage: pages.coverImage,
        createdAt: pages.createdAt,
      })
      .from(pages)
      .where(
        and(
          eq(pages.shareToken, shareToken),
          eq(pages.visibility, 'UNLISTED')
        )
      )
      .limit(1);

    if (pageItems.length > 0) {
      return NextResponse.json({ item: pageItems[0], itemType: 'page' });
    }

    return NextResponse.json({ error: 'Nội dung chia sẻ không tồn tại hoặc đã bị thu hồi.' }, { status: 404 });
  } catch (error) {
    console.error('Lỗi lấy nội dung unlisted:', error);
    return NextResponse.json({ error: 'Không thể tải nội dung chia sẻ.' }, { status: 500 });
  }
}
