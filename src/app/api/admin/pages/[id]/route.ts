import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guard';
import { getDb, initializeDatabase } from '@/lib/db';
import { pages, contentBlocks } from '@/lib/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import crypto from 'crypto';
import { sanitizePlain } from '@/lib/security/sanitize';
import { logSecurityEvent } from '@/lib/security/audit';
import { SECURITY_EVENT_TYPES } from '@/lib/security/constants';
import { getClientIp } from '@/lib/security/rate-limit';

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

    const pageResult = await db
      .select()
      .from(pages)
      .where(and(eq(pages.id, id), eq(pages.profileId, auth.profile.id)))
      .limit(1);

    if (pageResult.length === 0) {
      return NextResponse.json({ error: 'Trang không tồn tại.' }, { status: 404 });
    }

    const blocks = await db
      .select()
      .from(contentBlocks)
      .where(eq(contentBlocks.pageId, id))
      .orderBy(asc(contentBlocks.sortOrder));

    return NextResponse.json({
      page: pageResult[0],
      blocks,
    });
  } catch (error) {
    console.error('Lỗi lấy chi tiết trang:', error);
    return NextResponse.json({ error: 'Không thể tải chi tiết trang.' }, { status: 500 });
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
      .from(pages)
      .where(and(eq(pages.id, id), eq(pages.profileId, auth.profile.id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Trang không tồn tại.' }, { status: 404 });
    }

    const currentPage = existing[0];
    const body = await req.json();
    const { title, description, coverImage, visibility, status, isFeatured, sortOrder } = body;

    const updates: Partial<typeof pages.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (title !== undefined) updates.title = sanitizePlain(title);
    if (description !== undefined) updates.description = description ? sanitizePlain(description) : null;
    if (coverImage !== undefined) updates.coverImage = coverImage;
    if (isFeatured !== undefined) updates.isFeatured = Boolean(isFeatured);
    if (sortOrder !== undefined) updates.sortOrder = Number(sortOrder);

    if (visibility !== undefined) {
      updates.visibility = visibility;
      if (visibility === 'UNLISTED' && !currentPage.shareToken) {
        updates.shareToken = crypto.randomBytes(16).toString('hex');
      }
    }

    if (status !== undefined) {
      updates.status = status;
      if (status === 'PUBLISHED' && !currentPage.publishedAt) {
        updates.publishedAt = new Date();
      }
    }

    await db
      .update(pages)
      .set(updates)
      .where(and(eq(pages.id, id), eq(pages.profileId, auth.profile.id)));

    const ip = getClientIp(req.headers);
    const userAgent = req.headers.get('user-agent') || 'Unknown';
    await logSecurityEvent(auth.profile.id, SECURITY_EVENT_TYPES.PAGE_UPDATED, { id, title: updates.title || currentPage.title, updates: Object.keys(updates) }, ip, userAgent);

    const updated = await db.select().from(pages).where(eq(pages.id, id)).limit(1);

    return NextResponse.json({ success: true, page: updated[0] });
  } catch (error) {
    console.error('Lỗi cập nhật trang:', error);
    return NextResponse.json({ error: 'Không thể cập nhật trang.' }, { status: 500 });
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

    const existing = await db
      .select()
      .from(pages)
      .where(and(eq(pages.id, id), eq(pages.profileId, auth.profile.id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Trang không tồn tại.' }, { status: 404 });
    }

    await db.delete(pages).where(and(eq(pages.id, id), eq(pages.profileId, auth.profile.id)));

    const ip = getClientIp(req.headers);
    const userAgent = req.headers.get('user-agent') || 'Unknown';
    await logSecurityEvent(auth.profile.id, SECURITY_EVENT_TYPES.PAGE_DELETED, { id, title: existing[0].title }, ip, userAgent);

    return NextResponse.json({ success: true, message: 'Đã xóa trang thành công.' });
  } catch (error) {
    console.error('Lỗi khi xóa trang:', error);
    return NextResponse.json({ error: 'Không thể xóa trang.' }, { status: 500 });
  }
}
