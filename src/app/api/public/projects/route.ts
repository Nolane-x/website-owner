import { NextResponse } from 'next/server';
import { getDb, initializeDatabase } from '@/lib/db';
import { contentItems } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { checkPublicAccessProtection } from '@/lib/auth/guard';

export async function GET() {
  try {
    const access = await checkPublicAccessProtection();
    if (access.requirePassword && !access.hasValidGuestSession) {
      return NextResponse.json({ error: 'Yêu cầu mật mã truy cập.' }, { status: 403 });
    }

    await initializeDatabase();
    const db = getDb();

    const projects = await db
      .select({
        id: contentItems.id,
        title: contentItems.title,
        slug: contentItems.slug,
        description: contentItems.description,
        coverImage: contentItems.coverImage,
        tags: contentItems.tags,
        category: contentItems.category,
        metadata: contentItems.metadata,
        isFeatured: contentItems.isFeatured,
        publishedAt: contentItems.publishedAt,
      })
      .from(contentItems)
      .where(
        and(
          eq(contentItems.type, 'project'),
          eq(contentItems.visibility, 'PUBLIC'),
          eq(contentItems.status, 'PUBLISHED')
        )
      )
      .orderBy(desc(contentItems.isPinned), desc(contentItems.publishedAt));

    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Lỗi API public projects:', error);
    return NextResponse.json({ error: 'Không thể tải danh sách dự án.' }, { status: 500 });
  }
}
