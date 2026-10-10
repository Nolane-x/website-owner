import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { requireOwner } from '@/lib/auth/guard';
import { getDb, initializeDatabase } from '@/lib/db';
import { inboxItems } from '@/lib/db/schema';
import { assertValidOrigin } from '@/lib/security/origin-guard';
import { parseInboxPatchInput } from '@/lib/inbox/validation';
import { inboxValidationErrorResponse, readInboxJsonBody } from '@/lib/inbox/request';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const originError = assertValidOrigin(req);
  if (originError) return originError;
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    const body = await readInboxJsonBody(req);
    const updates = parseInboxPatchInput(body);
    const { id } = await params;
    await initializeDatabase();
    const db = getDb();

    const [existing] = await db
      .select({ id: inboxItems.id })
      .from(inboxItems)
      .where(and(eq(inboxItems.id, id), eq(inboxItems.profileId, auth.profile.id)))
      .limit(1);
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy mục Inbox.' }, { status: 404 });

    await db
      .update(inboxItems)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(inboxItems.id, id), eq(inboxItems.profileId, auth.profile.id)));

    const [updated] = await db
      .select()
      .from(inboxItems)
      .where(and(eq(inboxItems.id, id), eq(inboxItems.profileId, auth.profile.id)))
      .limit(1);
    if (!updated) return NextResponse.json({ error: 'Mục Inbox không còn tồn tại.' }, { status: 404 });
    return NextResponse.json({ item: updated });
  } catch (error) {
    const response = inboxValidationErrorResponse(error);
    if (response) return response;
    console.error('Lỗi cập nhật mục Inbox:', error);
    return NextResponse.json({ error: 'Không thể cập nhật mục Inbox.' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const originErr = assertValidOrigin(req);
  if (originErr) return originErr;
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    const { id } = await params;
    await initializeDatabase();
    const db = getDb();

    const [existing] = await db
      .select({ id: inboxItems.id })
      .from(inboxItems)
      .where(and(eq(inboxItems.id, id), eq(inboxItems.profileId, auth.profile.id)))
      .limit(1);
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy mục Inbox.' }, { status: 404 });

    await db
      .delete(inboxItems)
      .where(and(eq(inboxItems.id, id), eq(inboxItems.profileId, auth.profile.id)));
    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    console.error('Lỗi xóa mục Inbox:', error);
    return NextResponse.json({ error: 'Không thể xóa mục Inbox.' }, { status: 500 });
  }
}
