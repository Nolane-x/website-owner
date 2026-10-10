import { describe, expect, it } from 'vitest';
import {
  InboxValidationError,
  parseInboxCreateInput,
  parseInboxListQuery,
  parseInboxPatchInput,
} from '@/lib/inbox/validation';

describe('inbox request validation', () => {
  it('normalizes a minimal capture and applies safe defaults', () => {
    expect(parseInboxCreateInput({ title: '  Save this idea  ' })).toEqual({
      title: 'Save this idea',
      kind: 'text',
      textPreview: null,
      sourceUri: null,
      status: 'inbox',
      tagsJson: [],
      projectId: null,
    });
  });

  it('accepts supported kinds, statuses, optional fields and normalizes duplicate tags', () => {
    const parsed = parseInboxCreateInput({
      title: '  Read later ',
      kind: 'url',
      textPreview: '  Useful reference ',
      sourceUri: 'https://example.com/article',
      status: 'archived',
      tagsJson: ['read', 'read', '  research  ', ''],
      projectId: 'project-42',
    });

    expect(parsed).toEqual({
      title: 'Read later',
      kind: 'url',
      textPreview: 'Useful reference',
      sourceUri: 'https://example.com/article',
      status: 'archived',
      tagsJson: ['read', 'research'],
      projectId: 'project-42',
    });
  });

  it.each(['note', 'bookmark', '', 1, null])('rejects invalid item kind %j', (kind) => {
    expect(() => parseInboxCreateInput({ title: 'Item', kind })).toThrow(InboxValidationError);
  });

  it.each(['new', 'deleted', '', 1, null])('rejects invalid item status %j', (status) => {
    expect(() => parseInboxCreateInput({ title: 'Item', status })).toThrow(InboxValidationError);
  });

  it('rejects non-object and empty-title payloads', () => {
    expect(() => parseInboxCreateInput(null)).toThrow('object JSON');
    expect(() => parseInboxCreateInput([])).toThrow('object JSON');
    expect(() => parseInboxCreateInput({ title: '  ' })).toThrow('không được để trống');
    expect(() => parseInboxCreateInput({ title: 42 })).toThrow('phải là chuỗi');
  });

  it('limits title, preview and project id lengths', () => {
    expect(() => parseInboxCreateInput({ title: 'x'.repeat(241) })).toThrow('240');
    expect(() => parseInboxCreateInput({ title: 'Item', textPreview: 'x'.repeat(20_001) })).toThrow('20000');
    expect(() => parseInboxCreateInput({ title: 'Item', projectId: 'x'.repeat(201) })).toThrow('200');
  });

  it('accepts only safe HTTP(S) source URLs without credentials', () => {
    expect(parseInboxCreateInput({ title: 'Link', sourceUri: 'https://example.com/path' }).sourceUri)
      .toBe('https://example.com/path');
    for (const sourceUri of [
      'javascript:alert(1)',
      'data:text/html,hello',
      'file:///tmp/file',
      'not a url',
      'https://user:password@example.com/private',
      'x'.repeat(2_049),
      12,
    ]) {
      expect(() => parseInboxCreateInput({ title: 'Link', sourceUri })).toThrow(InboxValidationError);
    }
    expect(parseInboxCreateInput({ title: 'Text', sourceUri: null }).sourceUri).toBeNull();
  });

  it('bounds tags, rejects incorrect types, and removes duplicates/blanks', () => {
    expect(parseInboxCreateInput({ title: 'Item', tagsJson: ['x', 'x', ' ', 'y'] }).tagsJson)
      .toEqual(['x', 'y']);
    expect(() => parseInboxCreateInput({ title: 'Item', tagsJson: 'tag' })).toThrow('mảng');
    expect(() => parseInboxCreateInput({ title: 'Item', tagsJson: Array(31).fill('tag') })).toThrow('30');
    expect(() => parseInboxCreateInput({ title: 'Item', tagsJson: ['x'.repeat(41)] })).toThrow('40');
    expect(() => parseInboxCreateInput({ title: 'Item', tagsJson: [false] })).toThrow('phải là chuỗi');
  });

  it('allows sparse patches and preserves omitted fields', () => {
    expect(parseInboxPatchInput({ status: 'converted' })).toEqual({ status: 'converted' });
    expect(parseInboxPatchInput({ textPreview: null })).toEqual({ textPreview: null });
    expect(parseInboxPatchInput({ tagsJson: ['work'] })).toEqual({ tagsJson: ['work'] });
  });

  it('rejects empty, unsupported-only and invalid patches', () => {
    expect(() => parseInboxPatchInput({})).toThrow('ít nhất một trường');
    expect(() => parseInboxPatchInput({ unknown: true })).toThrow('ít nhất một trường');
    expect(() => parseInboxPatchInput({ status: 'deleted' })).toThrow('Trạng thái');
    expect(() => parseInboxPatchInput({ title: '' })).toThrow('không được để trống');
    expect(() => parseInboxPatchInput({ sourceUri: 'javascript:alert(1)' })).toThrow('HTTP(S)');
  });

  it('applies valid defaults and strict bounds to list pagination', () => {
    expect(parseInboxListQuery({ status: null, kind: null, limit: null, offset: null }))
      .toEqual({ limit: 250, offset: 0 });
    expect(parseInboxListQuery({ status: 'inbox', kind: 'snippet', limit: '25', offset: '50' }))
      .toEqual({ status: 'inbox', kind: 'snippet', limit: 25, offset: 50 });
  });

  it.each([
    { status: 'deleted', kind: null, limit: null, offset: null },
    { status: null, kind: 'unknown', limit: null, offset: null },
    { status: null, kind: null, limit: '0', offset: null },
    { status: null, kind: null, limit: '251', offset: null },
    { status: null, kind: null, limit: '1.5', offset: null },
    { status: null, kind: null, limit: null, offset: '-1' },
    { status: null, kind: null, limit: null, offset: '1000001' },
    { status: null, kind: null, limit: null, offset: '1e2' },
  ])('rejects invalid list query %#', (query) => {
    expect(() => parseInboxListQuery(query)).toThrow(InboxValidationError);
  });
});
