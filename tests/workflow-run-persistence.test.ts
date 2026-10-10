import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { getDb, initializeDatabase } from '@/lib/db';
import { automationWorkflowRuns, automationWorkflows, profiles } from '@/lib/db/schema';

describe('Workflow run history persistence', () => {
  let profileId = '';
  let workflowId = '';

  beforeAll(async () => {
    await initializeDatabase();
    const db = getDb();
    profileId = `workflow-history-profile-${crypto.randomUUID()}`;
    workflowId = `workflow-history-${crypto.randomUUID()}`;
    await db.insert(profiles).values({
      id: profileId,
      username: `workflow_history_${crypto.randomUUID().slice(0, 8)}`,
      displayName: 'Workflow History Test',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await db.insert(automationWorkflows).values({
      id: workflowId,
      profileId,
      name: 'History persistence test',
      description: 'Temporary test row',
      triggerType: 'overdue_report',
      nodesJson: [],
      edgesJson: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it('persists run status, result, input, and duration against an owned workflow', async () => {
    const db = getDb();
    const id = `workflow-run-${crypto.randomUUID()}`;
    const startedAt = new Date('2026-10-10T05:00:00.000Z');
    const finishedAt = new Date('2026-10-10T05:00:00.125Z');
    await db.insert(automationWorkflowRuns).values({
      id,
      profileId,
      workflowId,
      triggerType: 'overdue_report',
      status: 'succeeded',
      inputJson: { source: 'test' },
      resultJson: { result: 'No overdue tasks', overdueCount: 0 },
      startedAt,
      finishedAt,
      durationMs: 125,
      createdAt: startedAt,
    });

    const [run] = await db.select().from(automationWorkflowRuns).where(eq(automationWorkflowRuns.id, id));
    expect(run).toBeDefined();
    expect(run.profileId).toBe(profileId);
    expect(run.workflowId).toBe(workflowId);
    expect(run.status).toBe('succeeded');
    expect(run.inputJson).toEqual({ source: 'test' });
    expect(run.resultJson).toEqual({ result: 'No overdue tasks', overdueCount: 0 });
    expect(run.durationMs).toBe(125);
    await db.delete(automationWorkflowRuns).where(eq(automationWorkflowRuns.id, id));
  });

  afterAll(async () => {
    if (!profileId) return;
    const db = getDb();
    await db.delete(profiles).where(eq(profiles.id, profileId));
  });
});
