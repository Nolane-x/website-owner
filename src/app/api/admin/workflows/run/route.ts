import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { requireOwner } from '@/lib/auth/guard';
import { getDb, initializeDatabase } from '@/lib/db';
import { automationWorkflows, inboxItems, kanbanTasks } from '@/lib/db/schema';
import { assertValidOrigin } from '@/lib/security/origin-guard';
import { buildInboxTaskPayload } from '@/lib/workflows/inbox-to-task';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  const originError = assertValidOrigin(req);
  if (originError) return originError;

  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    const body: unknown = await req.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Nội dung yêu cầu không hợp lệ.' }, { status: 400 });
    }
    const input = body as { workflowId?: unknown; inboxItemId?: unknown };
    if (typeof input.workflowId !== 'string' || !input.workflowId.trim()) {
      return NextResponse.json({ error: 'workflowId là bắt buộc.' }, { status: 400 });
    }

    await initializeDatabase();
    const db = getDb();
    const [workflow] = await db.select().from(automationWorkflows).where(and(
      eq(automationWorkflows.id, input.workflowId),
      eq(automationWorkflows.profileId, auth.profile.id),
    )).limit(1);

    if (!workflow) {
      return NextResponse.json({ error: 'Không tìm thấy workflow thuộc tài khoản này.' }, { status: 404 });
    }
    if (!workflow.isActive) {
      return NextResponse.json({ error: 'Workflow đang bị tắt. Hãy bật lại trước khi chạy.' }, { status: 409 });
    }

    if (workflow.triggerType === 'inbox_to_task') {
      if (typeof input.inboxItemId !== 'string' || !input.inboxItemId.trim()) {
        return NextResponse.json({ error: 'Hãy chọn một mục Inbox trước khi chạy workflow.' }, { status: 400 });
      }
      const [item] = await db.select().from(inboxItems).where(and(
        eq(inboxItems.id, input.inboxItemId),
        eq(inboxItems.profileId, auth.profile.id),
      )).limit(1);

      if (!item) {
        return NextResponse.json({ error: 'Không tìm thấy mục Inbox thuộc tài khoản này.' }, { status: 404 });
      }

      // Idempotency at the application boundary: re-running the same item reuses its linked task.
      let [task] = await db.select().from(kanbanTasks).where(and(
        eq(kanbanTasks.profileId, auth.profile.id),
        eq(kanbanTasks.relatedItemId, item.id),
      )).limit(1);
      const alreadyCreated = Boolean(task);

      if (!task) {
        const payload = buildInboxTaskPayload(item);
        const id = `task-${crypto.randomUUID()}`;
        await db.insert(kanbanTasks).values({
          id,
          profileId: auth.profile.id,
          ...payload,
          subtasksJson: [],
          sortOrder: 0,
        });
        [task] = await db.select().from(kanbanTasks).where(and(
          eq(kanbanTasks.id, id),
          eq(kanbanTasks.profileId, auth.profile.id),
        )).limit(1);
        if (!task) {
          return NextResponse.json({ error: 'Đã gửi yêu cầu tạo task nhưng không thể xác minh bản ghi. Hãy chạy lại để phục hồi an toàn.' }, { status: 500 });
        }
      }

      if (item.status !== 'converted') {
        await db.update(inboxItems).set({ status: 'converted', updatedAt: new Date() }).where(and(
          eq(inboxItems.id, item.id),
          eq(inboxItems.profileId, auth.profile.id),
        ));
      }

      return NextResponse.json({
        status: 'succeeded',
        workflowId: workflow.id,
        result: alreadyCreated ? 'Task đã tồn tại; đã tái sử dụng, không tạo trùng.' : 'Task đã được tạo và liên kết với mục Inbox.',
        task,
        inboxItemId: item.id,
        inboxStatus: 'converted',
        idempotentReplay: alreadyCreated,
      });
    }

    if (workflow.triggerType === 'overdue_report') {
      const tasks = await db.select().from(kanbanTasks).where(eq(kanbanTasks.profileId, auth.profile.id));
      const now = new Date();
      const overdue = tasks.filter((task) => {
        if (!task.dueDate || task.status === 'done') return false;
        const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(task.dueDate);
        const due = new Date(dateOnly ? `${task.dueDate}T23:59:59` : task.dueDate);
        return Number.isFinite(due.getTime()) && due < now;
      });
      return NextResponse.json({
        status: 'succeeded',
        workflowId: workflow.id,
        result: `Đã kiểm tra ${tasks.length} task; ${overdue.length} task quá hạn chưa hoàn tất.`,
        totalTasks: tasks.length,
        overdueCount: overdue.length,
        overdueTasks: overdue.map((task) => ({ id: task.id, title: task.title, dueDate: task.dueDate, status: task.status })),
        sideEffects: false,
      });
    }

    return NextResponse.json({
      error: `Trigger "${workflow.triggerType}" hiện chưa có executor thật. Workflow chưa được chạy.`,
      status: 'unsupported_trigger',
    }, { status: 422 });
  } catch (error) {
    console.error('Lỗi thực thi workflow:', error);
    return NextResponse.json({ error: 'Workflow thất bại. Hệ thống không đánh dấu chạy thành công; hãy kiểm tra trạng thái dữ liệu trước khi thử lại.' }, { status: 500 });
  }
}
