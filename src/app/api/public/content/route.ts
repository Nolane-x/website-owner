import { NextRequest, NextResponse } from 'next/server';
import { getDb, initializeDatabase } from '@/lib/db';
import { contentItems } from '@/lib/db/schema';
import { eq, and, desc, isNull } from 'drizzle-orm';
import { checkPublicAccessProtection } from '@/lib/auth/guard';
import { toPublicContent } from '@/lib/api/public-serializer';

export async function GET(req: NextRequest) {
  try {
    const access = await checkPublicAccessProtection();
    if (access.requirePassword && !access.hasValidGuestSession) {
      return NextResponse.json(
        { error: 'Yêu cầu mật mã truy cập cho khách.' },
        { status: 403 }
      );
    }

    await initializeDatabase();
    const db = getDb();
    const { searchParams } = new URL(req.url);

    const type = searchParams.get('type');
    const isFeatured = searchParams.get('isFeatured');

    // NGUYÊN TẮC BẢO MẬT: BẮT BUỘC KHÓA Ở CẤP TRUY VẤN DATABASE!
    const conditions: any[] = [
      eq(contentItems.visibility, 'PUBLIC'),
      eq(contentItems.status, 'PUBLISHED'),
      isNull(contentItems.deletedAt),
    ];

    if (type) conditions.push(eq(contentItems.type, type));
    if (isFeatured === 'true') conditions.push(eq(contentItems.isFeatured, true));

    const rawItems = await db
      .select()
      .from(contentItems)
      .where(and(...conditions))
      .orderBy(desc(contentItems.isPinned), desc(contentItems.publishedAt));

    const items = rawItems.map(toPublicContent).filter(Boolean);

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Lỗi API public content:', error);
    return NextResponse.json({ error: 'Không thể tải nội dung công khai.' }, { status: 500 });
  }
}
