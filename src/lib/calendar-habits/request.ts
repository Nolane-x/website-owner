import { NextResponse } from 'next/server';
import {
  BoundedRequestBodyTooLargeError,
  InvalidBoundedRequestBodyError,
  readBoundedRequestText,
} from '@/lib/security/bounded-request-body';
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
  let body: string;
  try {
    body = await readBoundedRequestText(request, CALENDAR_HABITS_REQUEST_MAX_BYTES);
  } catch (error) {
    if (error instanceof BoundedRequestBodyTooLargeError) {
      throw new CalendarHabitsPayloadTooLargeError();
    }
    if (error instanceof InvalidBoundedRequestBodyError) {
      throw new CalendarHabitsValidationError(error.message);
    }
    throw error;
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
