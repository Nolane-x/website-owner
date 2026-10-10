import { describe, expect, it } from 'vitest';
import {
  CalendarHabitsValidationError,
  parseCalendarEventCreateInput,
  parseCalendarEventPatchInput,
  parseDateKey,
  parseHabitCreateInput,
  parseHabitPatchInput,
  parseListQuery,
} from '@/lib/calendar-habits/validation';
import { CalendarHabitsPayloadTooLargeError, readCalendarHabitsJsonBody } from '@/lib/calendar-habits/request';

const validEvent = {
  title: '  Study session  ',
  startAt: '2026-10-10T09:00:00.000Z',
  endAt: '2026-10-10T10:00:00.000Z',
};

describe('calendar event validation', () => {
  it('normalizes a valid event and applies explicit safe defaults', () => {
    expect(parseCalendarEventCreateInput(validEvent)).toEqual({
      title: 'Study session',
      description: null,
      startAt: '2026-10-10T09:00:00.000Z',
      endAt: '2026-10-10T10:00:00.000Z',
      timezone: 'Asia/Ho_Chi_Minh',
      isAllDay: false,
    });
  });

  it('accepts a valid date-only all-day event', () => {
    expect(parseCalendarEventCreateInput({
      title: 'Holiday',
      startAt: '2028-02-29',
      endAt: '2028-03-01',
      isAllDay: true,
    })).toMatchObject({ startAt: '2028-02-29', endAt: '2028-03-01', isAllDay: true });
  });

  it.each([
    '2026-02-29',
    '2026-02-30',
    '2026-13-01',
    '2026-00-10',
    '2026-04-31',
    '2026-2-01',
    '',
    'tomorrow',
  ])('rejects invalid calendar date key %j', (value) => {
    expect(() => parseDateKey(value)).toThrow(CalendarHabitsValidationError);
  });

  it('accepts leap-day keys only in leap years', () => {
    expect(parseDateKey('2024-02-29')).toBe('2024-02-29');
    expect(() => parseDateKey('2025-02-29')).toThrow('YYYY-MM-DD');
  });

  it.each([
    '2026-02-30T09:00:00Z',
    '2026-10-10T24:00:00Z',
    '2026-10-10T09:60:00Z',
    '2026-10-10T09:00:60Z',
    '2026-10-10T09:00:00',
    '2026-10-10 09:00:00Z',
    'Oct 10 2026',
    'x'.repeat(41),
    '',
  ])('rejects ambiguous or invalid start timestamps %j', (startAt) => {
    expect(() => parseCalendarEventCreateInput({ title: 'Valid', startAt })).toThrow(CalendarHabitsValidationError);
  });

  it('requires an end timestamp not to precede the start', () => {
    expect(() => parseCalendarEventCreateInput({
      title: 'Invalid range',
      startAt: '2026-10-10T10:00:00Z',
      endAt: '2026-10-10T09:59:59Z',
    })).toThrow('không được trước');
  });

  it('rejects non-string, empty-after-sanitization, and overlong titles', () => {
    expect(() => parseCalendarEventCreateInput({ title: 2, startAt: validEvent.startAt })).toThrow('chuỗi');
    expect(() => parseCalendarEventCreateInput({ title: '<>', startAt: validEvent.startAt })).toThrow('sau khi chuẩn hóa');
    expect(() => parseCalendarEventCreateInput({ title: 'x'.repeat(181), startAt: validEvent.startAt })).toThrow('180');
  });

  it('bounds description and timezone length and validates the timezone', () => {
    expect(() => parseCalendarEventCreateInput({ ...validEvent, description: 'x'.repeat(6_001) })).toThrow('6000');
    expect(() => parseCalendarEventCreateInput({ ...validEvent, timezone: 'x'.repeat(101) })).toThrow('100');
    expect(() => parseCalendarEventCreateInput({ ...validEvent, timezone: 'Mars/Olympus' })).toThrow('Múi giờ');
    expect(parseCalendarEventCreateInput({ ...validEvent, description: '  Notes  ', timezone: 'UTC' }))
      .toMatchObject({ description: 'Notes', timezone: 'UTC' });
  });

  it('rejects invalid boolean values and non-object bodies', () => {
    expect(() => parseCalendarEventCreateInput({ ...validEvent, isAllDay: 'true' })).toThrow('boolean');
    expect(() => parseCalendarEventCreateInput(null)).toThrow('object JSON');
    expect(() => parseCalendarEventCreateInput([])).toThrow('object JSON');
  });

  it('allows a sparse event patch and validates the merged time range', () => {
    const existing = {
      title: 'Old title',
      description: 'Keep this',
      startAt: '2026-10-10T09:00:00Z',
      endAt: '2026-10-10T10:00:00Z',
      timezone: 'UTC',
      isAllDay: false,
    };
    expect(parseCalendarEventPatchInput({ title: 'New title' }, existing)).toMatchObject({
      title: 'New title',
      description: 'Keep this',
      startAt: existing.startAt,
      endAt: existing.endAt,
      timezone: 'UTC',
    });
    expect(() => parseCalendarEventPatchInput({
      startAt: '2026-10-10T12:00:00Z',
    }, existing)).toThrow('không được trước');
  });

  it('rejects empty and unknown-only event patches', () => {
    const existing = {
      title: 'Old title',
      description: null,
      startAt: '2026-10-10T09:00:00Z',
      endAt: null,
      timezone: 'UTC',
      isAllDay: false,
    };
    expect(() => parseCalendarEventPatchInput({}, existing)).toThrow('ít nhất một');
    expect(() => parseCalendarEventPatchInput({ forgedProfileId: 'other' }, existing)).toThrow('ít nhất một');
  });
});

