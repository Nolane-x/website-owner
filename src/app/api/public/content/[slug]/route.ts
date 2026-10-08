import { NextRequest, NextResponse } from 'next/server';
import { getDb, initializeDatabase } from '@/lib/db';
import { contentItems } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
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

    // CHỈ QUERY NỘI DUNG PUBLIC VÀ PUBLISHED
    const items = await db
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
        publishedAt: contentItems.publishedAt,
      })
      .from(contentItems)
      .where(
        and(
          eq(contentItems.slug, slug),
          eq(contentItems.visibility, 'PUBLIC'),
          eq(contentItems.status, 'PUBLISHED')
        )
      )
      .limit(1);

    if (items.length === 0) {
      // 404 bảo mật: Không tiết lộ nếu slug đó có tồn tại ở dạng Private/Draft
      return NextResponse.json({ error: 'Nội dung không tồn tại hoặc chưa được xuất bản.' }, { status: 404 });
    }

    return NextResponse.json({ item: items[0] });
  } catch (error) {
    console.error('Lỗi lấy bài viết công khai:', error);
    return NextResponse.json({ error: 'Không thể tải nội dung.' }, { status: 500 });
  }
}
