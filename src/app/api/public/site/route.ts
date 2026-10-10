import { NextResponse } from 'next/server';
import { getDb, initializeDatabase } from '@/lib/db';
import { profiles, settings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { ensureSeedData } from '@/lib/db/seed';
import { checkPublicAccessProtection } from '@/lib/auth/guard';
import { checkPublicApiRateLimit } from '@/lib/security/public-api-guard';
import { toPublicSiteSettings } from '@/lib/api/public-serializer';

export async function GET(req: Request) {
  try {
    const rateLimitResponse = checkPublicApiRateLimit(req, 'site', 30);
    if (rateLimitResponse) return rateLimitResponse;
    await initializeDatabase();
    if (process.env.NODE_ENV !== 'production') {
      await ensureSeedData();
    }
    const db = getDb();

    // 1. Lấy thông tin hiển thị của Owner
    const profileList = await db.select({
      id: profiles.id,
      displayName: profiles.displayName,
      bio: profiles.bio,
      avatarUrl: profiles.avatarUrl,
    }).from(profiles).orderBy(profiles.createdAt).limit(1);

    const profile = profileList[0] || {
      id: 'default',
      displayName: 'Chủ Sở Hữu',
      bio: 'Personal Web OS & Không gian số cá nhân.',
      avatarUrl: null,
    };

    // 2. Lấy cài đặt giao diện công khai và cấu hình bảo vệ mật mã khách
    const settingList = profileList[0]?.id
      ? await db.select().from(settings).where(eq(settings.profileId, profileList[0].id))
      : [];
    const settingsMap: Record<string, unknown> = {};
    for (const s of settingList) {
      settingsMap[s.key] = s.valueJson;
    }

    const publicAccess = await checkPublicAccessProtection();
    const siteSettings = toPublicSiteSettings(settingsMap);

    const isLocked = publicAccess.requirePassword && !publicAccess.hasValidGuestSession;
    const safeProfile = isLocked
      ? {
          id: profile.id,
          displayName: profile.displayName,
          bio: 'Trang web yêu cầu mật khẩu khách để mở khóa.',
          avatarUrl: null,
        }
      : profile;
    const safeNavigation = isLocked ? [] : siteSettings.navigation;

    return NextResponse.json({
      profile: safeProfile,
      theme: siteSettings.theme,
      navigation: safeNavigation,
      accessProtection: {
        requirePassword: publicAccess.requirePassword,
        passwordHint: publicAccess.passwordHint,
        isUnlocked: publicAccess.hasValidGuestSession,
      },
    });
  } catch (error) {
    console.error('Lỗi API public site:', error);
    return NextResponse.json({ error: 'Không thể tải thông tin trang web.' }, { status: 500 });
  }
}
