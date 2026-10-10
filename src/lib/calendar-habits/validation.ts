import { sanitizePlain } from '@/lib/security/sanitize';
import type { CalendarEvent, Habit } from '@/lib/types';

const DEFAULT_TIMEZONE = 'Asia/Ho_Chi_Minh';
const MAX_TITLE_LENGTH = 180;
const MAX_DESCRIPTION_LENGTH = 6_000;
const MAX_HABIT_NAME_LENGTH = 160;
const MAX_HABIT_TARGET_LENGTH = 100;
const MAX_PAGE_SIZE = 250;
const MAX_OFFSET = 1_000_000;

export class CalendarHabitsValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CalendarHabitsValidationError';
  }
}

export interface CalendarEventInput {
  title: string;
  description: string | null;
  startAt: string;
  endAt: string | null;
  timezone: string;
  isAllDay: boolean;
}

export interface HabitCreateInput {
  name: string;
  target: string;
}

export type HabitPatchInput = Partial<Pick<Habit, 'name' | 'target' | 'isActive'>>;

export interface ListQuery {
  limit: number;
  offset: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new CalendarHabitsValidationError('Nội dung phải là một object JSON.');
  return value;
}

function isValidDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day;
}

export function parseDateKey(value: unknown): string {
  if (typeof value !== 'string' || !isValidDateKey(value)) {
    throw new CalendarHabitsValidationError('Ngày phải là ngày lịch hợp lệ theo định dạng YYYY-MM-DD.');
  }
  return value;
}

function parseTemporalValue(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new CalendarHabitsValidationError(field + ' phải là ngày hoặc thời điểm ISO hợp lệ.');
  }
  const normalized = value.trim();
  if (!normalized || normalized.length > 40) {
    throw new CalendarHabitsValidationError(field + ' phải có tối đa 40 ký tự.');
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    if (!isValidDateKey(normalized)) {
      throw new CalendarHabitsValidationError(field + ' không phải ngày lịch hợp lệ.');
    }
    return normalized;
  }

  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2})$/i.exec(normalized);
  if (!match || !isValidDateKey(match[1])) {
    throw new CalendarHabitsValidationError(field + ' phải dùng YYYY-MM-DD hoặc ISO datetime có múi giờ (Z/±HH:MM).');
  }

  const hour = Number(match[2]);
  const minute = Number(match[3]);
  const second = match[4] === undefined ? 0 : Number(match[4]);
  if (hour > 23 || minute > 59 || second > 59 || !Number.isFinite(Date.parse(normalized))) {
    throw new CalendarHabitsValidationError(field + ' chứa thời gian không hợp lệ.');
  }
  return normalized;
}

function parseTimezone(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 100) {
    throw new CalendarHabitsValidationError('Múi giờ phải là tên IANA hợp lệ (tối đa 100 ký tự).');
  }
  const timezone = value.trim();
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format();
  } catch {
    throw new CalendarHabitsValidationError('Múi giờ không hợp lệ.');
  }
  return timezone;
}

function parseNullableDescription(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') {
    throw new CalendarHabitsValidationError('Mô tả phải là chuỗi hoặc null.');
  }
  const normalized = sanitizePlain(value).trim();
  if (normalized.length > MAX_DESCRIPTION_LENGTH) {
    throw new CalendarHabitsValidationError('Mô tả không được vượt quá ' + MAX_DESCRIPTION_LENGTH + ' ký tự.');
  }
  return normalized || null;
}

function parseTitle(value: unknown): string {
  if (typeof value !== 'string') throw new CalendarHabitsValidationError('Tiêu đề phải là chuỗi.');
  const title = sanitizePlain(value).trim();
  if (!title || title.length > MAX_TITLE_LENGTH) {
    throw new CalendarHabitsValidationError('Tiêu đề phải có từ 1 đến ' + MAX_TITLE_LENGTH + ' ký tự sau khi chuẩn hóa.');
  }
  return title;
}

export function parseCalendarEventCreateInput(value: unknown): CalendarEventInput {
  const input = requireRecord(value);
  const title = parseTitle(input.title);
  const startAt = parseTemporalValue(input.startAt, 'Thời điểm bắt đầu');
  const endAt = input.endAt === undefined || input.endAt === null || input.endAt === ''
    ? null
    : parseTemporalValue(input.endAt, 'Thời điểm kết thúc');
  if (endAt && Date.parse(endAt) < Date.parse(startAt)) {
    throw new CalendarHabitsValidationError('Thời điểm kết thúc không được trước thời điểm bắt đầu.');
  }
  const timezone = input.timezone === undefined ? DEFAULT_TIMEZONE : parseTimezone(input.timezone);
  if (input.isAllDay !== undefined && typeof input.isAllDay !== 'boolean') {
    throw new CalendarHabitsValidationError('isAllDay phải là boolean.');
  }
  return {
    title,
    description: parseNullableDescription(input.description),
    startAt,
    endAt,
    timezone,
    isAllDay: input.isAllDay === true,
  };
}

