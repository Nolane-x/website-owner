import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guard';
import { getDb, initializeDatabase } from '@/lib/db';
import { collections, collectionItems, contentItems } from '@/lib/db/schema';
import { eq, and, asc, inArray } from 'drizzle-orm';
import crypto from 'crypto';
import { sanitizePlain } from '@/lib/security/sanitize';
import { assertValidOrigin } from '@/lib/security/origin-guard';

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

    // Lấy danh sách item trong collection (chỉ thuộc quyền sở hữu của auth.profile.id)
    const items = await db
      .select({
        collectionItem: collectionItems,
        item: contentItems,
      })
      .from(collectionItems)
      .innerJoin(
        contentItems,
        and(
          eq(collectionItems.contentItemId, contentItems.id),
          eq(contentItems.profileId, auth.profile.id)
        )
      )
      .where(eq(collectionItems.collectionId, id))
      .orderBy(asc(collectionItems.sortOrder));

    return NextResponse.json({
      collection: colResult[0],
      items: items.map((i) => ({ ...i.item, collectionOrder: i.collectionItem.sortOrder })),
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
  const originError = assertValidOrigin(req);
  if (originError) return originError;

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
      if (visibility === 'UNLISTED') {
        // F2-11: Luôn sinh share token mới khi chuyển sang UNLISTED
        updates.shareToken = crypto.randomBytes(16).toString('hex');
      } else {
        // Thu hồi token cũ khi không còn UNLISTED
        updates.shareToken = null;
      }
    }

    if (status !== undefined) updates.status = status;

    await db.transaction(async (tx) => {
      await tx
        .update(collections)
        .set(updates)
        .where(and(eq(collections.id, id), eq(collections.profileId, auth.profile.id)));

      // DB-04 / P1-13 / F2-09: Cập nhật nguyên tử danh sách items bên trong transaction
      if (Array.isArray(itemIds)) {
        if (itemIds.length > 0) {
          // F2-09: Xác minh mọi item ID đều thuộc sở hữu của auth.profile.id
          const userItems = await tx
            .select({ id: contentItems.id })
            .from(contentItems)
            .where(and(inArray(contentItems.id, itemIds), eq(contentItems.profileId, auth.profile.id)));
          const validItemIds = new Set(userItems.map((u) => u.id));
          for (const itemId of itemIds) {
            if (!validItemIds.has(itemId)) {
              throw new Error('INVALID_ITEM_OWNERSHIP');
            }
          }
        }

        await tx.delete(collectionItems).where(eq(collectionItems.collectionId, id));
        for (let i = 0; i < itemIds.length; i++) {
          await tx.insert(collectionItems).values({
            id: crypto.randomUUID(),
            collectionId: id,
            contentItemId: itemIds[i],
            sortOrder: i,
            createdAt: new Date(),
          });
        }
      }
    });

    const updated = await db
      .select()
      .from(collections)
      .where(and(eq(collections.id, id), eq(collections.profileId, auth.profile.id)))
      .limit(1);

    return NextResponse.json({ success: true, collection: updated[0] });
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_ITEM_OWNERSHIP') {
      return NextResponse.json({ error: 'Một hoặc nhiều mục nội dung không thuộc quyền sở hữu của bạn.' }, { status: 400 });
    }
    console.error('Lỗi cập nhật bộ sưu tập:', error);
    return NextResponse.json({ error: 'Không thể cập nhật bộ sưu tập.' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  segmentData: { params: Promise<{ id: string }> }
) {
  const originError = assertValidOrigin(req);
  if (originError) return originError;

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
