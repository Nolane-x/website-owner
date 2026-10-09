import { NextRequest, NextResponse } from 'next/server';
import { getDb, initializeDatabase } from '@/lib/db';
import { pages, contentBlocks } from '@/lib/db/schema';
import { eq, and, asc, isNull } from 'drizzle-orm';
import { checkPublicAccessProtection } from '@/lib/auth/guard';
import { toPublicPage, toPublicBlock } from '@/lib/api/public-serializer';

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

    // CHỈ QUERY TRANG CÔNG KHAI, ĐÃ XUẤT BẢN VÀ CHƯA BỊ XÓA (SOFT DELETE)
    const pageResult = await db
      .select()
      .from(pages)
      .where(
        and(
          eq(pages.slug, slug),
          eq(pages.visibility, 'PUBLIC'),
          eq(pages.status, 'PUBLISHED'),
          isNull(pages.deletedAt)
        )
      )
      .limit(1);

    if (pageResult.length === 0) {
      return NextResponse.json({ error: 'Trang không tồn tại hoặc chưa được xuất bản.' }, { status: 404 });
    }

    const pageRaw = pageResult[0];

    const rawBlocks = await db
      .select()
      .from(contentBlocks)
      .where(eq(contentBlocks.pageId, pageRaw.id))
      .orderBy(asc(contentBlocks.sortOrder));

    const publicBlocks = rawBlocks.map((b) => toPublicBlock(b as unknown as Record<string, unknown>)).filter(Boolean);
    const publicPage = toPublicPage(pageRaw as unknown as Record<string, unknown>, rawBlocks as unknown as Array<Record<string, unknown>>);

    return NextResponse.json({
      page: publicPage,
      blocks: publicBlocks,
    });
  } catch (error) {
    console.error('Lỗi API public page:', error);
    return NextResponse.json({ error: 'Không thể tải trang.' }, { status: 500 });
  }
}
