import crypto from 'crypto';
import { and, eq, isNull, lt, or } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { automationWorkflowRuns, automationWorkflows, kanbanTasks } from '@/lib/db/schema';
import { buildOverdueReport, getVietnamDateKey } from '@/lib/workflows/overdue-report';

const MAX_SCHEDULED_WORKFLOWS_PER_TICK = 50;
const MAX_DURATION_MS = 2_147_483_647;

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
        return { profileId: claimed.profileId, runId: candidateRunId, startedAt: candidateStartedAt };
      });

      if (!claim) {
        result.skippedAlreadyRun += 1;
        continue;
      }

      runId = claim.runId;
      startedAt = claim.startedAt;

      const tasks = await db.select().from(kanbanTasks).where(eq(kanbanTasks.profileId, claim.profileId));
      const report = buildOverdueReport(tasks, new Date());
      const resultMessage = `Đã kiểm tra ${report.totalTasks} task; ${report.overdueCount} task quá hạn chưa hoàn tất.`;
      const finishedAt = new Date();
      await db.update(automationWorkflowRuns).set({
        status: 'succeeded',
        resultJson: {
          result: resultMessage,
          totalTasks: report.totalTasks,
          overdueCount: report.overdueCount,
          overdueTasks: report.overdueTasks,
          sideEffects: false,
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
            errorMessage: 'Lịch chạy tự động thất bại. Có thể chạy báo cáo thủ công sau khi kiểm tra hệ thống.',
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
