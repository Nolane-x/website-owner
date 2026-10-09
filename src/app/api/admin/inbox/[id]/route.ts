import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guard';
import { getDb, initializeDatabase } from '@/lib/db';
import { inboxItems } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { sanitizePlain } from '@/lib/security/sanitize';
import { assertValidOrigin } from '@/lib/security/origin-guard';
import { InboxItemKind, InboxItemStatus } from '@/lib/types';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const originErr = await assertValidOrigin(req);
  if (originErr) return originErr;
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    const { id } = await params;
    await initializeDatabase();
    const db = getDb();
    const body = await req.json();

    const [existing] = await db
      .select()
      .from(inboxItems)
      .where(and(eq(inboxItems.id, id), eq(inboxItems.profileId, auth.profile.id)));

    if (!existing) {
      return NextResponse.json({ error: 'Không tìm thấy mục Inbox.' }, { status: 404 });
    }

    const updates: Partial<typeof inboxItems.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (body.title !== undefined) updates.title = sanitizePlain(body.title);
    if (body.kind !== undefined) updates.kind = body.kind as InboxItemKind;
    if (body.textPreview !== undefined) {
      updates.textPreview = body.textPreview ? sanitizePlain(body.textPreview) : null;
    }
    if (body.sourceUri !== undefined) {
      updates.sourceUri = body.sourceUri ? sanitizePlain(body.sourceUri) : null;
    }
    if (body.status !== undefined) updates.status = body.status as InboxItemStatus;
    if (body.projectId !== undefined) {
      updates.projectId = body.projectId ? sanitizePlain(body.projectId) : null;
    }
    if (Array.isArray(body.tagsJson)) {
      updates.tagsJson = body.tagsJson.map((t: string) => sanitizePlain(t));
    }

    await db
      .update(inboxItems)
      .set(updates)
      .where(and(eq(inboxItems.id, id), eq(inboxItems.profileId, auth.profile.id)));

    const [updated] = await db
      .select()
      .from(inboxItems)
      .where(and(eq(inboxItems.id, id), eq(inboxItems.profileId, auth.profile.id)));
    return NextResponse.json({ item: updated });
  } catch (error) {
    console.error('Lỗi cập nhật mục Inbox:', error);
    return NextResponse.json({ error: 'Không thể cập nhật mục Inbox.' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const originErr = await assertValidOrigin(req);
  if (originErr) return originErr;
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    const { id } = await params;
    await initializeDatabase();
    const db = getDb();

    const [existing] = await db
      .select()
      .from(inboxItems)
      .where(and(eq(inboxItems.id, id), eq(inboxItems.profileId, auth.profile.id)));

    if (!existing) {
      return NextResponse.json({ error: 'Không tìm thấy mục Inbox.' }, { status: 404 });
    }

    await db
      .delete(inboxItems)
      .where(and(eq(inboxItems.id, id), eq(inboxItems.profileId, auth.profile.id)));
    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    console.error('Lỗi xóa mục Inbox:', error);
    return NextResponse.json({ error: 'Không thể xóa mục Inbox.' }, { status: 500 });
  }
}
