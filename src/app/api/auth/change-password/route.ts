import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/auth/session';
import { getDb, initializeDatabase } from '@/lib/db';
import { authCredentials } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyPassword, hashPassword } from '@/lib/auth/password';
import { logSecurityEvent } from '@/lib/security/audit';
import { SECURITY_EVENT_TYPES } from '@/lib/security/constants';
import { rateLimiter, getClientIp } from '@/lib/security/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const sessionData = await getSessionFromCookies();
    const ip = getClientIp(req.headers);
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    if (!sessionData) {
      return NextResponse.json({ error: 'Yêu cầu đăng nhập để đổi mật khẩu.' }, { status: 401 });
    }

    const rateCheck = rateLimiter.check(`change-pwd:${sessionData.profile.id}`, 3, 60);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Vui lòng đợi 1 phút trước khi thử đổi mật khẩu lại.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Vui lòng điền đầy đủ mật khẩu hiện tại và mật khẩu mới.' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Mật khẩu mới phải có ít nhất 8 ký tự.' },
        { status: 400 }
      );
    }

    await initializeDatabase();
    const db = getDb();

    // Lấy mật khẩu cũ
    const credResult = await db
      .select()
      .from(authCredentials)
      .where(eq(authCredentials.profileId, sessionData.profile.id))
      .limit(1);

    if (credResult.length === 0) {
      return NextResponse.json({ error: 'Không tìm thấy hồ sơ bảo mật.' }, { status: 404 });
    }

    const currentCred = credResult[0];
    const isMatch = await verifyPassword(currentPassword, currentCred.passwordHash);
    if (!isMatch) {
      await logSecurityEvent(sessionData.profile.id, 'change_password_failed', { reason: 'Mật khẩu hiện tại không đúng' }, ip, userAgent);
      return NextResponse.json({ error: 'Mật khẩu hiện tại không chính xác.' }, { status: 400 });
    }

    const newHash = await hashPassword(newPassword);

    await db
      .update(authCredentials)
      .set({
        passwordHash: newHash,
        updatedAt: new Date(),
      })
      .where(eq(authCredentials.profileId, sessionData.profile.id));

    await logSecurityEvent(sessionData.profile.id, SECURITY_EVENT_TYPES.PASSWORD_CHANGED, null, ip, userAgent);

    return NextResponse.json({
      success: true,
      message: 'Mật khẩu đã được thay đổi thành công.',
    });
  } catch (error) {
    console.error('Lỗi khi đổi mật khẩu:', error);
    return NextResponse.json({ error: 'Không thể đổi mật khẩu. Vui lòng thử lại.' }, { status: 500 });
  }
}
