'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Share2, 
  Check, 
  Tag, 
  ChevronRight 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { marked } from 'marked';
import { sanitizeHtml } from '@/lib/security/sanitize';

interface ArticleData {
  id: string;
  title: string;
  slug: string;
  description?: string;
  content?: string;
  category?: string;
  tags?: string[];
  publishedAt?: string;
}

export function ArticleDetailClient({ slug }: { slug: string }) {
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadArticle() {
      try {
        setLoading(true);
        const res = await fetch(`/api/public/content/${slug}`);
        const data = await res.json();
        if (res.ok) {
          setArticle(data.item);
        } else {
          setError(data.error || 'Bài viết không tồn tại.');
        }
      } catch {
        setError('Lỗi kết nối máy chủ.');
      } finally {
        setLoading(false);
      }
    }
    loadArticle();
  }, [slug]);

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
        Đang tải nội dung bài viết...
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="py-24 text-center max-w-md mx-auto space-y-4">
        <h2 className="text-xl font-serif font-bold text-[var(--text-primary)]">
          Không tìm thấy bài viết
        </h2>
        <p className="text-xs text-[var(--text-secondary)]">
          {error || 'Nội dung này chưa được xuất bản hoặc không tồn tại.'}
        </p>
        <Link href="/articles">
          <Button variant="outline" size="sm">
            <ArrowLeft size={14} className="mr-1.5" /> Quay về danh sách bài viết
          </Button>
        </Link>
      </div>
    );
  }

  const rawHtml = article.content ? (marked.parse(article.content) as string) : '';
  const cleanHtml = sanitizeHtml(rawHtml);

  // Estimate reading time (~200 words/min)
  const wordCount = (article.content || '').split(/\s+/).length;
  const readMinutes = Math.max(1, Math.round(wordCount / 200));

  return (
    <article className="max-w-3xl mx-auto space-y-10">
      {/* Breadcrumb / Top Bar */}
      <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-4">
        <nav className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
          <Link href="/articles" className="hover:text-[var(--text-primary)] transition-colors">
            Bài viết
          </Link>
          <ChevronRight size={12} />
          <span className="text-[var(--text-primary)] truncate max-w-[200px] sm:max-w-xs font-medium">
            {article.title}
          </span>
        </nav>

        <button
          onClick={copyUrl}
          className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          {copied ? <Check size={14} className="text-emerald-500" /> : <Share2 size={14} />}
          <span>{copied ? 'Đã sao chép liên kết' : 'Chia sẻ'}</span>
        </button>
      </div>

      {/* Header */}
      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {article.category && (
            <Badge variant="outline" className="text-xs font-mono uppercase">
              {article.category}
            </Badge>
          )}
          {article.publishedAt && (
            <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
              <Calendar size={12} />
              {new Date(article.publishedAt).toLocaleDateString('vi-VN')}
            </span>
          )}
          <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
            <Clock size={12} />
            Khoảng {readMinutes} phút đọc
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-[var(--text-primary)] tracking-tight leading-[1.2]">
          {article.title}
        </h1>

        {article.description && (
          <p className="text-base text-[var(--text-secondary)] leading-relaxed italic border-l-2 border-[var(--accent)] pl-4 py-1">
            {article.description}
          </p>
        )}
      </header>

      {/* Main Content Render */}
      <div
        className="prose dark:prose-invert prose-stone max-w-none pt-6 border-t border-[var(--border-color)] text-sm sm:text-base leading-relaxed space-y-4"
        dangerouslySetInnerHTML={{ __html: cleanHtml }}
      />

      {/* Footer Tags & Share */}
      <footer className="pt-8 border-t border-[var(--border-color)] space-y-6">
        {article.tags && article.tags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Tag size={14} className="text-[var(--text-muted)]" />
            {article.tags.map((t: string, idx: number) => (
              <span
                key={idx}
                className="text-xs font-mono px-2.5 py-1 rounded-md bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-color)]"
              >
                #{t}
              </span>
            ))}
          </div>
        )}

        <div className="p-6 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface-subtle)] flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-[var(--text-primary)]">Tác phẩm cá nhân</div>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              Được xuất bản từ Personal Web OS của chủ sở hữu.
            </p>
          </div>
          <Link href="/articles">
            <Button variant="outline" size="sm" className="text-xs">
              <ArrowLeft size={13} className="mr-1" /> Danh sách bài viết
            </Button>
          </Link>
        </div>
      </footer>
    </article>
  );
}
