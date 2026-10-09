'use client';

import React, { useState, useEffect } from 'react';
import { Layers, Plus, Trash2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { VisibilityBadge, StatusBadge } from '@/components/ui/badge';
import { CollectionItem, Visibility, ContentStatus } from '@/lib/types';

export default function AdminCollectionsPage() {
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('PUBLIC');
  const [status, setStatus] = useState<ContentStatus>('PUBLISHED');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchCollections = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/collections');
      if (res.ok) {
        const data = await res.json();
        setCollections(data.collections || []);
      }
    } catch (err) {
      console.error('Lỗi tải bộ sưu tập:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function loadCollections() {
      try {
        const res = await fetch('/api/admin/collections');
        if (res.ok) {
          const data = await res.json();
          setCollections(data.collections || []);
        }
      } catch (err) {
        console.error('Lỗi tải bộ sưu tập:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCollections();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Vui lòng nhập tên bộ sưu tập.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/admin/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          coverImage,
          visibility,
          status,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Lỗi khi tạo bộ sưu tập');
      }

      setModalOpen(false);
      setName('');
      setDescription('');
      fetchCollections();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tạo bộ sưu tập.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, colName: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa bộ sưu tập "${colName}"?`)) return;
    try {
      const res = await fetch(`/api/admin/collections/${id}`, { method: 'DELETE' });
      if (res.ok) fetchCollections();
    } catch {
      alert('Không thể xóa bộ sưu tập.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
            Quản lý Bộ sưu tập (Collections)
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Gom nhóm các ghi chú, bài viết, dự án và tài nguyên thành các chuyên đề mạch lạc.
          </p>
        </div>

        <Button onClick={() => setModalOpen(true)} size="sm" className="gap-1.5 self-start sm:self-auto">
          <Plus size={15} />
          <span>Tạo bộ sưu tập mới</span>
        </Button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-[var(--text-muted)] animate-pulse">
          Đang tải danh sách bộ sưu tập...
        </div>
      ) : collections.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-[var(--bg-surface)] border border-dashed border-[var(--border-color)] rounded-2xl">
          <Layers size={32} className="mx-auto text-[var(--text-muted)] opacity-50" />
          <p className="text-xs text-[var(--text-muted)]">Chưa có bộ sưu tập nào.</p>
          <Button size="sm" variant="outline" onClick={() => setModalOpen(true)}>
            Tạo bộ sưu tập đầu tiên
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map((col) => (
            <div
              key={col.id}
              className="flex flex-col bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-5 space-y-3 hover:border-[var(--text-secondary)] transition-all shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 min-w-0">
                  <h3 className="font-bold text-sm text-[var(--text-primary)] truncate">{col.name}</h3>
                  <p className="text-[11px] text-[var(--text-muted)] font-mono">/collections/{col.slug}</p>
                </div>
                <VisibilityBadge visibility={col.visibility} />
              </div>

              <p className="text-xs text-[var(--text-secondary)] line-clamp-2">
                {col.description || 'Chưa có mô tả cho bộ sưu tập này.'}
              </p>

              <div className="pt-2 border-t border-[var(--border-color)] flex items-center justify-between mt-auto">
                <StatusBadge status={col.status} />

                <div className="flex items-center gap-1.5">
                  {col.visibility === 'PUBLIC' && (
                    <a href={`/collections/${col.slug}`} target="_blank" rel="noreferrer">
                      <Button size="icon" variant="ghost" title="Xem ngoài web">
                        <ExternalLink size={14} />
                      </Button>
                    </a>
                  )}

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDelete(col.id, col.name)}
                    className="hover:text-red-600"
                    title="Xóa"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent
          title="Tạo bộ sưu tập mới"
          description="Tập hợp nhiều bài viết, liên kết và tài nguyên lại với nhau."
          className="max-w-md"
        >
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {error && <p className="text-xs text-[var(--danger)] font-medium p-2 bg-red-50 dark:bg-red-950/20 rounded">{error}</p>}

            <Input
              label="Tên bộ sưu tập *"
              placeholder="VD: Nghiên cứu Trí tuệ Nhân tạo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />

            <Textarea
              label="Mô tả tóm tắt"
              placeholder="Mô tả ý nghĩa của bộ sưu tập này..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />

            <Input
              label="Ảnh bìa (URL)"
              placeholder="https://..."
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Mức độ hiển thị
                </label>
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as Visibility)}
                  className="w-full px-3 py-2 text-sm bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-[var(--radius-md,0.625rem)] outline-none"
                >
                  <option value="PUBLIC">● Công khai</option>
                  <option value="PRIVATE">○ Riêng tư</option>
                  <option value="UNLISTED">◐ Không liệt kê</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Trạng thái
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ContentStatus)}
                  className="w-full px-3 py-2 text-sm bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-[var(--radius-md,0.625rem)] outline-none"
                >
                  <option value="PUBLISHED">Đã xuất bản</option>
                  <option value="DRAFT">Bản nháp</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-color)]">
              <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" size="sm" isLoading={submitting}>
                Tạo bộ sưu tập
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
