'use client';

import React, { useState, useEffect } from 'react';
import { Bookmark, Plus, ExternalLink, Trash2, Edit, Tag, Globe, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { VisibilityBadge, StatusBadge } from '@/components/ui/badge';
import { ContentItem, Visibility } from '@/lib/types';

export default function AdminResourcesPage() {
  const [resources, setResources] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);

  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [provider, setProvider] = useState('Google Drive');
  const [category, setCategory] = useState('Tài liệu');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('PUBLIC');
  const [downloadAllowed, setDownloadAllowed] = useState(true);
  const [openInNewTab, setOpenInNewTab] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const providers = ['Google Drive', 'GitHub', 'OneDrive', 'Mega', 'Dropbox', 'Figma', 'Web Link'];
  const categories = ['Tài liệu', 'Công cụ & Phần mềm', 'Nghiên cứu AI', 'Thiết kế', 'Khóa học', 'Khác'];

  const fetchResources = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/content?type=resource');
      if (res.ok) {
        const data = await res.json();
        setResources(data.items || []);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách tài nguyên:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  const openCreateModal = () => {
    setEditingItem(null);
    setTitle('');
    setUrl('');
    setProvider('Google Drive');
    setCategory('Tài liệu');
    setDescription('');
    setTags('');
    setVisibility('PUBLIC');
    setDownloadAllowed(true);
    setOpenInNewTab(true);
    setError('');
    setModalOpen(true);
  };

  const openEditModal = (item: ContentItem) => {
    setEditingItem(item);
    setTitle(item.title);
    setUrl((item.metadata as any)?.url || '');
    setProvider((item.metadata as any)?.provider || 'Google Drive');
    setCategory(item.category || 'Tài liệu');
    setDescription(item.description || '');
    setTags((item.tags || []).join(', '));
    setVisibility(item.visibility);
    setDownloadAllowed((item.metadata as any)?.downloadAllowed !== false);
    setOpenInNewTab((item.metadata as any)?.openInNewTab !== false);
    setError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !url.trim()) {
      setError('Vui lòng nhập tiêu đề và đường dẫn URL.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const parsedTags = tags.split(',').map((t) => t.trim()).filter(Boolean);
      const payload = {
        title,
        type: 'resource',
        category,
        description,
        visibility,
        status: 'PUBLISHED',
        tags: parsedTags,
        metadata: {
          url,
          provider,
          downloadAllowed,
          openInNewTab,
        },
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

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Lỗi lưu tài nguyên');
      }

      setModalOpen(false);
      fetchResources();
    } catch (err: any) {
      setError(err.message || 'Không thể lưu tài nguyên.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, resTitle: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa tài nguyên "${resTitle}"?`)) return;
    try {
      const res = await fetch(`/api/admin/content/${id}`, { method: 'DELETE' });
      if (res.ok) fetchResources();
    } catch {
      alert('Không thể xóa tài nguyên.');
    }
  };

  const filtered = resources.filter((item) => {
    if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
            Thư viện Tài nguyên Link-First (Resource Library)
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Quản lý tài nguyên lưu trên Google Drive, GitHub, Mega, OneDrive mà không lo giới hạn dung lượng lưu trữ server.
          </p>
        </div>

        <Button onClick={openCreateModal} size="sm" className="gap-1.5 self-start sm:self-auto">
          <Plus size={15} />
          <span>Thêm liên kết tài nguyên</span>
        </Button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center gap-3 p-3 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl">
        <div className="relative flex-1 w-full">
          <Search size={15} className="absolute left-3 top-2.5 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Tìm kiếm tài nguyên hoặc từ khóa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[var(--bg-surface-subtle)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-md outline-none focus:ring-1 focus:ring-[var(--border-focus)]"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-2.5 py-1.5 text-xs bg-[var(--bg-surface-subtle)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-md outline-none"
        >
          <option value="all">Tất cả danh mục</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Resources Grid */}
      {loading ? (
        <div className="py-12 text-center text-xs text-[var(--text-muted)] animate-pulse">
          Đang tải danh sách tài nguyên...
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-[var(--bg-surface)] border border-dashed border-[var(--border-color)] rounded-2xl">
          <Bookmark size={32} className="mx-auto text-[var(--text-muted)] opacity-50" />
          <p className="text-xs text-[var(--text-muted)]">Chưa có tài nguyên nào.</p>
          <Button size="sm" variant="outline" onClick={openCreateModal}>
            Thêm tài nguyên Google Drive hoặc Web Link
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => {
            const meta = (item.metadata as any) || {};
            return (
              <div
                key={item.id}
                className="flex flex-col bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-4.5 space-y-3 hover:border-[var(--text-secondary)] transition-all shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--accent)] bg-[var(--accent-light)] px-2 py-0.5 rounded-full inline-block">
                      {meta.provider || 'Link'}
                    </span>
                    <h3 className="font-bold text-sm text-[var(--text-primary)] truncate">
                      {item.title}
                    </h3>
                  </div>
                  <VisibilityBadge visibility={item.visibility} />
                </div>

                <p className="text-xs text-[var(--text-secondary)] line-clamp-2">
                  {item.description || 'Không có mô tả chi tiết'}
                </p>

                {item.tags && item.tags.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {item.tags.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-surface-subtle)] px-1.5 py-0.5 rounded border border-[var(--border-color)]"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                <div className="pt-2 border-t border-[var(--border-color)] flex items-center justify-between text-xs mt-auto">
                  {meta.url ? (
                    <a
                      href={meta.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-medium text-[var(--accent)] hover:underline flex items-center gap-1"
                    >
                      <span>Mở liên kết</span>
                      <ExternalLink size={12} />
                    </a>
                  ) : (
                    <span />
                  )}

                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openEditModal(item)}
                      title="Chỉnh sửa"
                    >
                      <Edit size={14} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(item.id, item.title)}
                      className="hover:text-red-600"
                      title="Xóa"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Add / Edit Resource */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent
          title={editingItem ? 'Chỉnh sửa tài nguyên' : 'Thêm tài nguyên mới'}
          description="Liên kết tới tệp Google Drive, kho GitHub hoặc bất kỳ URL nào."
          className="max-w-lg"
        >
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {error && <p className="text-xs text-[var(--danger)] font-medium p-2 bg-red-50 dark:bg-red-950/20 rounded">{error}</p>}

            <Input
              label="Tiêu đề tài nguyên *"
              placeholder="VD: Thư mục Tài liệu Kiến trúc Google Drive"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />

            <Input
              label="Đường dẫn liên kết (URL) *"
              placeholder="https://drive.google.com/drive/folders/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />

            {/* Nhà cung cấp lưu trữ (Provider) */}
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                Nhà cung cấp lưu trữ
              </label>
              <div className="flex flex-wrap gap-1.5">
                {providers.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setProvider(p)}
                    className={`px-2.5 py-1 text-xs rounded-md border transition-all ${
                      provider === p
                        ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-light)] font-medium'
                        : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Danh mục
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-[var(--radius-md,0.625rem)] outline-none"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
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
                  <option value="PUBLIC">● Công khai (Public)</option>
                  <option value="PRIVATE">○ Riêng tư (Private)</option>
                  <option value="UNLISTED">◐ Không liệt kê (Unlisted)</option>
                </select>
              </div>
            </div>

            <Textarea
              label="Mô tả tóm tắt"
              placeholder="Ghi chú về nội dung tài nguyên này..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />

            <Input
              label="Thẻ phân loại (Tags)"
              placeholder="TaiLieu, GoogleDrive, PDF"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />

            <div className="flex items-center gap-4 pt-1">
              <label className="flex items-center gap-2 text-xs text-[var(--text-primary)] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={downloadAllowed}
                  onChange={(e) => setDownloadAllowed(e.target.checked)}
                  className="rounded border-[var(--border-color)] text-[var(--accent)]"
                />
                <span>Cho phép tải tệp xuống</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-[var(--text-primary)] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={openInNewTab}
                  onChange={(e) => setOpenInNewTab(e.target.checked)}
                  className="rounded border-[var(--border-color)] text-[var(--accent)]"
                />
                <span>Mở trong tab mới</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-color)]">
              <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" size="sm" isLoading={submitting}>
                {editingItem ? 'Lưu thay đổi' : 'Lưu tài nguyên'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
