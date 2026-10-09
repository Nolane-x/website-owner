'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent } from './dialog';
import { Button } from './button';
import { Input } from './input';
import { Textarea } from './textarea';
import { FileText, FolderGit2, Bookmark, Compass, Link2 } from 'lucide-react';
import { Visibility } from '@/lib/types';

export function QuickAddModal({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const [type, setType] = useState<'note' | 'project' | 'resource' | 'link' | 'page'>('note');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [provider, setProvider] = useState('Google Drive');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('PRIVATE');
  const [isPublishImmediately, setIsPublishImmediately] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const typeTabs = [
    { id: 'note', label: 'Ghi chú', icon: FileText },
    { id: 'link', label: 'Liên kết', icon: Link2 },
    { id: 'resource', label: 'Tài nguyên', icon: Bookmark },
    { id: 'project', label: 'Dự án', icon: FolderGit2 },
    { id: 'page', label: 'Trang mới', icon: Compass },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Vui lòng nhập tiêu đề.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const parsedTags = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const status = isPublishImmediately ? 'PUBLISHED' : 'DRAFT';
      const finalVisibility = isPublishImmediately ? 'PUBLIC' : visibility;

      if (type === 'page') {
        const res = await fetch('/api/admin/pages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            description,
            visibility: finalVisibility,
            status,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Lỗi khi tạo trang');
      } else {
        const metadata: Record<string, unknown> = {};
        if (type === 'resource' || type === 'link') {
          metadata.url = url;
          metadata.provider = provider;
          metadata.downloadAllowed = true;
          metadata.openInNewTab = true;
        }

        const res = await fetch('/api/admin/content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            type,
            description,
            content: description,
            visibility: finalVisibility,
            status,
            tags: parsedTags,
            metadata,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Lỗi khi lưu nội dung');
      }

      // Reset form
      setTitle('');
      setUrl('');
      setDescription('');
      setTags('');
      setIsPublishImmediately(false);
      onOpenChange(false);
      onSuccess?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể lưu nội dung. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Thêm nhanh (Quick Capture)"
        description="Lưu nhanh ý tưởng, liên kết, dự án hoặc tài nguyên chỉ trong vài giây."
      >
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Chọn loại nội dung */}
          <div className="flex items-center gap-1.5 p-1 bg-[var(--bg-surface-subtle)] rounded-[var(--radius-md,0.625rem)] border border-[var(--border-color)]">
            {typeTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = type === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setType(tab.id as 'note' | 'project' | 'resource' | 'link' | 'page')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-medium rounded-md transition-all ${
                    isActive
                      ? 'bg-[var(--bg-surface)] text-[var(--accent)] shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {error && <p className="text-xs text-[var(--danger)] font-medium">{error}</p>}

          <Input
            label="Tiêu đề *"
            placeholder={
              type === 'note'
                ? 'Ý tưởng bài viết, ghi chép nhanh...'
                : type === 'resource'
                ? 'Tài liệu Google Drive, Nghiên cứu...'
                : type === 'project'
                ? 'Tên dự án mới...'
                : 'Tiêu đề...'
            }
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />

          {(type === 'resource' || type === 'link') && (
            <div className="space-y-3">
              <Input
                label="Đường dẫn URL *"
                placeholder="https://drive.google.com/... hoặc https://github.com/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <div className="flex gap-2">
                {['Google Drive', 'GitHub', 'OneDrive', 'Mega', 'Web Link'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setProvider(p)}
                    className={`px-2.5 py-1 text-xs rounded-md border transition-all ${
                      provider === p
                        ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-light)]'
                        : 'border-[var(--border-color)] text-[var(--text-secondary)]'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Textarea
            label="Mô tả / Ghi chú vắn tắt"
            placeholder="Nội dung tóm tắt..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />

          <Input
            label="Thẻ phân loại (Tags, cách nhau bởi dấu phẩy)"
            placeholder="AI, LapTrinh, TaiLieu"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />

          {/* Visibility & Fast Publish */}
          <div className="flex items-center justify-between pt-2 border-t border-[var(--border-color)]">
            <div className="flex items-center gap-2">
              <label className="text-xs text-[var(--text-secondary)] font-medium">Hiển thị:</label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as Visibility)}
                disabled={isPublishImmediately}
                className="px-2 py-1 text-xs bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-md text-[var(--text-primary)] outline-none"
              >
                <option value="PRIVATE">○ Riêng tư (Private)</option>
                <option value="PUBLIC">● Công khai (Public)</option>
                <option value="UNLISTED">◐ Không liệt kê (Unlisted)</option>
              </select>
            </div>

            <label className="flex items-center gap-1.5 text-xs text-[var(--text-primary)] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isPublishImmediately}
                onChange={(e) => setIsPublishImmediately(e.target.checked)}
                className="rounded border-[var(--border-color)] text-[var(--accent)] focus:ring-[var(--border-focus)]"
              />
              <span>Xuất bản ngay</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Hủy
            </Button>
            <Button type="submit" size="sm" isLoading={loading}>
              Lưu ngay
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
