import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guard';
import { getDb, initializeDatabase } from '@/lib/db';
import { collections, collectionItems, contentItems } from '@/lib/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import crypto from 'crypto';
import { sanitizePlain } from '@/lib/security/sanitize';

export async function GET(
  req: NextRequest,
  segmentData: { params: Promise<{ id: string }> }
) {
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    const { id } = await segmentData.params;
    await initializeDatabase();
    const db = getDb();

    const colResult = await db
      .select()
      .from(collections)
      .where(and(eq(collections.id, id), eq(collections.profileId, auth.profile.id)))
      .limit(1);

    if (colResult.length === 0) {
      return NextResponse.json({ error: 'Bộ sưu tập không tồn tại.' }, { status: 404 });
    }

    // Lấy danh sách item trong collection
    const items = await db
      .select({
        collectionItem: collectionItems,
        item: contentItems,
      })
      .from(collectionItems)
      .innerJoin(contentItems, eq(collectionItems.contentItemId, contentItems.id))
      .where(eq(collectionItems.collectionId, id))
      .orderBy(asc(collectionItems.sortOrder));

    return NextResponse.json({
      collection: colResult[0],
      items: items.map((i: any) => ({ ...i.item, collectionOrder: i.collectionItem.sortOrder })),
    });
  } catch (error) {
    console.error('Lỗi lấy chi tiết bộ sưu tập:', error);
    return NextResponse.json({ error: 'Không thể tải chi tiết bộ sưu tập.' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  segmentData: { params: Promise<{ id: string }> }
) {
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    const { id } = await segmentData.params;
    await initializeDatabase();
    const db = getDb();

    const existing = await db
      .select()
      .from(collections)
      .where(and(eq(collections.id, id), eq(collections.profileId, auth.profile.id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Bộ sưu tập không tồn tại.' }, { status: 404 });
    }

    const current = existing[0];
    const body = await req.json();
    const { name, description, coverImage, icon, visibility, status, isFeatured, itemIds } = body;

    const updates: Partial<typeof collections.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updates.name = sanitizePlain(name);
    if (description !== undefined) updates.description = description ? sanitizePlain(description) : null;
    if (coverImage !== undefined) updates.coverImage = coverImage;
    if (icon !== undefined) updates.icon = icon;
    if (isFeatured !== undefined) updates.isFeatured = Boolean(isFeatured);

    if (visibility !== undefined) {
      updates.visibility = visibility;
      if (visibility === 'UNLISTED' && !current.shareToken) {
        updates.shareToken = crypto.randomBytes(16).toString('hex');
      }
    }

    if (status !== undefined) updates.status = status;

    await db
      .update(collections)
      .set(updates)
      .where(and(eq(collections.id, id), eq(collections.profileId, auth.profile.id)));

    // Cập nhật lại danh sách items trong collection nếu truyền vào
    if (Array.isArray(itemIds)) {
      await db.delete(collectionItems).where(eq(collectionItems.collectionId, id));
      for (let i = 0; i < itemIds.length; i++) {
        await db.insert(collectionItems).values({
          id: crypto.randomUUID(),
          collectionId: id,
          contentItemId: itemIds[i],
          sortOrder: i,
          createdAt: new Date(),
        });
      }
    }

    const updated = await db.select().from(collections).where(eq(collections.id, id)).limit(1);

    return NextResponse.json({ success: true, collection: updated[0] });
  } catch (error) {
    console.error('Lỗi cập nhật bộ sưu tập:', error);
    return NextResponse.json({ error: 'Không thể cập nhật bộ sưu tập.' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  segmentData: { params: Promise<{ id: string }> }
) {
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    const { id } = await segmentData.params;
    await initializeDatabase();
    const db = getDb();

    await db.delete(collections).where(and(eq(collections.id, id), eq(collections.profileId, auth.profile.id)));

    return NextResponse.json({ success: true, message: 'Đã xóa bộ sưu tập thành công.' });
  } catch (error) {
    console.error('Lỗi khi xóa bộ sưu tập:', error);
    return NextResponse.json({ error: 'Không thể xóa bộ sưu tập.' }, { status: 500 });
  }
}
