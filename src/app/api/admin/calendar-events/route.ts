import { NextRequest, NextResponse } from 'next/server';
import { and, asc, eq } from 'drizzle-orm';
import crypto from 'crypto';
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

export async function GET(req: NextRequest) {
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;
  try {
    await initializeDatabase();
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const limit = Math.min(250, Math.max(1, Number(searchParams.get('limit') || 150)));
    const items = await db.select().from(calendarEvents)
      .where(eq(calendarEvents.profileId, auth.profile.id))
      .orderBy(asc(calendarEvents.startAt)).limit(limit);
    return NextResponse.json({ events: items });
  } catch (error) {
    console.error('Không thể tải calendar:', error);
    return NextResponse.json({ error: 'Không thể tải sự kiện lịch.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const originError = assertValidOrigin(req);
  if (originError) return originError;
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    const body = await req.json() as {
      title?: unknown; description?: unknown; startAt?: unknown; endAt?: unknown;
      timezone?: unknown; isAllDay?: unknown;
    };
    const title = typeof body.title === 'string' ? sanitizePlain(body.title).trim() : '';
    const startAt = typeof body.startAt === 'string' ? body.startAt.trim() : '';
    const endAt = typeof body.endAt === 'string' && body.endAt.trim() ? body.endAt.trim() : null;
    const timezone = typeof body.timezone === 'string' ? body.timezone : 'Asia/Ho_Chi_Minh';
    const isAllDay = body.isAllDay === true;
    if (!title || title.length > 180) return NextResponse.json({ error: 'Tiêu đề sự kiện phải có từ 1 đến 180 ký tự.' }, { status: 400 });
    if (!validTemporalValue(startAt) || (endAt && !validTemporalValue(endAt))) {
      return NextResponse.json({ error: 'Thời điểm bắt đầu/kết thúc không hợp lệ.' }, { status: 400 });
    }
    if (endAt && Date.parse(endAt) < Date.parse(startAt)) {
      return NextResponse.json({ error: 'Thời điểm kết thúc phải bằng hoặc sau thời điểm bắt đầu.' }, { status: 400 });
    }
    if (!validTimezone(timezone)) return NextResponse.json({ error: 'Múi giờ không hợp lệ.' }, { status: 400 });
    if (body.isAllDay !== undefined && typeof body.isAllDay !== 'boolean') return NextResponse.json({ error: 'isAllDay phải là boolean.' }, { status: 400 });

    await initializeDatabase();
    const db = getDb();
    const id = `event-${crypto.randomUUID()}`;
    await db.insert(calendarEvents).values({
      id,
      profileId: auth.profile.id,
      title,
      description: typeof body.description === 'string' && body.description.trim() ? sanitizePlain(body.description).slice(0, 6000) : null,
      startAt,
      endAt,
      timezone,
      isAllDay,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const [created] = await db.select().from(calendarEvents).where(and(
      eq(calendarEvents.id, id), eq(calendarEvents.profileId, auth.profile.id),
    )).limit(1);
    if (!created) return NextResponse.json({ error: 'Không thể xác minh sự kiện sau khi tạo.' }, { status: 500 });
    return NextResponse.json({ event: created }, { status: 201 });
  } catch (error) {
    console.error('Không thể tạo calendar event:', error);
    return NextResponse.json({ error: 'Không thể tạo sự kiện.' }, { status: 500 });
  }
}
