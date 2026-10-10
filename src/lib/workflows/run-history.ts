import { and, asc, eq, lt } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { automationWorkflowRuns } from '@/lib/db/schema';

const DEFAULT_STALE_AFTER_MS = 30 * 60 * 1000;
const MAX_RECONCILE_PER_REQUEST = 100;

/**
 * Mark abandoned manual runs as interrupted without touching another owner's rows.
 * A conditional status update prevents racing a run that finished between select and update.
 */
export async function reconcileStaleWorkflowRuns(
  db: ReturnType<typeof getDb>,
  profileId: string,
  now = new Date(),
  staleAfterMs = DEFAULT_STALE_AFTER_MS,
): Promise<number> {
  if (!profileId || !Number.isFinite(now.getTime()) || !Number.isFinite(staleAfterMs) || staleAfterMs < 1) {
    return 0;
  }

  const staleBefore = new Date(now.getTime() - staleAfterMs);
  const staleRuns = await db.select({
    id: automationWorkflowRuns.id,
    startedAt: automationWorkflowRuns.startedAt,
  }).from(automationWorkflowRuns).where(and(
    eq(automationWorkflowRuns.profileId, profileId),
    eq(automationWorkflowRuns.status, 'running'),
    lt(automationWorkflowRuns.startedAt, staleBefore),
  )).orderBy(asc(automationWorkflowRuns.startedAt)).limit(MAX_RECONCILE_PER_REQUEST);

  let interrupted = 0;
  for (const run of staleRuns) {
    const finishedAt = now;
    const durationMs = Math.min(
      2_147_483_647,
      Math.max(0, finishedAt.getTime() - run.startedAt.getTime()),
    );
    const updated = await db.update(automationWorkflowRuns).set({
      status: 'interrupted',
      errorMessage: 'Lượt chạy đã quá thời hạn và được đánh dấu gián đoạn; hệ thống không thể xác nhận executor đã hoàn tất.',
      finishedAt,
      durationMs,
    }).where(and(
      eq(automationWorkflowRuns.id, run.id),
      eq(automationWorkflowRuns.profileId, profileId),
      eq(automationWorkflowRuns.status, 'running'),
    )).returning();
    interrupted += updated.length;
  }
  return interrupted;
}
