'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { KanbanTask, TaskStatus, TaskPriority } from '@/lib/types';
import {
  Plus,
  Trash2,
  Loader2,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';

const COLUMNS: { id: TaskStatus; title: string; color: string }[] = [
  { id: 'todo', title: 'Cần làm', color: 'border-stone-700' },
  { id: 'in_progress', title: 'Đang thực hiện', color: 'border-sky-500/50' },
  { id: 'review', title: 'Kiểm tra', color: 'border-amber-500/50' },
  { id: 'done', title: 'Hoàn thành', color: 'border-emerald-500/50' },
];

export function TasksApp() {
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/tasks');
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (e) {
      console.error('Lỗi tải công việc:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => {
      fetchTasks();
    });
  }, [fetchTasks]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/admin/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          priority: newTaskPriority,
          status: 'todo',
        }),
      });

      if (res.ok) {
        setNewTaskTitle('');
        fetchTasks();
      }
    } catch (e) {
      console.error('Lỗi tạo nhiệm vụ:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMoveStatus = async (taskId: string, currentStatus: TaskStatus, direction: 'prev' | 'next') => {
    const order: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'review', 'done'];
    const currentIndex = order.indexOf(currentStatus);
    const targetIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

    if (targetIndex >= 0 && targetIndex < order.length) {
      const nextStatus = order[targetIndex];
      // Optimistic update
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t))
      );

      try {
        await fetch(`/api/admin/tasks/${taskId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: nextStatus }),
        });
      } catch (e) {
        console.error('Lỗi di chuyển công việc:', e);
        fetchTasks();
      }
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa công việc này?')) return;
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    try {
      await fetch(`/api/admin/tasks/${taskId}`, { method: 'DELETE' });
    } catch (e) {
      console.error('Lỗi xóa công việc:', e);
      fetchTasks();
    }
  };

  const getPriorityBadge = (p: TaskPriority) => {
    switch (p) {
      case 'urgent':
        return <span className="px-1.5 py-0.2 rounded text-[10px] bg-rose-950 text-rose-400 border border-rose-800">Khẩn cấp</span>;
      case 'high':
        return <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-950 text-amber-400 border border-amber-800">Cao</span>;
      case 'low':
        return <span className="px-1.5 py-0.2 rounded text-[10px] bg-stone-800 text-stone-400">Thấp</span>;
      default:
        return <span className="px-1.5 py-0.2 rounded text-[10px] bg-sky-950 text-sky-400 border border-sky-800">Bình thường</span>;
    }
  };

  return (
    <div className="flex flex-col h-full bg-stone-950 text-stone-200 text-xs">
      {/* Top quick add form */}
      <div className="p-3 border-b border-stone-800 bg-stone-900/40 flex items-center justify-between gap-3">
        <form onSubmit={handleCreate} className="flex items-center gap-2 flex-1">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Thêm nhanh nhiệm vụ mới..."
            className="flex-1 bg-stone-950 border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-stone-500 focus:outline-hidden focus:border-emerald-500"
            required
          />
          <select
            value={newTaskPriority}
            onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)}
            className="bg-stone-950 border border-stone-700 rounded-lg px-2 py-1.5 text-xs text-stone-300 focus:outline-hidden"
          >
            <option value="urgent">Khẩn cấp</option>
            <option value="high">Ưu tiên cao</option>
            <option value="medium">Trung bình</option>
            <option value="low">Thấp</option>
          </select>
          <button
            type="submit"
            disabled={isSubmitting || !newTaskTitle.trim()}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-3 py-1.5 rounded-lg disabled:opacity-50 transition"
          >
            {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            <span>Thêm</span>
          </button>
        </form>

        <button
          onClick={() => fetchTasks()}
          title="Làm mới"
          className="p-1.5 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Kanban Board Columns */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-3 flex gap-3">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-stone-500">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            <span>Đang tải bảng công việc Kanban...</span>
          </div>
        ) : (
          COLUMNS.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.id);
            return (
              <div
                key={col.id}
                className="flex-1 min-w-[220px] max-w-[320px] flex flex-col bg-stone-900/50 border border-stone-800/80 rounded-xl overflow-hidden"
              >
                {/* Column header */}
                <div className={`p-2.5 border-b ${col.color} bg-stone-900/80 flex items-center justify-between`}>
                  <div className="flex items-center gap-1.5 font-semibold text-stone-200">
                    <span>{col.title}</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-stone-800 text-[10px] text-stone-400 font-mono">
                      {colTasks.length}
                    </span>
                  </div>
                </div>

                {/* Column tasks scrollable */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {colTasks.length === 0 ? (
                    <div className="py-8 text-center text-stone-600 text-[11px]">
                      Chưa có nhiệm vụ
                    </div>
                  ) : (
                    colTasks.map((t) => (
                      <div
                        key={t.id}
                        className="p-2.5 rounded-lg bg-stone-950/80 border border-stone-800 hover:border-stone-700 transition flex flex-col gap-2 group"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <p className="font-medium text-stone-200 line-clamp-2 leading-relaxed">
                            {t.title}
                          </p>
                          <button
                            onClick={() => handleDelete(t.id)}
                            className="text-stone-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition p-0.5"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>

                        {t.description && (
                          <p className="text-[11px] text-stone-400 line-clamp-2">
                            {t.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between pt-1 border-t border-stone-900 text-[10px]">
                          <div>{getPriorityBadge(t.priority)}</div>

                          <div className="flex items-center gap-1">
                            {col.id !== 'todo' && (
                              <button
                                onClick={() => handleMoveStatus(t.id, t.status, 'prev')}
                                title="Lùi lại cột trước"
                                className="p-1 rounded hover:bg-stone-800 text-stone-400"
                              >
                                <ChevronLeft className="w-3 h-3" />
                              </button>
                            )}
                            {col.id !== 'done' && (
                              <button
                                onClick={() => handleMoveStatus(t.id, t.status, 'next')}
                                title="Chuyển sang cột tiếp theo"
                                className="p-1 rounded hover:bg-stone-800 text-stone-400 hover:text-emerald-400"
                              >
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
