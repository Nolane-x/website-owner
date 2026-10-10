import { NextRequest, NextResponse } from 'next/server';
import { getDb, initializeDatabase } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { profiles, settings } from '@/lib/db/schema';
import { verifyPassword } from '@/lib/auth/password';
import { createGuestSession, setGuestSessionCookie } from '@/lib/auth/guest-session';
import { rateLimiter, getClientIp } from '@/lib/security/rate-limit';
import { assertValidOrigin } from '@/lib/security/origin-guard';
import { BoundedRequestBodyTooLargeError, InvalidBoundedRequestBodyError, readBoundedRequestText } from '@/lib/security/bounded-request-body';

export async function POST(req: NextRequest) {
  const originError = assertValidOrigin(req);
  if (originError) return originError;

  try {
    const ip = getClientIp(req.headers);
    const rateCheck = rateLimiter.check(`guest-pwd:${ip}`, 5, 60);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Quá nhiều lần thử mật khẩu khách. Vui lòng thử lại sau 1 phút.' },
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
    const { password } = parsedBody as { password?: unknown };

    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Vui lòng nhập mật khẩu khách.' }, { status: 400 });
    }

    if (Buffer.byteLength(password, 'utf8') > 72) {
      return NextResponse.json({ error: 'Mật mã khách không chính xác.' }, { status: 401 });
    }

    await initializeDatabase();
    const db = getDb();

    const ownerProfiles = await db.select({ id: profiles.id }).from(profiles).orderBy(profiles.createdAt).limit(1);
    const ownerId = ownerProfiles[0]?.id;
    if (!ownerId) {
      return NextResponse.json({ success: true, message: 'Website không yêu cầu mật khẩu.' });
    }

    const publicSettings = await db
      .select()
      .from(settings)
      .where(and(eq(settings.key, 'public_access'), eq(settings.profileId, ownerId)))
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
