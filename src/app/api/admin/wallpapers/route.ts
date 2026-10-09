import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guard';
import { getDb, initializeDatabase } from '@/lib/db';
import { customWallpapers } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import crypto from 'crypto';
import { sanitizePlain } from '@/lib/security/sanitize';
import { assertValidOrigin } from '@/lib/security/origin-guard';
import { WallpaperMediaType, WallpaperFilters } from '@/lib/types';

export async function GET(req: NextRequest) {
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    await initializeDatabase();
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') as WallpaperMediaType | null;
    const favoriteOnly = searchParams.get('favorite') === 'true';

    const conditions = [eq(customWallpapers.profileId, auth.profile.id)];
    if (type) {
      conditions.push(eq(customWallpapers.type, type));
    }
    if (favoriteOnly) {
      conditions.push(eq(customWallpapers.isFavorite, true));
    }

    const wallpapers = await db
      .select()
      .from(customWallpapers)
      .where(and(...conditions))
      .orderBy(desc(customWallpapers.createdAt));

    return NextResponse.json({ wallpapers });
  } catch (error) {
    console.error('Lỗi lấy danh sách hình nền:', error);
    return NextResponse.json({ error: 'Không thể tải danh sách hình nền.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  await assertValidOrigin(req);
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    await initializeDatabase();
    const db = getDb();
    const body = await req.json();

    const title = sanitizePlain(body.title || '');
    if (!title) {
      return NextResponse.json({ error: 'Tiêu đề hình nền là bắt buộc.' }, { status: 400 });
    }

    const type: WallpaperMediaType = body.type || 'image';
    const sourceUrl = body.sourceUrl ? sanitizePlain(body.sourceUrl) : null;
    const localDataUrl = body.localDataUrl ? String(body.localDataUrl) : null;
    const isFavorite = Boolean(body.isFavorite);
    const tagsJson: string[] = Array.isArray(body.tagsJson)
      ? body.tagsJson.map((t: string) => sanitizePlain(t))
      : [];
    const filtersJson: WallpaperFilters = body.filtersJson && typeof body.filtersJson === 'object'
      ? {
          dim: typeof body.filtersJson.dim === 'number' ? body.filtersJson.dim : 0,
          blur: typeof body.filtersJson.blur === 'number' ? body.filtersJson.blur : 0,
          contrast: typeof body.filtersJson.contrast === 'number' ? body.filtersJson.contrast : 100,
          saturation: typeof body.filtersJson.saturation === 'number' ? body.filtersJson.saturation : 100,
          vignette: Boolean(body.filtersJson.vignette),
          scanlines: Boolean(body.filtersJson.scanlines),
        }
      : {};

    const id = 'wp-' + crypto.randomUUID();

    await db.insert(customWallpapers).values({
      id,
      profileId: auth.profile.id,
      title,
      sourceUrl,
      localDataUrl,
      type,
      tagsJson,
      filtersJson,
      isFavorite,
      createdAt: new Date(),
    });

    const [created] = await db.select().from(customWallpapers).where(eq(customWallpapers.id, id));
    return NextResponse.json({ wallpaper: created }, { status: 201 });
  } catch (error) {
    console.error('Lỗi lưu hình nền tùy chỉnh:', error);
    return NextResponse.json({ error: 'Không thể lưu hình nền.' }, { status: 500 });
  }
}
