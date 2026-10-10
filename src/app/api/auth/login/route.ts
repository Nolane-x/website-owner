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
import { assertValidOrigin } from '@/lib/security/origin-guard';
import { BoundedRequestBodyTooLargeError, InvalidBoundedRequestBodyError, readBoundedRequestText } from '@/lib/security/bounded-request-body';

export async function POST(req: NextRequest) {
  // P0.5: CSRF / Origin Guard
  const originError = assertValidOrigin(req);
  if (originError) return originError;

  try {
    const ip = getClientIp(req.headers);
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    // Reject abusive calls and oversized bodies before initializing or querying the database.
    const rateCheck = rateLimiter.check(`login:${ip}`, 5, 60);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Quá nhiều lần thử đăng nhập thất bại. Vui lòng đợi 1 phút và thử lại.' },
        { status: 429 }
      );
    }

    let parsedBody: unknown;
    try {
      const rawBody = await readBoundedRequestText(req, 8 * 1024);
      parsedBody = JSON.parse(rawBody) as unknown;
    } catch (error) {
      if (error instanceof BoundedRequestBodyTooLargeError) {
        return NextResponse.json({ error: 'Yêu cầu vượt quá giới hạn 8 KiB.' }, { status: 413 });
      }
      if (error instanceof InvalidBoundedRequestBodyError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ error: 'Nội dung yêu cầu không phải JSON hợp lệ.' }, { status: 400 });
    }

    if (!parsedBody || typeof parsedBody !== 'object' || Array.isArray(parsedBody)) {
      return NextResponse.json({ error: 'Nội dung yêu cầu phải là một object JSON.' }, { status: 400 });
    }
    const { username, password, isTrusted } = parsedBody as {
      username?: unknown;
      password?: unknown;
      isTrusted?: unknown;
    };

    if (!username || !password || typeof username !== 'string' || typeof password !== 'string' ||
        (isTrusted !== undefined && typeof isTrusted !== 'boolean')) {
      return NextResponse.json(
        { error: 'Vui lòng nhập tên đăng nhập và mật khẩu hợp lệ.' },
        { status: 400 }
      );
    }

    // F2-06: Giới hạn độ dài tránh cạn kiệt CPU và tương thích giới hạn 72 bytes của bcrypt
    if (username.length > 64 || Buffer.byteLength(password, 'utf8') > 72) {
      return NextResponse.json(
        { error: 'Tên đăng nhập hoặc mật khẩu không chính xác.' },
        { status: 401 }
      );
    }

    await initializeDatabase();
    if (process.env.NODE_ENV !== 'production') {
      await ensureSeedData();
    }
    const db = getDb();

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
      // SEC-26: Constant-time dummy verify chống tấn công độ trễ đoán username
      const DUMMY_HASH = '$2a$12$000000000000000000000uJ4v4cZzN7e01hV2v7X0oO1K7d1pX2gS';
      await verifyPassword(password, DUMMY_HASH);
      // SEC-12: Giới hạn độ dài username khi ghi audit
      await logSecurityEvent('unknown', SECURITY_EVENT_TYPES.LOGIN_FAILED, { username: String(username).trim().slice(0, 32), reason: 'Thông tin đăng nhập không chính xác' }, ip, userAgent);
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
  } catch (error) {
    console.error('Lỗi API đăng nhập:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi trong quá trình xử lý đăng nhập. Vui lòng thử lại.' },
      { status: 500 }
    );
  }
}
