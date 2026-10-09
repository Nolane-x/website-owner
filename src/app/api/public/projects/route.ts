import { NextResponse } from 'next/server';
import { getDb, initializeDatabase } from '@/lib/db';
import { contentItems } from '@/lib/db/schema';
import { eq, and, desc, isNull } from 'drizzle-orm';
import { checkPublicAccessProtection } from '@/lib/auth/guard';
import { toPublicProject } from '@/lib/api/public-serializer';

export async function GET() {
  try {
    const access = await checkPublicAccessProtection();
    if (access.requirePassword && !access.hasValidGuestSession) {
      return NextResponse.json({ error: 'Yêu cầu mật mã truy cập.' }, { status: 403 });
    }

    await initializeDatabase();
    const db = getDb();

    const rawProjects = await db
      .select()
      .from(contentItems)
      .where(
        and(
          eq(contentItems.type, 'project'),
          eq(contentItems.visibility, 'PUBLIC'),
          eq(contentItems.status, 'PUBLISHED'),
          isNull(contentItems.deletedAt)
        )
      )
      .orderBy(desc(contentItems.isPinned), desc(contentItems.publishedAt));

    const projects = rawProjects.map(toPublicProject).filter(Boolean);

    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Lỗi API public projects:', error);
    return NextResponse.json({ error: 'Không thể tải danh sách dự án.' }, { status: 500 });
  }
}
