import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { requireOwner } from '@/lib/auth/guard';
import { getDb, initializeDatabase } from '@/lib/db';
import { habits } from '@/lib/db/schema';
import { assertValidOrigin } from '@/lib/security/origin-guard';
import { parseHabitPatchInput } from '@/lib/calendar-habits/validation';
import { calendarHabitsErrorResponse, readCalendarHabitsJsonBody } from '@/lib/calendar-habits/request';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const originError = assertValidOrigin(req);
  if (originError) return originError;
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    const body = await readCalendarHabitsJsonBody(req);
    const updates = parseHabitPatchInput(body);
    const { id } = await params;
    if (!id || id.length > 200) return NextResponse.json({ error: 'ID thói quen không hợp lệ.' }, { status: 400 });

    await initializeDatabase();
    const db = getDb();
    const [existing] = await db.select({ id: habits.id }).from(habits).where(and(
      eq(habits.id, id),
      eq(habits.profileId, auth.profile.id),
    )).limit(1);
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy thói quen thuộc tài khoản này.' }, { status: 404 });

    await db.update(habits).set({ ...updates, updatedAt: new Date() }).where(and(
      eq(habits.id, id),
      eq(habits.profileId, auth.profile.id),
    ));
    const [updated] = await db.select().from(habits).where(and(
      eq(habits.id, id),
      eq(habits.profileId, auth.profile.id),
    )).limit(1);
    if (!updated) return NextResponse.json({ error: 'Thói quen không còn tồn tại.' }, { status: 404 });
    return NextResponse.json({ habit: updated });
  } catch (error) {
    const response = calendarHabitsErrorResponse(error);
    if (response) return response;
    console.error('Không thể cập nhật habit:', error);
    return NextResponse.json({ error: 'Không thể cập nhật thói quen.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const originError = assertValidOrigin(req);
  if (originError) return originError;
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    const { id } = await params;
    if (!id || id.length > 200) return NextResponse.json({ error: 'ID thói quen không hợp lệ.' }, { status: 400 });
    await initializeDatabase();
    const db = getDb();
    const [existing] = await db.select({ id: habits.id }).from(habits).where(and(
      eq(habits.id, id),
      eq(habits.profileId, auth.profile.id),
    )).limit(1);
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy thói quen thuộc tài khoản này.' }, { status: 404 });
    await db.delete(habits).where(and(
      eq(habits.id, id),
      eq(habits.profileId, auth.profile.id),
    ));
    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    console.error('Không thể xóa habit:', error);
    return NextResponse.json({ error: 'Không thể xóa thói quen.' }, { status: 500 });
  }
}
