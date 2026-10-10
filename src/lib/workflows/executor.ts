import crypto from 'crypto';
import { and, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { inboxItems, kanbanTasks } from '@/lib/db/schema';
import { buildInboxTaskPayload } from '@/lib/workflows/inbox-to-task';
import { buildOverdueReport, type OverdueReport } from '@/lib/workflows/overdue-report';
import { compileWorkflowGraph, type CompiledWorkflowNode } from '@/lib/workflows/compiler';
import type { WorkflowEdge } from '@/lib/types';

export interface WorkflowExecutionTraceStep {
  nodeId: string;
  title: string;
  type: string;
  status: 'succeeded' | 'skipped' | 'failed';
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  summary: string;
}

export interface WorkflowNodeExecutorResult {
  status: 'succeeded';
  result: string;
  sideEffects: boolean;
  executionTrace: WorkflowExecutionTraceStep[];
  task?: { id: string; title: string };
  inboxItemId?: string;
  inboxStatus?: string;
  idempotentReplay?: boolean;
  totalTasks?: number;
  overdueCount?: number;
  overdueTasks?: OverdueReport['overdueTasks'];
}

export class WorkflowExecutionError extends Error {
  readonly executionTrace: WorkflowExecutionTraceStep[];

  constructor(message: string, executionTrace: WorkflowExecutionTraceStep[]) {
    super(message);
    this.name = 'WorkflowExecutionError';
    this.executionTrace = executionTrace;
  }
}

interface ExecutorInput {
  inboxItemId?: string;
}

interface ExecutionContext {
  inboxItem?: typeof inboxItems.$inferSelect;
  existingTask?: typeof kanbanTasks.$inferSelect;
  task?: typeof kanbanTasks.$inferSelect;
  tasks?: (typeof kanbanTasks.$inferSelect)[];
  overdueReport?: OverdueReport;
  conditionResult?: boolean;
  sideEffects: boolean;
  idempotentReplay: boolean;
}

interface OperationResult {
  summary: string;
  conditionResult?: boolean;
}

const SUPPORTED_OPERATIONS: Record<CompiledWorkflowNode['type'], ReadonlySet<string>> = {
  trigger: new Set(['load_inbox_item', 'load_owner_tasks']),
  condition: new Set(['task_already_linked', 'overdue_tasks_exist']),
  action: new Set([
    'reuse_linked_task',
    'create_task_if_missing',
    'mark_inbox_converted',
    'build_overdue_report',
    'emit_no_overdue_report',
  ]),
  ai: new Set(),
  approval: new Set(),
};

const MAX_DURATION_MS = 2_147_483_647;

function getOperation(node: CompiledWorkflowNode): string {
  const operation = node.config?.operation;
  if (typeof operation !== 'string' || !operation.trim()) {
    throw new Error(`Node “${node.title}” chưa khai báo operation an toàn.`);
  }
  if (!SUPPORTED_OPERATIONS[node.type].has(operation)) {
    throw new Error(`Operation “${operation}” không được phép cho node type “${node.type}”.`);
  }
  return operation;
}

function safeNowDate(now: Date): Date {
  return Number.isFinite(now.getTime()) ? now : new Date();
}

/**
 * Execute only registered, bounded operations. The graph controls reachability,
 * order and condition branches; node config never contains executable code.
 * Any unknown operation fails closed. Older definitions without operation
 * configs remain on the legacy trigger-specific path in the API route.
 */
export async function executeWorkflowGraph(
  db: ReturnType<typeof getDb>,
  profileId: string,
  nodes: unknown,
  edgesValue: unknown,
  input: ExecutorInput,
  now = new Date(),
): Promise<WorkflowNodeExecutorResult> {
  const compilation = compileWorkflowGraph(nodes, edgesValue);
  if (!compilation.valid) {
    throw new WorkflowExecutionError('Workflow có đồ thị không hợp lệ.', []);
  }
  if (!compilation.order.length || compilation.mode === 'empty') {
    throw new WorkflowExecutionError('Workflow chưa có node có thể thực thi.', []);
  }

  const edges = Array.isArray(edgesValue) ? edgesValue as WorkflowEdge[] : [];
  const executionTrace: WorkflowExecutionTraceStep[] = [];
  const context: ExecutionContext = {
    sideEffects: false,
    idempotentReplay: false,
  };
  const trigger = compilation.order.find((node) => node.type === 'trigger');
  if (!trigger) throw new WorkflowExecutionError('Workflow thiếu node trigger.', []);
  const activeNodes = new Set<string>([trigger.id]);
  const activeEdges = new Map<string, boolean>();
  const keyForEdge = (source: string, target: string) => `${source}\u0000${target}`;
  const currentTime = safeNowDate(now);

  for (const node of compilation.order) {
    const incoming = edges.filter((edge) => edge.target === node.id);
    const isActive = node.id === trigger.id || compilation.mode === 'legacy-linear' ||
      incoming.some((edge) => activeEdges.get(keyForEdge(edge.source, edge.target)) === true);

    if (!isActive) {
      const skippedAt = new Date().toISOString();
      executionTrace.push({
        nodeId: node.id,
        title: node.title,
        type: node.type,
        status: 'skipped',
        startedAt: skippedAt,
        finishedAt: skippedAt,
        durationMs: 0,
        summary: 'Bỏ qua do nhánh điều kiện trước đó không được chọn.',
      });
      continue;
    }

    const started = Date.now();
    const startedAt = new Date(started).toISOString();
    try {
      const operation = getOperation(node);
      const outcome = await executeOperation(operation, db, profileId, context, input, currentTime);
      const finished = Date.now();
      executionTrace.push({
        nodeId: node.id,
        title: node.title,
        type: node.type,
        status: 'succeeded',
        startedAt,
        finishedAt: new Date(finished).toISOString(),
        durationMs: Math.min(MAX_DURATION_MS, Math.max(0, finished - started)),
        summary: outcome.summary,
      });

      if (node.type === 'condition') context.conditionResult = outcome.conditionResult ?? false;
      const outgoing = edges.filter((edge) => edge.source === node.id);
      for (const edge of outgoing) {
        let follows = true;
        if (node.type === 'condition' && outgoing.length > 1) {
          const label = edge.label?.trim().toLowerCase();
          if (label !== 'true' && label !== 'false') {
            throw new Error(`Nhánh của node điều kiện “${node.title}” phải được gắn nhãn true/false.`);
          }
          follows = label === String(context.conditionResult);
        }
        activeEdges.set(keyForEdge(edge.source, edge.target), follows);
        if (follows) activeNodes.add(edge.target);
      }
    } catch (error) {
      const finished = Date.now();
      const message = error instanceof Error
        ? error.message
        : `Node “${node.title}” thực thi thất bại.`;
      executionTrace.push({
        nodeId: node.id,
        title: node.title,
        type: node.type,
        status: 'failed',
        startedAt,
        finishedAt: new Date(finished).toISOString(),
        durationMs: Math.min(MAX_DURATION_MS, Math.max(0, finished - started)),
        summary: message.slice(0, 500),
      });
      throw new WorkflowExecutionError(message, executionTrace);
    }
  }

  if (context.inboxItem && context.task) {
    return {
      status: 'succeeded',
      result: context.idempotentReplay
        ? 'Task đã tồn tại; workflow đã tái sử dụng task liên kết, không tạo trùng.'
        : 'Task đã được tạo, xác minh và liên kết với mục Inbox.',
      sideEffects: context.sideEffects,
      executionTrace,
      task: { id: context.task.id, title: context.task.title },
      inboxItemId: context.inboxItem.id,
      inboxStatus: context.inboxItem.status,
      idempotentReplay: context.idempotentReplay,
    };
  }

  const report = context.overdueReport;
  if (report) {
    return {
      status: 'succeeded',
      result: `Đã kiểm tra ${report.totalTasks} task; ${report.overdueCount} task quá hạn chưa hoàn tất.`,
      sideEffects: false,
      executionTrace,
      totalTasks: report.totalTasks,
      overdueCount: report.overdueCount,
      overdueTasks: report.overdueTasks.slice(0, 100),
    };
  }

  throw new WorkflowExecutionError('Workflow kết thúc nhưng không tạo ra kết quả được hỗ trợ.', executionTrace);
}

async function executeOperation(
  operation: string,
  db: ReturnType<typeof getDb>,
  profileId: string,
  context: ExecutionContext,
  input: ExecutorInput,
  now: Date,
): Promise<OperationResult> {
  switch (operation) {
    case 'load_inbox_item': {
      if (!input.inboxItemId?.trim()) throw new Error('Node load_inbox_item cần inboxItemId.');
      const [item] = await db.select().from(inboxItems).where(and(
        eq(inboxItems.id, input.inboxItemId),
        eq(inboxItems.profileId, profileId),
      )).limit(1);
      if (!item) throw new Error('Không tìm thấy mục Inbox thuộc tài khoản này.');
      context.inboxItem = item;
      return { summary: 'Đã tải mục Inbox trong phạm vi tài khoản chủ sở hữu.' };
    }
    case 'load_owner_tasks': {
      context.tasks = await db.select().from(kanbanTasks).where(eq(kanbanTasks.profileId, profileId));
      return { summary: `Đã đọc ${context.tasks.length} task thuộc tài khoản.` };
    }
    case 'task_already_linked': {
      if (!context.inboxItem) throw new Error('Node task_already_linked cần node load_inbox_item chạy trước.');
      const [existing] = await db.select().from(kanbanTasks).where(and(
        eq(kanbanTasks.profileId, profileId),
        eq(kanbanTasks.relatedItemId, context.inboxItem.id),
      )).limit(1);
      context.existingTask = existing;
      return {
        summary: existing ? 'Đã tìm thấy task liên kết; nhánh tái sử dụng sẽ được chọn.' : 'Chưa có task liên kết; nhánh tạo task sẽ được chọn.',
        conditionResult: Boolean(existing),
      };
    }
    case 'overdue_tasks_exist': {
      if (!context.tasks) throw new Error('Node overdue_tasks_exist cần node load_owner_tasks chạy trước.');
      context.overdueReport = buildOverdueReport(context.tasks, now);
      return {
        summary: context.overdueReport.overdueCount > 0
          ? `Tìm thấy ${context.overdueReport.overdueCount} task quá hạn.`
          : 'Không có task quá hạn chưa hoàn tất.',
        conditionResult: context.overdueReport.overdueCount > 0,
      };
    }
    case 'reuse_linked_task': {
      if (!context.existingTask) throw new Error('Không có task liên kết để tái sử dụng.');
      context.task = context.existingTask;
      context.idempotentReplay = true;
      return { summary: 'Đã tái sử dụng task liên kết, không tạo task mới.' };
    }
    case 'create_task_if_missing': {
      if (!context.inboxItem) throw new Error('Node create_task_if_missing cần node load_inbox_item chạy trước.');
      // Re-check immediately before insert. The partial unique index below is the
      // final guard for concurrent runs of the same Inbox item.
      const [alreadyLinked] = await db.select().from(kanbanTasks).where(and(
        eq(kanbanTasks.profileId, profileId),
        eq(kanbanTasks.relatedItemId, context.inboxItem.id),
      )).limit(1);
      if (alreadyLinked) {
        context.task = alreadyLinked;
        context.idempotentReplay = true;
        return { summary: 'Một lượt chạy khác đã tạo task; tái sử dụng bản ghi đó.' };
      }

      const id = `task-${crypto.randomUUID()}`;
      const payload = buildInboxTaskPayload(context.inboxItem);
      const [inserted] = await db.insert(kanbanTasks).values({
        id,
        profileId,
        ...payload,
        subtasksJson: [],
        sortOrder: 0,
      }).onConflictDoNothing().returning();
      const [task] = await db.select().from(kanbanTasks).where(and(
        eq(kanbanTasks.profileId, profileId),
        eq(kanbanTasks.relatedItemId, context.inboxItem.id),
      )).limit(1);
      if (!task) throw new Error('Không thể xác minh task sau khi tạo.');
      context.task = task;
      context.idempotentReplay = !inserted;
      if (inserted) context.sideEffects = true;
      return {
        summary: inserted ? 'Đã tạo task và xác minh liên kết nguồn.' : 'Task đã được tạo đồng thời ở lượt chạy khác; đã tái sử dụng.',
      };
    }
    case 'mark_inbox_converted': {
      if (!context.inboxItem || !context.task) throw new Error('Node mark_inbox_converted cần task đã được xác minh.');
      if (context.inboxItem.status !== 'converted') {
        await db.update(inboxItems).set({ status: 'converted', updatedAt: new Date() }).where(and(
          eq(inboxItems.id, context.inboxItem.id),
          eq(inboxItems.profileId, profileId),
        ));
        context.sideEffects = true;
        context.inboxItem = { ...context.inboxItem, status: 'converted', updatedAt: new Date() };
      }
      return { summary: 'Đã xác minh task và cập nhật trạng thái Inbox thành converted.' };
    }
    case 'build_overdue_report': {
      if (!context.tasks) context.tasks = await db.select().from(kanbanTasks).where(eq(kanbanTasks.profileId, profileId));
      context.overdueReport = buildOverdueReport(context.tasks, now);
      return { summary: `Báo cáo đã tạo: ${context.overdueReport.overdueCount} task quá hạn.` };
    }
    case 'emit_no_overdue_report': {
      if (!context.overdueReport) {
        if (!context.tasks) context.tasks = await db.select().from(kanbanTasks).where(eq(kanbanTasks.profileId, profileId));
        context.overdueReport = buildOverdueReport(context.tasks, now);
      }
      if (context.overdueReport.overdueCount !== 0) {
        throw new Error('Nhánh không có task quá hạn được chọn nhưng dữ liệu báo cáo không khớp.');
      }
      return { summary: `Không có task quá hạn. Đã kiểm tra ${context.overdueReport.totalTasks} task.` };
    }
    default:
      throw new Error(`Operation “${operation}” chưa có executor được phép.`);
  }
}
