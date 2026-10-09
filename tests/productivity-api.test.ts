import { describe, it, expect } from 'vitest';
import { getDb, initializeDatabase } from '../src/lib/db';
import { profiles, kanbanTasks, subscriptions, scratchpads } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

describe('Productivity & Work Ops Database Operations', () => {
  it('tạo và truy vấn thẻ công việc Kanban', async () => {
    await initializeDatabase();
    const db = getDb();

    // Tìm profile đầu tiên hoặc tạo profile test
    let [profile] = await db.select().from(profiles).limit(1);
    if (!profile) {
      const pid = 'test-prof-' + crypto.randomUUID();
      await db.insert(profiles).values({
        id: pid,
        username: 'test_owner_' + Date.now(),
        displayName: 'Test Owner',
      });
      [profile] = await db.select().from(profiles).where(eq(profiles.id, pid));
    }

    const taskId = 'task-' + crypto.randomUUID();
    await db.insert(kanbanTasks).values({
      id: taskId,
      profileId: profile.id,
      title: 'Thiết kế giao diện Focus Studio',
      description: 'Tích hợp âm thanh Web Audio',
      status: 'in_progress',
      priority: 'high',
      tags: ['ui', 'audio'],
      subtasksJson: [
        { id: 'sub-1', title: 'Tạo synthesizer', completed: true },
        { id: 'sub-2', title: 'Tạo slider âm lượng', completed: false },
      ],
      sortOrder: 0,
    });

    const [found] = await db.select().from(kanbanTasks).where(eq(kanbanTasks.id, taskId));
    expect(found).toBeDefined();
    expect(found.title).toBe('Thiết kế giao diện Focus Studio');
    expect(found.priority).toBe('high');
    expect(found.status).toBe('in_progress');
    expect(found.subtasksJson).toHaveLength(2);

    // Cleanup
    await db.delete(kanbanTasks).where(eq(kanbanTasks.id, taskId));
  });

  it('tạo và truy vấn dịch vụ Subscription', async () => {
    await initializeDatabase();
    const db = getDb();

    let [profile] = await db.select().from(profiles).limit(1);
    if (!profile) {
      const pid = 'test-prof-' + crypto.randomUUID();
      await db.insert(profiles).values({
        id: pid,
        username: 'test_owner_' + Date.now(),
        displayName: 'Test Owner',
      });
      [profile] = await db.select().from(profiles).where(eq(profiles.id, pid));
    }

    const subId = 'sub-' + crypto.randomUUID();
    await db.insert(subscriptions).values({
      id: subId,
      profileId: profile.id,
      name: 'VPS Hetzner Cloud',
      category: 'infrastructure',
      cost: 150000,
      currency: 'VND',
      billingCycle: 'monthly',
      nextBillingDate: '2026-11-01',
      status: 'active',
    });

    const [found] = await db.select().from(subscriptions).where(eq(subscriptions.id, subId));
    expect(found).toBeDefined();
    expect(found.name).toBe('VPS Hetzner Cloud');
    expect(found.cost).toBe(150000);
    expect(found.currency).toBe('VND');

    // Cleanup
    await db.delete(subscriptions).where(eq(subscriptions.id, subId));
  });

  it('tạo và truy vấn Scratchpad ghi chú dán', async () => {
    await initializeDatabase();
    const db = getDb();

    let [profile] = await db.select().from(profiles).limit(1);
    if (!profile) {
      const pid = 'test-prof-' + crypto.randomUUID();
      await db.insert(profiles).values({
        id: pid,
        username: 'test_owner_' + Date.now(),
        displayName: 'Test Owner',
      });
      [profile] = await db.select().from(profiles).where(eq(profiles.id, pid));
    }

    const padId = 'pad-' + crypto.randomUUID();
    await db.insert(scratchpads).values({
      id: padId,
      profileId: profile.id,
      title: 'Ý tưởng bài viết mới',
      content: 'Nghiên cứu về Web Audio API và Procedural Audio Synthesis',
      color: 'amber',
      isPinned: true,
      sortOrder: 1,
    });

    const [found] = await db.select().from(scratchpads).where(eq(scratchpads.id, padId));
    expect(found).toBeDefined();
    expect(found.color).toBe('amber');
    expect(found.isPinned).toBe(true);

    // Cleanup
    await db.delete(scratchpads).where(eq(scratchpads.id, padId));
  });
});
