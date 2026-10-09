import { NextRequest, NextResponse } from 'next/server';
import { getDb, initializeDatabase } from '@/lib/db';
import { contentItems, pages, contentBlocks } from '@/lib/db/schema';
import { eq, and, isNull, asc } from 'drizzle-orm';
import { toPublicContent, toPublicPage, toPublicBlock } from '@/lib/api/public-serializer';

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

    // 1. Thử tìm trong contentItems với visibility='UNLISTED' và chưa bị xóa
    const items = await db
      .select()
      .from(contentItems)
      .where(
        and(
          eq(contentItems.shareToken, shareToken),
          eq(contentItems.visibility, 'UNLISTED'),
          isNull(contentItems.deletedAt)
        )
      )
      .limit(1);

    if (items.length > 0) {
      const publicItem = toPublicContent(items[0] as unknown as Record<string, unknown>);
      return NextResponse.json({ item: publicItem, itemType: 'content' });
    }

    // 2. Thử tìm trong pages với visibility='UNLISTED' và chưa bị xóa
    const pageItems = await db
      .select()
      .from(pages)
      .where(
        and(
          eq(pages.shareToken, shareToken),
          eq(pages.visibility, 'UNLISTED'),
          isNull(pages.deletedAt)
        )
      )
      .limit(1);

    if (pageItems.length > 0) {
      const rawPage = pageItems[0];
      const rawBlocks = await db
        .select()
        .from(contentBlocks)
        .where(eq(contentBlocks.pageId, rawPage.id))
        .orderBy(asc(contentBlocks.sortOrder));

      const publicBlocks = rawBlocks.map((b) => toPublicBlock(b as unknown as Record<string, unknown>)).filter(Boolean);
      const publicPage = toPublicPage(
        rawPage as unknown as Record<string, unknown>,
        rawBlocks as unknown as Array<Record<string, unknown>>
      );

      return NextResponse.json({
        item: publicPage,
        blocks: publicBlocks,
        itemType: 'page',
      });
    }

    return NextResponse.json({ error: 'Nội dung chia sẻ không tồn tại hoặc đã bị thu hồi.' }, { status: 404 });
  } catch (error) {
    console.error('Lỗi lấy nội dung unlisted:', error);
    return NextResponse.json({ error: 'Không thể tải nội dung chia sẻ.' }, { status: 500 });
  }
}
