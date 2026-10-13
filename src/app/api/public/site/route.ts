import { NextResponse } from 'next/server';
import { getDb, initializeDatabase } from '@/lib/db';
import { profiles, settings } from '@/lib/db/schema';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { ensureSeedData } from '@/lib/db/seed';
import { checkPublicAccessProtection } from '@/lib/auth/guard';
import { checkPublicApiRateLimit } from '@/lib/security/public-api-guard';
import { getPublicApiCacheHeaders } from '@/lib/security/public-api-cache';
import { toPublicSiteSettings } from '@/lib/api/public-serializer';
import { MAX_PUBLIC_NAVIGATION_BYTES, MAX_PUBLIC_ACCESS_CONFIG_BYTES } from '@/lib/security/public-egress-limits';

// PublicShell doesn't consume theme data; do not fetch potentially large private/public theme JSON on every visit.
export const PUBLIC_SITE_SETTING_KEYS = ['public_navigation', 'public_access'] as const;

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
      displayName: sql<string>`left(${profiles.displayName}, 120)`,
      bio: sql<string | null>`left(${profiles.bio}, 1200)`,
      avatarUrl: sql<string | null>`CASE WHEN ${profiles.avatarUrl} IS NOT NULL AND length(${profiles.avatarUrl}) <= 4096 AND ${profiles.avatarUrl} NOT LIKE 'data:%' THEN ${profiles.avatarUrl} ELSE NULL END`,
    }).from(profiles).orderBy(profiles.createdAt).limit(1);

    const profile = profileList[0] || {
      id: 'default',
      displayName: 'Chủ Sở Hữu',
      bio: 'Personal Web OS & Không gian số cá nhân.',
      avatarUrl: null,
    };

    // 2. Lấy cài đặt giao diện công khai và cấu hình bảo vệ mật mã khách
    const settingList = profileList[0]?.id
      ? await db.select({
        key: settings.key,
        valueJson: sql<Record<string, unknown>>`CASE
          WHEN ${settings.key} = 'public_navigation' THEN
            CASE
              WHEN OCTET_LENGTH(${settings.valueJson}::text) <= ${MAX_PUBLIC_NAVIGATION_BYTES}
                THEN ${settings.valueJson}
              ELSE jsonb_build_object('items', '[]'::jsonb)
            END
          WHEN ${settings.key} = 'public_access' THEN
            CASE
              WHEN OCTET_LENGTH(${settings.valueJson}::text) <= ${MAX_PUBLIC_ACCESS_CONFIG_BYTES}
                THEN ${settings.valueJson}
              ELSE jsonb_build_object(
                'requirePassword', TRUE,
                'passwordHash', 'PUBLIC_ACCESS_CONFIG_TOO_LARGE',
                'passwordHint', 'Cấu hình truy cập vượt giới hạn; cần kiểm tra trong quản trị.',
                'allowCopy', FALSE,
                'showSearch', FALSE
              )
            END
          ELSE '{}'::jsonb
        END`,
      }).from(settings).where(and(eq(settings.profileId, profileList[0].id), inArray(settings.key, PUBLIC_SITE_SETTING_KEYS)))
      : [];
    const settingsMap: Record<string, unknown> = {};
    for (const s of settingList) {
      settingsMap[s.key] = s.valueJson;
    }

    const publicAccessSetting = settingList.find((setting) => setting.key === 'public_access');
    const publicAccess = await checkPublicAccessProtection({
      ownerProfileId: profileList[0]?.id ?? null,
      settingValue: publicAccessSetting?.valueJson,
    });
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
      navigation: safeNavigation,
      accessProtection: {
        requirePassword: publicAccess.requirePassword,
        passwordHint: publicAccess.passwordHint,
        isUnlocked: publicAccess.hasValidGuestSession,
      },
    }, { headers: getPublicApiCacheHeaders(publicAccess) });
  } catch (error) {
    console.error('Lỗi API public site:', error);
    return NextResponse.json({ error: 'Không thể tải thông tin trang web.' }, { status: 500 });
  }
}
