import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { requireOwner } from '@/lib/auth/guard';
import { getDb, initializeDatabase } from '@/lib/db';
import { calendarEvents } from '@/lib/db/schema';
import { assertValidOrigin } from '@/lib/security/origin-guard';
import { sanitizePlain } from '@/lib/security/sanitize';

function validTemporalValue(value: string): boolean {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }
  return Number.isFinite(Date.parse(value));
}
function validTimezone(value: string): boolean {
  try { new Intl.DateTimeFormat('en-US', { timeZone: value }).format(); return true; }
  catch { return false; }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const originError = assertValidOrigin(req);
  if (originError) return originError;
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;
  try {
    const { id } = await params;
    await initializeDatabase();
    const db = getDb();
    const [existing] = await db.select().from(calendarEvents).where(and(
      eq(calendarEvents.id, id), eq(calendarEvents.profileId, auth.profile.id),
    )).limit(1);
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy sự kiện thuộc tài khoản này.' }, { status: 404 });

    const body = await req.json() as Record<string, unknown>;
    const title = body.title === undefined ? existing.title : typeof body.title === 'string' ? sanitizePlain(body.title).trim() : '';
    const startAt = body.startAt === undefined ? existing.startAt : typeof body.startAt === 'string' ? body.startAt.trim() : '';
    const endAt = body.endAt === undefined ? existing.endAt : typeof body.endAt === 'string' && body.endAt.trim() ? body.endAt.trim() : null;
    const timezone = body.timezone === undefined ? existing.timezone : typeof body.timezone === 'string' ? body.timezone : '';
    const isAllDay = body.isAllDay === undefined ? existing.isAllDay : body.isAllDay === true;
    if (!title || title.length > 180 || !validTemporalValue(startAt) || (endAt && !validTemporalValue(endAt))) {
      return NextResponse.json({ error: 'Thông tin sự kiện không hợp lệ.' }, { status: 400 });
    }
    if (endAt && Date.parse(endAt) < Date.parse(startAt)) return NextResponse.json({ error: 'Thời điểm kết thúc phải sau thời điểm bắt đầu.' }, { status: 400 });
    if (!validTimezone(timezone) || (body.isAllDay !== undefined && typeof body.isAllDay !== 'boolean')) {
      return NextResponse.json({ error: 'Múi giờ hoặc trường isAllDay không hợp lệ.' }, { status: 400 });
    }
    const description = body.description === undefined ? existing.description : typeof body.description === 'string' && body.description.trim() ? sanitizePlain(body.description).slice(0, 6000) : null;
    await db.update(calendarEvents).set({ title, description, startAt, endAt, timezone, isAllDay, updatedAt: new Date() }).where(and(
      eq(calendarEvents.id, id), eq(calendarEvents.profileId, auth.profile.id),
    ));
    const [updated] = await db.select().from(calendarEvents).where(and(
      eq(calendarEvents.id, id), eq(calendarEvents.profileId, auth.profile.id),
    )).limit(1);
    return NextResponse.json({ event: updated });
  } catch (error) {
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
    await initializeDatabase();
    const db = getDb();
    const [existing] = await db.select({ id: calendarEvents.id }).from(calendarEvents).where(and(
      eq(calendarEvents.id, id), eq(calendarEvents.profileId, auth.profile.id),
    )).limit(1);
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy sự kiện thuộc tài khoản này.' }, { status: 404 });
    await db.delete(calendarEvents).where(and(eq(calendarEvents.id, id), eq(calendarEvents.profileId, auth.profile.id)));
    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    console.error('Không thể xóa calendar event:', error);
    return NextResponse.json({ error: 'Không thể xóa sự kiện.' }, { status: 500 });
  }
}
