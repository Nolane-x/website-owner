import { NextResponse } from 'next/server';
import {
  CALENDAR_HABITS_REQUEST_MAX_BYTES,
  CalendarHabitsValidationError,
} from '@/lib/calendar-habits/validation';

export class CalendarHabitsPayloadTooLargeError extends Error {
  constructor() {
    super('Nội dung yêu cầu vượt quá 64 KiB.');
    this.name = 'CalendarHabitsPayloadTooLargeError';
  }
}

export async function readCalendarHabitsJsonBody(request: Request): Promise<unknown> {
  const contentLength = request.headers.get('content-length');
  if (contentLength && /^\d+$/.test(contentLength) && Number(contentLength) > CALENDAR_HABITS_REQUEST_MAX_BYTES) {
    throw new CalendarHabitsPayloadTooLargeError();
  }

  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > CALENDAR_HABITS_REQUEST_MAX_BYTES) {
    throw new CalendarHabitsPayloadTooLargeError();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(body) as unknown;
  } catch {
    throw new CalendarHabitsValidationError('Nội dung yêu cầu không phải JSON hợp lệ.');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new CalendarHabitsValidationError('Nội dung yêu cầu phải là một object JSON.');
  }
  return parsed;
}

export function calendarHabitsErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof CalendarHabitsPayloadTooLargeError) {
    return NextResponse.json({ error: error.message }, { status: 413 });
  }
  if (error instanceof CalendarHabitsValidationError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return null;
}
