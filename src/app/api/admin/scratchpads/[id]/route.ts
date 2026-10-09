import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guard';
import { getDb, initializeDatabase } from '@/lib/db';
import { scratchpads } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { sanitizePlain } from '@/lib/security/sanitize';
import { assertValidOrigin } from '@/lib/security/origin-guard';
import { ScratchpadColor } from '@/lib/types';

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
      .from(scratchpads)
      .where(and(eq(scratchpads.id, id), eq(scratchpads.profileId, auth.profile.id)));

    if (!existing) {
      return NextResponse.json({ error: 'Không tìm thấy ghi chú nháp.' }, { status: 404 });
    }

    const updates: Partial<typeof scratchpads.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (body.title !== undefined) updates.title = body.title ? sanitizePlain(body.title) : null;
    if (body.content !== undefined) updates.content = sanitizePlain(body.content);
    if (body.color !== undefined) updates.color = body.color as ScratchpadColor;
    if (body.isPinned !== undefined) updates.isPinned = Boolean(body.isPinned);
    if (body.sortOrder !== undefined) updates.sortOrder = Number(body.sortOrder);

    await db
      .update(scratchpads)
      .set(updates)
      .where(and(eq(scratchpads.id, id), eq(scratchpads.profileId, auth.profile.id)));

    const [updated] = await db
      .select()
      .from(scratchpads)
      .where(and(eq(scratchpads.id, id), eq(scratchpads.profileId, auth.profile.id)));

    return NextResponse.json({ scratchpad: updated });
  } catch (error) {
    console.error('Lỗi cập nhật ghi chú nháp:', error);
    return NextResponse.json({ error: 'Không thể cập nhật ghi chú nháp.' }, { status: 500 });
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

    await db
      .delete(scratchpads)
      .where(and(eq(scratchpads.id, id), eq(scratchpads.profileId, auth.profile.id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Lỗi xóa ghi chú nháp:', error);
    return NextResponse.json({ error: 'Không thể xóa ghi chú nháp.' }, { status: 500 });
  }
}
