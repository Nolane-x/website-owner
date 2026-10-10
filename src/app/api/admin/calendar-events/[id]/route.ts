import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { requireOwner } from '@/lib/auth/guard';
import { getDb, initializeDatabase } from '@/lib/db';
import { calendarEvents } from '@/lib/db/schema';
import { assertValidOrigin } from '@/lib/security/origin-guard';
import { parseCalendarEventPatchInput } from '@/lib/calendar-habits/validation';
import { calendarHabitsErrorResponse, readCalendarHabitsJsonBody } from '@/lib/calendar-habits/request';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const originError = assertValidOrigin(req);
  if (originError) return originError;
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    const body = await readCalendarHabitsJsonBody(req);
    const { id } = await params;
    if (!id || id.length > 200) return NextResponse.json({ error: 'ID sự kiện không hợp lệ.' }, { status: 400 });

    await initializeDatabase();
    const db = getDb();
    const [existing] = await db.select().from(calendarEvents).where(and(
      eq(calendarEvents.id, id),
      eq(calendarEvents.profileId, auth.profile.id),
    )).limit(1);
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy sự kiện thuộc tài khoản này.' }, { status: 404 });

    const updates = parseCalendarEventPatchInput(body, existing);
    await db.update(calendarEvents).set({ ...updates, updatedAt: new Date() }).where(and(
      eq(calendarEvents.id, id),
      eq(calendarEvents.profileId, auth.profile.id),
    ));
    const [updated] = await db.select().from(calendarEvents).where(and(
      eq(calendarEvents.id, id),
      eq(calendarEvents.profileId, auth.profile.id),
    )).limit(1);
    if (!updated) return NextResponse.json({ error: 'Sự kiện không còn tồn tại.' }, { status: 404 });
    return NextResponse.json({ event: updated });
  } catch (error) {
    const response = calendarHabitsErrorResponse(error);
    if (response) return response;
    console.error('Không thể cập nhật calendar event:', error);
    return NextResponse.json({ error: 'Không thể cập nhật sự kiện.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const originError = assertValidOrigin(req);
  if (originError) return originError;
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    const { id } = await params;
    if (!id || id.length > 200) return NextResponse.json({ error: 'ID sự kiện không hợp lệ.' }, { status: 400 });
    await initializeDatabase();
    const db = getDb();
    const [existing] = await db.select({ id: calendarEvents.id }).from(calendarEvents).where(and(
      eq(calendarEvents.id, id),
      eq(calendarEvents.profileId, auth.profile.id),
    )).limit(1);
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy sự kiện thuộc tài khoản này.' }, { status: 404 });
    await db.delete(calendarEvents).where(and(
      eq(calendarEvents.id, id),
      eq(calendarEvents.profileId, auth.profile.id),
    ));
    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    console.error('Không thể xóa calendar event:', error);
    return NextResponse.json({ error: 'Không thể xóa sự kiện.' }, { status: 500 });
  }
}
