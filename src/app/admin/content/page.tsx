'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit,
  ExternalLink,
  Eye,
  Globe,
  Lock,
  Tag,
  Check,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { VisibilityBadge, StatusBadge } from '@/components/ui/badge';
import { ContentItem, Visibility, ContentStatus } from '@/lib/types';

export default function AdminContentPage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [type, setType] = useState('note');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('PRIVATE');
  const [status, setStatus] = useState<ContentStatus>('DRAFT');
  const [isPinned, setIsPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/content');
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch (err) {
      console.error('Lỗi tải nội dung:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const openCreateModal = () => {
    setEditingItem(null);
    setTitle('');
    setType('note');
    setDescription('');
    setContent('');
    setTags('');
    setVisibility('PRIVATE');
    setStatus('DRAFT');
    setIsPinned(false);
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (item: ContentItem) => {
    setEditingItem(item);
    setTitle(item.title);
    setType(item.type);
    setDescription(item.description || '');
    setContent(item.content || '');
    setTags((item.tags || []).join(', '));
    setVisibility(item.visibility);
    setStatus(item.status);
    setIsPinned(item.isPinned);
    setFormError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('Vui lòng nhập tiêu đề.');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      const parsedTags = tags.split(',').map((t) => t.trim()).filter(Boolean);
      const payload = {
        title,
        type,
        description,
        content,
        tags: parsedTags,
        visibility,
        status,
        isPinned,
      };

      let res;
      if (editingItem) {
        res = await fetch(`/api/admin/content/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/admin/content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi lưu nội dung');

      setModalOpen(false);
      fetchItems();
    } catch (err: any) {
      setFormError(err.message || 'Không thể lưu nội dung.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, itemTitle: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa "${itemTitle}"?`)) return;

    try {
      const res = await fetch(`/api/admin/content/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchItems();
      }
    } catch (err) {
      alert('Không thể xóa mục này.');
    }
  };

  const handleTogglePublish = async (item: ContentItem) => {
    const nextStatus = item.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    const nextVisibility = nextStatus === 'PUBLISHED' ? 'PUBLIC' : item.visibility;

    try {
      const res = await fetch(`/api/admin/content/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus, visibility: nextVisibility }),
      });
      if (res.ok) {
        fetchItems();
      }
    } catch {
      alert('Không thể cập nhật trạng thái xuất bản.');
    }
  };

  // Filtered Items
  const filtered = items.filter((item) => {
    if (typeFilter !== 'all' && item.type !== typeFilter) return false;
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
            Quản lý Ghi chú & Bài viết
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Soạn thảo, phân loại tag, lưu nháp và kiểm soát xuất bản ra website công khai.
          </p>
        </div>

        <Button onClick={openCreateModal} size="sm" className="gap-1.5 self-start sm:self-auto">
          <Plus size={15} />
          <span>Tạo nội dung mới</span>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 p-3 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl">
        <div className="relative flex-1 w-full">
          <Search size={15} className="absolute left-3 top-2.5 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Tìm kiếm theo tiêu đề hoặc từ khóa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[var(--bg-surface-subtle)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-md outline-none focus:ring-1 focus:ring-[var(--border-focus)]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-[var(--bg-surface-subtle)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-md outline-none"
          >
            <option value="all">Tất cả loại</option>
            <option value="note">Ghi chú</option>
            <option value="article">Bài viết</option>
            <option value="document">Tài liệu</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-[var(--bg-surface-subtle)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-md outline-none"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="DRAFT">Bản nháp</option>
            <option value="PUBLISHED">Đã xuất bản</option>
            <option value="ARCHIVED">Lưu trữ</option>
          </select>
        </div>
      </div>

      {/* Content Table / List */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-12 text-center text-xs text-[var(--text-muted)] animate-pulse">
            Đang tải danh sách nội dung...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <p className="text-xs text-[var(--text-muted)]">Không tìm thấy nội dung phù hợp.</p>
            <Button size="sm" variant="outline" onClick={openCreateModal}>
              Tạo nội dung mới
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-color)]">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[var(--bg-surface-subtle)] transition-colors"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-[var(--text-primary)]">
                      {item.title}
                    </span>
                    <VisibilityBadge visibility={item.visibility} />
                    <StatusBadge status={item.status} />
                    {item.isPinned && (
                      <span className="text-[10px] bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded font-medium">
                        Đã ghim
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[var(--text-secondary)] line-clamp-1">
                    {item.description || item.content || 'Chưa có mô tả'}
                  </p>

                  {item.tags && item.tags.length > 0 && (
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <Tag size={11} className="text-[var(--text-muted)]" />
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-surface-subtle)] px-1.5 py-0.5 rounded border border-[var(--border-color)]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant={item.status === 'PUBLISHED' ? 'outline' : 'subtle'}
                    onClick={() => handleTogglePublish(item)}
                    className="text-xs"
                  >
                    {item.status === 'PUBLISHED' ? 'Hủy xuất bản' : 'Xuất bản'}
                  </Button>

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => openEditModal(item)}
                    title="Chỉnh sửa"
                  >
                    <Edit size={15} />
                  </Button>

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDelete(item.id, item.title)}
                    className="hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                    title="Xóa"
                  >
                    <Trash2 size={15} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent
          title={editingItem ? 'Chỉnh sửa nội dung' : 'Tạo nội dung mới'}
          description="Soạn thảo ghi chú hoặc bài viết. Bạn có thể lưu nháp hoặc xuất bản trực tiếp."
          className="max-w-2xl"
        >
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {formError && (
              <p className="text-xs text-[var(--danger)] font-medium bg-red-50 dark:bg-red-950/20 p-2 rounded">
                {formError}
              </p>
            )}

            <Input
              label="Tiêu đề *"
              placeholder="Nhập tiêu đề ghi chú hoặc bài viết..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Loại nội dung
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-[var(--radius-md,0.625rem)] outline-none"
                >
                  <option value="note">Ghi chú (Note)</option>
                  <option value="article">Bài viết (Article)</option>
                  <option value="document">Tài liệu (Document)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Mức độ hiển thị
                </label>
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as Visibility)}
                  className="w-full px-3 py-2 text-sm bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-[var(--radius-md,0.625rem)] outline-none"
                >
                  <option value="PRIVATE">○ Riêng tư (Chỉ mình bạn)</option>
                  <option value="PUBLIC">● Công khai (Hiển thị ngoài web)</option>
                  <option value="UNLISTED">◐ Không liệt kê (Cần link chia sẻ)</option>
                </select>
              </div>
            </div>

            <Textarea
              label="Mô tả tóm tắt"
              placeholder="Tóm tắt ngắn gọn hiển thị trên thẻ xem trước..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />

            <Textarea
              label="Nội dung chính (Hỗ trợ Markdown)"
              placeholder="# Tiêu đề lớn&#10;&#10;Nội dung chi tiết ghi chú của bạn..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
            />

            <Input
              label="Thẻ phân loại (Tags, cách nhau bởi dấu phẩy)"
              placeholder="WebOS, BaoMat, NghienCuu"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />

            <div className="flex items-center justify-between pt-2 border-t border-[var(--border-color)]">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs text-[var(--text-primary)] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isPinned}
                    onChange={(e) => setIsPinned(e.target.checked)}
                    className="rounded border-[var(--border-color)] text-[var(--accent)]"
                  />
                  <span>Ghim lên đầu</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-[var(--text-primary)] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={status === 'PUBLISHED'}
                    onChange={(e) => setStatus(e.target.checked ? 'PUBLISHED' : 'DRAFT')}
                    className="rounded border-[var(--border-color)] text-[var(--accent)]"
                  />
                  <span>Xuất bản ra website</span>
                </label>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalOpen(false)}
                >
                  Hủy
                </Button>
                <Button type="submit" size="sm" isLoading={submitting}>
                  {editingItem ? 'Lưu thay đổi' : 'Tạo mới'}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
