import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guard';
import { getDb, initializeDatabase } from '@/lib/db';
import { securityEvents } from '@/lib/db/schema';
import { eq, desc, or } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    await initializeDatabase();
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get('limit') || 50), 100);

    // SEC-27: Hiển thị cả sự kiện của chủ nhân lẫn các sự kiện không xác thực (như đăng nhập sai username)
    const events = await db
      .select()
      .from(securityEvents)
      .where(
        or(
          eq(securityEvents.profileId, auth.profile.id),
          eq(securityEvents.profileId, 'unknown')
        )
      )
      .orderBy(desc(securityEvents.createdAt))
      .limit(limit);

    return NextResponse.json({ events });
  } catch (error) {
    console.error('Lỗi lấy nhật ký bảo mật:', error);
    return NextResponse.json({ error: 'Không thể tải nhật ký bảo mật.' }, { status: 500 });
  }
}
