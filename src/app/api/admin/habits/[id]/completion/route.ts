import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guard';
import { getDb, initializeDatabase } from '@/lib/db';
import { assertValidOrigin } from '@/lib/security/origin-guard';
import { setHabitCompletion } from '@/lib/calendar-habits/completion';
import { calendarHabitsErrorResponse, readCalendarHabitsJsonBody } from '@/lib/calendar-habits/request';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const originError = assertValidOrigin(req);
  if (originError) return originError;
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    const body = await readCalendarHabitsJsonBody(req) as { date?: unknown; completed?: unknown };
    const { id } = await params;
    if (!id || id.length > 200) return NextResponse.json({ error: 'ID thói quen không hợp lệ.' }, { status: 400 });

    await initializeDatabase();
    const result = await setHabitCompletion(getDb(), auth.profile.id, id, body.date, body.completed);
    if (result.status === 'not_found') {
      return NextResponse.json({ error: 'Không tìm thấy thói quen thuộc tài khoản này.' }, { status: 404 });
    }
    return NextResponse.json({
      habit: result.habit,
      changed: result.changed,
      completed: body.completed,
      date: body.date,
    });
  } catch (error) {
    const response = calendarHabitsErrorResponse(error);
    if (response) return response;
    console.error('Không thể lưu lần hoàn thành thói quen:', error);
    return NextResponse.json({ error: 'Không thể lưu lần hoàn thành thói quen.' }, { status: 500 });
  }
}
