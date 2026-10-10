import { NextRequest, NextResponse } from 'next/server';
import { and, asc, eq } from 'drizzle-orm';
import crypto from 'crypto';
import { requireOwner } from '@/lib/auth/guard';
import { getDb, initializeDatabase } from '@/lib/db';
import { habits } from '@/lib/db/schema';
import { assertValidOrigin } from '@/lib/security/origin-guard';
import { parseHabitCreateInput, parseListQuery } from '@/lib/calendar-habits/validation';
import { calendarHabitsErrorResponse, readCalendarHabitsJsonBody } from '@/lib/calendar-habits/request';

export async function GET(req: NextRequest) {
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const query = parseListQuery({
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    });
    await initializeDatabase();
    const db = getDb();
    const rows = await db.select().from(habits)
      .where(eq(habits.profileId, auth.profile.id))
      .orderBy(asc(habits.createdAt), asc(habits.id))
      .limit(query.limit + 1)
      .offset(query.offset);

    return NextResponse.json({
      habits: rows.slice(0, query.limit),
      pagination: {
        limit: query.limit,
        offset: query.offset,
        hasMore: rows.length > query.limit,
      },
    });
  } catch (error) {
    const response = calendarHabitsErrorResponse(error);
    if (response) return response;
    console.error('Không thể tải habits:', error);
    return NextResponse.json({ error: 'Không thể tải danh sách thói quen.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const originError = assertValidOrigin(req);
  if (originError) return originError;
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    const input = parseHabitCreateInput(await readCalendarHabitsJsonBody(req));
    await initializeDatabase();
    const db = getDb();
    const id = 'habit-' + crypto.randomUUID();
    await db.insert(habits).values({
      id,
      profileId: auth.profile.id,
      ...input,
      completedDatesJson: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const [created] = await db.select().from(habits).where(and(
      eq(habits.id, id),
      eq(habits.profileId, auth.profile.id),
    )).limit(1);
    if (!created) return NextResponse.json({ error: 'Không thể xác minh thói quen sau khi tạo.' }, { status: 500 });
    return NextResponse.json({ habit: created }, { status: 201 });
  } catch (error) {
    const response = calendarHabitsErrorResponse(error);
    if (response) return response;
    console.error('Không thể tạo habit:', error);
    return NextResponse.json({ error: 'Không thể tạo thói quen.' }, { status: 500 });
  }
}
