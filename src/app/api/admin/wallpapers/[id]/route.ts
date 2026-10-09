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
  await assertValidOrigin(req);
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

    if (body.title !== undefined) updates.title = sanitizePlain(body.title);
    if (body.sourceUrl !== undefined) {
      updates.sourceUrl = body.sourceUrl ? sanitizePlain(body.sourceUrl) : null;
    }
    if (body.localDataUrl !== undefined) {
      updates.localDataUrl = body.localDataUrl ? String(body.localDataUrl) : null;
    }
    if (body.type !== undefined) updates.type = body.type as WallpaperMediaType;
    if (body.isFavorite !== undefined) updates.isFavorite = Boolean(body.isFavorite);

    if (Array.isArray(body.tagsJson)) {
      updates.tagsJson = body.tagsJson.map((t: string) => sanitizePlain(t));
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
      .where(eq(customWallpapers.id, id));

    const [updated] = await db.select().from(customWallpapers).where(eq(customWallpapers.id, id));
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
  await assertValidOrigin(req);
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

    await db.delete(customWallpapers).where(eq(customWallpapers.id, id));
    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    console.error('Lỗi xóa hình nền:', error);
    return NextResponse.json({ error: 'Không thể xóa hình nền.' }, { status: 500 });
  }
}
