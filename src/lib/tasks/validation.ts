import crypto from 'node:crypto';
import type { KanbanSubtask, TaskPriority, TaskStatus } from '@/lib/types';

const TASK_STATUSES: readonly TaskStatus[] = ['backlog', 'todo', 'in_progress', 'review', 'done'];
const TASK_PRIORITIES: readonly TaskPriority[] = ['urgent', 'high', 'medium', 'low'];
const MAX_TITLE_LENGTH = 240;
const MAX_DESCRIPTION_LENGTH = 20_000;
const MAX_TAGS = 30;
const MAX_TAG_LENGTH = 40;
const MAX_SUBTASKS = 100;
const MAX_SUBTASK_TITLE_LENGTH = 200;
const MAX_SORT_ORDER = 1_000_000;

export class TaskValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TaskValidationError';
  }
}

export interface TaskCreateInput {
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  tags: string[];
  subtasksJson: KanbanSubtask[];
  sortOrder: number;
  relatedItemId: string | null;
}

export type TaskPatchInput = Partial<TaskCreateInput>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new TaskValidationError('Dữ liệu công việc phải là một object JSON.');
  return value;
}

function parseRequiredText(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== 'string') throw new TaskValidationError(field + ' phải là chuỗi.');
  const normalized = value.trim();
  if (!normalized) throw new TaskValidationError(field + ' không được để trống.');
  if (normalized.length > maxLength) throw new TaskValidationError(field + ' không được vượt quá ' + maxLength + ' ký tự.');
  return normalized;
}

function parseNullableText(value: unknown, field: string, maxLength: number): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') throw new TaskValidationError(field + ' phải là chuỗi hoặc null.');
  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.length > maxLength) throw new TaskValidationError(field + ' không được vượt quá ' + maxLength + ' ký tự.');
  return normalized;
}

function parseStatus(value: unknown): TaskStatus {
  if (typeof value !== 'string' || !TASK_STATUSES.includes(value as TaskStatus)) {
    throw new TaskValidationError('Trạng thái công việc không hợp lệ.');
  }
  return value as TaskStatus;
}

function parsePriority(value: unknown): TaskPriority {
  if (typeof value !== 'string' || !TASK_PRIORITIES.includes(value as TaskPriority)) {
    throw new TaskValidationError('Mức ưu tiên công việc không hợp lệ.');
  }
  return value as TaskPriority;
}

function parseDueDate(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw new TaskValidationError('Hạn chót phải là ngày hoặc chuỗi thời gian hợp lệ.');
  const normalized = value.trim();
  if (!normalized) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
      throw new TaskValidationError('Hạn chót không phải ngày lịch hợp lệ.');
    }
    return normalized;
  }

  if (!/^\d{4}-\d{2}-\d{2}T/.test(normalized) || !Number.isFinite(Date.parse(normalized))) {
    throw new TaskValidationError('Hạn chót phải dùng YYYY-MM-DD hoặc ISO datetime hợp lệ.');
  }
  return normalized;
}

function parseTags(value: unknown): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new TaskValidationError('Danh sách thẻ phải là một mảng.');
  if (value.length > MAX_TAGS) throw new TaskValidationError('Mỗi công việc có tối đa ' + MAX_TAGS + ' thẻ.');
  const tags = value.map((tag, index) => parseRequiredText(tag, 'Thẻ ' + (index + 1), MAX_TAG_LENGTH));
  return [...new Set(tags)];
}

function parseSubtasks(value: unknown): KanbanSubtask[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new TaskValidationError('Danh sách việc con phải là một mảng.');
  if (value.length > MAX_SUBTASKS) throw new TaskValidationError('Mỗi công việc có tối đa ' + MAX_SUBTASKS + ' việc con.');

  return value.map((raw, index) => {
    if (!isRecord(raw)) throw new TaskValidationError('Việc con ' + (index + 1) + ' không hợp lệ.');
    const title = parseRequiredText(raw.title, 'Tên việc con ' + (index + 1), MAX_SUBTASK_TITLE_LENGTH);

    let id: string;
    if (raw.id === undefined || raw.id === null || raw.id === '') {
      id = 'sub-' + crypto.randomUUID();
    } else if (typeof raw.id === 'string' && raw.id.trim().length > 0 && raw.id.trim().length <= 120) {
      id = raw.id.trim();
    } else {
      throw new TaskValidationError('ID việc con ' + (index + 1) + ' không hợp lệ.');
    }

    if (raw.completed !== undefined && typeof raw.completed !== 'boolean') {
      throw new TaskValidationError('Trạng thái hoàn thành của việc con ' + (index + 1) + ' phải là boolean.');
    }
    return { id, title, completed: raw.completed === true };
  });
}

function parseSortOrder(value: unknown): number {
  if (value === undefined) return 0;
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || Math.abs(value) > MAX_SORT_ORDER) {
    throw new TaskValidationError('Thứ tự sắp xếp phải là số nguyên trong khoảng ±' + MAX_SORT_ORDER + '.');
  }
  return value;
}

function parseTitle(value: unknown): string {
  return parseRequiredText(value, 'Tiêu đề công việc', MAX_TITLE_LENGTH);
}

function parseDescription(value: unknown): string | null {
  if (value === undefined) return null;
  return parseNullableText(value, 'Mô tả', MAX_DESCRIPTION_LENGTH);
}

function parseRelatedItemId(value: unknown): string | null {
  if (value === undefined) return null;
  return parseNullableText(value, 'ID mục liên kết', 200);
}

export function parseTaskCreateInput(value: unknown): TaskCreateInput {
  const input = requireRecord(value);
  return {
    title: parseTitle(input.title ?? ''),
    description: parseDescription(input.description),
    status: input.status === undefined ? 'todo' : parseStatus(input.status),
    priority: input.priority === undefined ? 'medium' : parsePriority(input.priority),
    dueDate: parseDueDate(input.dueDate),
    tags: parseTags(input.tags),
    subtasksJson: parseSubtasks(input.subtasksJson),
    sortOrder: parseSortOrder(input.sortOrder),
    relatedItemId: parseRelatedItemId(input.relatedItemId),
  };
}

const PATCH_FIELDS = new Set([
  'title', 'description', 'status', 'priority', 'dueDate', 'tags', 'subtasksJson', 'sortOrder', 'relatedItemId',
]);

export function parseTaskPatchInput(value: unknown): TaskPatchInput {
  const input = requireRecord(value);
  const keys = Object.keys(input).filter((key) => PATCH_FIELDS.has(key));
  if (keys.length === 0) {
    throw new TaskValidationError('Cần cung cấp ít nhất một trường công việc được hỗ trợ để cập nhật.');
  }

  const updates: TaskPatchInput = {};
  if ('title' in input) updates.title = parseTitle(input.title);
  if ('description' in input) updates.description = parseDescription(input.description);
  if ('status' in input) updates.status = parseStatus(input.status);
  if ('priority' in input) updates.priority = parsePriority(input.priority);
  if ('dueDate' in input) updates.dueDate = parseDueDate(input.dueDate);
  if ('tags' in input) updates.tags = parseTags(input.tags);
  if ('subtasksJson' in input) updates.subtasksJson = parseSubtasks(input.subtasksJson);
  if ('sortOrder' in input) updates.sortOrder = parseSortOrder(input.sortOrder);
  if ('relatedItemId' in input) updates.relatedItemId = parseRelatedItemId(input.relatedItemId);
  return updates;
}
