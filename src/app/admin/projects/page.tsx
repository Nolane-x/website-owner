'use client';

import React, { useState, useEffect } from 'react';
import { FolderGit2, Plus, Edit, Trash2, Globe, ExternalLink, Eye } from 'lucide-react';
import { GithubIcon as Github } from '@/components/ui/github-icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { VisibilityBadge, StatusBadge } from '@/components/ui/badge';
import { ContentItem, Visibility, ContentStatus } from '@/lib/types';

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [demoUrl, setDemoUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [tags, setTags] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('PUBLIC');
  const [status, setStatus] = useState<ContentStatus>('PUBLISHED');
  const [isFeatured, setIsFeatured] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/content?type=project');
      if (res.ok) {
        const data = await res.json();
        setProjects(data.items || []);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách dự án:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const openCreateModal = () => {
    setEditingItem(null);
    setTitle('');
    setDescription('');
    setContent('');
    setCoverImage('');
    setDemoUrl('');
    setGithubUrl('');
    setTags('');
    setVisibility('PUBLIC');
    setStatus('PUBLISHED');
    setIsFeatured(true);
    setError('');
    setModalOpen(true);
  };

  const openEditModal = (item: ContentItem) => {
    setEditingItem(item);
    setTitle(item.title);
    setDescription(item.description || '');
    setContent(item.content || '');
    setCoverImage(item.coverImage || '');
    setDemoUrl((item.metadata as any)?.demoUrl || '');
    setGithubUrl((item.metadata as any)?.githubUrl || '');
    setTags((item.tags || []).join(', '));
    setVisibility(item.visibility);
    setStatus(item.status);
    setIsFeatured(item.isFeatured);
    setError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Vui lòng nhập tên dự án.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const parsedTags = tags.split(',').map((t) => t.trim()).filter(Boolean);
      const payload = {
        title,
        type: 'project',
        description,
        content,
        coverImage: coverImage || null,
        metadata: { demoUrl, githubUrl },
        tags: parsedTags,
        visibility,
        status,
        isFeatured,
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
        throw new Error(data.error || 'Lỗi lưu dự án');
      }

      setModalOpen(false);
      fetchProjects();
    } catch (err: any) {
      setError(err.message || 'Không thể lưu dự án.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, projTitle: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa dự án "${projTitle}"?`)) return;
    try {
      const res = await fetch(`/api/admin/content/${id}`, { method: 'DELETE' });
      if (res.ok) fetchProjects();
    } catch {
      alert('Không thể xóa dự án.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
            Quản lý Dự án (Projects & Portfolio)
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Trình bày các sản phẩm, phần mềm, nghiên cứu và sản phẩm kỹ thuật số của bạn.
          </p>
        </div>

        <Button onClick={openCreateModal} size="sm" className="gap-1.5 self-start sm:self-auto">
          <Plus size={15} />
          <span>Thêm dự án mới</span>
        </Button>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="py-12 text-center text-xs text-[var(--text-muted)] animate-pulse">
          Đang tải danh sách dự án...
        </div>
      ) : projects.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-[var(--bg-surface)] border border-dashed border-[var(--border-color)] rounded-2xl">
          <FolderGit2 size={32} className="mx-auto text-[var(--text-muted)] opacity-50" />
          <p className="text-xs text-[var(--text-muted)]">Chưa có dự án nào được tạo.</p>
          <Button size="sm" variant="outline" onClick={openCreateModal}>
            Thêm dự án đầu tiên
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((proj) => (
            <div
              key={proj.id}
              className="flex flex-col bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl overflow-hidden hover:border-[var(--text-secondary)] transition-all shadow-sm"
            >
              {proj.coverImage && (
                <div className="h-36 w-full overflow-hidden bg-[var(--bg-surface-subtle)]">
                  <img
                    src={proj.coverImage}
                    alt={proj.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-[var(--text-primary)] truncate">
                      {proj.title}
                    </span>
                    <VisibilityBadge visibility={proj.visibility} />
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] line-clamp-2">
                    {proj.description || 'Chưa có mô tả'}
                  </p>
                </div>

                <div className="pt-2 border-t border-[var(--border-color)] flex items-center justify-between text-xs">
                  <StatusBadge status={proj.status} />

                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openEditModal(proj)}
                      title="Chỉnh sửa"
                    >
                      <Edit size={14} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(proj.id, proj.title)}
                      className="hover:text-red-600"
                      title="Xóa"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Add / Edit Project */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent
          title={editingItem ? 'Chỉnh sửa dự án' : 'Tạo dự án mới'}
          description="Điền thông tin và liên kết sản phẩm, mã nguồn để giới thiệu."
          className="max-w-xl"
        >
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {error && <p className="text-xs text-[var(--danger)] font-medium p-2 bg-red-50 dark:bg-red-950/20 rounded">{error}</p>}

            <Input
              label="Tên dự án *"
              placeholder="VD: Personal Web OS"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />

            <Input
              label="Ảnh bìa (URL)"
              placeholder="https://images.unsplash.com/..."
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
            />

            <Textarea
              label="Mô tả tóm tắt"
              placeholder="Tóm tắt tính năng và giá trị của dự án..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Đường dẫn Demo (Live URL)"
                placeholder="https://..."
                value={demoUrl}
                onChange={(e) => setDemoUrl(e.target.value)}
              />
              <Input
                label="Mã nguồn (GitHub URL)"
                placeholder="https://github.com/..."
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
              />
            </div>

            <Textarea
              label="Nội dung chi tiết (Markdown)"
              placeholder="## Giới thiệu chi tiết..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
            />

            <Input
              label="Thẻ phân loại (Tags)"
              placeholder="React, Next.js, Postgres"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />

            <div className="flex items-center justify-between pt-2 border-t border-[var(--border-color)]">
              <div className="flex items-center gap-3">
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as Visibility)}
                  className="px-2 py-1 text-xs bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-md text-[var(--text-primary)]"
                >
                  <option value="PUBLIC">● Công khai (Public)</option>
                  <option value="PRIVATE">○ Riêng tư (Private)</option>
                  <option value="UNLISTED">◐ Không liệt kê</option>
                </select>

                <label className="flex items-center gap-1.5 text-xs text-[var(--text-primary)] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={status === 'PUBLISHED'}
                    onChange={(e) => setStatus(e.target.checked ? 'PUBLISHED' : 'DRAFT')}
                    className="rounded border-[var(--border-color)] text-[var(--accent)]"
                  />
                  <span>Xuất bản</span>
                </label>
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" size="sm" isLoading={submitting}>
                  {editingItem ? 'Lưu thay đổi' : 'Tạo dự án'}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
