import { and, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { habits } from '@/lib/db/schema';
import { parseDateKey, CalendarHabitsValidationError } from '@/lib/calendar-habits/validation';

export type HabitCompletionResult =
  | { status: 'not_found'; habit: null; changed: false }
  | { status: 'updated'; habit: typeof habits.$inferSelect; changed: boolean };

/**
 * Idempotently sets one date's completion under a row lock.
 * The caller sends the desired state, not a stale replacement array, so
 * concurrent updates for distinct dates cannot overwrite each other.
 */
export async function setHabitCompletion(
  db: ReturnType<typeof getDb>,
  profileId: string,
  habitId: string,
  rawDate: unknown,
  completed: unknown,
): Promise<HabitCompletionResult> {
  const date = parseDateKey(rawDate);
  if (typeof completed !== 'boolean') {
    throw new CalendarHabitsValidationError('completed phải là boolean.');
  }

  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(habits).where(and(
      eq(habits.id, habitId),
      eq(habits.profileId, profileId),
    )).for('update').limit(1);

    if (!current) return { status: 'not_found', habit: null, changed: false };

    const before = Array.isArray(current.completedDatesJson) ? current.completedDatesJson : [];
    const hasDate = before.includes(date);
    const changed = completed !== hasDate;
    if (!changed) return { status: 'updated', habit: current, changed: false };

    const dates = completed
      ? [...new Set([...before, date])].sort()
      : before.filter((item) => item !== date).sort();

    if (dates.length > 1_000) {
      throw new CalendarHabitsValidationError('Lịch sử hoàn thành có giới hạn 1000 ngày cho mỗi thói quen.');
    }

    await tx.update(habits).set({
      completedDatesJson: dates,
      updatedAt: new Date(),
    }).where(and(
      eq(habits.id, habitId),
      eq(habits.profileId, profileId),
    ));

    const [updated] = await tx.select().from(habits).where(and(
      eq(habits.id, habitId),
      eq(habits.profileId, profileId),
    )).limit(1);
    if (!updated || updated.completedDatesJson.includes(date) !== completed) {
      throw new Error('Không thể xác minh trạng thái hoàn thành; giao dịch đã bị hủy.');
    }
    return { status: 'updated', habit: updated, changed: true };
  });
}
