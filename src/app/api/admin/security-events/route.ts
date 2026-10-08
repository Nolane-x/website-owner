import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guard';
import { getDb, initializeDatabase } from '@/lib/db';
import { securityEvents } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    await initializeDatabase();
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get('limit') || 50), 100);

    const events = await db
      .select()
      .from(securityEvents)
      .where(eq(securityEvents.profileId, auth.profile.id))
      .orderBy(desc(securityEvents.createdAt))
      .limit(limit);

    return NextResponse.json({ events });
  } catch (error) {
    console.error('Lỗi lấy nhật ký bảo mật:', error);
    return NextResponse.json({ error: 'Không thể tải nhật ký bảo mật.' }, { status: 500 });
  }
}
