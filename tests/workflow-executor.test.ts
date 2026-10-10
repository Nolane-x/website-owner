import crypto from 'crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { getDb, initializeDatabase } from '@/lib/db';
import { inboxItems, kanbanTasks, profiles } from '@/lib/db/schema';
import { executeWorkflowGraph, WorkflowExecutionError } from '@/lib/workflows/executor';

const opNode = (id: string, type: string, title: string, operation: string) => ({
  id,
  type,
  title,
  config: { operation },
});
const edge = (id: string, source: string, target: string, label?: string) => ({
  id, source, target, ...(label ? { label } : {}),
});

function inboxGraph() {
  return {
    nodes: [
      opNode('load', 'trigger', 'Load Inbox item', 'load_inbox_item'),
      opNode('has-task', 'condition', 'Task already linked?', 'task_already_linked'),
      opNode('reuse', 'action', 'Reuse linked task', 'reuse_linked_task'),
      opNode('create', 'action', 'Create task if missing', 'create_task_if_missing'),
      opNode('mark', 'action', 'Mark Inbox converted', 'mark_inbox_converted'),
    ],
    edges: [
      edge('e1', 'load', 'has-task'),
      edge('e2', 'has-task', 'reuse', 'true'),
      edge('e3', 'has-task', 'create', 'false'),
      edge('e4', 'reuse', 'mark'),
      edge('e5', 'create', 'mark'),
    ],
  };
}

function overdueGraph() {
  return {
    nodes: [
      opNode('load-tasks', 'trigger', 'Load owner tasks', 'load_owner_tasks'),
      opNode('has-overdue', 'condition', 'Any overdue task?', 'overdue_tasks_exist'),
      opNode('report-overdue', 'action', 'Build overdue report', 'build_overdue_report'),
      opNode('report-clear', 'action', 'Emit clear report', 'emit_no_overdue_report'),
    ],
    edges: [
      edge('e1', 'load-tasks', 'has-overdue'),
      edge('e2', 'has-overdue', 'report-overdue', 'true'),
      edge('e3', 'has-overdue', 'report-clear', 'false'),
    ],
  };
}

describe('safe workflow node executor', () => {
  const profileId = `workflow-executor-profile-${crypto.randomUUID()}`;
  const inboxItemId = `workflow-executor-inbox-${crypto.randomUUID()}`;

  beforeAll(async () => {
    await initializeDatabase();
    const db = getDb();
    await db.insert(profiles).values({
      id: profileId,
      username: `wf_exec_${crypto.randomUUID().slice(0, 10)}`,
      displayName: 'Workflow Executor Test',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await db.insert(inboxItems).values({
      id: inboxItemId,
      profileId,
      title: 'Execute bounded node graph',
      kind: 'text',
      textPreview: 'Testing safe node operations.',
      sourceUri: 'https://example.test/workflow',
      status: 'inbox',
      tagsJson: ['workflow'],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it('executes a branched Inbox graph and reuses its linked task on retry', async () => {
    const db = getDb();
    const graph = inboxGraph();

    const first = await executeWorkflowGraph(db, profileId, graph.nodes, graph.edges, { inboxItemId });
    expect(first).toMatchObject({
      status: 'succeeded',
      sideEffects: true,
      idempotentReplay: false,
      inboxItemId,
      inboxStatus: 'converted',
    });
    expect(first.task?.title).toBe('Execute bounded node graph');
    expect(first.executionTrace.map((step) => [step.nodeId, step.status])).toEqual([
      ['load', 'succeeded'],
      ['has-task', 'succeeded'],
      ['reuse', 'skipped'],
      ['create', 'succeeded'],
      ['mark', 'succeeded'],
    ]);

    const second = await executeWorkflowGraph(db, profileId, graph.nodes, graph.edges, { inboxItemId });
    expect(second.sideEffects).toBe(false);
    expect(second.idempotentReplay).toBe(true);
    expect(second.task?.id).toBe(first.task?.id);
    expect(second.executionTrace.find((step) => step.nodeId === 'reuse')?.status).toBe('succeeded');
    expect(second.executionTrace.find((step) => step.nodeId === 'create')?.status).toBe('skipped');

    const linkedTasks = await db.select().from(kanbanTasks).where(and(
      eq(kanbanTasks.profileId, profileId),
      eq(kanbanTasks.relatedItemId, inboxItemId),
    ));
    expect(linkedTasks).toHaveLength(1);
  });

  it('routes an overdue report down the true or false branch based on real database data', async () => {
    const db = getDb();
    const taskId = `workflow-executor-task-${crypto.randomUUID()}`;
    await db.insert(kanbanTasks).values({
      id: taskId,
      profileId,
      title: 'Overdue test task',
      status: 'todo',
      priority: 'high',
      dueDate: '2026-10-09',
      tags: [],
      subtasksJson: [],
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const graph = overdueGraph();
    const hasOverdue = await executeWorkflowGraph(
      db, profileId, graph.nodes, graph.edges, {}, new Date('2026-10-10T04:00:00.000Z'),
    );
    expect(hasOverdue.overdueCount).toBe(1);
    expect(hasOverdue.sideEffects).toBe(false);
    expect(hasOverdue.executionTrace.find((step) => step.nodeId === 'report-overdue')?.status).toBe('succeeded');
    expect(hasOverdue.executionTrace.find((step) => step.nodeId === 'report-clear')?.status).toBe('skipped');

    await db.update(kanbanTasks).set({ status: 'done', updatedAt: new Date() }).where(eq(kanbanTasks.id, taskId));
    const noOverdue = await executeWorkflowGraph(
      db, profileId, graph.nodes, graph.edges, {}, new Date('2026-10-10T04:00:00.000Z'),
    );
    expect(noOverdue.overdueCount).toBe(0);
    expect(noOverdue.executionTrace.find((step) => step.nodeId === 'report-overdue')?.status).toBe('skipped');
    expect(noOverdue.executionTrace.find((step) => step.nodeId === 'report-clear')?.status).toBe('succeeded');
  });

  it('fails closed on arbitrary or unknown operations and retains a failure trace', async () => {
    const unsafeNodes = [opNode('trigger', 'trigger', 'Unsafe operation', 'execute_shell')];
    let captured: unknown;
    try {
      await executeWorkflowGraph(getDb(), profileId, unsafeNodes, [], {});
    } catch (error) {
      captured = error;
    }
    expect(captured).toBeInstanceOf(WorkflowExecutionError);
    expect((captured as WorkflowExecutionError).executionTrace).toHaveLength(1);
    expect((captured as WorkflowExecutionError).executionTrace[0]).toMatchObject({
      nodeId: 'trigger',
      status: 'failed',
    });
    expect((captured as Error).message).toContain('không được phép');
  });

  afterAll(async () => {
    await getDb().delete(profiles).where(eq(profiles.id, profileId));
  });
});
