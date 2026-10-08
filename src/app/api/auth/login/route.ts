import { NextRequest, NextResponse } from 'next/server';
import { getDb, initializeDatabase } from '@/lib/db';
import { profiles, authCredentials } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyPassword } from '@/lib/auth/password';
import { createSession, setSessionCookie } from '@/lib/auth/session';
import { logSecurityEvent } from '@/lib/security/audit';
import { SECURITY_EVENT_TYPES } from '@/lib/security/constants';
import { rateLimiter, getClientIp } from '@/lib/security/rate-limit';
import { ensureSeedData } from '@/lib/db/seed';

export async function POST(req: NextRequest) {
  try {
    await ensureSeedData();
    const db = getDb();
    const ip = getClientIp(req.headers);
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    // Rate limiting: Tối đa 5 lần thử sai / phút theo IP
    const rateCheck = rateLimiter.check(`login:${ip}`, 5, 60);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Quá nhiều lần thử đăng nhập thất bại. Vui lòng đợi 1 phút và thử lại.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { username, password, isTrusted } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Vui lòng nhập tên đăng nhập và mật khẩu.' },
        { status: 400 }
      );
    }

    // Tìm tài khoản
    const userResult = await db
      .select({
        profile: profiles,
        credential: authCredentials,
      })
      .from(profiles)
      .innerJoin(authCredentials, eq(profiles.id, authCredentials.profileId))
      .where(eq(profiles.username, username.trim()))
      .limit(1);

    if (userResult.length === 0) {
      await logSecurityEvent('unknown', SECURITY_EVENT_TYPES.LOGIN_FAILED, { username: username.trim(), reason: 'Không tìm thấy tài khoản' }, ip, userAgent);
      return NextResponse.json(
        { error: 'Tên đăng nhập hoặc mật khẩu không chính xác.' },
        { status: 401 }
      );
    }

    const { profile, credential } = userResult[0];

    // Xác thực mật khẩu
    const isValid = await verifyPassword(password, credential.passwordHash);
    if (!isValid) {
      await logSecurityEvent(profile.id, SECURITY_EVENT_TYPES.LOGIN_FAILED, { username: profile.username, reason: 'Mật khẩu sai' }, ip, userAgent);
      return NextResponse.json(
        { error: 'Tên đăng nhập hoặc mật khẩu không chính xác.' },
        { status: 401 }
      );
    }

    // Tạo phiên đăng nhập bảo mật
    const { token, expiresAt } = await createSession(
      profile.id,
      ip,
      userAgent,
      Boolean(isTrusted)
    );

    await setSessionCookie(token, expiresAt);
    await logSecurityEvent(profile.id, SECURITY_EVENT_TYPES.LOGIN_SUCCESS, { isTrusted: Boolean(isTrusted) }, ip, userAgent);

    // Reset rate limiter khi thành công
    rateLimiter.reset(`login:${ip}`);

    return NextResponse.json({
      success: true,
      profile: {
        id: profile.id,
        username: profile.username,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        bio: profile.bio,
      },
    });
  } catch (error: any) {
    console.error('Lỗi API đăng nhập:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi trong quá trình xử lý đăng nhập. Vui lòng thử lại.' },
      { status: 500 }
    );
  }
}
