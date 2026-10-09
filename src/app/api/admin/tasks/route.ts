import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guard';
import { getDb, initializeDatabase } from '@/lib/db';
import { kanbanTasks } from '@/lib/db/schema';
import { eq, desc, and, asc } from 'drizzle-orm';
import crypto from 'crypto';
import { sanitizePlain } from '@/lib/security/sanitize';
import { assertValidOrigin } from '@/lib/security/origin-guard';
import { TaskStatus, TaskPriority, KanbanSubtask } from '@/lib/types';

export async function GET(req: NextRequest) {
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    await initializeDatabase();
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as TaskStatus | null;

    const conditions = [eq(kanbanTasks.profileId, auth.profile.id)];
    if (status) {
      conditions.push(eq(kanbanTasks.status, status));
    }

    const tasks = await db
      .select()
      .from(kanbanTasks)
      .where(and(...conditions))
      .orderBy(asc(kanbanTasks.sortOrder), desc(kanbanTasks.createdAt));

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Lỗi lấy danh sách công việc:', error);
    return NextResponse.json({ error: 'Không thể tải danh sách công việc.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  await assertValidOrigin(req);
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    await initializeDatabase();
    const db = getDb();
    const body = await req.json();

    const title = sanitizePlain(body.title || '');
    if (!title) {
      return NextResponse.json({ error: 'Tiêu đề công việc là bắt buộc.' }, { status: 400 });
    }

    const description = body.description ? sanitizePlain(body.description) : null;
    const status: TaskStatus = body.status || 'todo';
    const priority: TaskPriority = body.priority || 'medium';
    const dueDate = body.dueDate ? sanitizePlain(body.dueDate) : null;
    const tags: string[] = Array.isArray(body.tags) ? body.tags.map((t: string) => sanitizePlain(t)) : [];
    const subtasksJson: KanbanSubtask[] = Array.isArray(body.subtasksJson)
      ? body.subtasksJson.map((st: { id?: string; title: string; completed?: boolean }) => ({
          id: st.id || 'sub-' + crypto.randomUUID(),
          title: sanitizePlain(st.title || ''),
          completed: Boolean(st.completed),
        }))
      : [];
    const relatedItemId = body.relatedItemId ? sanitizePlain(body.relatedItemId) : null;

    const newTask = {
      id: 'task-' + crypto.randomUUID(),
      profileId: auth.profile.id,
      title,
      description,
      status,
      priority,
      dueDate,
      tags,
      subtasksJson,
      sortOrder: Number(body.sortOrder) || 0,
      relatedItemId,
    };

    await db.insert(kanbanTasks).values(newTask);

    const [created] = await db.select().from(kanbanTasks).where(eq(kanbanTasks.id, newTask.id));
    return NextResponse.json({ task: created }, { status: 201 });
  } catch (error) {
    console.error('Lỗi tạo công việc mới:', error);
    return NextResponse.json({ error: 'Không thể tạo công việc mới.' }, { status: 500 });
  }
}
