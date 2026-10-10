import crypto from 'crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getDb, initializeDatabase } from '@/lib/db';
import { automationWorkflowRuns, automationWorkflows, inboxItems, kanbanTasks, profiles } from '@/lib/db/schema';

const profileId = 'workflow-run-api-owner';

const mocks = vi.hoisted(() => ({
  requireOwner: vi.fn(async () => ({
    authorized: true,
    profile: { id: 'workflow-run-api-owner', username: 'owner', displayName: 'Workflow API Test Owner' },
  })),
}));

vi.mock('@/lib/auth/guard', () => ({ requireOwner: mocks.requireOwner }));

import { POST } from '@/app/api/admin/workflows/run/route';

const inboxWorkflowId = `workflow-api-inbox-${crypto.randomUUID()}`;
const invalidWorkflowId = `workflow-api-invalid-${crypto.randomUUID()}`;
const missingOperationsWorkflowId = `workflow-api-missing-ops-${crypto.randomUUID()}`;
const unsafeOperationWorkflowId = `workflow-api-unsafe-op-${crypto.randomUUID()}`;
const inboxItemId = `workflow-api-inbox-item-${crypto.randomUUID()}`;

const inboxGraph = {
  nodes: [
    { id: 'load', type: 'trigger', title: 'Load Inbox', config: { operation: 'load_inbox_item' } },
    { id: 'linked', type: 'condition', title: 'Task already linked?', config: { operation: 'task_already_linked' } },
    { id: 'reuse', type: 'action', title: 'Reuse task', config: { operation: 'reuse_linked_task' } },
    { id: 'create', type: 'action', title: 'Create task', config: { operation: 'create_task_if_missing' } },
    { id: 'convert', type: 'action', title: 'Mark converted', config: { operation: 'mark_inbox_converted' } },
  ],
  edges: [
    { id: 'e1', source: 'load', target: 'linked' },
    { id: 'e2', source: 'linked', target: 'reuse', label: 'true' },
    { id: 'e3', source: 'linked', target: 'create', label: 'false' },
    { id: 'e4', source: 'reuse', target: 'convert' },
    { id: 'e5', source: 'create', target: 'convert' },
  ],
};

