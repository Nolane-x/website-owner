import crypto from 'crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { getDb, initializeDatabase } from '@/lib/db';
import { automationWorkflowRuns, automationWorkflows, kanbanTasks, profiles } from '@/lib/db/schema';
import { runDailyScheduledOverdueReports } from '@/lib/workflows/scheduler';

describe('daily workflow scheduler', () => {
  const profileId = `scheduler-profile-${crypto.randomUUID()}`;
  const workflowIds = {
    scheduled: `workflow-scheduled-${crypto.randomUUID()}`,
    notScheduled: `workflow-not-scheduled-${crypto.randomUUID()}`,
    unsupported: `workflow-unsupported-${crypto.randomUUID()}`,
    inactive: `workflow-inactive-${crypto.randomUUID()}`,
  };

  beforeAll(async () => {
    await initializeDatabase();
    const db = getDb();
    await db.insert(profiles).values({
      id: profileId,
      username: `scheduler_${crypto.randomUUID().slice(0, 8)}`,
      displayName: 'Scheduler Test Owner',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await db.insert(automationWorkflows).values([
      {
        id: workflowIds.scheduled,
        profileId,
        name: 'Daily report',
        description: 'Scheduled read-only report',
        triggerType: 'overdue_report',
        nodesJson: [],
        edgesJson: [],
        isActive: true,
        scheduleEnabled: true,
      },
      {
        id: workflowIds.notScheduled,
        profileId,
        name: 'Manual report',
        description: null,
        triggerType: 'overdue_report',
        nodesJson: [],
        edgesJson: [],
        isActive: true,
        scheduleEnabled: false,
      },
      {
        id: workflowIds.unsupported,
        profileId,
        name: 'Unsupported trigger',
        description: null,
        triggerType: 'inbox_to_task',
        nodesJson: [],
        edgesJson: [],
        isActive: true,
        scheduleEnabled: true,
      },
      {
        id: workflowIds.inactive,
        profileId,
        name: 'Inactive report',
        description: null,
        triggerType: 'overdue_report',
        nodesJson: [],
        edgesJson: [],
        isActive: false,
        scheduleEnabled: true,
      },
    ]);
    await db.insert(kanbanTasks).values([
      {
        id: `task-overdue-${crypto.randomUUID()}`,
        profileId,
        title: 'Past deadline',
        status: 'todo',
        dueDate: '2026-10-09',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: `task-today-${crypto.randomUUID()}`,
        profileId,
        title: 'Due today',
        status: 'todo',
        dueDate: '2026-10-10',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  });

  it('runs only explicitly enabled active read-only reports and records real results', async () => {
    const db = getDb();
    const result = await runDailyScheduledOverdueReports(db, new Date('2026-10-10T12:00:00.000Z'));

    expect(result).toMatchObject({
      scheduleDate: '2026-10-10',
      scanned: 1,
      succeeded: 1,
      failed: 0,
      skippedAlreadyRun: 0,
    });

    const runs = await db.select().from(automationWorkflowRuns).where(eq(
      automationWorkflowRuns.workflowId,
      workflowIds.scheduled,
    ));
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({
      profileId,
      triggerType: 'schedule',
      status: 'succeeded',
      inputJson: {
        source: 'vercel_cron',
        scheduleDate: '2026-10-10',
        timezone: 'Asia/Ho_Chi_Minh',
      },
    });
    expect(runs[0].resultJson).toMatchObject({
      totalTasks: 2,
      overdueCount: 1,
      sideEffects: false,
      scheduleDate: '2026-10-10',
    });

    const manualRuns = await db.select().from(automationWorkflowRuns).where(eq(
      automationWorkflowRuns.workflowId,
      workflowIds.notScheduled,
    ));
    expect(manualRuns).toHaveLength(0);
  });

  it('runs on a new Vietnam calendar day, then rejects duplicates for that day', async () => {
    const db = getDb();
    const result = await runDailyScheduledOverdueReports(db, new Date('2026-10-10T22:00:00.000Z'));
    expect(result).toMatchObject({
      scheduleDate: '2026-10-11',
      scanned: 1,
      succeeded: 1,
      failed: 0,
      skippedAlreadyRun: 0,
    });

    const [workflow] = await db.select().from(automationWorkflows).where(eq(
      automationWorkflows.id,
      workflowIds.scheduled,
    ));
    expect(workflow.lastScheduledFor).toBe('2026-10-11');

    // A duplicate call during that same Vietnam calendar date must be a no-op.
    const duplicate = await runDailyScheduledOverdueReports(db, new Date('2026-10-11T03:00:00.000Z'));
    expect(duplicate).toMatchObject({
      scheduleDate: '2026-10-11',
      scanned: 0,
      succeeded: 0,
      failed: 0,
      skippedAlreadyRun: 0,
    });
    const runs = await db.select().from(automationWorkflowRuns).where(and(
      eq(automationWorkflowRuns.workflowId, workflowIds.scheduled),
      eq(automationWorkflowRuns.profileId, profileId),
    ));
    expect(runs).toHaveLength(2);
  });

  it('continues past the first 50 workflows without starving later schedules', async () => {
    const db = getDb();
    const batchIds = Array.from({ length: 51 }, (_, index) => (
      `workflow-scheduler-batch-${crypto.randomUUID()}-${index}`
    ));
    const now = new Date('2026-10-10T22:00:00.000Z'); // 2026-10-11 in Vietnam.

    await db.insert(automationWorkflows).values(batchIds.map((id, index) => ({
      id,
      profileId,
      name: `Batch scheduled workflow ${index}`,
      description: 'Scheduler fairness regression fixture',
      triggerType: 'overdue_report' as const,
      nodesJson: [],
      edgesJson: [],
      isActive: true,
      scheduleEnabled: true,
      createdAt: now,
      updatedAt: now,
    })));

    const firstTick = await runDailyScheduledOverdueReports(db, now);
    expect(firstTick).toMatchObject({
      scheduleDate: '2026-10-11',
      scanned: 50,
      succeeded: 50,
      failed: 0,
    });

    const secondTick = await runDailyScheduledOverdueReports(db, now);
    expect(secondTick).toMatchObject({
      scheduleDate: '2026-10-11',
      scanned: 1,
      succeeded: 1,
      failed: 0,
    });

    const ownedWorkflows = await db.select().from(automationWorkflows).where(eq(
      automationWorkflows.profileId,
      profileId,
    ));
    const batchWorkflows = ownedWorkflows.filter((workflow) => batchIds.includes(workflow.id));
    expect(batchWorkflows).toHaveLength(51);
    expect(batchWorkflows.every((workflow) => workflow.lastScheduledFor === '2026-10-11')).toBe(true);

    const ownedRuns = await db.select().from(automationWorkflowRuns).where(eq(
      automationWorkflowRuns.profileId,
      profileId,
    ));
    const batchRuns = ownedRuns.filter((run) => batchIds.includes(run.workflowId ?? ''));
    expect(batchRuns).toHaveLength(51);
    expect(batchRuns.every((run) => run.status === 'succeeded')).toBe(true);
  });

  afterAll(async () => {
    const db = getDb();
    await db.delete(profiles).where(eq(profiles.id, profileId));
  });
});
