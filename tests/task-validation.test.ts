import { describe, expect, it } from 'vitest';
import {
  parseTaskCreateInput,
  parseTaskPatchInput,
  TaskValidationError,
} from '@/lib/tasks/validation';

describe('task request validation', () => {
  it('normalizes valid create input and applies safe defaults', () => {
    expect(parseTaskCreateInput({ title: '  Ship dashboard  ' })).toEqual({
      title: 'Ship dashboard',
      description: null,
      status: 'todo',
      priority: 'medium',
      dueDate: null,
      tags: [],
      subtasksJson: [],
      sortOrder: 0,
      relatedItemId: null,
    });
  });

  it('accepts valid status, priority, date, tags and subtask values', () => {
    const parsed = parseTaskCreateInput({
      title: 'Prepare release',
      status: 'backlog',
      priority: 'urgent',
      dueDate: '2026-12-31',
      tags: ['release', 'release', 'qa'],
      subtasksJson: [{ title: ' Run checks ', completed: true }],
      sortOrder: 5,
      relatedItemId: 'content-42',
    });

    expect(parsed.status).toBe('backlog');
    expect(parsed.priority).toBe('urgent');
    expect(parsed.dueDate).toBe('2026-12-31');
    expect(parsed.tags).toEqual(['release', 'qa']);
    expect(parsed.subtasksJson).toHaveLength(1);
    expect(parsed.subtasksJson[0]).toMatchObject({ title: 'Run checks', completed: true });
    expect(parsed.subtasksJson[0].id).toMatch(/^sub-/);
  });

  it.each(['doing', 'pending', 'DONE', '', 1, null])('rejects invalid status %j', (status) => {
    expect(() => parseTaskCreateInput({ title: 'A task', status })).toThrow(TaskValidationError);
  });

  it.each(['normal', 'critical', '', 2, null])('rejects invalid priority %j', (priority) => {
    expect(() => parseTaskCreateInput({ title: 'A task', priority })).toThrow(TaskValidationError);
  });

  it.each(['2026-02-30', '2026-13-01', 'yesterday', '2026-01-02Tnot-time', 123])(
    'rejects malformed due date %j',
    (dueDate) => {
      expect(() => parseTaskCreateInput({ title: 'A task', dueDate })).toThrow(TaskValidationError);
    },
  );

  it('accepts a valid ISO datetime deadline', () => {
    expect(parseTaskCreateInput({ title: 'A task', dueDate: '2026-12-31T18:30:00.000Z' }).dueDate)
      .toBe('2026-12-31T18:30:00.000Z');
  });

  it('rejects empty or oversized titles and oversized descriptions', () => {
    expect(() => parseTaskCreateInput({ title: '   ' })).toThrow('không được để trống');
    expect(() => parseTaskCreateInput({ title: 'x'.repeat(241) })).toThrow('240 ký tự');
    expect(() => parseTaskCreateInput({ title: 'A task', description: 'x'.repeat(20_001) })).toThrow('20000 ký tự');
  });

  it('bounds and validates tag collection shape and values', () => {
    expect(() => parseTaskCreateInput({ title: 'A task', tags: 'urgent' })).toThrow('một mảng');
    expect(() => parseTaskCreateInput({ title: 'A task', tags: Array(31).fill('tag') })).toThrow('tối đa 30');
    expect(() => parseTaskCreateInput({ title: 'A task', tags: ['x'.repeat(41)] })).toThrow('40 ký tự');
    expect(() => parseTaskCreateInput({ title: 'A task', tags: [false] })).toThrow('phải là chuỗi');
  });

  it('bounds and validates nested subtasks before database writes', () => {
    expect(() => parseTaskCreateInput({ title: 'A task', subtasksJson: Array(101).fill({ title: 'x' }) })).toThrow('tối đa 100');
    expect(() => parseTaskCreateInput({ title: 'A task', subtasksJson: [{ title: '   ' }] })).toThrow('không được để trống');
    expect(() => parseTaskCreateInput({ title: 'A task', subtasksJson: [{ title: 'X', completed: 'yes' }] })).toThrow('boolean');
    expect(() => parseTaskCreateInput({ title: 'A task', subtasksJson: [{ title: 'X', id: 42 }] })).toThrow('ID việc con');
  });

  it('rejects invalid sort orders and non-object payloads', () => {
    expect(() => parseTaskCreateInput(null)).toThrow('object JSON');
    expect(() => parseTaskCreateInput({ title: 'A task', sortOrder: 1.5 })).toThrow('số nguyên');
    expect(() => parseTaskCreateInput({ title: 'A task', sortOrder: 1_000_001 })).toThrow('số nguyên');
    expect(() => parseTaskCreateInput([])).toThrow('object JSON');
  });

  it('allows sparse patches without resetting omitted fields', () => {
    expect(parseTaskPatchInput({ status: 'review' })).toEqual({ status: 'review' });
    expect(parseTaskPatchInput({ dueDate: null })).toEqual({ dueDate: null });
    expect(parseTaskPatchInput({ tags: ['work'] })).toEqual({ tags: ['work'] });
  });

  it('rejects empty or unsupported-only patches and invalid patch values', () => {
    expect(() => parseTaskPatchInput({})).toThrow('ít nhất một trường');
    expect(() => parseTaskPatchInput({ madeUpField: true })).toThrow('ít nhất một trường');
    expect(() => parseTaskPatchInput({ priority: 'extreme' })).toThrow('Mức ưu tiên');
  });
});
