import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guard';
import { getDb, initializeDatabase } from '@/lib/db';
import { pages, contentBlocks } from '@/lib/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import crypto from 'crypto';

export async function GET(
  req: NextRequest,
  segmentData: { params: Promise<{ id: string }> }
) {
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    const { id: pageId } = await segmentData.params;
    await initializeDatabase();
    const db = getDb();

    // Xác minh quyền sở hữu trang
    const pageCheck = await db
      .select({ id: pages.id })
      .from(pages)
      .where(and(eq(pages.id, pageId), eq(pages.profileId, auth.profile.id)))
      .limit(1);

    if (pageCheck.length === 0) {
      return NextResponse.json({ error: 'Trang không tồn tại.' }, { status: 404 });
    }

    const blocks = await db
      .select()
      .from(contentBlocks)
      .where(eq(contentBlocks.pageId, pageId))
      .orderBy(asc(contentBlocks.sortOrder));

    return NextResponse.json({ blocks });
  } catch (error) {
    console.error('Lỗi lấy danh sách khối:', error);
    return NextResponse.json({ error: 'Không thể tải các khối của trang.' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  segmentData: { params: Promise<{ id: string }> }
) {
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    const { id: pageId } = await segmentData.params;
    await initializeDatabase();
    const db = getDb();

    // Xác minh trang thuộc owner
    const pageCheck = await db
      .select({ id: pages.id })
      .from(pages)
      .where(and(eq(pages.id, pageId), eq(pages.profileId, auth.profile.id)))
      .limit(1);

    if (pageCheck.length === 0) {
      return NextResponse.json({ error: 'Trang không tồn tại.' }, { status: 404 });
    }

    const body = await req.json();
    const { blockType = 'text', contentJson = {}, settingsJson = {}, sortOrder } = body;

    const blockId = crypto.randomUUID();
    let order = typeof sortOrder === 'number' ? sortOrder : 0;

    if (typeof sortOrder !== 'number') {
      const existingBlocks = await db
        .select({ sortOrder: contentBlocks.sortOrder })
        .from(contentBlocks)
        .where(eq(contentBlocks.pageId, pageId));
      order = existingBlocks.length;
    }

    await db.insert(contentBlocks).values({
      id: blockId,
      pageId,
      blockType,
      sortOrder: order,
      contentJson,
      settingsJson,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const created = await db
      .select()
      .from(contentBlocks)
      .where(eq(contentBlocks.id, blockId))
      .limit(1);

    return NextResponse.json({ success: true, block: created[0] }, { status: 201 });
  } catch (error) {
    console.error('Lỗi khi thêm khối:', error);
    return NextResponse.json({ error: 'Không thể thêm khối mới.' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  segmentData: { params: Promise<{ id: string }> }
) {
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    const { id: pageId } = await segmentData.params;
    await initializeDatabase();
    const db = getDb();

    const pageCheck = await db
      .select({ id: pages.id })
      .from(pages)
      .where(and(eq(pages.id, pageId), eq(pages.profileId, auth.profile.id)))
      .limit(1);

    if (pageCheck.length === 0) {
      return NextResponse.json({ error: 'Trang không tồn tại.' }, { status: 404 });
    }

    const body = await req.json();
    const { blocks } = body; // Array of { id, sortOrder, contentJson, settingsJson, blockType }

    if (!Array.isArray(blocks)) {
      return NextResponse.json({ error: 'Dữ liệu khối không hợp lệ.' }, { status: 400 });
    }

    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      if (!b.id) continue;

      const updates: any = {
        sortOrder: typeof b.sortOrder === 'number' ? b.sortOrder : i,
        updatedAt: new Date(),
      };
      if (b.contentJson !== undefined) updates.contentJson = b.contentJson;
      if (b.settingsJson !== undefined) updates.settingsJson = b.settingsJson;
      if (b.blockType !== undefined) updates.blockType = b.blockType;

      await db
        .update(contentBlocks)
        .set(updates)
        .where(and(eq(contentBlocks.id, b.id), eq(contentBlocks.pageId, pageId)));
    }

    const updatedBlocks = await db
      .select()
      .from(contentBlocks)
      .where(eq(contentBlocks.pageId, pageId))
      .orderBy(asc(contentBlocks.sortOrder));

    return NextResponse.json({ success: true, blocks: updatedBlocks });
  } catch (error) {
    console.error('Lỗi cập nhật danh sách khối:', error);
    return NextResponse.json({ error: 'Không thể cập nhật danh sách khối.' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  segmentData: { params: Promise<{ id: string }> }
) {
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    const { id: pageId } = await segmentData.params;
    const { searchParams } = new URL(req.url);
    const blockId = searchParams.get('blockId');

    if (!blockId) {
      return NextResponse.json({ error: 'Thiếu blockId.' }, { status: 400 });
    }

    await initializeDatabase();
    const db = getDb();

    // Xác minh trang thuộc owner
    const pageCheck = await db
      .select({ id: pages.id })
      .from(pages)
      .where(and(eq(pages.id, pageId), eq(pages.profileId, auth.profile.id)))
      .limit(1);

    if (pageCheck.length === 0) {
      return NextResponse.json({ error: 'Trang không tồn tại.' }, { status: 404 });
    }

    await db
      .delete(contentBlocks)
      .where(and(eq(contentBlocks.id, blockId), eq(contentBlocks.pageId, pageId)));

    return NextResponse.json({ success: true, message: 'Đã xóa khối thành công.' });
  } catch (error) {
    console.error('Lỗi khi xóa khối:', error);
    return NextResponse.json({ error: 'Không thể xóa khối.' }, { status: 500 });
  }
}
