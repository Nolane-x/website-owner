'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Lock, Calendar, Tag, Share2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { marked } from 'marked';
import { sanitizeHtml } from '@/lib/security/sanitize';

export function UnlistedShareClient({ token }: { token: string }) {
  const [item, setItem] = useState<any>(null);
  const [itemType, setItemType] = useState<string>('content');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadUnlistedItem() {
      try {
        setLoading(true);
        const res = await fetch(`/api/public/unlisted/${token}`);
        const data = await res.json();
        if (res.ok) {
          setItem(data.item);
          setItemType(data.itemType || 'content');
        } else {
          setError(data.error || 'Nội dung chia sẻ không tồn tại.');
        }
      } catch {
        setError('Không thể kết nối đến máy chủ.');
      } finally {
        setLoading(false);
      }
    }
    loadUnlistedItem();
  }, [token]);

  const copyUrl = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-xs font-mono text-[var(--text-muted)]">
        Đang giải mã liên kết chia sẻ...
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="py-24 text-center max-w-md mx-auto space-y-4">
        <h2 className="text-xl font-serif font-bold text-[var(--text-primary)]">
          Liên kết không hợp lệ hoặc đã thu hồi
        </h2>
        <p className="text-xs text-[var(--text-secondary)]">
          {error || 'Nội dung chia sẻ bí mật này có thể đã bị chủ sở hữu hủy liên kết.'}
        </p>
        <Link href="/">
          <Button variant="outline" size="sm">
            <ArrowLeft size={14} className="mr-1.5" /> Quay về Trang chủ
          </Button>
        </Link>
      </div>
    );
  }

  const rawHtml = item.content ? (marked.parse(item.content) as string) : '';
  const cleanHtml = sanitizeHtml(rawHtml);

  return (
    <article className="max-w-3xl mx-auto space-y-8">
      {/* Privacy Notice Banner */}
      <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Lock size={15} className="shrink-0" />
          <span>
            <strong>Liên kết Không Công Khai (Unlisted):</strong> Trang này không hiển thị trên danh mục tìm kiếm công cộng.
          </span>
        </div>
        <button
          onClick={copyUrl}
          className="flex items-center gap-1 font-semibold hover:underline shrink-0 ml-2"
        >
          {copied ? <Check size={13} /> : <Share2 size={13} />}
          <span>{copied ? 'Đã chép link' : 'Sao chép link'}</span>
        </button>
      </div>

      {/* Header */}
      <header className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-mono uppercase">
            {item.category || itemType}
          </Badge>
          {item.createdAt && (
            <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
              <Calendar size={12} />
              {new Date(item.createdAt).toLocaleDateString('vi-VN')}
            </span>
          )}
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-[var(--text-primary)] tracking-tight">
          {item.title}
        </h1>

        {item.description && (
          <p className="text-base text-[var(--text-secondary)] leading-relaxed italic border-l-2 border-[var(--accent)] pl-4 py-1">
            {item.description}
          </p>
        )}
      </header>

      {/* Content Render */}
      {cleanHtml ? (
        <div
          className="prose dark:prose-invert prose-stone max-w-none pt-6 border-t border-[var(--border-color)] text-sm sm:text-base leading-relaxed space-y-4"
          dangerouslySetInnerHTML={{ __html: cleanHtml }}
        />
      ) : (
        <div className="pt-6 border-t border-[var(--border-color)] text-xs text-[var(--text-muted)] italic">
          Nội dung đang được cập nhật.
        </div>
      )}

      {/* Footer Tags */}
      {item.tags && item.tags.length > 0 && (
        <footer className="pt-6 border-t border-[var(--border-color)] flex items-center gap-2 flex-wrap">
          <Tag size={13} className="text-[var(--text-muted)]" />
          {item.tags.map((t: string, idx: number) => (
            <span
              key={idx}
              className="text-xs font-mono px-2.5 py-1 rounded-md bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-color)]"
            >
              #{t}
            </span>
          ))}
        </footer>
      )}
    </article>
  );
}
