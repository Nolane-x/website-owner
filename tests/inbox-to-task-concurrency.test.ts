import crypto from 'crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { getDb, initializeDatabase } from '@/lib/db';
import { inboxItems, kanbanTasks, profiles } from '@/lib/db/schema';
import { convertInboxItemToTask } from '@/lib/workflows/convert-inbox';

describe('Inbox-to-task atomic conversion', () => {
  const profileId = `inbox-conversion-profile-${crypto.randomUUID()}`;
  const inboxItemId = `inbox-conversion-item-${crypto.randomUUID()}`;
  const secondInboxItemId = `inbox-conversion-missing-${crypto.randomUUID()}`;

  beforeAll(async () => {
    await initializeDatabase();
    const db = getDb();
    await db.insert(profiles).values({
      id: profileId,
      username: `inbox_conv_${crypto.randomUUID().slice(0, 10)}`,
      displayName: 'Inbox Conversion Test',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await db.insert(inboxItems).values({
      id: inboxItemId,
      profileId,
      title: 'Concurrent conversion',
      kind: 'text',
      textPreview: 'This must become exactly one task.',
      sourceUri: 'https://example.test/source',
      status: 'inbox',
      tagsJson: ['atomic', 'test'],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it('serializes simultaneous conversions and creates exactly one task', async () => {
    const db = getDb();
    const [first, second] = await Promise.all([
      convertInboxItemToTask(db, profileId, inboxItemId),
      convertInboxItemToTask(db, profileId, inboxItemId),
    ]);

    expect([first.status, second.status].sort()).toEqual(['created', 'reused']);
    expect(first.task).not.toBeNull();
    expect(second.task).not.toBeNull();
    expect(first.task?.id).toBe(second.task?.id);
    expect(first.task?.relatedItemId).toBe(inboxItemId);
    expect(first.task?.profileId).toBe(profileId);

    const tasks = await db.select().from(kanbanTasks).where(and(
      eq(kanbanTasks.profileId, profileId),
      eq(kanbanTasks.relatedItemId, inboxItemId),
    ));
    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe('Concurrent conversion');
    expect(tasks[0].description).toContain('https://example.test/source');

    const [item] = await db.select().from(inboxItems).where(eq(inboxItems.id, inboxItemId));
    expect(item.status).toBe('converted');
  });

  it('reuses the existing task on retries without mutating its title or creating duplicates', async () => {
    const db = getDb();
    const before = await db.select().from(kanbanTasks).where(and(
      eq(kanbanTasks.profileId, profileId),
      eq(kanbanTasks.relatedItemId, inboxItemId),
    ));
    const result = await convertInboxItemToTask(db, profileId, inboxItemId);
    const after = await db.select().from(kanbanTasks).where(and(
      eq(kanbanTasks.profileId, profileId),
      eq(kanbanTasks.relatedItemId, inboxItemId),
    ));

    expect(result.status).toBe('reused');
    expect(after).toHaveLength(1);
    expect(after[0].id).toBe(before[0].id);
    expect(after[0].title).toBe(before[0].title);
  });

  it('enforces the source-link invariant at the database layer as a final race guard', async () => {
    const db = getDb();
    const [inserted] = await db.insert(kanbanTasks).values({
      id: `duplicate-source-${crypto.randomUUID()}`,
      profileId,
      title: 'This duplicate must not persist',
      status: 'todo',
      priority: 'medium',
      relatedItemId: inboxItemId,
      tags: [],
      subtasksJson: [],
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).onConflictDoNothing().returning();

    expect(inserted).toBeUndefined();
    const tasks = await db.select().from(kanbanTasks).where(and(
      eq(kanbanTasks.profileId, profileId),
      eq(kanbanTasks.relatedItemId, inboxItemId),
    ));
    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe('Concurrent conversion');
  });

  it('does not disclose or convert an Inbox item owned by another profile', async () => {
    const result = await convertInboxItemToTask(getDb(), profileId, secondInboxItemId);
    expect(result).toMatchObject({ status: 'not_found', task: null, inboxItemId: secondInboxItemId });
  });

  afterAll(async () => {
    await getDb().delete(profiles).where(eq(profiles.id, profileId));
  });
});
