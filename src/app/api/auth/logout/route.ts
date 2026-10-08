import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies, revokeSession, clearSessionCookie } from '@/lib/auth/session';
import { logSecurityEvent } from '@/lib/security/audit';
import { SECURITY_EVENT_TYPES } from '@/lib/security/constants';
import { getClientIp } from '@/lib/security/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const sessionData = await getSessionFromCookies();
    const ip = getClientIp(req.headers);
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    if (sessionData) {
      await revokeSession(sessionData.session.id, sessionData.profile.id);
      await logSecurityEvent(sessionData.profile.id, SECURITY_EVENT_TYPES.LOGOUT, null, ip, userAgent);
    }

    await clearSessionCookie();

    return NextResponse.json({ success: true, message: 'Đã đăng xuất thành công.' });
  } catch (error) {
    console.error('Lỗi khi đăng xuất:', error);
    await clearSessionCookie();
    return NextResponse.json({ success: true });
  }
}
