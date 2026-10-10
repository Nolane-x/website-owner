import crypto from 'crypto';
import { and, eq, isNull, lt, or } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { automationWorkflowRuns, automationWorkflows, kanbanTasks } from '@/lib/db/schema';
import { buildOverdueReport, getVietnamDateKey } from '@/lib/workflows/overdue-report';
import { compileWorkflowGraph } from '@/lib/workflows/compiler';
import { executeWorkflowGraph, WorkflowExecutionError } from '@/lib/workflows/executor';

const MAX_SCHEDULED_WORKFLOWS_PER_TICK = 50;
const MAX_DURATION_MS = 2_147_483_647;
const READ_ONLY_SCHEDULED_OPERATIONS = new Set([
  'load_owner_tasks',
  'overdue_tasks_exist',
  'build_overdue_report',
  'emit_no_overdue_report',
]);

type ScheduledWorkflow = typeof automationWorkflows.$inferSelect;
type ScheduledPlan =
  | { kind: 'legacy_read_only' }
  | { kind: 'node_graph'; nodes: unknown[]; edges: unknown[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/** Only compile safe report graphs; never silently replace a user's custom DAG with a fixed report. */
function compileScheduledPlan(workflow: ScheduledWorkflow): ScheduledPlan {
  const nodes = Array.isArray(workflow.nodesJson) ? workflow.nodesJson as unknown[] : [];
  const edges = Array.isArray(workflow.edgesJson) ? workflow.edgesJson as unknown[] : [];

  // Empty historical definitions used the old, built-in read-only overdue-report executor.
  if (nodes.length === 0 && edges.length === 0) return { kind: 'legacy_read_only' };

  // Recognize only the exact unmodified legacy template; arbitrary/custom legacy graphs fail closed.
  const legacyNodeIds = nodes.map((node) => isRecord(node) ? node.id : null);
  if (workflow.name === 'Overdue Task Audit' &&
      edges.length === 0 &&
      legacyNodeIds.length === 3 &&
      legacyNodeIds.every((id, index) => id === ['load', 'check', 'report'][index]) &&
      nodes.every((node) => isRecord(node) && (
        !Object.prototype.hasOwnProperty.call(node, 'config') ||
        (isRecord(node.config) && !Object.prototype.hasOwnProperty.call(node.config, 'operation'))
      ))) {
    return { kind: 'legacy_read_only' };
  }

  if (!nodes.length || !nodes.every((node) => isRecord(node) &&
      isRecord(node.config) && typeof node.config.operation === 'string' &&
      READ_ONLY_SCHEDULED_OPERATIONS.has(node.config.operation))) {
    throw new Error('Lịch tự động chỉ cho phép DAG gồm operation báo cáo quá hạn ở chế độ chỉ đọc.');
  }

  const compilation = compileWorkflowGraph(nodes, edges);
  if (!compilation.valid || compilation.mode !== 'dag') {
    throw new Error(`DAG báo cáo quá hạn không hợp lệ: ${compilation.errors.join(' ').slice(0, 350)}`);
  }
  const typesAreSafe = compilation.order.every((node) => {
    const operation = node.config?.operation;
    return (node.type === 'trigger' && operation === 'load_owner_tasks') ||
      (node.type === 'condition' && operation === 'overdue_tasks_exist') ||
      (node.type === 'action' && (operation === 'build_overdue_report' || operation === 'emit_no_overdue_report'));
  });
  if (!typesAreSafe) {
    throw new Error('Operation báo cáo quá hạn không được gắn vào node type không tương thích.');
  }

  return { kind: 'node_graph', nodes, edges };
}

export interface ScheduledWorkflowTickResult {
  scheduleDate: string;
  scanned: number;
  succeeded: number;
  failed: number;
  skippedAlreadyRun: number;
}

/**
 * Executes the deliberately narrow scheduled surface: active, explicitly enabled
 * overdue reports only. A conditional database update claims each workflow once
 * per Vietnam calendar day, so concurrent/duplicate cron calls cannot double-run it.
 */
export async function runDailyScheduledOverdueReports(
  db: ReturnType<typeof getDb>,
  now = new Date(),
): Promise<ScheduledWorkflowTickResult> {
  const scheduleDate = getVietnamDateKey(now);
  const candidates = await db.select().from(automationWorkflows).where(and(
    eq(automationWorkflows.isActive, true),
    eq(automationWorkflows.scheduleEnabled, true),
    eq(automationWorkflows.triggerType, 'overdue_report'),
    or(
      isNull(automationWorkflows.lastScheduledFor),
      lt(automationWorkflows.lastScheduledFor, scheduleDate),
    ),
  )).limit(MAX_SCHEDULED_WORKFLOWS_PER_TICK);

  const result: ScheduledWorkflowTickResult = {
    scheduleDate,
    scanned: candidates.length,
    succeeded: 0,
    failed: 0,
    skippedAlreadyRun: 0,
  };

  for (const candidate of candidates) {
    let runId: string | null = null;
    let startedAt = new Date();

    try {
      // Claim the daily slot and persist the initial run record in one transaction.
      // If insert fails, the claim rolls back and a later invocation can safely retry.
      const candidateRunId = crypto.randomUUID();
      const candidateStartedAt = new Date();
      const claim = await db.transaction(async (tx) => {
        const [claimed] = await tx.update(automationWorkflows).set({
          lastScheduledFor: scheduleDate,
          updatedAt: new Date(),
        }).where(and(
          eq(automationWorkflows.id, candidate.id),
          eq(automationWorkflows.profileId, candidate.profileId),
          eq(automationWorkflows.isActive, true),
          eq(automationWorkflows.scheduleEnabled, true),
          eq(automationWorkflows.triggerType, 'overdue_report'),
          or(
            isNull(automationWorkflows.lastScheduledFor),
            lt(automationWorkflows.lastScheduledFor, scheduleDate),
          ),
        )).returning();

        if (!claimed) return null;

        await tx.insert(automationWorkflowRuns).values({
          id: candidateRunId,
          profileId: claimed.profileId,
          workflowId: claimed.id,
          triggerType: 'schedule',
          status: 'running',
          inputJson: {
            source: 'vercel_cron',
            scheduleDate,
            timezone: 'Asia/Ho_Chi_Minh',
          },
          startedAt: candidateStartedAt,
          createdAt: candidateStartedAt,
        });
        return { profileId: claimed.profileId, runId: candidateRunId, startedAt: candidateStartedAt, workflow: claimed };
      });

      if (!claim) {
        result.skippedAlreadyRun += 1;
        continue;
      }

      runId = claim.runId;
      startedAt = claim.startedAt;

      const plan = compileScheduledPlan(claim.workflow);
      let reportResult: Record<string, unknown>;

      if (plan.kind === 'node_graph') {
        const executed = await executeWorkflowGraph(
          db,
          claim.profileId,
          plan.nodes,
          plan.edges,
          {},
          now,
        );
        if (executed.sideEffects !== false || executed.task || executed.inboxItemId) {
          throw new Error('Scheduler từ chối kết quả có dấu hiệu ghi dữ liệu.');
        }
        reportResult = {
          ...executed,
          executorMode: 'node_graph',
          compilerMode: 'dag',
          compiledNodeIds: plan.nodes.map((node) => isRecord(node) ? node.id : null),
        };
      } else {
        const tasks = await db.select().from(kanbanTasks).where(eq(kanbanTasks.profileId, claim.profileId));
        const report = buildOverdueReport(tasks, now);
        reportResult = {
          result: `Đã kiểm tra ${report.totalTasks} task; ${report.overdueCount} task quá hạn chưa hoàn tất.`,
          totalTasks: report.totalTasks,
          overdueCount: report.overdueCount,
          overdueTasks: report.overdueTasks,
          sideEffects: false,
          executorMode: 'legacy_read_only',
        };
      }

      const finishedAt = new Date();
      await db.update(automationWorkflowRuns).set({
        status: 'succeeded',
        resultJson: {
          ...reportResult,
          scheduleDate,
          timezone: 'Asia/Ho_Chi_Minh',
        },
        errorMessage: null,
        finishedAt,
        durationMs: Math.min(MAX_DURATION_MS, Math.max(0, finishedAt.getTime() - startedAt.getTime())),
      }).where(and(
        eq(automationWorkflowRuns.id, runId),
        eq(automationWorkflowRuns.profileId, claim.profileId),
        eq(automationWorkflowRuns.status, 'running'),
      ));
      result.succeeded += 1;
    } catch (error) {
      console.error('Lỗi chạy scheduled workflow:', candidate.id, error);
      result.failed += 1;
      if (runId) {
        try {
          const finishedAt = new Date();
          await db.update(automationWorkflowRuns).set({
            status: 'failed',
            resultJson: error instanceof WorkflowExecutionError
              ? { executionTrace: error.executionTrace, source: 'vercel_cron', scheduleDate }
              : null,
            errorMessage: error instanceof Error
              ? error.message.slice(0, 500)
              : 'Lịch chạy tự động thất bại; hãy kiểm tra cấu hình workflow.',
            finishedAt,
            durationMs: Math.min(MAX_DURATION_MS, Math.max(0, finishedAt.getTime() - startedAt.getTime())),
          }).where(and(
            eq(automationWorkflowRuns.id, runId),
            eq(automationWorkflowRuns.profileId, candidate.profileId),
            eq(automationWorkflowRuns.status, 'running'),
          ));
        } catch (historyError) {
          console.error('Không thể ghi trạng thái lỗi của scheduled workflow:', historyError);
        }
      }
    }
  }

  return result;
}
