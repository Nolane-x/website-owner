'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { KanbanTask, TaskStatus, TaskPriority } from '@/lib/types';
import { Plus, Trash2, Loader2, RefreshCw, ChevronRight, ChevronLeft, Search, CalendarClock, AlertTriangle, CircleCheck, X } from 'lucide-react';

const COLUMNS: { id: TaskStatus; title: string; color: string; dot: string }[] = [
  { id: 'backlog', title: 'Backlog', color: 'border-violet-500/40', dot: 'bg-violet-400' },
  { id: 'todo', title: 'Cần làm', color: 'border-stone-700', dot: 'bg-stone-400' },
  { id: 'in_progress', title: 'Đang thực hiện', color: 'border-sky-500/50', dot: 'bg-sky-400' },
  { id: 'review', title: 'Kiểm tra', color: 'border-amber-500/50', dot: 'bg-amber-400' },
  { id: 'done', title: 'Hoàn thành', color: 'border-emerald-500/50', dot: 'bg-emerald-400' },
];

const PRIORITIES: { id: TaskPriority | 'all'; label: string }[] = [
  { id: 'all', label: 'Mọi mức ưu tiên' },
  { id: 'urgent', label: 'Khẩn cấp' },
  { id: 'high', label: 'Cao' },
  { id: 'medium', label: 'Trung bình' },
  { id: 'low', label: 'Thấp' },
];

function localDateKey(date: Date): string {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}

function dueDateKey(value?: string | null): string | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : localDateKey(parsed);
}

function formatDueDate(value?: string | null): string {
  const key = dueDateKey(value);
  if (!key) return '';
  const parts = key.split('-').map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString('vi-VN', { day: '2-digit', month: 'short', year: 'numeric' });
}

async function responseError(response: Response, fallback: string): Promise<string> {
  try {
    const payload = await response.json() as { error?: unknown };
    if (typeof payload.error === 'string' && payload.error.trim()) return payload.error;
  } catch {
    // A proxy may return non-JSON on failure. Avoid exposing raw internals.
  }
  return fallback + ' (HTTP ' + response.status + ').';
}

