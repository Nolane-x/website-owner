'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  CheckSquare,
  Trash2,
  Edit2,
  Calendar,
  ListTodo,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { playSound } from '@/lib/audio/sound-fx';
import { KanbanTask, TaskStatus, TaskPriority, KanbanSubtask } from '@/lib/types';

const STATUS_COLUMNS: { id: TaskStatus; label: string; bgBadge: string; textBadge: string }[] = [
  { id: 'todo', label: 'Cần làm', bgBadge: 'bg-zinc-500/10 border-zinc-500/20', textBadge: 'text-zinc-400' },
  { id: 'in_progress', label: 'Đang thực hiện', bgBadge: 'bg-blue-500/10 border-blue-500/20', textBadge: 'text-blue-400' },
  { id: 'review', label: 'Đang kiểm tra', bgBadge: 'bg-amber-500/10 border-amber-500/20', textBadge: 'text-amber-400' },
  { id: 'done', label: 'Đã hoàn thành', bgBadge: 'bg-emerald-500/10 border-emerald-500/20', textBadge: 'text-emerald-400' },
];

const PRIORITY_BADGES: Record<TaskPriority, { label: string; className: string }> = {
  low: { label: 'Thấp', className: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30' },
  medium: { label: 'Vừa', className: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  high: { label: 'Cao', className: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  urgent: { label: 'Khẩn cấp', className: 'bg-rose-500/15 text-rose-400 border-rose-500/30 font-bold' },
};

export default function KanbanTasksPage() {
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<KanbanTask | null>(null);
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate: string;
    tags: string;
    subtasks: KanbanSubtask[];
  }>({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    dueDate: '',
    tags: '',
    subtasks: [],
  });

  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/tasks');
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (err) {
      console.error('Lỗi tải tác vụ:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleOpenCreate = (initialStatus: TaskStatus = 'todo') => {
    setEditingTask(null);
    setFormData({
      title: '',
      description: '',
      status: initialStatus,
      priority: 'medium',
      dueDate: '',
      tags: '',
      subtasks: [],
    });
    setNewSubtaskTitle('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (task: KanbanTask) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate || '',
      tags: task.tags.join(', '),
      subtasks: task.subtasksJson || [],
    });
    setNewSubtaskTitle('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      status: formData.status,
      priority: formData.priority,
      dueDate: formData.dueDate.trim() || null,
      tags: formData.tags
        ? formData.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [],
      subtasksJson: formData.subtasks,
    };

    try {
      if (editingTask) {
        const res = await fetch(`/api/admin/tasks/${editingTask.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          playSound('pop');
          setIsModalOpen(false);
          fetchTasks();
        }
      } else {
        const res = await fetch('/api/admin/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          playSound('snap');
          setIsModalOpen(false);
          fetchTasks();
        }
      }
    } catch (err) {
      console.error('Lỗi lưu tác vụ:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa tác vụ này?')) return;
    try {
      const res = await fetch(`/api/admin/tasks/${id}`, { method: 'DELETE' });
      if (res.ok) {
        playSound('pop');
        setTasks((prev) => prev.filter((t) => t.id !== id));
      }
    } catch (err) {
      console.error('Lỗi xóa tác vụ:', err);
    }
  };

  const handleMoveStatus = async (task: KanbanTask, nextStatus: TaskStatus) => {
    if (task.status === nextStatus) return;

    if (nextStatus === 'done') {
      playSound('chime');
    } else {
      playSound('snap');
    }

    // Cập nhật giao diện tức thì (Optimistic UI)
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
    );

    try {
      await fetch(`/api/admin/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
    } catch (err) {
      console.error('Lỗi di chuyển trạng thái tác vụ:', err);
      fetchTasks();
    }
  };

  const handleToggleSubtaskInCard = async (task: KanbanTask, subtaskId: string) => {
    const currentSubs = task.subtasksJson || [];
    const updatedSubtasks = currentSubs.map((st: KanbanSubtask) =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );

    playSound('thock');
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, subtasksJson: updatedSubtasks } : t))
    );

    try {
      await fetch(`/api/admin/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subtasksJson: updatedSubtasks }),
      });
    } catch (err) {
      console.error('Lỗi cập nhật danh sách việc con:', err);
    }
  };

  const handleAddSubtaskInModal = () => {
    if (!newSubtaskTitle.trim()) return;
    const newSt: KanbanSubtask = {
      id: crypto.randomUUID(),
      title: newSubtaskTitle.trim(),
      completed: false,
    };
    setFormData((prev) => ({
      ...prev,
      subtasks: [...prev.subtasks, newSt],
    }));
    setNewSubtaskTitle('');
    playSound('pop');
  };

  const handleRemoveSubtaskInModal = (subId: string) => {
    setFormData((prev) => ({
      ...prev,
      subtasks: prev.subtasks.filter((s) => s.id !== subId),
    }));
  };

  const filteredTasks = tasks.filter((t) => {
    const matchSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(search.toLowerCase())) ||
      t.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase()));

    const matchPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    return matchSearch && matchPriority;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2.5">
            <CheckSquare className="text-[var(--accent)]" size={26} />
            Bảng điều hành Công việc (Kanban Board)
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Quản trị tiến độ công việc, việc cần làm và phân loại mức độ ưu tiên cá nhân.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={() => handleOpenCreate('todo')} className="flex items-center gap-2">
            <Plus size={16} />
            Tạo việc mới
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
          <Input
            placeholder="Tìm kiếm tác vụ, thẻ gắn..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-[var(--bg-surface-subtle)] border-none text-sm"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter size={16} className="text-[var(--text-muted)] shrink-0" />
          <span className="text-xs text-[var(--text-muted)] shrink-0">Mức độ ưu tiên:</span>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            aria-label="Lọc theo mức độ ưu tiên"
            className="text-xs bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          >
            <option value="all">Tất cả ưu tiên</option>
            <option value="urgent">Khẩn cấp</option>
            <option value="high">Cao</option>
            <option value="medium">Vừa</option>
            <option value="low">Thấp</option>
          </select>
        </div>
      </div>

      {/* Kanban Board Grid */}
      {loading ? (
        <div className="py-20 text-center text-[var(--text-muted)] text-sm">
          Đang nạp dữ liệu công việc...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {STATUS_COLUMNS.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.id);
            return (
              <div
                key={col.id}
                className="flex flex-col rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] overflow-hidden shadow-sm min-h-[500px]"
              >
                {/* Column Header */}
                <div className="p-3.5 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-surface-subtle)]">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${col.bgBadge} ${col.textBadge}`}>
                      {col.label}
                    </span>
                    <span className="text-xs text-[var(--text-muted)] font-mono font-medium">
                      {colTasks.length}
                    </span>
                  </div>
                  <button
                    onClick={() => handleOpenCreate(col.id)}
                    className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors"
                    title={`Thêm tác vụ vào ${col.label}`}
                  >
                    <Plus size={16} />
                  </button>
                </div>

                {/* Task Cards Container */}
                <div className="p-3 space-y-3 flex-1 overflow-y-auto">
                  {colTasks.length === 0 ? (
                    <div className="h-32 flex flex-col items-center justify-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-color)] rounded-lg">
                      Không có tác vụ
                    </div>
                  ) : (
                    colTasks.map((task) => {
                      const subs = task.subtasksJson || [];
                      const completedSubCount = subs.filter((s: KanbanSubtask) => s.completed).length;
                      const hasSubtasks = subs.length > 0;
                      return (
                        <div
                          key={task.id}
                          className="group p-3.5 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] hover:border-[var(--accent)]/50 transition-all hover:shadow-md space-y-2.5"
                        >
                          {/* Card Top: Priority & Actions */}
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                PRIORITY_BADGES[task.priority].className
                              }`}
                            >
                              {PRIORITY_BADGES[task.priority].label}
                            </span>

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleOpenEdit(task)}
                                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded"
                                title="Chỉnh sửa"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => handleDelete(task.id)}
                                className="p-1 text-[var(--text-muted)] hover:text-rose-500 rounded"
                                title="Xóa"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>

                          {/* Title */}
                          <h4 className="text-sm font-semibold text-[var(--text-primary)] leading-snug">
                            {task.title}
                          </h4>

                          {/* Description snippet */}
                          {task.description && (
                            <p className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                              {task.description}
                            </p>
                          )}

                          {/* Subtasks Progress */}
                          {hasSubtasks && (
                            <div className="space-y-1.5 pt-1">
                              <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                                <span className="flex items-center gap-1">
                                  <ListTodo size={12} /> Việc con
                                </span>
                                <span>
                                  {completedSubCount}/{subs.length}
                                </span>
                              </div>
                              <div className="h-1.5 w-full bg-[var(--border-color)] rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-[var(--accent)] transition-all duration-300"
                                  style={{
                                    width: `${(completedSubCount / subs.length) * 100}%`,
                                  }}
                                />
                              </div>

                              {/* Expandable subtasks preview */}
                              <div className="space-y-1 pt-1">
                                {subs.slice(0, 3).map((st: KanbanSubtask) => (
                                  <label
                                    key={st.id}
                                    className="flex items-center gap-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={st.completed}
                                      onChange={() => handleToggleSubtaskInCard(task, st.id)}
                                      className="rounded border-[var(--border-color)] text-[var(--accent)] focus:ring-0 w-3.5 h-3.5"
                                    />
                                    <span className={st.completed ? 'line-through text-[var(--text-muted)]' : ''}>
                                      {st.title}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Due Date & Tags */}
                          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[var(--border-color)]/60 text-[11px] text-[var(--text-muted)]">
                            {task.dueDate && (
                              <span className="flex items-center gap-1 font-mono text-[10px]">
                                <Calendar size={11} />
                                {task.dueDate}
                              </span>
                            )}
                            {task.tags.map((tag) => (
                              <span
                                key={tag}
                                className="px-1.5 py-0.5 rounded bg-[var(--border-color)]/50 text-[10px]"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>

                          {/* Quick Move Status Buttons */}
                          <div className="pt-2 flex items-center justify-between gap-1">
                            <span className="text-[10px] text-[var(--text-muted)]">Chuyển:</span>
                            <div className="flex items-center gap-1">
                              {STATUS_COLUMNS.filter((sc) => sc.id !== task.status).map((sc) => (
                                <button
                                  key={sc.id}
                                  onClick={() => handleMoveStatus(task, sc.id)}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-surface)] hover:bg-[var(--accent)] hover:text-white transition-colors border border-[var(--border-color)]"
                                >
                                  {sc.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
              <h3 className="font-semibold text-base text-[var(--text-primary)]">
                {editingTask ? 'Chỉnh sửa tác vụ' : 'Tạo tác vụ mới'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Tiêu đề tác vụ *
                </label>
                <Input
                  required
                  placeholder="Nhập tiêu đề công việc..."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Mô tả chi tiết
                </label>
                <textarea
                  rows={3}
                  placeholder="Ghi chú chi tiết yêu cầu, link tài liệu..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full text-sm bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] rounded-lg p-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Cột trạng thái
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as TaskStatus })
                    }
                    className="w-full text-sm bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] rounded-lg p-2 text-[var(--text-primary)] focus:outline-none"
                  >
                    {STATUS_COLUMNS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Mức độ ưu tiên
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({ ...formData, priority: e.target.value as TaskPriority })
                    }
                    className="w-full text-sm bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] rounded-lg p-2 text-[var(--text-primary)] focus:outline-none"
                  >
                    <option value="low">Thấp</option>
                    <option value="medium">Vừa</option>
                    <option value="high">Cao</option>
                    <option value="urgent">Khẩn cấp</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Hạn chót (Deadline)
                  </label>
                  <Input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Thẻ gắn (cách nhau bởi dấu phẩy)
                  </label>
                  <Input
                    placeholder="dev, release, ui..."
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  />
                </div>
              </div>

              {/* Subtasks Management */}
              <div className="pt-2 border-t border-[var(--border-color)]">
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-2">
                  Danh sách việc con (Checklist)
                </label>
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder="Thêm mục việc con..."
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSubtaskInModal();
                      }
                    }}
                  />
                  <Button type="button" onClick={handleAddSubtaskInModal} variant="outline">
                    Thêm
                  </Button>
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1.5">
                  {formData.subtasks.map((st) => (
                    <div
                      key={st.id}
                      className="flex items-center justify-between p-2 rounded bg-[var(--bg-surface-subtle)] text-xs"
                    >
                      <label className="flex items-center gap-2 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={st.completed}
                          onChange={() => {
                            setFormData((prev) => ({
                              ...prev,
                              subtasks: prev.subtasks.map((s) =>
                                s.id === st.id ? { ...s, completed: !s.completed } : s
                              ),
                            }));
                          }}
                        />
                        <span className={st.completed ? 'line-through text-[var(--text-muted)]' : ''}>
                          {st.title}
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleRemoveSubtaskInModal(st.id)}
                        className="text-rose-400 hover:text-rose-500 p-1"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border-color)]">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit">
                  {editingTask ? 'Lưu thay đổi' : 'Tạo mới'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
