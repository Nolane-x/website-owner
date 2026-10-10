import { describe, expect, it } from 'vitest';
import { buildOverdueReport, getVietnamDateKey } from '@/lib/workflows/overdue-report';

describe('read-only overdue report', () => {
  it('uses the Vietnam calendar day rather than the server UTC date', () => {
    expect(getVietnamDateKey(new Date('2026-10-10T04:00:00.000Z'))).toBe('2026-10-10');
    expect(getVietnamDateKey(new Date('2026-10-10T18:00:00.000Z'))).toBe('2026-10-11');
  });

  it('treats date-only deadlines as overdue only after their Vietnam calendar day ends', () => {
    const tasks = [
      { id: 'yesterday', title: 'Yesterday', dueDate: '2026-10-09', status: 'todo' },
      { id: 'today', title: 'Today', dueDate: '2026-10-10', status: 'todo' },
      { id: 'done', title: 'Done', dueDate: '2026-10-01', status: 'done' },
      { id: 'no-date', title: 'No deadline', dueDate: null, status: 'todo' },
      { id: 'past-timestamp', title: 'Past time', dueDate: '2026-10-10T03:00:00.000Z', status: 'todo' },
      { id: 'future-timestamp', title: 'Future time', dueDate: '2026-10-10T20:00:00.000Z', status: 'todo' },
    ];

    const report = buildOverdueReport(tasks, new Date('2026-10-10T04:00:00.000Z'));
    expect(report.totalTasks).toBe(6);
    expect(report.overdueCount).toBe(2);
    expect(report.overdueTasks.map((task) => task.id)).toEqual(['yesterday', 'past-timestamp']);
    expect(report.sideEffects).toBe(false);
  });
});
