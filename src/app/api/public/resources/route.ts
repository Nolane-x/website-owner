import { NextRequest, NextResponse } from 'next/server';
import { getDb, initializeDatabase } from '@/lib/db';
import { contentItems } from '@/lib/db/schema';
import { eq, and, desc, or, isNull, type SQL } from 'drizzle-orm';
import { checkPublicAccessProtection } from '@/lib/auth/guard';
import { checkPublicApiRateLimit } from '@/lib/security/public-api-guard';
import { toPublicResource } from '@/lib/api/public-serializer';

export async function GET(req: NextRequest) {
  try {
    const rateLimitResponse = checkPublicApiRateLimit(req, 'resources', 40);
    if (rateLimitResponse) return rateLimitResponse;
    const access = await checkPublicAccessProtection();
    if (access.requirePassword && !access.hasValidGuestSession) {
      return NextResponse.json({ error: 'Yêu cầu mật mã truy cập.' }, { status: 403 });
    }

    await initializeDatabase();
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');

    const conditions: SQL[] = [
      or(eq(contentItems.type, 'resource'), eq(contentItems.type, 'link'))!,
      eq(contentItems.visibility, 'PUBLIC'),
      eq(contentItems.status, 'PUBLISHED'),
      isNull(contentItems.deletedAt),
    ];

    if (category) {
      conditions.push(eq(contentItems.category, category));
    }

    const rawResources = await db
      .select()
      .from(contentItems)
      .where(and(...conditions))
      .orderBy(desc(contentItems.isPinned), desc(contentItems.publishedAt))
      .limit(100);

    const resources = rawResources
      .map((r) => toPublicResource(r as unknown as Record<string, unknown>))
      .filter((r): r is NonNullable<typeof r> => r !== null);

    return NextResponse.json({ resources });
  } catch (error) {
    console.error('Lỗi API public resources:', error);
    return NextResponse.json({ error: 'Không thể tải danh sách tài nguyên.' }, { status: 500 });
  }
}
