import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { getDb, initializeDatabase } from '../src/lib/db';
import { calendarEvents, habits, profiles } from '../src/lib/db/schema';
import crypto from 'crypto';

describe('Calendar and habits persistence contract', () => {
  let profileId = '';
  beforeAll(async () => {
    await initializeDatabase();
    const db = getDb();
    profileId = `profile-${crypto.randomUUID()}`;
    await db.insert(profiles).values({
      id: profileId,
      username: `calendar_test_${crypto.randomUUID().slice(0, 8)}`,
      displayName: 'Calendar Test Owner',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it('persists real habit completion dates without duplicates', async () => {
    const db = getDb();
    const id = `habit-${crypto.randomUUID()}`;
    const completedDatesJson = ['2026-10-08', '2026-10-09', '2026-10-09'];
    await db.insert(habits).values({
      id,
      profileId,
      name: 'Đọc sách',
      target: '20 phút',
      completedDatesJson: [...new Set(completedDatesJson)].sort(),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const [record] = await db.select().from(habits).where(eq(habits.id, id));
    expect(record).toBeDefined();
    expect(record.profileId).toBe(profileId);
    expect(record.completedDatesJson).toEqual(['2026-10-08', '2026-10-09']);
    expect(record.isActive).toBe(true);
    await db.delete(habits).where(eq(habits.id, id));
  });

  it('persists internal calendar events with an explicit timezone', async () => {
    const db = getDb();
    const id = `event-${crypto.randomUUID()}`;
    await db.insert(calendarEvents).values({
      id,
      profileId,
      title: 'Ôn tập Toán',
      description: 'Làm bài tập và ghi lại phần chưa hiểu.',
      startAt: '2026-10-10T09:00:00.000Z',
      endAt: '2026-10-10T10:00:00.000Z',
      timezone: 'Asia/Ho_Chi_Minh',
      isAllDay: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const [record] = await db.select().from(calendarEvents).where(eq(calendarEvents.id, id));
    expect(record).toBeDefined();
    expect(record.profileId).toBe(profileId);
    expect(record.startAt).toBe('2026-10-10T09:00:00.000Z');
    expect(record.timezone).toBe('Asia/Ho_Chi_Minh');
    await db.delete(calendarEvents).where(eq(calendarEvents.id, id));
  });

  afterAll(async () => {
    if (!profileId) return;
    const db = getDb();
    await db.delete(profiles).where(eq(profiles.id, profileId));
  });
});
