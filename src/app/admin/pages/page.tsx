'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Compass, Plus, Edit3, Trash2, ExternalLink, Globe, LayoutTemplate, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { VisibilityBadge, StatusBadge } from '@/components/ui/badge';
import { PageItem, Visibility } from '@/lib/types';

export default function AdminPagesListPage() {
  const [pages, setPages] = useState<PageItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('PRIVATE');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchPages = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/pages');
      if (res.ok) {
        const data = await res.json();
        setPages(data.pages || []);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách trang:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Vui lòng nhập tiêu đề trang.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/admin/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          visibility,
          status: 'DRAFT',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi tạo trang');

      setCreateModalOpen(false);
      setTitle('');
      setDescription('');
      fetchPages();
    } catch (err: any) {
      setError(err.message || 'Không thể tạo trang.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, pageTitle: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa trang "${pageTitle}"? Toàn bộ các khối nội dung bên trong sẽ bị xóa.`)) return;

    try {
      const res = await fetch(`/api/admin/pages/${id}`, { method: 'DELETE' });
      if (res.ok) fetchPages();
    } catch {
      alert('Không thể xóa trang.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
            Trình dựng Trang Động (Page Canvas Builder)
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Xây dựng các trang web tùy biến bằng khối (Heading, Text, Card, Code, Quote, Image...).
          </p>
        </div>

        <Button onClick={() => setCreateModalOpen(true)} size="sm" className="gap-1.5 self-start sm:self-auto">
          <Plus size={15} />
          <span>Tạo trang mới</span>
        </Button>
      </div>

      {/* Pages List */}
      {loading ? (
        <div className="py-12 text-center text-xs text-[var(--text-muted)] animate-pulse">
          Đang tải danh sách trang...
        </div>
      ) : pages.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-[var(--bg-surface)] border border-dashed border-[var(--border-color)] rounded-2xl">
          <Compass size={32} className="mx-auto text-[var(--text-muted)] opacity-50" />
          <p className="text-xs text-[var(--text-muted)]">Chưa có trang nào được tạo.</p>
          <Button size="sm" variant="outline" onClick={() => setCreateModalOpen(true)}>
            Tạo trang đầu tiên với Trình dựng khối
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pages.map((p) => (
            <div
              key={p.id}
              className="flex flex-col bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-5 space-y-3 hover:border-[var(--text-secondary)] transition-all shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 min-w-0">
                  <h3 className="font-bold text-sm text-[var(--text-primary)] truncate">
                    {p.title}
                  </h3>
                  <p className="text-[11px] text-[var(--text-muted)] font-mono">
                    /p/{p.slug}
                  </p>
                </div>
                <VisibilityBadge visibility={p.visibility} />
              </div>

              <p className="text-xs text-[var(--text-secondary)] line-clamp-2">
                {p.description || 'Chưa có mô tả cho trang này.'}
              </p>

              <div className="pt-2 border-t border-[var(--border-color)] flex items-center justify-between mt-auto">
                <StatusBadge status={p.status} />

                <div className="flex items-center gap-1.5">
                  <Link href={`/admin/pages/${p.id}/builder`}>
                    <Button size="sm" className="gap-1 text-xs py-1 px-2.5">
                      <LayoutTemplate size={13} />
                      <span>Mở Builder</span>
                    </Button>
                  </Link>

                  {p.status === 'PUBLISHED' && p.visibility === 'PUBLIC' && (
                    <Link href={`/p/${p.slug}`} target="_blank">
                      <Button size="icon" variant="ghost" title="Xem trang ngoài">
                        <ExternalLink size={14} />
                      </Button>
                    </Link>
                  )}

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDelete(p.id, p.title)}
                    className="hover:text-red-600"
                    title="Xóa trang"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Page Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent
          title="Tạo trang mới"
          description="Thiết lập tiêu đề và mô tả ban đầu cho trang web."
          className="max-w-md"
        >
          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            {error && <p className="text-xs text-[var(--danger)] font-medium p-2 bg-red-50 dark:bg-red-950/20 rounded">{error}</p>}

            <Input
              label="Tiêu đề trang *"
              placeholder="VD: Giới thiệu & Triết lý Thiết kế"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />

            <Textarea
              label="Mô tả ngắn"
              placeholder="Tóm tắt nội dung của trang..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                Mức độ hiển thị ban đầu
              </label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as Visibility)}
                className="w-full px-3 py-2 text-sm bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-[var(--radius-md,0.625rem)] outline-none"
              >
                <option value="PRIVATE">○ Riêng tư (Private)</option>
                <option value="PUBLIC">● Công khai (Public)</option>
                <option value="UNLISTED">◐ Không liệt kê (Unlisted)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-color)]">
              <Button type="button" variant="outline" size="sm" onClick={() => setCreateModalOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" size="sm" isLoading={submitting}>
                Tạo và mở Builder
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
