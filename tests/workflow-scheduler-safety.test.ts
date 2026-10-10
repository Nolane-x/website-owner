import crypto from 'crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { getDb, initializeDatabase } from '@/lib/db';
import { automationWorkflowRuns, automationWorkflows, kanbanTasks, profiles } from '@/lib/db/schema';
import { runDailyScheduledOverdueReports } from '@/lib/workflows/scheduler';

describe('scheduled workflow graph safety', () => {
  const profileId = `scheduled-graph-profile-${crypto.randomUUID()}`;
  const safeWorkflowId = `scheduled-safe-dag-${crypto.randomUUID()}`;
  const unsafeWorkflowId = `scheduled-unsafe-dag-${crypto.randomUUID()}`;
  const overdueTaskId = `scheduled-overdue-task-${crypto.randomUUID()}`;

  beforeAll(async () => {
    await initializeDatabase();
    const db = getDb();
    await db.insert(profiles).values({
      id: profileId,
      username: `schedule_graph_${crypto.randomUUID().slice(0, 10)}`,
      displayName: 'Scheduled DAG Safety Test',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db.insert(kanbanTasks).values({
      id: overdueTaskId,
      profileId,
      title: 'Scheduled graph overdue task',
      status: 'todo',
      priority: 'high',
      dueDate: '2026-10-09',
      tags: [],
      subtasksJson: [],
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db.insert(automationWorkflows).values({
      id: safeWorkflowId,
      profileId,
      name: 'Scheduled overdue DAG',
      description: 'A read-only overdue DAG',
      triggerType: 'overdue_report',
      nodesJson: [
        { id: 'load', type: 'trigger', title: 'Load tasks', config: { operation: 'load_owner_tasks' } },
        { id: 'check', type: 'condition', title: 'Overdue exist?', config: { operation: 'overdue_tasks_exist' } },
        { id: 'report', type: 'action', title: 'Build overdue report', config: { operation: 'build_overdue_report' } },
        { id: 'clear', type: 'action', title: 'No overdue report', config: { operation: 'emit_no_overdue_report' } },
      ] as never,
      edgesJson: [
        { id: 'e1', source: 'load', target: 'check' },
        { id: 'e2', source: 'check', target: 'report', label: 'true' },
        { id: 'e3', source: 'check', target: 'clear', label: 'false' },
      ] as never,
      isActive: true,
      scheduleEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db.insert(automationWorkflows).values({
      id: unsafeWorkflowId,
      profileId,
      name: 'Scheduled unsafe DAG',
      description: 'A custom DAG that must never execute under the report-only scheduler',
      triggerType: 'overdue_report',
      nodesJson: [
        { id: 'load', type: 'trigger', title: 'Load Inbox', config: { operation: 'load_inbox_item' } },
        { id: 'mark', type: 'action', title: 'Mark Inbox converted', config: { operation: 'mark_inbox_converted' } },
      ] as never,
      edgesJson: [{ id: 'e1', source: 'load', target: 'mark' }] as never,
      isActive: true,
      scheduleEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it('runs safe read-only overdue DAGs but fails closed on custom graphs with non-report operations', async () => {
    const db = getDb();
    const result = await runDailyScheduledOverdueReports(db, new Date('2026-10-10T04:00:00.000Z'));
    expect(result).toMatchObject({
      scheduleDate: '2026-10-10',
      scanned: 2,
      succeeded: 1,
      failed: 1,
      skippedAlreadyRun: 0,
    });

    const [safeRun] = await db.select().from(automationWorkflowRuns).where(and(
      eq(automationWorkflowRuns.workflowId, safeWorkflowId),
      eq(automationWorkflowRuns.profileId, profileId),
    ));
    expect(safeRun.status).toBe('succeeded');
    expect(safeRun.resultJson).toMatchObject({
      executorMode: 'node_graph',
      sideEffects: false,
      overdueCount: 1,
      executionTrace: [
        { nodeId: 'load', status: 'succeeded' },
        { nodeId: 'check', status: 'succeeded' },
        { nodeId: 'report', status: 'succeeded' },
        { nodeId: 'clear', status: 'skipped' },
      ],
    });

    const [unsafeRun] = await db.select().from(automationWorkflowRuns).where(and(
      eq(automationWorkflowRuns.workflowId, unsafeWorkflowId),
      eq(automationWorkflowRuns.profileId, profileId),
    ));
    expect(unsafeRun.status).toBe('failed');
    expect(unsafeRun.errorMessage).toContain('operation báo cáo quá hạn');
    expect(unsafeRun.resultJson).toBeNull();

    const inboxSideEffects = await db.select().from(kanbanTasks).where(and(
      eq(kanbanTasks.profileId, profileId),
      eq(kanbanTasks.relatedItemId, 'never-created-inbox-item'),
    ));
    expect(inboxSideEffects).toHaveLength(0);
  });

  afterAll(async () => {
    await getDb().delete(profiles).where(eq(profiles.id, profileId));
  });
});