describe('habit validation', () => {
  it('normalizes habit create input and applies default target', () => {
    expect(parseHabitCreateInput({ name: '  Read  ' })).toEqual({ name: 'Read', target: 'Hàng ngày' });
  });

  it('rejects empty-after-sanitization and overlong names', () => {
    expect(() => parseHabitCreateInput({ name: '<>' })).toThrow('sau khi chuẩn hóa');
    expect(() => parseHabitCreateInput({ name: 'x'.repeat(161) })).toThrow('160');
    expect(() => parseHabitCreateInput({ name: 3 })).toThrow('chuỗi');
  });

  it('bounds the target string and normalizes blank targets', () => {
    expect(parseHabitCreateInput({ name: 'Read', target: ' ' }).target).toBe('Hàng ngày');
    expect(() => parseHabitCreateInput({ name: 'Read', target: 'x'.repeat(101) })).toThrow('100');
    expect(() => parseHabitCreateInput({ name: 'Read', target: 25 })).toThrow('chuỗi');
  });

  it('rejects whole-array completion overwrites so day updates stay atomic', () => {
    expect(() => parseHabitPatchInput({
      completedDatesJson: ['2026-10-09', '2026-10-08'],
    })).toThrow('endpoint completion');
  });

  it('only accepts a boolean isActive field', () => {
    expect(parseHabitPatchInput({ isActive: false })).toEqual({ isActive: false });
    expect(() => parseHabitPatchInput({ isActive: 0 })).toThrow('boolean');
  });

  it('allows sparse habit updates but rejects empty/unknown-only patches', () => {
    expect(parseHabitPatchInput({ target: '20 phút' })).toEqual({ target: '20 phút' });
    expect(() => parseHabitPatchInput({})).toThrow('ít nhất một');
    expect(() => parseHabitPatchInput({ profileId: 'other' })).toThrow('ít nhất một');
  });
});

describe('bounded JSON request parsing', () => {
  it('accepts a bounded JSON object', async () => {
    await expect(readCalendarHabitsJsonBody(new Request('http://localhost/api/admin/habits', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Read', target: '20 minutes' }),
    }))).resolves.toEqual({ name: 'Read', target: '20 minutes' });
  });

  it('rejects malformed JSON and non-object payloads', async () => {
    await expect(readCalendarHabitsJsonBody(new Request('http://localhost/api/admin/habits', {
      method: 'POST', body: '{',
    }))).rejects.toThrow('JSON hợp lệ');
    await expect(readCalendarHabitsJsonBody(new Request('http://localhost/api/admin/habits', {
      method: 'POST', body: '[]',
    }))).rejects.toThrow('object JSON');
  });

  it('rejects a body larger than 64 KiB even without a Content-Length header', async () => {
    const body = JSON.stringify({ text: 'x'.repeat(66_000) });
    await expect(readCalendarHabitsJsonBody(new Request('http://localhost/api/admin/habits', {
      method: 'POST', body,
    }))).rejects.toBeInstanceOf(CalendarHabitsPayloadTooLargeError);
  });

  it('rejects oversized declared Content-Length before reading JSON', async () => {
    await expect(readCalendarHabitsJsonBody(new Request('http://localhost/api/admin/habits', {
      method: 'POST',
      headers: { 'content-length': '70000' },
      body: '{}',
    }))).rejects.toBeInstanceOf(CalendarHabitsPayloadTooLargeError);
  });
});

describe('bounded list pagination', () => {
  it('applies bounded defaults and accepts maximum supported page size', () => {
    expect(parseListQuery({ limit: null, offset: null })).toEqual({ limit: 100, offset: 0 });
    expect(parseListQuery({ limit: '250', offset: '1000000' })).toEqual({ limit: 250, offset: 1_000_000 });
    expect(parseListQuery({ limit: '1', offset: '0' })).toEqual({ limit: 1, offset: 0 });
  });

  it.each([
    { limit: '0', offset: null },
    { limit: '-1', offset: null },
    { limit: '251', offset: null },
    { limit: '1.5', offset: null },
    { limit: 'NaN', offset: null },
    { limit: '1e2', offset: null },
    { limit: null, offset: '-1' },
    { limit: null, offset: '1000001' },
    { limit: null, offset: '2.4' },
  ])('rejects invalid page parameters %#', (query) => {
    expect(() => parseListQuery(query)).toThrow(CalendarHabitsValidationError);
  });
});
