import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guard';
import { getDb, initializeDatabase } from '@/lib/db';
import { kanbanTasks } from '@/lib/db/schema';
import { eq, desc, and, asc } from 'drizzle-orm';
import crypto from 'node:crypto';
import { sanitizePlain } from '@/lib/security/sanitize';
import { assertValidOrigin } from '@/lib/security/origin-guard';
import { TaskStatus } from '@/lib/types';
import { parseTaskCreateInput, TaskValidationError } from '@/lib/tasks/validation';

const TASK_STATUSES = new Set<TaskStatus>(['backlog', 'todo', 'in_progress', 'review', 'done']);

export async function GET(req: NextRequest) {
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    await initializeDatabase();
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const requestedStatus = searchParams.get('status');
    if (requestedStatus && !TASK_STATUSES.has(requestedStatus as TaskStatus)) {
      return NextResponse.json({ error: 'Trạng thái lọc công việc không hợp lệ.' }, { status: 400 });
    }

    const conditions = [eq(kanbanTasks.profileId, auth.profile.id)];
    if (requestedStatus) conditions.push(eq(kanbanTasks.status, requestedStatus as TaskStatus));

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
  const originError = assertValidOrigin(req);
  if (originError) return originError;
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    await initializeDatabase();
    const db = getDb();
    const input = parseTaskCreateInput(await req.json());
    const title = sanitizePlain(input.title);
    if (!title) throw new TaskValidationError('Tiêu đề công việc không hợp lệ sau khi làm sạch.');

    const newTask = {
      id: 'task-' + crypto.randomUUID(),
      profileId: auth.profile.id,
      title,
      description: input.description ? sanitizePlain(input.description) : null,
      status: input.status,
      priority: input.priority,
      dueDate: input.dueDate,
      tags: input.tags.map((tag) => sanitizePlain(tag)).filter(Boolean),
      subtasksJson: input.subtasksJson.map((subtask) => ({
        ...subtask,
        title: sanitizePlain(subtask.title),
      })).filter((subtask) => subtask.title.length > 0),
      sortOrder: input.sortOrder,
      relatedItemId: input.relatedItemId ? sanitizePlain(input.relatedItemId) : null,
    };

    await db.insert(kanbanTasks).values(newTask);
    const [created] = await db.select().from(kanbanTasks).where(eq(kanbanTasks.id, newTask.id));
    if (!created) throw new Error('Task insert completed without a readable row.');
    return NextResponse.json({ task: created }, { status: 201 });
  } catch (error) {
    if (error instanceof TaskValidationError || error instanceof SyntaxError) {
      return NextResponse.json({
        error: error instanceof TaskValidationError ? error.message : 'Body yêu cầu phải là JSON hợp lệ.',
      }, { status: 400 });
    }
    console.error('Lỗi tạo công việc mới:', error);
    return NextResponse.json({ error: 'Không thể tạo công việc mới.' }, { status: 500 });
  }
}
