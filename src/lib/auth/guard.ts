import { NextResponse } from 'next/server';
import { getSessionFromCookies, type AuthenticatedProfile, type AuthenticatedSession } from './session';
import { getDb, initializeDatabase } from '../db';
import { profiles, settings } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { getGuestSessionFromCookies } from './guest-session';

export type RequireOwnerResult =
  | { authorized: true; profile: AuthenticatedProfile; session: AuthenticatedSession; response?: never }
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

export interface PreloadedPublicAccess {
  ownerProfileId: string | null;
  settingValue?: unknown;
}

export async function checkPublicAccessProtection(preloaded?: PreloadedPublicAccess): Promise<{
  requirePassword: boolean;
  passwordHint?: string;
  hasValidGuestSession: boolean;
}> {
  let ownerId: string | null | undefined;
  let settingValue: unknown;
  let hasSetting = false;

  if (preloaded) {
    // Reuse fields the caller has already fetched; avoid duplicate owner/settings reads.
    ownerId = preloaded.ownerProfileId;
    settingValue = preloaded.settingValue;
    hasSetting = preloaded.settingValue !== undefined;
  } else {
    await initializeDatabase();
    const db = getDb();

    const ownerProfiles = await db.select({ id: profiles.id }).from(profiles).orderBy(profiles.createdAt).limit(1);
    ownerId = ownerProfiles[0]?.id ?? null;
    if (!ownerId) {
      return { requirePassword: false, hasValidGuestSession: true };
    }

    const publicSettings = await db
      .select({ valueJson: settings.valueJson })
      .from(settings)
      .where(and(eq(settings.key, 'public_access'), eq(settings.profileId, ownerId)))
      .limit(1);

    hasSetting = publicSettings.length > 0;
    settingValue = publicSettings[0]?.valueJson;
  }

  if (!ownerId || !hasSetting) {
    return { requirePassword: false, hasValidGuestSession: true };
  }

  interface PublicAccessConfig {
    requirePassword?: boolean;
    passwordHash?: string;
    passwordHint?: string;
  }
  const config = (settingValue || {}) as PublicAccessConfig;
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
