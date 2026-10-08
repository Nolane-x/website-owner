import { NextRequest, NextResponse } from 'next/server';
import { getDb, initializeDatabase } from '@/lib/db';
import { contentItems } from '@/lib/db/schema';
import { eq, and, desc, or } from 'drizzle-orm';
import { checkPublicAccessProtection } from '@/lib/auth/guard';

export async function GET(req: NextRequest) {
  try {
    const access = await checkPublicAccessProtection();
    if (access.requirePassword && !access.hasValidGuestSession) {
      return NextResponse.json({ error: 'Yêu cầu mật mã truy cập.' }, { status: 403 });
    }

    await initializeDatabase();
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');

    const conditions: any[] = [
      or(eq(contentItems.type, 'resource'), eq(contentItems.type, 'link')),
      eq(contentItems.visibility, 'PUBLIC'),
      eq(contentItems.status, 'PUBLISHED'),
    ];

    if (category) {
      conditions.push(eq(contentItems.category, category));
    }

    const resources = await db
      .select({
        id: contentItems.id,
        title: contentItems.title,
        slug: contentItems.slug,
        type: contentItems.type,
        description: contentItems.description,
        coverImage: contentItems.coverImage,
        tags: contentItems.tags,
        category: contentItems.category,
        metadata: contentItems.metadata,
        isFeatured: contentItems.isFeatured,
        publishedAt: contentItems.publishedAt,
      })
      .from(contentItems)
      .where(and(...conditions))
      .orderBy(desc(contentItems.isPinned), desc(contentItems.publishedAt));

    return NextResponse.json({ resources });
  } catch (error) {
    console.error('Lỗi API public resources:', error);
    return NextResponse.json({ error: 'Không thể tải danh sách tài nguyên.' }, { status: 500 });
  }
}
