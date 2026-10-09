'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { InboxItem, InboxItemKind, InboxItemStatus } from '@/lib/types';
import {
  Inbox,
  Plus,
  Trash2,
  CheckCircle,
  Archive,
  ArrowRightCircle,
  ExternalLink,
  Code,
  FileText,
  CheckSquare,
  Loader2,
  RefreshCw,
  Search,
} from 'lucide-react';

export function InboxApp() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<InboxItemStatus | 'all'>('inbox');
  const [searchTerm, setSearchTerm] = useState('');

  // New item form
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<InboxItemKind>('text');
  const [textPreview, setTextPreview] = useState('');
  const [sourceUri, setSourceUri] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const url = filterStatus === 'all' ? '/api/admin/inbox' : `/api/admin/inbox?status=${filterStatus}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch (e) {
      console.error('Lỗi tải Inbox:', e);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setIsSubmitting(true);
      const tags = tagInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await fetch('/api/admin/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          kind,
          textPreview: textPreview.trim() || null,
          sourceUri: sourceUri.trim() || null,
          tagsJson: tags,
        }),
      });

      if (res.ok) {
        setTitle('');
        setTextPreview('');
        setSourceUri('');
        setTagInput('');
        fetchItems();
      }
    } catch (e) {
      console.error('Lỗi tạo mục Inbox:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConvertToTask = async (item: InboxItem) => {
    try {
      // 1. Create task in kanban
      const taskRes = await fetch('/api/admin/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: item.title,
          description: item.textPreview || (item.sourceUri ? `Nguồn: ${item.sourceUri}` : null),
          status: 'todo',
          priority: 'medium',
          tags: item.tagsJson || [],
        }),
      });

      if (taskRes.ok) {
        // 2. Mark inbox item converted
        await fetch(`/api/admin/inbox/${item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'converted' }),
        });
        fetchItems();
      }
    } catch (e) {
      console.error('Lỗi chuyển thành công việc:', e);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: InboxItemStatus) => {
    try {
      await fetch(`/api/admin/inbox/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchItems();
    } catch (e) {
      console.error('Lỗi cập nhật trạng thái:', e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa mục này khỏi Inbox?')) return;
    try {
      await fetch(`/api/admin/inbox/${id}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e) {
      console.error('Lỗi xóa mục Inbox:', e);
    }
  };

  const filteredItems = items.filter((item) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.title.toLowerCase().includes(term) ||
      (item.textPreview && item.textPreview.toLowerCase().includes(term)) ||
      (item.tagsJson && item.tagsJson.some((t) => t.toLowerCase().includes(term)))
    );
  });

  const getKindIcon = (k: InboxItemKind) => {
    switch (k) {
      case 'url':
        return <ExternalLink className="w-4 h-4 text-sky-400" />;
      case 'task':
        return <CheckSquare className="w-4 h-4 text-emerald-400" />;
      case 'snippet':
        return <Code className="w-4 h-4 text-amber-400" />;
      default:
        return <FileText className="w-4 h-4 text-stone-400" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-stone-950 text-stone-200 text-xs">
      {/* Top Header & Fast Capture */}
      <div className="p-3 border-b border-stone-800 bg-stone-900/50 flex flex-col gap-3">
        <form onSubmit={handleCreate} className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ghi nhanh ý tưởng, liên kết, hoặc việc cần làm..."
              className="flex-1 bg-stone-950 border border-stone-700/80 rounded-lg px-3 py-1.5 text-xs text-white placeholder-stone-500 focus:outline-hidden focus:border-emerald-500"
              required
            />
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as InboxItemKind)}
              className="bg-stone-950 border border-stone-700/80 rounded-lg px-2 py-1.5 text-xs text-stone-300 focus:outline-hidden"
            >
              <option value="text">Văn bản</option>
              <option value="url">Liên kết URL</option>
              <option value="task">Nhiệm vụ</option>
              <option value="snippet">Đoạn mã</option>
            </select>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-3 py-1.5 rounded-lg disabled:opacity-50 transition"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              <span>Thu thập</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={textPreview}
              onChange={(e) => setTextPreview(e.target.value)}
              placeholder="Chi tiết / Ghi chú bổ sung..."
              className="flex-1 bg-stone-950/60 border border-stone-800 rounded-lg px-2.5 py-1 text-xs text-stone-300 placeholder-stone-600 focus:outline-hidden"
            />
            {kind === 'url' && (
              <input
                type="url"
                value={sourceUri}
                onChange={(e) => setSourceUri(e.target.value)}
                placeholder="https://..."
                className="w-48 bg-stone-950/60 border border-stone-800 rounded-lg px-2.5 py-1 text-xs text-stone-300 placeholder-stone-600 focus:outline-hidden"
              />
            )}
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="Thẻ (cách nhau bằng dấu phẩy)..."
              className="w-48 bg-stone-950/60 border border-stone-800 rounded-lg px-2.5 py-1 text-xs text-stone-300 placeholder-stone-600 focus:outline-hidden"
            />
          </div>
        </form>

        {/* Toolbar: Filters, search, refresh */}
        <div className="flex items-center justify-between pt-1 border-t border-stone-800/60">
          <div className="flex items-center gap-1.5">
            {(['inbox', 'converted', 'archived', 'all'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium transition ${
                  filterStatus === st
                    ? 'bg-stone-700 text-white'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
                }`}
              >
                {st === 'inbox'
                  ? 'Hộp thư'
                  : st === 'converted'
                  ? 'Đã chuyển đổi'
                  : st === 'archived'
                  ? 'Đã lưu trữ'
                  : 'Tất cả'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2 top-1.5 text-stone-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm kiếm..."
                className="pl-7 pr-2 py-0.5 bg-stone-950 border border-stone-800 rounded-md text-[11px] text-stone-300 focus:outline-hidden"
              />
            </div>
            <button
              onClick={() => fetchItems()}
              title="Làm mới"
              className="p-1 rounded hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* List items */}
      <div className="flex-1 overflow-auto p-3 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-stone-500">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            <span>Đang tải danh sách hộp thư...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-stone-500">
            <Inbox className="w-10 h-10 mb-2 opacity-40 text-stone-400" />
            <p className="font-medium">Hộp thư trống</p>
            <p className="text-[11px] text-stone-600 mt-1">
              Nhập ý tưởng hoặc thông tin vào ô trên để lưu trữ ngay lập tức.
            </p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between gap-3 p-2.5 rounded-xl bg-stone-900/60 border border-stone-800/80 hover:border-stone-700 transition group"
            >
              <div className="flex items-start gap-2.5 flex-1 min-w-0">
                <div className="p-1.5 rounded-lg bg-stone-800/80 mt-0.5">
                  {getKindIcon(item.kind)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-stone-200 truncate">{item.title}</h4>
                    {item.status === 'converted' && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800">
                        Đã chuyển Task
                      </span>
                    )}
                    {item.status === 'archived' && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-stone-800 text-stone-400">
                        Đã lưu trữ
                      </span>
                    )}
                  </div>

                  {item.textPreview && (
                    <p className="text-stone-400 text-[11px] mt-1 line-clamp-2">
                      {item.textPreview}
                    </p>
                  )}

                  {item.sourceUri && (
                    <a
                      href={item.sourceUri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sky-400 hover:underline text-[11px] mt-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span className="truncate max-w-[280px]">{item.sourceUri}</span>
                    </a>
                  )}

                  {item.tagsJson && item.tagsJson.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {item.tagsJson.map((t, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.2 rounded text-[10px] bg-stone-800/80 text-stone-400"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                {item.status === 'inbox' && (
                  <button
                    onClick={() => handleConvertToTask(item)}
                    title="Chuyển mục này thành Thẻ Kanban"
                    className="p-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-800/80 text-emerald-300 transition flex items-center gap-1 text-[11px]"
                  >
                    <ArrowRightCircle className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Chuyển Task</span>
                  </button>
                )}

                {item.status !== 'archived' ? (
                  <button
                    onClick={() => handleUpdateStatus(item.id, 'archived')}
                    title="Lưu trữ"
                    className="p-1.5 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition"
                  >
                    <Archive className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpdateStatus(item.id, 'inbox')}
                    title="Đưa lại vào Hộp thư"
                    className="p-1.5 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition"
                  >
                    <Inbox className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  onClick={() => handleDelete(item.id)}
                  title="Xóa mục"
                  className="p-1.5 rounded-lg hover:bg-rose-950/60 hover:text-rose-400 text-stone-500 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
