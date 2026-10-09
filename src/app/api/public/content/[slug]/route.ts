import { NextRequest, NextResponse } from 'next/server';
import { getDb, initializeDatabase } from '@/lib/db';
import { contentItems } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { checkPublicAccessProtection } from '@/lib/auth/guard';
import { toPublicContent } from '@/lib/api/public-serializer';

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

    // PUB-01 & PUB-11: CHỈ QUERY NỘI DUNG PUBLIC, PUBLISHED VÀ KHÔNG BỊ XÓA (NOT DELETED)
    const items = await db
      .select()
      .from(contentItems)
      .where(
        and(
          eq(contentItems.slug, slug),
          eq(contentItems.visibility, 'PUBLIC'),
          eq(contentItems.status, 'PUBLISHED'),
          isNull(contentItems.deletedAt)
        )
      )
      .limit(1);

    if (items.length === 0) {
      // 404 bảo mật: Không tiết lộ nếu slug đó có tồn tại ở dạng Private/Draft
      return NextResponse.json({ error: 'Nội dung không tồn tại hoặc chưa được xuất bản.' }, { status: 404 });
    }

    const publicItem = toPublicContent(items[0] as unknown as Record<string, unknown>);
    if (!publicItem) {
      return NextResponse.json({ error: 'Nội dung không tồn tại hoặc chưa được xuất bản.' }, { status: 404 });
    }

    return NextResponse.json({ item: publicItem });
  } catch (error) {
    console.error('Lỗi lấy bài viết công khai:', error);
    return NextResponse.json({ error: 'Không thể tải nội dung.' }, { status: 500 });
  }
}
