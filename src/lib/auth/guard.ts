import { NextResponse } from 'next/server';
import { getSessionFromCookies } from './session';
import { getDb, initializeDatabase } from '../db';
import { profiles, sessions, settings } from '../db/schema';
import { eq } from 'drizzle-orm';
import { getGuestSessionFromCookies } from './guest-session';

export type RequireOwnerResult =
  | { authorized: true; profile: typeof profiles.$inferSelect; session: typeof sessions.$inferSelect; response?: never }
  | { authorized: false; response: NextResponse; profile?: never; session?: never };

export async function requireOwner(): Promise<RequireOwnerResult> {
  const sessionData = await getSessionFromCookies();
  if (!sessionData) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Yêu cầu đăng nhập. Phiên làm việc không hợp lệ hoặc đã hết hạn.' },
        { status: 401 }
      ),
    };
  }

  return {
    authorized: true,
    profile: sessionData.profile,
    session: sessionData.session,
  };
}

export async function checkPublicAccessProtection(): Promise<{
  requirePassword: boolean;
  passwordHint?: string;
  hasValidGuestSession: boolean;
}> {
  await initializeDatabase();
  const db = getDb();

  const publicSettings = await db
    .select()
    .from(settings)
    .where(eq(settings.key, 'public_access'))
    .limit(1);

  if (publicSettings.length === 0) {
    return { requirePassword: false, hasValidGuestSession: true };
  }

  const config = publicSettings[0].valueJson as any;
  if (!config.requirePassword || !config.passwordHash) {
    return { requirePassword: false, hasValidGuestSession: true };
  }

  // Nếu là Owner đang đăng nhập, tự động bypass
  const ownerSession = await getSessionFromCookies();
  if (ownerSession) {
    return { requirePassword: true, passwordHint: config.passwordHint, hasValidGuestSession: true };
  }

  // Kiểm tra guest session token (đã tách rời hoàn toàn khỏi password hash)
  const isGuestValid = await getGuestSessionFromCookies();
  if (isGuestValid) {
    return { requirePassword: true, passwordHint: config.passwordHint, hasValidGuestSession: true };
  }

  return {
    requirePassword: true,
    passwordHint: config.passwordHint,
    hasValidGuestSession: false,
  };
}