function request(body: unknown) {
  return new NextRequest('http://localhost/api/admin/workflows/run', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

describe('workflow run API: node executor integration', () => {
  beforeAll(async () => {
    await initializeDatabase();
    const db = getDb();
    await db.insert(profiles).values({
      id: profileId,
      username: `wf_api_${crypto.randomUUID().slice(0, 12)}`,
      displayName: 'Workflow API Test Owner',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await db.insert(inboxItems).values({
      id: inboxItemId,
      profileId,
      title: 'API graph run',
      kind: 'text',
      textPreview: 'Created by workflow API integration test.',
      sourceUri: 'https://example.test/workflow-api',
      status: 'inbox',
      tagsJson: ['api-test'],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await db.insert(automationWorkflows).values({
      id: inboxWorkflowId,
      profileId,
      name: 'Inbox graph integration',
      description: 'A real graph execution test',
      triggerType: 'inbox_to_task',
      nodesJson: inboxGraph.nodes as never,
      edgesJson: inboxGraph.edges as never,
      isActive: true,
      scheduleEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await db.insert(automationWorkflows).values({
      id: invalidWorkflowId,
      profileId,
      name: 'Invalid graph integration',
      description: 'This cyclic graph must be rejected',
      triggerType: 'manual',
      nodesJson: [
        { id: 'start', type: 'trigger', title: 'Start' },
        { id: 'a', type: 'action', title: 'A' },
        { id: 'b', type: 'action', title: 'B' },
      ] as never,
      edgesJson: [
        { id: 'e1', source: 'start', target: 'a' },
        { id: 'e2', source: 'a', target: 'b' },
        { id: 'e3', source: 'b', target: 'a' },
      ] as never,
      isActive: true,
      scheduleEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await db.insert(automationWorkflows).values({
      id: missingOperationsWorkflowId,
      profileId,
      name: 'DAG missing operations',
      description: 'A valid graph with no registered operations must not fall back to a trigger executor.',
      triggerType: 'overdue_report',
      nodesJson: [
        { id: 'start', type: 'trigger', title: 'Start' },
        { id: 'report', type: 'action', title: 'Report' },
      ] as never,
      edgesJson: [{ id: 'e1', source: 'start', target: 'report' }] as never,
      isActive: true,
      scheduleEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await db.insert(automationWorkflows).values({
      id: unsafeOperationWorkflowId,
      profileId,
      name: 'Unsafe operation',
      description: 'Arbitrary operation must be rejected and traced.',
      triggerType: 'manual',
      nodesJson: [{ id: 'start', type: 'trigger', title: 'Unsafe', config: { operation: 'execute_shell' } }] as never,
      edgesJson: [] as never,
      isActive: true,
      scheduleEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it('executes a stored operation graph through the API and persists per-node trace', async () => {
    const response = await POST(request({ workflowId: inboxWorkflowId, inboxItemId }));
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      status: 'succeeded',
      executorMode: 'node_graph',
      compilerMode: 'dag',
      inboxItemId,
      inboxStatus: 'converted',
      sideEffects: true,
      executionTrace: [
        { nodeId: 'load', status: 'succeeded' },
        { nodeId: 'linked', status: 'succeeded' },
        { nodeId: 'reuse', status: 'skipped' },
        { nodeId: 'create', status: 'succeeded' },
        { nodeId: 'convert', status: 'succeeded' },
      ],
    });

    const db = getDb();
    const linkedTasks = await db.select().from(kanbanTasks).where(and(
      eq(kanbanTasks.profileId, profileId),
      eq(kanbanTasks.relatedItemId, inboxItemId),
    ));
    expect(linkedTasks).toHaveLength(1);

    const [run] = await db.select().from(automationWorkflowRuns).where(eq(
      automationWorkflowRuns.id,
      payload.runId,
    ));
    expect(run.status).toBe('succeeded');
    expect(run.resultJson).toMatchObject({ executorMode: 'node_graph' });
    expect(Array.isArray(run.resultJson?.executionTrace)).toBe(true);
    expect((run.resultJson?.executionTrace as Array<{ nodeId: string; status: string }>)[0]).toMatchObject({
      nodeId: 'load',
      status: 'succeeded',
    });
  });

  it('rejects a cyclic graph before creating a run record', async () => {
    const response = await POST(request({ workflowId: invalidWorkflowId }));
    const payload = await response.json();
    expect(response.status).toBe(422);
    expect(payload.compilation.valid).toBe(false);
    expect(payload.compilation.errors.join(' ')).toContain('chu trình');

    const runs = await getDb().select().from(automationWorkflowRuns).where(eq(
      automationWorkflowRuns.workflowId,
      invalidWorkflowId,
    ));
    expect(runs).toHaveLength(0);
  });

  it('refuses a DAG without registered operations instead of silently using the trigger executor', async () => {
    const response = await POST(request({ workflowId: missingOperationsWorkflowId }));
    const payload = await response.json();
    expect(response.status).toBe(422);
    expect(payload.error).toContain('operation đã đăng ký');

    const runs = await getDb().select().from(automationWorkflowRuns).where(eq(
      automationWorkflowRuns.workflowId,
      missingOperationsWorkflowId,
    ));
    expect(runs).toHaveLength(0);
  });

  it('rejects arbitrary operations and persists the node failure trace', async () => {
    const response = await POST(request({ workflowId: unsafeOperationWorkflowId }));
    const payload = await response.json();
    expect(response.status).toBe(500);
    expect(payload.error).toContain('không được phép');
    expect(payload.executionTrace).toMatchObject([{ nodeId: 'start', status: 'failed' }]);

    const [run] = await getDb().select().from(automationWorkflowRuns).where(eq(
      automationWorkflowRuns.id,
      payload.runId,
    ));
    expect(run.status).toBe('failed');
    expect(run.resultJson).toMatchObject({
      executionTrace: [{ nodeId: 'start', status: 'failed' }],
    });
  });

  afterAll(async () => {
    await getDb().delete(profiles).where(eq(profiles.id, profileId));
  });
});
