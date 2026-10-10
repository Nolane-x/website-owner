import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { requireOwner } from '@/lib/auth/guard';
import { getDb, initializeDatabase } from '@/lib/db';
import { automationWorkflows, automationWorkflowRuns, kanbanTasks } from '@/lib/db/schema';
import { assertValidOrigin } from '@/lib/security/origin-guard';
import { convertInboxItemToTask } from '@/lib/workflows/convert-inbox';
import { buildOverdueReport } from '@/lib/workflows/overdue-report';
import { compileWorkflowGraph } from '@/lib/workflows/compiler';
import { executeWorkflowGraph, WorkflowExecutionError } from '@/lib/workflows/executor';
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

    const compilation = compileWorkflowGraph(workflow.nodesJson, workflow.edgesJson);
    if (!compilation.valid) {
      return NextResponse.json({
        error: 'Workflow có đồ thị không hợp lệ và chưa được thực thi.',
        details: compilation.errors,
        compilation,
      }, { status: 422 });
    }

    const configuredOperationCount = compilation.order.filter(
      (node) => typeof node.config?.operation === 'string' && node.config.operation.trim(),
    ).length;
    const useNodeExecutor = compilation.order.length > 0 &&
      configuredOperationCount === compilation.order.length;
    const hasPartialOperations = configuredOperationCount > 0 && !useNodeExecutor;
    if (hasPartialOperations || (compilation.mode === 'dag' && !useNodeExecutor)) {
      return NextResponse.json({
        error: 'Workflow dạng DAG cần khai báo operation đã đăng ký cho tất cả node trước khi chạy.',
        details: ['Không tự động bỏ qua cấu trúc node/edge để chạy executor trigger cũ.'],
      }, { status: 422 });
    }

    const requiresInboxItem = workflow.triggerType === 'inbox_to_task' ||
      (useNodeExecutor && compilation.order.some((node) => node.config?.operation === 'load_inbox_item'));
    if (requiresInboxItem && (typeof input.inboxItemId !== 'string' || !input.inboxItemId.trim())) {
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
      inputJson: {
        inboxItemId: typeof input.inboxItemId === 'string' ? input.inboxItemId : null,
        compilerMode: compilation.mode,
        compiledNodeIds: compilation.order.map((node) => node.id),
        compilationWarnings: compilation.warnings,
      },
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

    if (useNodeExecutor) {
      const result = await executeWorkflowGraph(
        db,
        auth.profile.id,
        workflow.nodesJson,
        workflow.edgesJson,
        { inboxItemId: typeof input.inboxItemId === 'string' ? input.inboxItemId : undefined },
      );
      const executionResult = {
        ...result,
        executorMode: 'node_graph',
        compilerMode: compilation.mode,
        compiledNodeIds: compilation.order.map((node) => node.id),
      };
      await finishRun('succeeded', executionResult);
      return NextResponse.json({
        ...executionResult,
        status: 'succeeded',
        runId,
        workflowId: workflow.id,
      });
    }

    if (workflow.triggerType === 'inbox_to_task') {
      const inboxItemId = input.inboxItemId as string;
      const conversion = await convertInboxItemToTask(db, auth.profile.id, inboxItemId);

      if (conversion.status === 'not_found') {
        const message = 'Không tìm thấy mục Inbox thuộc tài khoản này.';
        await finishRun('failed', { reason: 'inbox_item_not_found' }, message);
        return NextResponse.json({ error: message, runId }, { status: 404 });
      }

      const alreadyCreated = conversion.status === 'reused';
      const resultMessage = alreadyCreated
        ? 'Task đã tồn tại; đã tái sử dụng, không tạo trùng.'
        : 'Task đã được tạo và liên kết với mục Inbox.';
      await finishRun('succeeded', {
        result: resultMessage,
        taskId: conversion.task.id,
        taskTitle: conversion.task.title,
        inboxItemId: conversion.inboxItemId,
        idempotentReplay: alreadyCreated,
        atomicConversion: true,
      });
      return NextResponse.json({
        status: 'succeeded',
        runId,
        workflowId: workflow.id,
        result: resultMessage,
        task: conversion.task,
        inboxItemId: conversion.inboxItemId,
        inboxStatus: 'converted',
        idempotentReplay: alreadyCreated,
        atomicConversion: true,
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
    const executionFailure = error instanceof WorkflowExecutionError ? error : null;
    const safeErrorMessage = executionFailure?.message ??
      'Workflow thất bại. Hệ thống không đánh dấu chạy thành công; hãy kiểm tra trạng thái dữ liệu trước khi thử lại.';
    if (database && runId && runProfileId) {
      try {
        const finishedAt = new Date();
        await database.update(automationWorkflowRuns).set({
          status: 'failed',
          resultJson: executionFailure ? { executionTrace: executionFailure.executionTrace } : null,
          errorMessage: safeErrorMessage.slice(0, 500),
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
      error: safeErrorMessage,
      executionTrace: executionFailure?.executionTrace,
      runId: runId ?? undefined,
    }, { status: 500 });
  }
}
