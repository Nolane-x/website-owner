export interface OverdueTaskSummary {
  id: string;
  title: string;
  dueDate: string | null;
  status: string;
}

export interface OverdueReport {
  totalTasks: number;
  overdueCount: number;
  overdueTasks: OverdueTaskSummary[];
  sideEffects: false;
}

/** Returns the calendar date in the application's explicit Vietnam timezone. */
export function getVietnamDateKey(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const read = (type: string) => parts.find((part) => part.type === type)?.value;
  const year = read('year');
  const month = read('month');
  const day = read('day');
  if (!year || !month || !day) throw new Error('Không thể xác định ngày theo múi giờ Việt Nam.');
  return `${year}-${month}-${day}`;
}

/**
 * Build a read-only report. Date-only deadlines expire at the end of that day
 * in Asia/Ho_Chi_Minh, not at midnight in the server's timezone.
 */
export function buildOverdueReport(
  tasks: OverdueTaskSummary[],
  now = new Date(),
): OverdueReport {
  const todayInVietnam = getVietnamDateKey(now);
  const overdueTasks = tasks.filter((task) => {
    if (!task.dueDate || task.status === 'done') return false;
    if (/^\d{4}-\d{2}-\d{2}$/.test(task.dueDate)) {
      return task.dueDate < todayInVietnam;
    }
    const due = new Date(task.dueDate);
    return Number.isFinite(due.getTime()) && due < now;
  });

  return {
    totalTasks: tasks.length,
    overdueCount: overdueTasks.length,
    overdueTasks,
    sideEffects: false,
  };
}
