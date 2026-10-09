import { describe, it, expect } from 'vitest';
import { getDb, initializeDatabase } from '../src/lib/db';
import {
  profiles,
  projectGoals,
  automationWorkflows,
  contentPipelines,
  learningCards,
  crmContacts,
} from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

describe('Web OS 5.0 Extended Domain Tests (Projects, Workflows, Creator, Learning, CRM)', () => {
  it('tạo và cập nhật mục tiêu dự án (Project Goals)', async () => {
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

    const goalId = 'goal-' + crypto.randomUUID();
    await db.insert(projectGoals).values({
      id: goalId,
      profileId: profile.id,
      title: 'Hoàn thành kiến trúc Web OS 5.0 Ultra Master',
      description: 'Đạt 100% tiêu chí nghiệm thu',
      category: 'delivery',
      targetDate: '2026-12-31',
      status: 'active',
      progress: 50,
    });

    const [found] = await db.select().from(projectGoals).where(eq(projectGoals.id, goalId));
    expect(found).toBeDefined();
    expect(found.title).toBe('Hoàn thành kiến trúc Web OS 5.0 Ultra Master');
    expect(found.progress).toBe(50);

    // Cập nhật tiến độ
    await db.update(projectGoals).set({ progress: 100, status: 'completed' }).where(eq(projectGoals.id, goalId));
    const [updated] = await db.select().from(projectGoals).where(eq(projectGoals.id, goalId));
    expect(updated.progress).toBe(100);
    expect(updated.status).toBe('completed');

    await db.delete(projectGoals).where(eq(projectGoals.id, goalId));
  });

  it('lưu trữ quy trình tự động hóa dạng Node Graph (Automation Workflows)', async () => {
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

    const wfId = 'wf-' + crypto.randomUUID();
    const sampleNodes = [
      { id: 'n1', type: 'trigger', title: 'Inbox Event' },
      { id: 'n2', type: 'ai', title: 'Summarize Note' },
    ];
    const sampleEdges = [{ id: 'e1', source: 'n1', target: 'n2' }];

    await db.insert(automationWorkflows).values({
      id: wfId,
      profileId: profile.id,
      name: 'Luồng xử lý tự động ghi chú thông minh',
      description: 'Kích hoạt khi nhận item mới',
      triggerType: 'inbox',
      nodesJson: sampleNodes,
      edgesJson: sampleEdges,
      isActive: true,
    });

    const [found] = await db.select().from(automationWorkflows).where(eq(automationWorkflows.id, wfId));
    expect(found).toBeDefined();
    expect(found.name).toBe('Luồng xử lý tự động ghi chú thông minh');
    expect(found.nodesJson).toHaveLength(2);
    expect(found.isActive).toBe(true);

    await db.delete(automationWorkflows).where(eq(automationWorkflows.id, wfId));
  });

  it('quản lý quy trình sản xuất nội dung Creator Studio', async () => {
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

    const contentId = 'content-' + crypto.randomUUID();
    await db.insert(contentPipelines).values({
      id: contentId,
      profileId: profile.id,
      title: 'Bài viết Chuyên sâu: Triết lý Web OS Cục bộ',
      stage: 'idea',
      channel: 'blog',
      body: 'Nội dung khởi tạo...',
      outline: 'Dàn ý 5 phần',
      tagsJson: ['tech', 'architecture'],
    });

    const [found] = await db.select().from(contentPipelines).where(eq(contentPipelines.id, contentId));
    expect(found).toBeDefined();
    expect(found.stage).toBe('idea');

    // Nâng cấp giai đoạn sang draft rồi published
    await db.update(contentPipelines).set({ stage: 'published' }).where(eq(contentPipelines.id, contentId));
    const [published] = await db.select().from(contentPipelines).where(eq(contentPipelines.id, contentId));
    expect(published.stage).toBe('published');

    await db.delete(contentPipelines).where(eq(contentPipelines.id, contentId));
  });

  it('tính toán lịch ôn tập ngắt quãng Spaced Repetition (Learning Cards)', async () => {
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

    const cardId = 'card-' + crypto.randomUUID();
    const today = new Date().toISOString().split('T')[0];

    await db.insert(learningCards).values({
      id: cardId,
      profileId: profile.id,
      deckName: 'Thuật toán Phân tán',
      front: 'Thuật toán Raft giải quyết bài toán gì?',
      back: 'Đồng thuận phân tán (Distributed Consensus)',
      difficulty: 1,
      intervalDays: 1,
      repetitions: 0,
      easeFactor: 250,
      nextReviewDate: today,
    });

    const [found] = await db.select().from(learningCards).where(eq(learningCards.id, cardId));
    expect(found).toBeDefined();
    expect(found.intervalDays).toBe(1);

    // Giả lập đánh giá "Good": repetitions = 1, intervalDays = 6
    const nextDate = new Date(Date.now() + 6 * 86400000).toISOString().split('T')[0];
    await db.update(learningCards).set({
      repetitions: 1,
      intervalDays: 6,
      nextReviewDate: nextDate,
    }).where(eq(learningCards.id, cardId));

    const [updated] = await db.select().from(learningCards).where(eq(learningCards.id, cardId));
    expect(updated.repetitions).toBe(1);
    expect(updated.intervalDays).toBe(6);

    await db.delete(learningCards).where(eq(learningCards.id, cardId));
  });

  it('quản lý liên hệ cá nhân Personal CRM và cờ bảo mật', async () => {
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

    const crmId = 'crm-' + crypto.randomUUID();
    await db.insert(crmContacts).values({
      id: crmId,
      profileId: profile.id,
      name: 'Nguyễn Văn A',
      role: 'Principal Architect',
      organization: 'Tech Lab',
      category: 'mentor',
      email: 'a@example.com',
      followUpDays: 30,
      notes: 'Trao đổi về kiến trúc microservices và WebAssembly',
      neverCloudAi: true,
    });

    const [found] = await db.select().from(crmContacts).where(eq(crmContacts.id, crmId));
    expect(found).toBeDefined();
    expect(found.name).toBe('Nguyễn Văn A');
    expect(found.neverCloudAi).toBe(true);

    await db.delete(crmContacts).where(eq(crmContacts.id, crmId));
  });
});
