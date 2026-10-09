import { NextRequest, NextResponse } from 'next/server';
import { getDb, initializeDatabase } from '@/lib/db';
import { settings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyPassword } from '@/lib/auth/password';
import { createGuestSession, setGuestSessionCookie } from '@/lib/auth/guest-session';
import { rateLimiter, getClientIp } from '@/lib/security/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    const rateCheck = rateLimiter.check(`guest-pwd:${ip}`, 5, 60);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Quá nhiều lần thử mật khẩu khách. Vui lòng thử lại sau 1 phút.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json({ error: 'Vui lòng nhập mật khẩu khách.' }, { status: 400 });
    }

    await initializeDatabase();
    const db = getDb();

    const publicSettings = await db
      .select()
      .from(settings)
      .where(eq(settings.key, 'public_access'))
      .limit(1);

    if (publicSettings.length === 0) {
      return NextResponse.json({ success: true, message: 'Website không yêu cầu mật khẩu.' });
    }

    interface PublicAccessConfig {
      requirePassword?: boolean;
      passwordHash?: string;
    }
    const config = (publicSettings[0].valueJson || {}) as PublicAccessConfig;
    if (!config.requirePassword || !config.passwordHash) {
      return NextResponse.json({ success: true, message: 'Website không yêu cầu mật khẩu.' });
    }

    const isMatch = await verifyPassword(password, config.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ error: 'Mật mã khách không chính xác.' }, { status: 401 });
    }

    // RULE V: Tuyệt đối không lưu hash mật mã khách vào cookie!
    // Tạo random 256-bit guest session token và lưu SHA-256 hash tại bảng guest_sessions
    const userAgent = req.headers.get('user-agent') || 'Unknown';
    const { token, expiresAt } = await createGuestSession(ip, userAgent);
    await setGuestSessionCookie(token, expiresAt);

    return NextResponse.json({ success: true, message: 'Mở khóa thành công.' });
  } catch (error) {
    console.error('Lỗi xác thực mật mã khách:', error);
    return NextResponse.json({ error: 'Không thể xác thực mật mã khách.' }, { status: 500 });
  }
}
