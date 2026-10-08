import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies, revokeAllSessions, clearSessionCookie } from '@/lib/auth/session';
import { logSecurityEvent } from '@/lib/security/audit';
import { SECURITY_EVENT_TYPES } from '@/lib/security/constants';
import { getClientIp } from '@/lib/security/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const sessionData = await getSessionFromCookies();
    const ip = getClientIp(req.headers);
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    if (!sessionData) {
      await clearSessionCookie();
      return NextResponse.json({ error: 'Chưa đăng nhập.' }, { status: 401 });
    }

    await revokeAllSessions(sessionData.profile.id);
    await logSecurityEvent(sessionData.profile.id, SECURITY_EVENT_TYPES.LOGOUT_ALL, null, ip, userAgent);
    await clearSessionCookie();

    return NextResponse.json({ success: true, message: 'Đã hủy toàn bộ các phiên đăng nhập trên tất cả thiết bị.' });
  } catch (error) {
    console.error('Lỗi khi đăng xuất tất cả:', error);
    return NextResponse.json({ error: 'Không thể đăng xuất tất cả thiết bị.' }, { status: 500 });
  }
}