const EVENT_PATCH_FIELDS = new Set(['title', 'description', 'startAt', 'endAt', 'timezone', 'isAllDay']);

export function parseCalendarEventPatchInput(value: unknown, existing: Pick<CalendarEvent, 'title' | 'description' | 'startAt' | 'endAt' | 'timezone' | 'isAllDay'>): CalendarEventInput {
  const input = requireRecord(value);
  const keys = Object.keys(input).filter((key) => EVENT_PATCH_FIELDS.has(key));
  if (keys.length === 0) throw new CalendarHabitsValidationError('Cần cung cấp ít nhất một trường sự kiện được hỗ trợ.');
  return parseCalendarEventCreateInput({
    title: 'title' in input ? input.title : existing.title,
    description: 'description' in input ? input.description : existing.description ?? null,
    startAt: 'startAt' in input ? input.startAt : existing.startAt,
    endAt: 'endAt' in input ? input.endAt : existing.endAt ?? null,
    timezone: 'timezone' in input ? input.timezone : existing.timezone,
    isAllDay: 'isAllDay' in input ? input.isAllDay : existing.isAllDay,
  });
}

function parseHabitName(value: unknown): string {
  if (typeof value !== 'string') throw new CalendarHabitsValidationError('Tên thói quen phải là chuỗi.');
  const name = sanitizePlain(value).trim();
  if (!name || name.length > MAX_HABIT_NAME_LENGTH) {
    throw new CalendarHabitsValidationError('Tên thói quen phải có từ 1 đến ' + MAX_HABIT_NAME_LENGTH + ' ký tự sau khi chuẩn hóa.');
  }
  return name;
}

function parseHabitTarget(value: unknown): string {
  if (value === undefined || value === null) return 'Hàng ngày';
  if (typeof value !== 'string') throw new CalendarHabitsValidationError('Mục tiêu phải là chuỗi.');
  const target = sanitizePlain(value).trim();
  if (target.length > MAX_HABIT_TARGET_LENGTH) {
    throw new CalendarHabitsValidationError('Mục tiêu không được vượt quá ' + MAX_HABIT_TARGET_LENGTH + ' ký tự.');
  }
  return target || 'Hàng ngày';
}

export function parseHabitCreateInput(value: unknown): HabitCreateInput {
  const input = requireRecord(value);
  return {
    name: parseHabitName(input.name),
    target: parseHabitTarget(input.target),
  };
}

const HABIT_PATCH_FIELDS = new Set(['name', 'target', 'isActive']);

export function parseHabitPatchInput(value: unknown): HabitPatchInput {
  const input = requireRecord(value);
  if ('completedDatesJson' in input) {
    throw new CalendarHabitsValidationError('Không thể ghi đè toàn bộ lịch sử hoàn thành. Hãy cập nhật từng ngày qua endpoint completion để tránh mất dữ liệu khi có request đồng thời.');
  }

  const keys = Object.keys(input).filter((key) => HABIT_PATCH_FIELDS.has(key));
  if (keys.length === 0) throw new CalendarHabitsValidationError('Cần cung cấp ít nhất một trường thói quen được hỗ trợ.');

  const updates: HabitPatchInput = {};
  if ('name' in input) updates.name = parseHabitName(input.name);
  if ('target' in input) updates.target = parseHabitTarget(input.target);
  if ('isActive' in input) {
    if (typeof input.isActive !== 'boolean') throw new CalendarHabitsValidationError('isActive phải là boolean.');
    updates.isActive = input.isActive;
  }
  return updates;
}

function parseIntegerQuery(value: string | null, field: string, fallback: number, max: number): number {
  if (value === null) return fallback;
  if (!/^(0|[1-9]\d*)$/.test(value)) {
    throw new CalendarHabitsValidationError(field + ' phải là số nguyên không âm.');
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed > max) {
    throw new CalendarHabitsValidationError(field + ' vượt quá giới hạn cho phép.');
  }
  return parsed;
}

export function parseListQuery(query: { limit: string | null; offset: string | null }): ListQuery {
  const limit = query.limit === null ? 100 : parseIntegerQuery(query.limit, 'limit', 100, MAX_PAGE_SIZE);
  if (limit < 1) throw new CalendarHabitsValidationError('limit phải nằm trong khoảng 1–' + MAX_PAGE_SIZE + '.');
  return {
    limit,
    offset: parseIntegerQuery(query.offset, 'offset', 0, MAX_OFFSET),
  };
}

export const CALENDAR_HABITS_REQUEST_MAX_BYTES = 64 * 1024;
export const CALENDAR_HABITS_MAX_PAGE_SIZE = MAX_PAGE_SIZE;
