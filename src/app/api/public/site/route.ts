import { NextResponse } from 'next/server';
import { getDb, initializeDatabase } from '@/lib/db';
import { profiles, settings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { ensureSeedData } from '@/lib/db/seed';
import { checkPublicAccessProtection } from '@/lib/auth/guard';
import { toPublicSiteSettings } from '@/lib/api/public-serializer';

export async function GET() {
  try {
    await ensureSeedData();
    const db = getDb();

    // 1. Lấy thông tin hiển thị của Owner
    const profileList = await db.select({
      displayName: profiles.displayName,
      bio: profiles.bio,
      avatarUrl: profiles.avatarUrl,
    }).from(profiles).limit(1);

    const profile = profileList[0] || {
      displayName: 'Chủ Sở Hữu',
      bio: 'Personal Web OS & Không gian số cá nhân.',
      avatarUrl: null,
    };

    // 2. Lấy cài đặt giao diện công khai và cấu hình bảo vệ mật mã khách
    const settingList = await db.select().from(settings);
    const settingsMap: Record<string, any> = {};
    for (const s of settingList) {
      settingsMap[s.key] = s.valueJson;
    }

    const publicAccess = await checkPublicAccessProtection();
    const siteSettings = toPublicSiteSettings(settingsMap);

    return NextResponse.json({
      profile,
      theme: siteSettings.theme,
      navigation: siteSettings.navigation,
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
