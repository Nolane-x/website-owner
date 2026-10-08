import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies, revokeSession } from '@/lib/auth/session';
import { getDb, initializeDatabase } from '@/lib/db';
import { sessions } from '@/lib/db/schema';
import { eq, and, desc, gt } from 'drizzle-orm';
import { logSecurityEvent } from '@/lib/security/audit';
import { SECURITY_EVENT_TYPES } from '@/lib/security/constants';
import { getClientIp } from '@/lib/security/rate-limit';

export async function GET() {
  try {
    const sessionData = await getSessionFromCookies();
    if (!sessionData) {
      return NextResponse.json({ error: 'Yêu cầu đăng nhập.' }, { status: 401 });
    }

    await initializeDatabase();
    const db = getDb();
    const now = new Date();

    const activeSessions = await db
      .select({
        id: sessions.id,
        ipAddress: sessions.ipAddress,
        userAgent: sessions.userAgent,
        isTrusted: sessions.isTrusted,
        createdAt: sessions.createdAt,
        lastActiveAt: sessions.lastActiveAt,
        expiresAt: sessions.expiresAt,
      })
      .from(sessions)
      .where(
        and(
          eq(sessions.profileId, sessionData.profile.id),
          eq(sessions.isRevoked, false),
          gt(sessions.expiresAt, now)
        )
      )
      .orderBy(desc(sessions.lastActiveAt));

    const result = activeSessions.map((s: typeof activeSessions[0]) => ({
      ...s,
      isCurrent: s.id === sessionData.session.id,
    }));

    return NextResponse.json({ sessions: result });
  } catch (error) {
    console.error('Lỗi lấy danh sách phiên:', error);
    return NextResponse.json({ error: 'Không thể lấy danh sách phiên đăng nhập.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const sessionData = await getSessionFromCookies();
    if (!sessionData) {
      return NextResponse.json({ error: 'Yêu cầu đăng nhập.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('id');

    if (!sessionId) {
      return NextResponse.json({ error: 'Thiếu ID phiên cần xóa.' }, { status: 400 });
    }

    await revokeSession(sessionId, sessionData.profile.id);
    const ip = getClientIp(req.headers);
    const userAgent = req.headers.get('user-agent') || 'Unknown';
    await logSecurityEvent(sessionData.profile.id, SECURITY_EVENT_TYPES.SESSION_REVOKED, { revokedSessionId: sessionId }, ip, userAgent);

    return NextResponse.json({ success: true, message: 'Đã hủy phiên làm việc thành công.' });
  } catch (error) {
    console.error('Lỗi khi hủy phiên:', error);
    return NextResponse.json({ error: 'Không thể hủy phiên làm việc.' }, { status: 500 });
  }
}
