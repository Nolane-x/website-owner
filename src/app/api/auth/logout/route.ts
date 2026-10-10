import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies, revokeSession, clearSessionCookie } from '@/lib/auth/session';
import { logSecurityEvent } from '@/lib/security/audit';
import { SECURITY_EVENT_TYPES } from '@/lib/security/constants';
import { getClientIp } from '@/lib/security/rate-limit';
import { assertValidOrigin } from '@/lib/security/origin-guard';

export async function POST(req: NextRequest) {
  const originError = assertValidOrigin(req);
  if (originError) return originError;
  try {
    const sessionData = await getSessionFromCookies();
    const ip = getClientIp(req.headers);
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    if (sessionData) {
      const revoked = await revokeSession(sessionData.session.id, sessionData.profile.id);
      if (!revoked) {
        await clearSessionCookie();
        return NextResponse.json(
          { success: false, error: 'Không thể thu hồi phiên làm việc trên cơ sở dữ liệu.' },
          { status: 500 }
        );
      }
      await logSecurityEvent(sessionData.profile.id, SECURITY_EVENT_TYPES.LOGOUT, null, ip, userAgent);
    }

    await clearSessionCookie();

    return NextResponse.json({ success: true, message: 'Đã đăng xuất thành công.' });
  } catch (error) {
    console.error('Lỗi khi đăng xuất:', error);
    await clearSessionCookie();
    return NextResponse.json(
      { success: false, error: 'Lỗi máy chủ khi đăng xuất.' },
      { status: 500 }
    );
  }
}
