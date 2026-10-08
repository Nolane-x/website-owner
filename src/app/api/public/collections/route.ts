import { NextResponse } from 'next/server';
import { getDb, initializeDatabase } from '@/lib/db';
import { collections } from '@/lib/db/schema';
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

    const publicCollections = await db
      .select({
        id: collections.id,
        name: collections.name,
        slug: collections.slug,
        description: collections.description,
        coverImage: collections.coverImage,
        icon: collections.icon,
        isFeatured: collections.isFeatured,
        createdAt: collections.createdAt,
      })
      .from(collections)
      .where(
        and(
          eq(collections.visibility, 'PUBLIC'),
          eq(collections.status, 'PUBLISHED')
        )
      )
      .orderBy(desc(collections.isFeatured), desc(collections.createdAt));

    return NextResponse.json({ collections: publicCollections });
  } catch (error) {
    console.error('Lỗi API public collections:', error);
    return NextResponse.json({ error: 'Không thể tải bộ sưu tập.' }, { status: 500 });
  }
}
