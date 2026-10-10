import { NextResponse } from 'next/server';
import { getDb, initializeDatabase } from '@/lib/db';
import { collections } from '@/lib/db/schema';
import { eq, and, desc, isNull } from 'drizzle-orm';
import { checkPublicAccessProtection } from '@/lib/auth/guard';
import { checkPublicApiRateLimit } from '@/lib/security/public-api-guard';

export async function GET(req: Request) {
  try {
    const rateLimitResponse = checkPublicApiRateLimit(req, 'collections', 40);
    if (rateLimitResponse) return rateLimitResponse;
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
          eq(collections.status, 'PUBLISHED'),
          isNull(collections.deletedAt)
        )
      )
      .orderBy(desc(collections.isFeatured), desc(collections.createdAt))
      .limit(100);

    return NextResponse.json({ collections: publicCollections });
  } catch (error) {
    console.error('Lỗi API public collections:', error);
    return NextResponse.json({ error: 'Không thể tải bộ sưu tập.' }, { status: 500 });
  }
}
