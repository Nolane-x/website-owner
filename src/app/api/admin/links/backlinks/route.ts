import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guard';
import { getDb, initializeDatabase } from '@/lib/db';
import { contentItems, contentLinks } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const targetId = searchParams.get('targetId');

    if (!targetId) {
      return NextResponse.json({ error: 'Mã targetId là bắt buộc.' }, { status: 400 });
    }

    await initializeDatabase();
    const db = getDb();

    // Truy vấn các mục nguồn đang trỏ tới targetId
    const rows = await db
      .select({
        id: contentItems.id,
        title: contentItems.title,
        slug: contentItems.slug,
        type: contentItems.type,
        createdAt: contentLinks.createdAt,
      })
      .from(contentLinks)
      .innerJoin(contentItems, eq(contentLinks.sourceId, contentItems.id))
      .where(
        and(
          eq(contentLinks.targetId, targetId),
          eq(contentItems.profileId, auth.profile.id),
          isNull(contentItems.deletedAt)
        )
      );

    return NextResponse.json({ backlinks: rows });
  } catch (error) {
    console.error('Lỗi lấy danh sách liên kết ngược:', error);
    return NextResponse.json({ error: 'Không thể tải danh sách liên kết ngược.' }, { status: 500 });
  }
}
