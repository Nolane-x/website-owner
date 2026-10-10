import crypto from 'crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { getDb, initializeDatabase } from '@/lib/db';
import { habits, profiles } from '@/lib/db/schema';
import { setHabitCompletion } from '@/lib/calendar-habits/completion';

describe('atomic habit completion updates', () => {
  const db = getDb();
  const profileId = 'habit-completion-profile-' + crypto.randomUUID();
  const habitId = 'habit-completion-' + crypto.randomUUID();

  beforeAll(async () => {
    await initializeDatabase();
    await db.insert(profiles).values({
      id: profileId,
      username: 'habit-completion-' + crypto.randomUUID().slice(0, 8),
      displayName: 'Habit Completion Test',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await db.insert(habits).values({
      id: habitId,
      profileId,
      name: 'Concurrent reading',
      target: '20 minutes',
      completedDatesJson: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it('preserves completions for different dates under concurrent requests', async () => {
    const results = await Promise.all([
      setHabitCompletion(db, profileId, habitId, '2026-10-08', true),
      setHabitCompletion(db, profileId, habitId, '2026-10-09', true),
    ]);
    expect(results.every((result) => result.status === 'updated')).toBe(true);
    const [stored] = await db.select().from(habits).where(eq(habits.id, habitId));
    expect(stored.completedDatesJson).toEqual(['2026-10-08', '2026-10-09']);
  });

  it('is idempotent when the same desired state is retried concurrently', async () => {
    const results = await Promise.all([
      setHabitCompletion(db, profileId, habitId, '2026-10-10', true),
      setHabitCompletion(db, profileId, habitId, '2026-10-10', true),
    ]);
    expect(results.every((result) => result.status === 'updated')).toBe(true);
    expect(results.filter((result) => result.status === 'updated' && result.changed)).toHaveLength(1);
    const [stored] = await db.select().from(habits).where(eq(habits.id, habitId));
    expect(stored.completedDatesJson).toEqual(['2026-10-08', '2026-10-09', '2026-10-10']);
  });

  it('removes one date without altering other completed dates', async () => {
    const result = await setHabitCompletion(db, profileId, habitId, '2026-10-09', false);
    expect(result.status).toBe('updated');
    if (result.status === 'updated') {
      expect(result.habit.completedDatesJson).toEqual(['2026-10-08', '2026-10-10']);
    }
  });

  it('does not resolve a habit owned by another profile', async () => {
    const result = await setHabitCompletion(db, 'different-profile', habitId, '2026-10-11', true);
    expect(result).toEqual({ status: 'not_found', habit: null, changed: false });
  });

  afterAll(async () => {
    await db.delete(habits).where(eq(habits.id, habitId));
    await db.delete(profiles).where(eq(profiles.id, profileId));
  });
});
