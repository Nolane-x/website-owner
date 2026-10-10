import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { requireOwner } from '@/lib/auth/guard';
import { getDb, initializeDatabase } from '@/lib/db';
import { automationWorkflows, automationWorkflowRuns, inboxItems, kanbanTasks } from '@/lib/db/schema';
import { assertValidOrigin } from '@/lib/security/origin-guard';
import { buildInboxTaskPayload } from '@/lib/workflows/inbox-to-task';
import { buildOverdueReport } from '@/lib/workflows/overdue-report';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  const originError = assertValidOrigin(req);
  if (originError) return originError;

  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  let database: ReturnType<typeof getDb> | null = null;
  let runId: string | null = null;
  let runStartedAt = 0;
  let runProfileId: string | null = null;

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
    database = db;
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
    if (workflow.triggerType === 'inbox_to_task' &&
        (typeof input.inboxItemId !== 'string' || !input.inboxItemId.trim())) {
      return NextResponse.json({ error: 'Hãy chọn một mục Inbox trước khi chạy workflow.' }, { status: 400 });
    }

    runId = crypto.randomUUID();
    runStartedAt = Date.now();
    runProfileId = auth.profile.id;
    await db.insert(automationWorkflowRuns).values({
      id: runId,
      profileId: auth.profile.id,
      workflowId: workflow.id,
      triggerType: workflow.triggerType,
      status: 'running',
      inputJson: { inboxItemId: typeof input.inboxItemId === 'string' ? input.inboxItemId : null },
      startedAt: new Date(runStartedAt),
      createdAt: new Date(runStartedAt),
    });
    const finishRun = async (
      status: string,
      resultJson: Record<string, unknown> | null = null,
      errorMessage: string | null = null,
    ) => {
      const finishedAt = new Date();
      await db.update(automationWorkflowRuns).set({
        status,
        resultJson,
        errorMessage,
        finishedAt,
        durationMs: Math.max(0, finishedAt.getTime() - runStartedAt),
      }).where(and(
        eq(automationWorkflowRuns.id, runId as string),
        eq(automationWorkflowRuns.profileId, auth.profile.id),
        eq(automationWorkflowRuns.status, 'running'),
      ));
    };

    if (workflow.triggerType === 'inbox_to_task') {
      const inboxItemId = input.inboxItemId as string;
      const [item] = await db.select().from(inboxItems).where(and(
        eq(inboxItems.id, inboxItemId),
        eq(inboxItems.profileId, auth.profile.id),
      )).limit(1);

      if (!item) {
        const message = 'Không tìm thấy mục Inbox thuộc tài khoản này.';
        await finishRun('failed', { reason: 'inbox_item_not_found' }, message);
        return NextResponse.json({ error: message, runId }, { status: 404 });
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
          const message = 'Đã gửi yêu cầu tạo task nhưng không thể xác minh bản ghi. Hãy chạy lại để phục hồi an toàn.';
          await finishRun('failed', { reason: 'task_verification_failed' }, message);
          return NextResponse.json({ error: message, runId }, { status: 500 });
        }
      }

      if (item.status !== 'converted') {
        await db.update(inboxItems).set({ status: 'converted', updatedAt: new Date() }).where(and(
          eq(inboxItems.id, item.id),
          eq(inboxItems.profileId, auth.profile.id),
        ));
      }

      const resultMessage = alreadyCreated
        ? 'Task đã tồn tại; đã tái sử dụng, không tạo trùng.'
        : 'Task đã được tạo và liên kết với mục Inbox.';
      await finishRun('succeeded', {
        result: resultMessage,
        taskId: task.id,
        taskTitle: task.title,
        inboxItemId: item.id,
        idempotentReplay: alreadyCreated,
      });
      return NextResponse.json({
        status: 'succeeded',
        runId,
        workflowId: workflow.id,
        result: resultMessage,
        task,
        inboxItemId: item.id,
        inboxStatus: 'converted',
        idempotentReplay: alreadyCreated,
      });
    }

    if (workflow.triggerType === 'overdue_report') {
      const tasks = await db.select().from(kanbanTasks).where(eq(kanbanTasks.profileId, auth.profile.id));
      const report = buildOverdueReport(tasks, new Date());
      const resultMessage = `Đã kiểm tra ${report.totalTasks} task; ${report.overdueCount} task quá hạn chưa hoàn tất.`;
      await finishRun('succeeded', {
        result: resultMessage,
        totalTasks: report.totalTasks,
        overdueCount: report.overdueCount,
        overdueTasks: report.overdueTasks,
        sideEffects: false,
      });
      return NextResponse.json({
        status: 'succeeded',
        runId,
        workflowId: workflow.id,
        result: resultMessage,
        totalTasks: report.totalTasks,
        overdueCount: report.overdueCount,
        overdueTasks: report.overdueTasks,
        sideEffects: false,
      });
    }

    const message = `Trigger "${workflow.triggerType}" hiện chưa có executor thật. Workflow chưa được chạy.`;
    await finishRun('unsupported_trigger', { reason: 'unsupported_trigger' }, message);
    return NextResponse.json({
      error: message,
      status: 'unsupported_trigger',
      runId,
    }, { status: 422 });
  } catch (error) {
    console.error('Lỗi thực thi workflow:', error);
    if (database && runId && runProfileId) {
      try {
        const finishedAt = new Date();
        await database.update(automationWorkflowRuns).set({
          status: 'failed',
          errorMessage: 'Workflow thất bại. Hãy kiểm tra dữ liệu trước khi thử lại.',
          finishedAt,
          durationMs: Math.max(0, finishedAt.getTime() - runStartedAt),
        }).where(and(
          eq(automationWorkflowRuns.id, runId),
          eq(automationWorkflowRuns.profileId, runProfileId),
          eq(automationWorkflowRuns.status, 'running'),
        ));
      } catch (historyError) {
        console.error('Không thể ghi trạng thái thất bại của workflow run:', historyError);
      }
    }
    return NextResponse.json({
      error: 'Workflow thất bại. Hệ thống không đánh dấu chạy thành công; hãy kiểm tra trạng thái dữ liệu trước khi thử lại.',
      runId: runId ?? undefined,
    }, { status: 500 });
  }
}
