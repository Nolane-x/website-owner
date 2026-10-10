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
  const originError = assertValidOrigin(req);
  if (originError) return originError;
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    await initializeDatabase();
    const db = getDb();
    const body = await req.json();

    const title = typeof body.title === 'string' ? sanitizePlain(body.title).trim() : '';
    if (!title || title.length > 200) {
      return NextResponse.json({ error: 'Tiêu đề hình nền phải có từ 1 đến 200 ký tự.' }, { status: 400 });
    }

    const requestedType = body.type === undefined ? 'image' : body.type;
    if (requestedType !== 'image' && requestedType !== 'video') {
      return NextResponse.json({ error: 'Loại hình nền chỉ có thể là image hoặc video.' }, { status: 400 });
    }
    const type: WallpaperMediaType = requestedType;
    let sourceUrl: string | null = null;
    if (body.sourceUrl !== undefined && body.sourceUrl !== null && body.sourceUrl !== '') {
      if (typeof body.sourceUrl !== 'string') {
        return NextResponse.json({ error: 'URL hình nền không hợp lệ.' }, { status: 400 });
      }
      try {
        const parsedUrl = new URL(body.sourceUrl);
        if ((parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') || !parsedUrl.hostname) {
          return NextResponse.json({ error: 'URL hình nền chỉ được sử dụng HTTP hoặc HTTPS.' }, { status: 400 });
        }
        sourceUrl = parsedUrl.toString();
      } catch {
        return NextResponse.json({ error: 'URL hình nền không hợp lệ.' }, { status: 400 });
      }
    }
    const localDataUrl = body.localDataUrl ? String(body.localDataUrl) : null;
    if (!sourceUrl && !localDataUrl) {
      return NextResponse.json({ error: 'Cần cung cấp một tệp tải lên hoặc URL hình nền.' }, { status: 400 });
    }

    // P1-24: Giới hạn kích thước và định dạng an toàn cho Data URL hình nền
    if (localDataUrl) {
      if (localDataUrl.length > 7 * 1024 * 1024) {
        return NextResponse.json({ error: 'Kích thước tệp hình nền vượt quá giới hạn 5MB.' }, { status: 400 });
      }
      const isAllowedDataUrl = /^data:(image\/(png|jpeg|jpg|webp|gif)|video\/(mp4|webm));base64,/i.test(localDataUrl);
      if (!isAllowedDataUrl) {
        return NextResponse.json({ error: 'Định dạng hình nền không hợp lệ. Chỉ chấp nhận PNG, JPEG, WEBP, GIF, MP4, WEBM.' }, { status: 400 });
      }
    }

    const isFavorite = Boolean(body.isFavorite);
    if (Array.isArray(body.tagsJson) && (body.tagsJson.length > 100 || !body.tagsJson.every((tag: unknown) => typeof tag === 'string' && tag.length <= 80))) {
      return NextResponse.json({ error: 'Danh sách tag không hợp lệ.' }, { status: 400 });
    }
    const tagsJson: string[] = Array.isArray(body.tagsJson)
      ? body.tagsJson.map((tag: string) => sanitizePlain(tag).trim()).filter(Boolean)
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

    const [created] = await db
      .select()
      .from(customWallpapers)
      .where(and(eq(customWallpapers.id, id), eq(customWallpapers.profileId, auth.profile.id)));
    return NextResponse.json({ wallpaper: created }, { status: 201 });
  } catch (error) {
    console.error('Lỗi lưu hình nền tùy chỉnh:', error);
    return NextResponse.json({ error: 'Không thể lưu hình nền.' }, { status: 500 });
  }
}
