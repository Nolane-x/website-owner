import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guard';
import { getDb, initializeDatabase } from '@/lib/db';
import { customWallpapers } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { sanitizePlain } from '@/lib/security/sanitize';
import { assertValidOrigin } from '@/lib/security/origin-guard';
import { WallpaperMediaType, WallpaperFilters } from '@/lib/types';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const originError = assertValidOrigin(req);
  if (originError) return originError;
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    const { id } = await params;
    await initializeDatabase();
    const db = getDb();
    const body = await req.json();

    const [existing] = await db
      .select()
      .from(customWallpapers)
      .where(and(eq(customWallpapers.id, id), eq(customWallpapers.profileId, auth.profile.id)));

    if (!existing) {
      return NextResponse.json({ error: 'Không tìm thấy hình nền.' }, { status: 404 });
    }

    const updates: Partial<typeof customWallpapers.$inferInsert> = {};

    if (body.title !== undefined) {
      if (typeof body.title !== 'string' || !body.title.trim() || body.title.length > 200) {
        return NextResponse.json({ error: 'Tiêu đề hình nền phải có từ 1 đến 200 ký tự.' }, { status: 400 });
      }
      updates.title = sanitizePlain(body.title).trim();
    }
    if (body.sourceUrl !== undefined) {
      if (!body.sourceUrl) {
        updates.sourceUrl = null;
      } else if (typeof body.sourceUrl !== 'string') {
        return NextResponse.json({ error: 'URL hình nền không hợp lệ.' }, { status: 400 });
      } else {
        try {
          const parsedUrl = new URL(body.sourceUrl);
          if ((parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') || !parsedUrl.hostname) {
            return NextResponse.json({ error: 'URL hình nền chỉ được sử dụng HTTP hoặc HTTPS.' }, { status: 400 });
          }
          updates.sourceUrl = parsedUrl.toString();
        } catch {
          return NextResponse.json({ error: 'URL hình nền không hợp lệ.' }, { status: 400 });
        }
      }
    }
    if (body.localDataUrl !== undefined) {
      const localDataUrl = body.localDataUrl ? String(body.localDataUrl) : null;
      if (localDataUrl) {
        if (localDataUrl.length > 7 * 1024 * 1024) {
          return NextResponse.json({ error: 'Kích thước tệp hình nền vượt quá giới hạn 5MB.' }, { status: 400 });
        }
        const isAllowedDataUrl = /^data:(image\/(png|jpeg|jpg|webp|gif)|video\/(mp4|webm));base64,/i.test(localDataUrl);
        if (!isAllowedDataUrl) {
          return NextResponse.json({ error: 'Định dạng hình nền không hợp lệ. Chỉ chấp nhận PNG, JPEG, WEBP, GIF, MP4, WEBM.' }, { status: 400 });
        }
      }
      updates.localDataUrl = localDataUrl;
    }
    if (body.type !== undefined) {
      if (body.type !== 'image' && body.type !== 'video') {
        return NextResponse.json({ error: 'Loại hình nền chỉ có thể là image hoặc video.' }, { status: 400 });
      }
      updates.type = body.type as WallpaperMediaType;
    }
    if (body.isFavorite !== undefined) updates.isFavorite = Boolean(body.isFavorite);

    if (Array.isArray(body.tagsJson)) {
      if (body.tagsJson.length > 100 || !body.tagsJson.every((tag: unknown) => typeof tag === 'string' && tag.length <= 80)) {
        return NextResponse.json({ error: 'Danh sách tag không hợp lệ.' }, { status: 400 });
      }
      updates.tagsJson = body.tagsJson.map((tag: string) => sanitizePlain(tag).trim()).filter(Boolean);
    }

    if (body.filtersJson && typeof body.filtersJson === 'object') {
      const prevFilters: WallpaperFilters = existing.filtersJson || {};
      updates.filtersJson = {
        dim: typeof body.filtersJson.dim === 'number' ? body.filtersJson.dim : prevFilters.dim,
        blur: typeof body.filtersJson.blur === 'number' ? body.filtersJson.blur : prevFilters.blur,
        contrast: typeof body.filtersJson.contrast === 'number' ? body.filtersJson.contrast : prevFilters.contrast,
        saturation: typeof body.filtersJson.saturation === 'number' ? body.filtersJson.saturation : prevFilters.saturation,
        vignette: body.filtersJson.vignette !== undefined ? Boolean(body.filtersJson.vignette) : prevFilters.vignette,
        scanlines: body.filtersJson.scanlines !== undefined ? Boolean(body.filtersJson.scanlines) : prevFilters.scanlines,
      };
    }

    await db
      .update(customWallpapers)
      .set(updates)
      .where(and(eq(customWallpapers.id, id), eq(customWallpapers.profileId, auth.profile.id)));

    const [updated] = await db
      .select()
      .from(customWallpapers)
      .where(and(eq(customWallpapers.id, id), eq(customWallpapers.profileId, auth.profile.id)));
    return NextResponse.json({ wallpaper: updated });
  } catch (error) {
    console.error('Lỗi cập nhật hình nền:', error);
    return NextResponse.json({ error: 'Không thể cập nhật hình nền.' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const originError = assertValidOrigin(req);
  if (originError) return originError;
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    const { id } = await params;
    await initializeDatabase();
    const db = getDb();

    const [existing] = await db
      .select()
      .from(customWallpapers)
      .where(and(eq(customWallpapers.id, id), eq(customWallpapers.profileId, auth.profile.id)));

    if (!existing) {
      return NextResponse.json({ error: 'Không tìm thấy hình nền.' }, { status: 404 });
    }

    await db
      .delete(customWallpapers)
      .where(and(eq(customWallpapers.id, id), eq(customWallpapers.profileId, auth.profile.id)));
    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    console.error('Lỗi xóa hình nền:', error);
    return NextResponse.json({ error: 'Không thể xóa hình nền.' }, { status: 500 });
  }
}
