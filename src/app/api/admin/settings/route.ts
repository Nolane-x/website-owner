import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guard';
import { getDb, initializeDatabase } from '@/lib/db';
import { settings, profiles } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import { hashPassword } from '@/lib/auth/password';
import { logSecurityEvent } from '@/lib/security/audit';
import { SECURITY_EVENT_TYPES } from '@/lib/security/constants';
import { getClientIp } from '@/lib/security/rate-limit';

export async function GET() {
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    await initializeDatabase();
    const db = getDb();

    const allSettings = await db
      .select()
      .from(settings)
      .where(eq(settings.profileId, auth.profile.id));

    const settingsMap: Record<string, any> = {};
    for (const s of allSettings) {
      settingsMap[s.key] = s.valueJson;
    }

    // Không bao giờ gửi password hash của public access ra client!
    if (settingsMap['public_access']) {
      settingsMap['public_access'] = {
        ...settingsMap['public_access'],
        hasPasswordSet: Boolean(settingsMap['public_access'].passwordHash),
        passwordHash: undefined,
      };
    }

    return NextResponse.json({
      settings: settingsMap,
      profile: auth.profile,
    });
  } catch (error) {
    console.error('Lỗi tải cài đặt:', error);
    return NextResponse.json({ error: 'Không thể tải cài đặt.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    await initializeDatabase();
    const db = getDb();
    const body = await req.json();

    const { key, value, profileUpdates } = body;
    const ip = getClientIp(req.headers);
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    // 1. Cập nhật hồ sơ (displayName, bio, avatarUrl) nếu có
    if (profileUpdates) {
      const allowedUpdates: Partial<typeof profiles.$inferInsert> = {
        updatedAt: new Date(),
      };
      if (profileUpdates.displayName !== undefined) allowedUpdates.displayName = profileUpdates.displayName;
      if (profileUpdates.bio !== undefined) allowedUpdates.bio = profileUpdates.bio;
      if (profileUpdates.avatarUrl !== undefined) allowedUpdates.avatarUrl = profileUpdates.avatarUrl;

      await db
        .update(profiles)
        .set(allowedUpdates)
        .where(eq(profiles.id, auth.profile.id));

      await logSecurityEvent(auth.profile.id, SECURITY_EVENT_TYPES.SETTINGS_CHANGED, { type: 'profile_updated' }, ip, userAgent);
    }

    // 2. Cập nhật setting theo key
    if (key && value !== undefined) {
      let finalValue = value;

      // Xử lý riêng cho public_access nếu có đổi mật mã khách
      if (key === 'public_access') {
        const existingSetting = await db
          .select()
          .from(settings)
          .where(and(eq(settings.profileId, auth.profile.id), eq(settings.key, 'public_access')))
          .limit(1);

        const currentVal = existingSetting.length > 0 ? (existingSetting[0].valueJson as any) : {};

        let newPasswordHash = currentVal.passwordHash;
        if (value.newPublicPassword && value.newPublicPassword.trim() !== '') {
          newPasswordHash = await hashPassword(value.newPublicPassword.trim());
          await logSecurityEvent(auth.profile.id, SECURITY_EVENT_TYPES.PUBLIC_PASSWORD_CHANGED, null, ip, userAgent);
        } else if (value.removePassword) {
          newPasswordHash = null;
        }

        finalValue = {
          requirePassword: Boolean(value.requirePassword),
          passwordHash: newPasswordHash,
          passwordHint: value.passwordHint || '',
          allowCopy: value.allowCopy !== undefined ? Boolean(value.allowCopy) : true,
          showSearch: value.showSearch !== undefined ? Boolean(value.showSearch) : true,
          customHeaderTitle: value.customHeaderTitle || 'Personal Web OS',
        };
      }

      // Upsert setting
      const existing = await db
        .select()
        .from(settings)
        .where(and(eq(settings.profileId, auth.profile.id), eq(settings.key, key)))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(settings)
          .set({
            valueJson: finalValue,
            updatedAt: new Date(),
          })
          .where(and(eq(settings.profileId, auth.profile.id), eq(settings.key, key)));
      } else {
        await db.insert(settings).values({
          id: crypto.randomUUID(),
          profileId: auth.profile.id,
          key,
          valueJson: finalValue,
          updatedAt: new Date(),
        });
      }

      await logSecurityEvent(auth.profile.id, SECURITY_EVENT_TYPES.SETTINGS_CHANGED, { key }, ip, userAgent);
    }

    return NextResponse.json({ success: true, message: 'Đã lưu cài đặt thành công.' });
  } catch (error) {
    console.error('Lỗi khi lưu cài đặt:', error);
    return NextResponse.json({ error: 'Không thể lưu cài đặt.' }, { status: 500 });
  }
}
