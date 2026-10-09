import crypto from 'crypto';
import { cookies } from 'next/headers';
import { getDb, initializeDatabase } from '../db';
import { guestSessions } from '../db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { COOKIE_GUEST_SESSION_NAME } from '../security/constants';

export function hashGuestToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateGuestToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Tạo phiên truy cập cho khách sau khi xác thực mật mã khách đúng
 * Tuyệt đối không lưu hash mật mã khách vào cookie
 */
export async function createGuestSession(
  ipAddress?: string | null,
  userAgent?: string | null
): Promise<{ token: string; expiresAt: Date }> {
  await initializeDatabase();
  const db = getDb();

  const token = generateGuestToken();
  const tokenHash = hashGuestToken(token);
  const sessionId = crypto.randomUUID();

  // Khách được cấp phiên 7 ngày
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await db.insert(guestSessions).values({
    id: sessionId,
    tokenHash,
    createdAt: new Date(),
    expiresAt,
    lastActiveAt: new Date(),
    ipAddress: ipAddress || null,
    userAgent: userAgent || null,
  });

  return { token, expiresAt };
}

/**
 * Xác thực token phiên khách từ cookie
 */
export async function validateGuestToken(token: string): Promise<boolean> {
  if (!token) return false;
  await initializeDatabase();
  const db = getDb();

  const tokenHash = hashGuestToken(token);
  const now = new Date();

  const results = await db
    .select()
    .from(guestSessions)
    .where(
      and(
        eq(guestSessions.tokenHash, tokenHash),
        isNull(guestSessions.revokedAt)
      )
    )
    .limit(1);

  if (!results || results.length === 0) {
    return false;
  }

  const session = results[0];
  if (new Date(session.expiresAt) <= now) {
    return false;
  }

  // Cập nhật lastActiveAt
  await db
    .update(guestSessions)
    .set({ lastActiveAt: new Date() })
    .where(eq(guestSessions.id, session.id));

  return true;
}

/**
 * Thu hồi tất cả các phiên khách (khi chủ nhân đổi mật mã khách hoặc hủy quyền)
 */
export async function revokeAllGuestSessions(): Promise<boolean> {
  await initializeDatabase();
  const db = getDb();

  await db
    .update(guestSessions)
    .set({ revokedAt: new Date() })
    .where(isNull(guestSessions.revokedAt));

  return true;
}

export async function getGuestSessionFromCookies(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_GUEST_SESSION_NAME)?.value;
  if (!token) return false;

  return await validateGuestToken(token);
}

export async function setGuestSessionCookie(token: string, expiresAt: Date) {
  const cookieStore = await cookies();
  cookieStore.set({
    name: COOKIE_GUEST_SESSION_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

export async function clearGuestSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set({
    name: COOKIE_GUEST_SESSION_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}
