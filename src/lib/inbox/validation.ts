import { sanitizePlain } from '@/lib/security/sanitize';
import type { InboxItemKind, InboxItemStatus } from '@/lib/types';

const INBOX_KINDS: readonly InboxItemKind[] = ['text', 'url', 'task', 'snippet', 'file'];
const INBOX_STATUSES: readonly InboxItemStatus[] = ['inbox', 'converted', 'archived'];
const MAX_TITLE_LENGTH = 240;
const MAX_PREVIEW_LENGTH = 20_000;
const MAX_SOURCE_URI_LENGTH = 2_048;
const MAX_PROJECT_ID_LENGTH = 200;
const MAX_TAGS = 30;
const MAX_TAG_LENGTH = 40;
const MAX_PAGE_SIZE = 250;
const MAX_OFFSET = 1_000_000;

export class InboxValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InboxValidationError';
  }
}

export interface InboxCreateInput {
  title: string;
  kind: InboxItemKind;
  textPreview: string | null;
  sourceUri: string | null;
  status: InboxItemStatus;
  tagsJson: string[];
  projectId: string | null;
}

export type InboxPatchInput = Partial<InboxCreateInput>;

export interface InboxListQuery {
  status?: InboxItemStatus;
  kind?: InboxItemKind;
  limit: number;
  offset: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new InboxValidationError('Dữ liệu Inbox phải là một object JSON.');
  return value;
}

function parseRequiredText(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== 'string') throw new InboxValidationError(field + ' phải là chuỗi.');
  const normalized = sanitizePlain(value).trim();
  if (!normalized) throw new InboxValidationError(field + ' không được để trống.');
  if (normalized.length > maxLength) {
    throw new InboxValidationError(field + ' không được vượt quá ' + maxLength + ' ký tự.');
  }
  return normalized;
}

function parseNullableText(value: unknown, field: string, maxLength: number): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') throw new InboxValidationError(field + ' phải là chuỗi hoặc null.');
  const normalized = sanitizePlain(value).trim();
  if (!normalized) return null;
  if (normalized.length > maxLength) {
    throw new InboxValidationError(field + ' không được vượt quá ' + maxLength + ' ký tự.');
  }
  return normalized;
}

function parseKind(value: unknown): InboxItemKind {
  if (typeof value !== 'string' || !INBOX_KINDS.includes(value as InboxItemKind)) {
    throw new InboxValidationError('Loại mục Inbox không hợp lệ.');
  }
  return value as InboxItemKind;
}

function parseStatus(value: unknown): InboxItemStatus {
  if (typeof value !== 'string' || !INBOX_STATUSES.includes(value as InboxItemStatus)) {
    throw new InboxValidationError('Trạng thái mục Inbox không hợp lệ.');
  }
  return value as InboxItemStatus;
}

function parseSourceUri(value: unknown): string | null {
  const uri = parseNullableText(value, 'Đường dẫn nguồn', MAX_SOURCE_URI_LENGTH);
  if (uri === null) return null;
  let parsed: URL;
  try {
    parsed = new URL(uri);
  } catch {
    throw new InboxValidationError('Đường dẫn nguồn phải là URL HTTP(S) hợp lệ.');
  }
  if ((parsed.protocol !== 'http:' && parsed.protocol !== 'https:') ||
      !parsed.hostname || parsed.username || parsed.password) {
    throw new InboxValidationError('Đường dẫn nguồn chỉ được dùng HTTP(S), không chứa thông tin đăng nhập.');
  }
  return uri;
}

function parseTags(value: unknown): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new InboxValidationError('Danh sách thẻ phải là một mảng.');
  if (value.length > MAX_TAGS) {
    throw new InboxValidationError('Mỗi mục Inbox có tối đa ' + MAX_TAGS + ' thẻ.');
  }

  const tags: string[] = [];
  for (let index = 0; index < value.length; index++) {
    const raw = value[index];
    if (typeof raw !== 'string') throw new InboxValidationError('Thẻ ' + (index + 1) + ' phải là chuỗi.');
    const tag = sanitizePlain(raw).trim();
    if (!tag) continue;
    if (tag.length > MAX_TAG_LENGTH) {
      throw new InboxValidationError('Mỗi thẻ không được vượt quá ' + MAX_TAG_LENGTH + ' ký tự.');
    }
    if (!tags.includes(tag)) tags.push(tag);
  }
  return tags;
}

function parseProjectId(value: unknown): string | null {
  return parseNullableText(value, 'ID dự án', MAX_PROJECT_ID_LENGTH);
}

export function parseInboxCreateInput(value: unknown): InboxCreateInput {
  const input = requireRecord(value);
  return {
    title: parseRequiredText(input.title, 'Tiêu đề', MAX_TITLE_LENGTH),
    kind: input.kind === undefined ? 'text' : parseKind(input.kind),
    textPreview: parseNullableText(input.textPreview, 'Nội dung xem trước', MAX_PREVIEW_LENGTH),
    sourceUri: parseSourceUri(input.sourceUri),
    status: input.status === undefined ? 'inbox' : parseStatus(input.status),
    tagsJson: parseTags(input.tagsJson),
    projectId: parseProjectId(input.projectId),
  };
}

const PATCH_FIELDS = new Set([
  'title', 'kind', 'textPreview', 'sourceUri', 'status', 'tagsJson', 'projectId',
]);

export function parseInboxPatchInput(value: unknown): InboxPatchInput {
  const input = requireRecord(value);
  const supportedKeys = Object.keys(input).filter((key) => PATCH_FIELDS.has(key));
  if (supportedKeys.length === 0) {
    throw new InboxValidationError('Cần cung cấp ít nhất một trường Inbox được hỗ trợ để cập nhật.');
  }

  const updates: InboxPatchInput = {};
  if ('title' in input) updates.title = parseRequiredText(input.title, 'Tiêu đề', MAX_TITLE_LENGTH);
  if ('kind' in input) updates.kind = parseKind(input.kind);
  if ('textPreview' in input) updates.textPreview = parseNullableText(input.textPreview, 'Nội dung xem trước', MAX_PREVIEW_LENGTH);
  if ('sourceUri' in input) updates.sourceUri = parseSourceUri(input.sourceUri);
  if ('status' in input) updates.status = parseStatus(input.status);
  if ('tagsJson' in input) updates.tagsJson = parseTags(input.tagsJson);
  if ('projectId' in input) updates.projectId = parseProjectId(input.projectId);
  return updates;
}

function parseIntegerQuery(value: string | null, field: string, fallback: number, min: number, max: number): number {
  if (value === null) return fallback;
  if (!/^(0|[1-9]\d*)$/.test(value)) {
    throw new InboxValidationError(field + ' phải là số nguyên không âm.');
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    throw new InboxValidationError(field + ' phải nằm trong khoảng ' + min + '–' + max + '.');
  }
  return parsed;
}

export function parseInboxListQuery(query: {
  status: string | null;
  kind: string | null;
  limit: string | null;
  offset: string | null;
}): InboxListQuery {
  return {
    ...(query.status === null ? {} : { status: parseStatus(query.status) }),
    ...(query.kind === null ? {} : { kind: parseKind(query.kind) }),
    limit: parseIntegerQuery(query.limit, 'limit', MAX_PAGE_SIZE, 1, MAX_PAGE_SIZE),
    offset: parseIntegerQuery(query.offset, 'offset', 0, 0, MAX_OFFSET),
  };
}

export const INBOX_REQUEST_MAX_BYTES = 64 * 1024;