export function TasksApp() {
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyTaskIds, setBusyTaskIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/tasks', { cache: 'no-store' });
      if (!response.ok) throw new Error(await responseError(response, 'Không thể tải danh sách công việc'));
      const payload = await response.json() as { tasks?: KanbanTask[] };
      if (!Array.isArray(payload.tasks)) throw new Error('Dữ liệu công việc từ máy chủ không hợp lệ.');
      setTasks(payload.tasks);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể tải danh sách công việc.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void Promise.resolve().then(() => fetchTasks()); }, [fetchTasks]);

  const today = localDateKey(new Date());
  const overdueTasks = useMemo(
    () => tasks.filter((task) => {
      const key = dueDateKey(task.dueDate);
      return task.status !== 'done' && !!key && key < today;
    }),
    [tasks, today],
  );
  const visibleTasks = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase('vi');
    return tasks.filter((task) => {
      const searchable = [task.title, task.description ?? '', ...(task.tags ?? []), ...(task.subtasksJson ?? []).map((item) => item.title)];
      const matchesQuery = !query || searchable.some((value) => value.toLocaleLowerCase('vi').includes(query));
      const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
      const dueKey = dueDateKey(task.dueDate);
      const matchesOverdue = !overdueOnly || (task.status !== 'done' && !!dueKey && dueKey < today);
      return matchesQuery && matchesPriority && matchesOverdue;
    });
  }, [tasks, searchQuery, priorityFilter, overdueOnly, today]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    const title = newTaskTitle.trim();
    if (!title || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, priority: newTaskPriority, dueDate: newTaskDueDate || null, status: 'todo' }),
      });
      if (!response.ok) throw new Error(await responseError(response, 'Không thể tạo công việc'));
      const payload = await response.json() as { task?: KanbanTask };
      if (!payload.task?.id) throw new Error('Máy chủ không trả về công việc vừa tạo.');
      setTasks((current) => [payload.task!, ...current.filter((task) => task.id !== payload.task!.id)]);
      setNewTaskTitle('');
      setNewTaskDueDate('');
      setNewTaskPriority('medium');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể tạo công việc.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMoveStatus = async (task: KanbanTask, direction: 'prev' | 'next') => {
    if (busyTaskIds.includes(task.id)) return;
    const currentIndex = COLUMNS.findIndex((column) => column.id === task.status);
    const targetIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= COLUMNS.length) return;
    const nextStatus = COLUMNS[targetIndex].id;

    setBusyTaskIds((current) => [...current, task.id]);
    setError(null);
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status: nextStatus } : item));
    try {
      const response = await fetch('/api/admin/tasks/' + encodeURIComponent(task.id), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!response.ok) throw new Error(await responseError(response, 'Không thể cập nhật trạng thái'));
      const payload = await response.json() as { task?: KanbanTask };
      if (!payload.task?.id) throw new Error('Máy chủ không xác nhận trạng thái mới.');
      setTasks((current) => current.map((item) => item.id === task.id ? payload.task! : item));
    } catch (cause) {
      setTasks((current) => current.map((item) => item.id === task.id ? task : item));
      setError(cause instanceof Error ? cause.message : 'Không thể cập nhật trạng thái.');
    } finally {
      setBusyTaskIds((current) => current.filter((id) => id !== task.id));
    }
  };

  const handleDelete = async (task: KanbanTask) => {
    if (busyTaskIds.includes(task.id) || !confirm('Xóa công việc "' + task.title + '"?')) return;
    setBusyTaskIds((current) => [...current, task.id]);
    setError(null);
    setTasks((current) => current.filter((item) => item.id !== task.id));
    try {
      const response = await fetch('/api/admin/tasks/' + encodeURIComponent(task.id), { method: 'DELETE' });
      if (!response.ok) throw new Error(await responseError(response, 'Không thể xóa công việc'));
    } catch (cause) {
      setTasks((current) => current.some((item) => item.id === task.id) ? current : [...current, task]);
      setError(cause instanceof Error ? cause.message : 'Không thể xóa công việc.');
    } finally {
      setBusyTaskIds((current) => current.filter((id) => id !== task.id));
    }
  };

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'urgent': return <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-950 text-rose-300 border border-rose-800">Khẩn cấp</span>;
      case 'high': return <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-950 text-amber-300 border border-amber-800">Cao</span>;
      case 'low': return <span className="px-1.5 py-0.5 rounded text-[10px] bg-stone-800 text-stone-400">Thấp</span>;
      default: return <span className="px-1.5 py-0.5 rounded text-[10px] bg-sky-950 text-sky-300 border border-sky-800">Trung bình</span>;
    }
  };

  return (
    <div className="flex flex-col h-full bg-stone-950 text-stone-200 text-xs">
      <div className="p-3 border-b border-stone-800 bg-stone-900/40 space-y-3">
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-[minmax(160px,1fr)_140px_145px_auto] gap-2">
          <input type="text" value={newTaskTitle} onChange={(event) => setNewTaskTitle(event.target.value)} maxLength={240}
            placeholder="Thêm nhanh nhiệm vụ mới..." aria-label="Tiêu đề nhiệm vụ mới" required
            className="min-w-0 bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-xs text-white placeholder-stone-500 focus:outline-hidden focus:border-emerald-500" />
          <select value={newTaskPriority} onChange={(event) => setNewTaskPriority(event.target.value as TaskPriority)}
            aria-label="Mức ưu tiên nhiệm vụ mới" className="bg-stone-950 border border-stone-700 rounded-lg px-2 py-2 text-xs text-stone-300">
            <option value="urgent">Khẩn cấp</option><option value="high">Ưu tiên cao</option><option value="medium">Trung bình</option><option value="low">Thấp</option>
          </select>
          <input type="date" value={newTaskDueDate} onChange={(event) => setNewTaskDueDate(event.target.value)}
            aria-label="Hạn chót nhiệm vụ mới" title="Hạn chót" className="min-w-0 bg-stone-950 border border-stone-700 rounded-lg px-2 py-2 text-xs text-stone-300" />
          <button type="submit" disabled={isSubmitting || !newTaskTitle.trim()}
            className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-3 py-2 rounded-lg disabled:opacity-50 transition">
            {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}<span>Thêm việc</span>
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex flex-1 min-w-[160px] items-center gap-2 rounded-lg border border-stone-800 bg-stone-950 px-2.5">
            <Search className="w-3.5 h-3.5 text-stone-500 shrink-0" />
            <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Tìm tiêu đề, mô tả, thẻ, việc con..." aria-label="Tìm kiếm công việc"
              className="w-full min-w-0 bg-transparent py-2 text-xs text-white outline-none placeholder:text-stone-600" />
            {searchQuery && <button type="button" aria-label="Xóa tìm kiếm" onClick={() => setSearchQuery('')} className="text-stone-500 hover:text-stone-200"><X className="w-3 h-3" /></button>}
          </label>
          <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as TaskPriority | 'all')}
            aria-label="Lọc mức ưu tiên" className="bg-stone-950 border border-stone-800 rounded-lg px-2.5 py-2 text-xs text-stone-300">
            {PRIORITIES.map((priority) => <option key={priority.id} value={priority.id}>{priority.label}</option>)}
          </select>
          <button type="button" aria-pressed={overdueOnly} onClick={() => setOverdueOnly((value) => !value)}
            className={'flex items-center gap-1.5 rounded-lg border px-2.5 py-2 transition ' + (overdueOnly ? 'border-rose-700 bg-rose-950/60 text-rose-200' : 'border-stone-800 bg-stone-950 text-stone-400 hover:text-stone-200')}>
            <AlertTriangle className="w-3.5 h-3.5" />Quá hạn ({overdueTasks.length})
          </button>
          <button type="button" onClick={() => void fetchTasks()} disabled={loading} title="Làm mới" aria-label="Làm mới danh sách công việc"
            className="p-2 rounded-lg border border-stone-800 hover:bg-stone-800 text-stone-400 hover:text-stone-200 disabled:opacity-50 transition">
            <RefreshCw className={'w-3.5 h-3.5 ' + (loading ? 'animate-spin' : '')} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[10px] text-stone-500">
          <span>{tasks.length} công việc</span><span>·</span>
          <span>{tasks.filter((task) => task.status === 'done').length} hoàn thành</span><span>·</span>
          <span className={overdueTasks.length ? 'text-rose-300' : ''}>{overdueTasks.length} quá hạn</span>
          <span className="ml-auto">{visibleTasks.length} kết quả đang hiển thị</span>
        </div>
      </div>

      {error && <div role="alert" aria-live="polite" className="mx-3 mt-3 flex items-start gap-2 rounded-lg border border-rose-900/80 bg-rose-950/30 px-3 py-2.5 text-xs text-rose-200">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /><span className="flex-1">{error}</span>
        <button type="button" aria-label="Đóng thông báo lỗi" onClick={() => setError(null)} className="text-rose-300 hover:text-white"><X className="w-3.5 h-3.5" /></button>
      </div>}

      <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden p-3 flex gap-3">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-stone-500"><Loader2 className="w-5 h-5 animate-spin mr-2" /><span>Đang tải bảng công việc Kanban...</span></div>
        ) : error && tasks.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-stone-500">
            <AlertTriangle className="w-6 h-6 text-rose-300" /><p>Không thể hiển thị dữ liệu chưa tải được.</p>
            <button onClick={() => void fetchTasks()} className="rounded-lg bg-stone-800 px-3 py-2 text-stone-200 hover:bg-stone-700">Thử lại</button>
          </div>
        ) : COLUMNS.map((column) => {
          const columnTasks = visibleTasks.filter((task) => task.status === column.id);
          return (
            <section key={column.id} aria-label={column.title} className="flex-1 min-w-[225px] max-w-[340px] flex flex-col bg-stone-900/50 border border-stone-800/80 rounded-xl overflow-hidden">
              <header className={'p-2.5 border-b ' + column.color + ' bg-stone-900/80 flex items-center justify-between'}>
                <div className="flex items-center gap-2 font-semibold text-stone-200"><span className={'w-2 h-2 rounded-full ' + column.dot} /><span>{column.title}</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-stone-800 text-[10px] text-stone-400 font-mono">{columnTasks.length}</span></div>
                {column.id === 'done' && <CircleCheck className="w-3.5 h-3.5 text-emerald-400" />}
              </header>
              <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2">
                {columnTasks.length === 0 ? <div className="py-8 text-center text-stone-600 text-[11px]">{visibleTasks.length === 0 ? 'Không có kết quả phù hợp' : 'Chưa có nhiệm vụ'}</div> :
                  columnTasks.map((task) => {
                    const busy = busyTaskIds.includes(task.id);
                    const index = COLUMNS.findIndex((item) => item.id === task.status);
                    const dueKey = dueDateKey(task.dueDate);
                    const isOverdue = task.status !== 'done' && !!dueKey && dueKey < today;
                    const subtasks = task.subtasksJson ?? [];
                    const completedSubtasks = subtasks.filter((subtask) => subtask.completed).length;
                    return (
                      <article key={task.id} className={'p-2.5 rounded-lg bg-stone-950/80 border transition flex flex-col gap-2 group ' + (isOverdue ? 'border-rose-900/80' : 'border-stone-800 hover:border-stone-700') + (busy ? ' opacity-60' : '')}>
                        <div className="flex items-start justify-between gap-1"><p className="font-medium text-stone-200 line-clamp-3 leading-relaxed break-words">{task.title}</p>
                          <button type="button" onClick={() => void handleDelete(task)} disabled={busy} aria-label={'Xóa ' + task.title}
                            className="shrink-0 text-stone-600 hover:text-rose-400 opacity-70 md:opacity-0 md:group-hover:opacity-100 disabled:opacity-30 transition p-0.5">
                            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                          </button></div>
                        {task.description && <p className="text-[11px] text-stone-400 line-clamp-3 whitespace-pre-wrap">{task.description}</p>}
                        {task.dueDate && <div className={'flex items-center gap-1 text-[10px] ' + (isOverdue ? 'text-rose-300' : 'text-stone-500')}>
                          {isOverdue ? <AlertTriangle className="w-3 h-3" /> : <CalendarClock className="w-3 h-3" />}
                          <span>{isOverdue ? 'Quá hạn · ' : 'Hạn · '}{formatDueDate(task.dueDate)}</span>
                        </div>}
                        {!!task.tags?.length && <div className="flex flex-wrap gap-1">
                          {task.tags.slice(0, 5).map((tag) => <span key={tag} className="max-w-full truncate rounded border border-stone-800 bg-stone-900 px-1.5 py-0.5 text-[9px] text-stone-400">#{tag}</span>)}
                          {task.tags.length > 5 && <span className="text-[9px] text-stone-600">+{task.tags.length - 5}</span>}
                        </div>}
                        {subtasks.length > 0 && <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-stone-500"><span>Việc con</span><span>{completedSubtasks}/{subtasks.length}</span></div>
                          <div className="h-1 overflow-hidden rounded-full bg-stone-800"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: ((completedSubtasks / subtasks.length) * 100) + '%' }} /></div>
                        </div>}
                        <div className="flex items-center justify-between gap-1 pt-1 border-t border-stone-900">{getPriorityBadge(task.priority)}
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => void handleMoveStatus(task, 'prev')} disabled={busy || index <= 0}
                              title="Lùi một trạng thái" aria-label={'Lùi trạng thái ' + task.title}
                              className="p-1 rounded hover:bg-stone-800 text-stone-400 disabled:opacity-20 disabled:cursor-not-allowed"><ChevronLeft className="w-3.5 h-3.5" /></button>
                            <button type="button" onClick={() => void handleMoveStatus(task, 'next')} disabled={busy || index < 0 || index >= COLUMNS.length - 1}
                              title="Chuyển sang trạng thái kế tiếp" aria-label={'Tiến trạng thái ' + task.title}
                              className="p-1 rounded hover:bg-stone-800 text-stone-400 hover:text-emerald-400 disabled:opacity-20 disabled:cursor-not-allowed"><ChevronRight className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
