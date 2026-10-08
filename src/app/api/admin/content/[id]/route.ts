import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guard';
import { getDb, initializeDatabase } from '@/lib/db';
import { contentItems } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import { sanitizeHtml, sanitizePlain } from '@/lib/security/sanitize';
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

    const items = await db
      .select()
      .from(contentItems)
      .where(and(eq(contentItems.id, id), eq(contentItems.profileId, auth.profile.id)))
      .limit(1);

    if (items.length === 0) {
      return NextResponse.json({ error: 'Nội dung không tồn tại.' }, { status: 404 });
    }

    return NextResponse.json({ item: items[0] });
  } catch (error) {
    console.error('Lỗi lấy chi tiết nội dung:', error);
    return NextResponse.json({ error: 'Không thể tải nội dung.' }, { status: 500 });
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

    // Kiểm tra xem item có thuộc về owner không
    const existing = await db
      .select()
      .from(contentItems)
      .where(and(eq(contentItems.id, id), eq(contentItems.profileId, auth.profile.id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Nội dung không tồn tại hoặc không thuộc quyền sở hữu.' }, { status: 404 });
    }

    const currentItem = existing[0];
    const body = await req.json();

    const {
      title,
      type,
      description,
      content,
      coverImage,
      icon,
      visibility,
      status,
      tags,
      category,
      metadata,
      isFeatured,
      isPinned,
    } = body;

    const updates: Partial<typeof contentItems.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (title !== undefined) updates.title = sanitizePlain(title);
    if (type !== undefined) updates.type = type;
    if (description !== undefined) updates.description = description ? sanitizePlain(description) : null;
    if (content !== undefined) updates.content = content ? sanitizeHtml(content) : null;
    if (coverImage !== undefined) updates.coverImage = coverImage;
    if (icon !== undefined) updates.icon = icon;
    if (category !== undefined) updates.category = category ? sanitizePlain(category) : null;
    if (tags !== undefined) updates.tags = Array.isArray(tags) ? tags : [];
    if (metadata !== undefined) updates.metadata = metadata;
    if (isFeatured !== undefined) updates.isFeatured = Boolean(isFeatured);
    if (isPinned !== undefined) updates.isPinned = Boolean(isPinned);

    if (visibility !== undefined) {
      updates.visibility = visibility;
      if (visibility === 'UNLISTED' && !currentItem.shareToken) {
        updates.shareToken = crypto.randomBytes(16).toString('hex');
      }
    }

    if (status !== undefined) {
      updates.status = status;
      if (status === 'PUBLISHED' && !currentItem.publishedAt) {
        updates.publishedAt = new Date();
      }
    }

    await db
      .update(contentItems)
      .set(updates)
      .where(and(eq(contentItems.id, id), eq(contentItems.profileId, auth.profile.id)));

    const ip = getClientIp(req.headers);
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    // Ghi audit log nếu thay đổi trạng thái xuất bản
    if (status === 'PUBLISHED' && currentItem.status !== 'PUBLISHED') {
      await logSecurityEvent(auth.profile.id, SECURITY_EVENT_TYPES.CONTENT_PUBLISHED, { id, title: updates.title || currentItem.title }, ip, userAgent);
    } else if (status === 'DRAFT' && currentItem.status === 'PUBLISHED') {
      await logSecurityEvent(auth.profile.id, SECURITY_EVENT_TYPES.CONTENT_UNPUBLISHED, { id, title: updates.title || currentItem.title }, ip, userAgent);
    } else {
      await logSecurityEvent(auth.profile.id, SECURITY_EVENT_TYPES.CONTENT_UPDATED, { id, updates: Object.keys(updates) }, ip, userAgent);
    }

    const updated = await db.select().from(contentItems).where(eq(contentItems.id, id)).limit(1);

    return NextResponse.json({ success: true, item: updated[0] });
  } catch (error) {
    console.error('Lỗi cập nhật nội dung:', error);
    return NextResponse.json({ error: 'Không thể cập nhật nội dung.' }, { status: 500 });
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
      .from(contentItems)
      .where(and(eq(contentItems.id, id), eq(contentItems.profileId, auth.profile.id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Nội dung không tồn tại.' }, { status: 404 });
    }

    await db
      .delete(contentItems)
      .where(and(eq(contentItems.id, id), eq(contentItems.profileId, auth.profile.id)));

    const ip = getClientIp(req.headers);
    const userAgent = req.headers.get('user-agent') || 'Unknown';
    await logSecurityEvent(auth.profile.id, SECURITY_EVENT_TYPES.CONTENT_DELETED, { id, title: existing[0].title }, ip, userAgent);

    return NextResponse.json({ success: true, message: 'Đã xóa nội dung thành công.' });
  } catch (error) {
    console.error('Lỗi khi xóa nội dung:', error);
    return NextResponse.json({ error: 'Không thể xóa nội dung.' }, { status: 500 });
  }
}
