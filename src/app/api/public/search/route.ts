import { NextRequest, NextResponse } from 'next/server';
import { getDb, initializeDatabase } from '@/lib/db';
import { contentItems, pages } from '@/lib/db/schema';
import { eq, and, or, ilike, isNull } from 'drizzle-orm';
import { checkPublicAccessProtection } from '@/lib/auth/guard';
import { checkPublicApiRateLimit } from '@/lib/security/public-api-guard';

export async function GET(req: NextRequest) {
  const rateLimitResponse = checkPublicApiRateLimit(req, 'search', 20);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const access = await checkPublicAccessProtection();
    if (access.requirePassword && !access.hasValidGuestSession) {
      return NextResponse.json({ error: 'Yêu cầu mật mã truy cập.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');
    const trimmedQuery = query?.trim() || '';

    if (trimmedQuery.length > 80) {
      return NextResponse.json({ error: 'Từ khóa tìm kiếm tối đa 80 ký tự.' }, { status: 400 });
    }
    // Avoid turning a user search into an unrestricted SQL LIKE wildcard scan.
    if (trimmedQuery.includes('%') || trimmedQuery.includes('_') || trimmedQuery.includes('\\')) {
      return NextResponse.json({ error: 'Từ khóa không được chứa ký tự đại diện %, _ hoặc dấu gạch chéo ngược.' }, { status: 400 });
    }
    if (!trimmedQuery) return NextResponse.json({ results: [] });

    await initializeDatabase();
    const db = getDb();
    const q = `%${trimmedQuery}%`;

    // Only search public, published, non-deleted content.
    const matchingItems = await db
      .select({
        id: contentItems.id,
        title: contentItems.title,
        slug: contentItems.slug,
        type: contentItems.type,
        description: contentItems.description,
        coverImage: contentItems.coverImage,
        category: contentItems.category,
        tags: contentItems.tags,
        publishedAt: contentItems.publishedAt,
      })
      .from(contentItems)
      .where(
        and(
          eq(contentItems.visibility, 'PUBLIC'),
          eq(contentItems.status, 'PUBLISHED'),
          isNull(contentItems.deletedAt),
          or(ilike(contentItems.title, q), ilike(contentItems.description, q)),
        ),
      )
      .limit(20);

    const matchingPages = await db
      .select({
        id: pages.id,
        title: pages.title,
        slug: pages.slug,
        description: pages.description,
        coverImage: pages.coverImage,
        publishedAt: pages.publishedAt,
      })
      .from(pages)
      .where(
        and(
          eq(pages.visibility, 'PUBLIC'),
          eq(pages.status, 'PUBLISHED'),
          isNull(pages.deletedAt),
          or(ilike(pages.title, q), ilike(pages.description, q)),
        ),
      )
      .limit(10);

    const results = [
      ...matchingItems.map((item) => ({ ...item, resultType: 'content' as const })),
      ...matchingPages.map((page) => ({ ...page, type: 'page', resultType: 'page' as const })),
    ];
    return NextResponse.json({ results }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Lỗi tìm kiếm công khai:', error);
    return NextResponse.json({ error: 'Không thể thực hiện tìm kiếm.' }, { status: 500 });
  }
}
