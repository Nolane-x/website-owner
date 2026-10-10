import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guard';
import { getDb, initializeDatabase } from '@/lib/db';
import { kanbanTasks } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { sanitizePlain } from '@/lib/security/sanitize';
import { assertValidOrigin } from '@/lib/security/origin-guard';
import { parseTaskPatchInput, TaskValidationError } from '@/lib/tasks/validation';

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
    const [existing] = await db
      .select()
      .from(kanbanTasks)
      .where(and(eq(kanbanTasks.id, id), eq(kanbanTasks.profileId, auth.profile.id)));

    if (!existing) return NextResponse.json({ error: 'Không tìm thấy công việc.' }, { status: 404 });

    const input = parseTaskPatchInput(await req.json());
    const updates: Partial<typeof kanbanTasks.$inferInsert> = { updatedAt: new Date() };

    if ('title' in input) {
      const title = sanitizePlain(input.title ?? '');
      if (!title) throw new TaskValidationError('Tiêu đề công việc không hợp lệ sau khi làm sạch.');
      updates.title = title;
    }
    if ('description' in input) updates.description = input.description ? sanitizePlain(input.description) : null;
    if ('status' in input) updates.status = input.status;
    if ('priority' in input) updates.priority = input.priority;
    if ('dueDate' in input) updates.dueDate = input.dueDate;
    if ('sortOrder' in input) updates.sortOrder = input.sortOrder;
    if ('relatedItemId' in input) updates.relatedItemId = input.relatedItemId ? sanitizePlain(input.relatedItemId) : null;
    if ('tags' in input) updates.tags = (input.tags ?? []).map((tag) => sanitizePlain(tag)).filter(Boolean);
    if ('subtasksJson' in input) {
      updates.subtasksJson = (input.subtasksJson ?? []).map((subtask) => ({
        ...subtask,
        title: sanitizePlain(subtask.title),
      })).filter((subtask) => subtask.title.length > 0);
    }

    await db
      .update(kanbanTasks)
      .set(updates)
      .where(and(eq(kanbanTasks.id, id), eq(kanbanTasks.profileId, auth.profile.id)));

    const [updated] = await db
      .select()
      .from(kanbanTasks)
      .where(and(eq(kanbanTasks.id, id), eq(kanbanTasks.profileId, auth.profile.id)));

    if (!updated) return NextResponse.json({ error: 'Công việc đã biến mất trong lúc cập nhật.' }, { status: 409 });
    return NextResponse.json({ task: updated });
  } catch (error) {
    if (error instanceof TaskValidationError || error instanceof SyntaxError) {
      return NextResponse.json({
        error: error instanceof TaskValidationError ? error.message : 'Body yêu cầu phải là JSON hợp lệ.',
      }, { status: 400 });
    }
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
    const [existing] = await db
      .select({ id: kanbanTasks.id })
      .from(kanbanTasks)
      .where(and(eq(kanbanTasks.id, id), eq(kanbanTasks.profileId, auth.profile.id)));

    if (!existing) return NextResponse.json({ error: 'Không tìm thấy công việc.' }, { status: 404 });

    await db
      .delete(kanbanTasks)
      .where(and(eq(kanbanTasks.id, id), eq(kanbanTasks.profileId, auth.profile.id)));

    return NextResponse.json({ success: true, deletedId: existing.id });
  } catch (error) {
    console.error('Lỗi xóa công việc:', error);
    return NextResponse.json({ error: 'Không thể xóa công việc.' }, { status: 500 });
  }
}
