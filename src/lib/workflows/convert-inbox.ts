import crypto from 'crypto';
import { and, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { inboxItems, kanbanTasks } from '@/lib/db/schema';
import { buildInboxTaskPayload } from '@/lib/workflows/inbox-to-task';

export type InboxTaskConversionResult =
  | { status: 'not_found'; task: null; inboxItemId: string }
  | { status: 'created' | 'reused'; task: typeof kanbanTasks.$inferSelect; inboxItemId: string };

/**
 * Atomically converts an owner-scoped Inbox item to a task.
 *
 * SELECT ... FOR UPDATE on the source row serializes concurrent conversions
 * of the same Inbox item. Task creation and marking the source as converted
 * happen in the same transaction, so a partial conversion cannot be committed.
 * A second caller waits for the first transaction and reuses its linked task.
 */
export async function convertInboxItemToTask(
  db: ReturnType<typeof getDb>,
  profileId: string,
  inboxItemId: string,
): Promise<InboxTaskConversionResult> {
  return db.transaction(async (tx) => {
    const [item] = await tx.select().from(inboxItems).where(and(
      eq(inboxItems.id, inboxItemId),
      eq(inboxItems.profileId, profileId),
    )).for('update').limit(1);

    if (!item) {
      return { status: 'not_found', task: null, inboxItemId };
    }

    const [existingTask] = await tx.select().from(kanbanTasks).where(and(
      eq(kanbanTasks.profileId, profileId),
      eq(kanbanTasks.relatedItemId, item.id),
    )).limit(1);

    let task = existingTask;
    let status: 'created' | 'reused' = 'reused';

    if (!task) {
      const payload = buildInboxTaskPayload(item);
      const id = `task-${crypto.randomUUID()}`;
      await tx.insert(kanbanTasks).values({
        id,
        profileId,
        ...payload,
        subtasksJson: [],
        sortOrder: 0,
      });

      const [createdTask] = await tx.select().from(kanbanTasks).where(and(
        eq(kanbanTasks.id, id),
        eq(kanbanTasks.profileId, profileId),
      )).limit(1);

      if (!createdTask) {
        throw new Error('Đã yêu cầu tạo task nhưng không thể xác minh bản ghi; giao dịch đã được hủy.');
      }

      task = createdTask;
      status = 'created';
    }

    if (item.status !== 'converted') {
      await tx.update(inboxItems).set({
        status: 'converted',
        updatedAt: new Date(),
      }).where(and(
        eq(inboxItems.id, item.id),
        eq(inboxItems.profileId, profileId),
      ));

      const [updatedItem] = await tx.select().from(inboxItems).where(and(
        eq(inboxItems.id, item.id),
        eq(inboxItems.profileId, profileId),
      )).limit(1);
      if (!updatedItem || updatedItem.status !== 'converted') {
        throw new Error('Không thể xác minh trạng thái Inbox; giao dịch đã được hủy.');
      }
    }

    return { status, task, inboxItemId: item.id };
  });
}
