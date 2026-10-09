import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guard';
import { getDb, initializeDatabase } from '@/lib/db';
import { kanbanTasks } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { sanitizePlain } from '@/lib/security/sanitize';
import { assertValidOrigin } from '@/lib/security/origin-guard';
import { TaskStatus, TaskPriority } from '@/lib/types';
import crypto from 'crypto';

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
      .from(kanbanTasks)
      .where(and(eq(kanbanTasks.id, id), eq(kanbanTasks.profileId, auth.profile.id)));

    if (!existing) {
      return NextResponse.json({ error: 'Không tìm thấy công việc.' }, { status: 404 });
    }

    const updates: Partial<typeof kanbanTasks.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (body.title !== undefined) updates.title = sanitizePlain(body.title);
    if (body.description !== undefined) updates.description = body.description ? sanitizePlain(body.description) : null;
    if (body.status !== undefined) updates.status = body.status as TaskStatus;
    if (body.priority !== undefined) updates.priority = body.priority as TaskPriority;
    if (body.dueDate !== undefined) updates.dueDate = body.dueDate ? sanitizePlain(body.dueDate) : null;
    if (body.sortOrder !== undefined) updates.sortOrder = Number(body.sortOrder);
    if (body.relatedItemId !== undefined) updates.relatedItemId = body.relatedItemId ? sanitizePlain(body.relatedItemId) : null;

    if (Array.isArray(body.tags)) {
      updates.tags = body.tags.map((t: string) => sanitizePlain(t));
    }

    if (Array.isArray(body.subtasksJson)) {
      updates.subtasksJson = body.subtasksJson.map((st: { id?: string; title: string; completed?: boolean }) => ({
        id: st.id || 'sub-' + crypto.randomUUID(),
        title: sanitizePlain(st.title || ''),
        completed: Boolean(st.completed),
      }));
    }

    await db
      .update(kanbanTasks)
      .set(updates)
      .where(and(eq(kanbanTasks.id, id), eq(kanbanTasks.profileId, auth.profile.id)));

    const [updated] = await db
      .select()
      .from(kanbanTasks)
      .where(and(eq(kanbanTasks.id, id), eq(kanbanTasks.profileId, auth.profile.id)));

    return NextResponse.json({ task: updated });
  } catch (error) {
    console.error('Lỗi cập nhật công việc:', error);
    return NextResponse.json({ error: 'Không thể cập nhật công việc.' }, { status: 500 });
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

    const result = await db
      .delete(kanbanTasks)
      .where(and(eq(kanbanTasks.id, id), eq(kanbanTasks.profileId, auth.profile.id)));

    return NextResponse.json({ success: true, deleted: result });
  } catch (error) {
    console.error('Lỗi xóa công việc:', error);
    return NextResponse.json({ error: 'Không thể xóa công việc.' }, { status: 500 });
  }
}
