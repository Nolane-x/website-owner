'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  ExternalLink, 
  Share2, 
  Check, 
  Calendar, 
  Terminal, 
  Copy 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { marked } from 'marked';
import { sanitizeHtml } from '@/lib/security/sanitize';

interface BlockContent {
  text?: string;
  level?: number;
  markdown?: string;
  author?: string;
  url?: string;
  caption?: string;
  language?: string;
  code?: string;
  openInNewTab?: boolean;
  label?: string;
  title?: string;
  description?: string;
  link?: string;
  height?: number;
  [key: string]: unknown;
}

interface Block {
  id: string;
  blockType: string;
  sortOrder: number;
  content: BlockContent;
  settings?: Record<string, unknown>;
}

interface PublicPageDetail {
  id: string;
  title: string;
  slug: string;
  description?: string;
  publishedAt?: string;
}

export function CanvasPageClient({ slug }: { slug: string }) {
  const [page, setPage] = useState<PublicPageDetail | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  useEffect(() => {
    async function loadPage() {
      try {
        setLoading(true);
        const res = await fetch(`/api/public/pages/${slug}`);
        const data = await res.json();
        if (res.ok) {
          setPage(data.page);
          setBlocks(data.blocks || []);
        } else {
          setError(data.error || 'Trang không tồn tại.');
        }
      } catch {
        setError('Lỗi kết nối máy chủ.');
      } finally {
        setLoading(false);
      }
    }
    loadPage();
  }, [slug]);

  const copyUrl = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const copyCode = (id: string, text: string) => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(text);
      setCopiedCodeId(id);
      setTimeout(() => setCopiedCodeId(null), 2000);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-xs font-mono text-[var(--text-muted)]">
        Đang dựng trang Canvas...
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="py-24 text-center max-w-md mx-auto space-y-4">
        <h2 className="text-xl font-serif font-bold text-[var(--text-primary)]">
          Không tìm thấy trang
        </h2>
        <p className="text-xs text-[var(--text-secondary)]">
          {error || 'Trang này chưa được xuất bản hoặc không tồn tại.'}
        </p>
        <Link href="/">
          <Button variant="outline" size="sm">
            <ArrowLeft size={14} className="mr-1.5" /> Quay về Trang chủ
          </Button>
        </Link>
      </div>
    );
  }

  const renderBlock = (b: Block) => {
    const c = b.content || {};

    switch (b.blockType) {
      case 'heading': {
        const level = c.level || 2;
        const Tag = level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3';
        const sizeClass =
          level === 1
            ? 'text-3xl sm:text-4xl font-bold'
            : level === 2
            ? 'text-2xl sm:text-3xl font-bold'
            : 'text-xl sm:text-2xl font-bold';
        return (
          <Tag className={`${sizeClass} font-serif text-[var(--text-primary)] tracking-tight my-4`}>
            {c.text || ''}
          </Tag>
        );
      }

      case 'text':
      case 'markdown': {
        const textContent = c.text || c.markdown || '';
        const html = sanitizeHtml(marked.parse(textContent) as string);
        return (
          <div
            className="prose dark:prose-invert prose-stone max-w-none text-sm sm:text-base leading-relaxed my-3"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      }

      case 'quote': {
        return (
          <blockquote className="my-6 border-l-4 border-[var(--accent)] bg-[var(--bg-surface-subtle)] p-4 rounded-r-xl italic font-serif text-[var(--text-primary)]">
            <p className="text-base sm:text-lg">&ldquo;{c.text || ''}&rdquo;</p>
            {c.author && (
              <footer className="text-xs not-italic font-sans text-[var(--text-secondary)] mt-2">
                — {c.author}
              </footer>
            )}
          </blockquote>
        );
      }

      case 'code': {
        const codeText = c.code || '';
        const language = c.language || 'text';
        return (
          <div className="my-5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface-subtle)] overflow-hidden font-mono text-xs">
            <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-muted)]">
              <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase">
                <Terminal size={12} /> {language}
              </span>
              <button
                onClick={() => copyCode(b.id, codeText)}
                className="flex items-center gap-1 text-[11px] hover:text-[var(--text-primary)] transition-colors"
              >
                {copiedCodeId === b.id ? (
                  <>
                    <Check size={12} className="text-emerald-500" />
                    <span>Đã sao chép</span>
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    <span>Sao chép</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 overflow-x-auto text-[var(--text-primary)] leading-relaxed">
              <code>{codeText}</code>
            </pre>
          </div>
        );
      }

      case 'image': {
        return (
          <figure className="my-6 space-y-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={c.url}
              alt={c.caption || 'Hình ảnh tài liệu'}
              className="w-full rounded-xl border border-[var(--border-color)] object-cover max-h-[500px]"
            />
            {c.caption && (
              <figcaption className="text-center text-xs text-[var(--text-muted)] italic">
                {c.caption}
              </figcaption>
            )}
          </figure>
        );
      }

      case 'button': {
        return (
          <div className="my-4">
            <a
              href={c.url || '#'}
              target={c.openInNewTab ? '_blank' : undefined}
              rel="noreferrer"
            >
              <Button size="sm" className="flex items-center gap-1.5">
                <span>{c.label || 'Bấm vào đây'}</span>
                {c.openInNewTab && <ExternalLink size={12} />}
              </Button>
            </a>
          </div>
        );
      }

      case 'divider': {
        return <hr className="my-8 border-[var(--border-color)]" />;
      }

      case 'spacer': {
        const height = c.height || 24;
        return <div style={{ height: `${height}px` }} />;
      }

      case 'card': {
        return (
          <div className="my-4 p-5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] hover:border-[var(--accent)]/40 transition-all space-y-2">
            {c.title && (
              <h4 className="font-serif font-bold text-base text-[var(--text-primary)]">
                {c.title}
              </h4>
            )}
            {c.description && (
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {c.description}
              </p>
            )}
            {c.link && (
              <a
                href={c.link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-[var(--accent)] font-medium pt-1"
              >
                Mở liên kết <ExternalLink size={11} />
              </a>
            )}
          </div>
        );
      }

      default:
        return (
          <div className="my-2 p-3 rounded-lg border border-[var(--border-color)] text-xs text-[var(--text-muted)]">
            Khối: {b.blockType}
          </div>
        );
    }
  };

  return (
    <article className="max-w-3xl mx-auto space-y-8">
      {/* Top Navigation */}
      <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft size={14} /> Trang chủ
        </Link>

        <button
          onClick={copyUrl}
          className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          {copied ? <Check size={14} className="text-emerald-500" /> : <Share2 size={14} />}
          <span>{copied ? 'Đã sao chép' : 'Chia sẻ'}</span>
        </button>
      </div>

      {/* Page Header */}
      <header className="space-y-3">
        <h1 className="text-3xl sm:text-5xl font-serif font-bold text-[var(--text-primary)] tracking-tight">
          {page.title}
        </h1>
        {page.description && (
          <p className="text-base text-[var(--text-secondary)] leading-relaxed font-sans">
            {page.description}
          </p>
        )}
        {page.publishedAt && (
          <div className="text-xs text-[var(--text-muted)] flex items-center gap-1 pt-1">
            <Calendar size={12} />
            <span>Xuất bản: {new Date(page.publishedAt).toLocaleDateString('vi-VN')}</span>
          </div>
        )}
      </header>

      {/* Render Blocks */}
      <div className="pt-4 border-t border-[var(--border-color)] space-y-2">
        {blocks.length === 0 ? (
          <div className="py-12 text-center text-xs text-[var(--text-muted)] italic">
            Trang này chưa có nội dung khối nào.
          </div>
        ) : (
          blocks.map((b) => <div key={b.id}>{renderBlock(b)}</div>)
        )}
      </div>
    </article>
  );
}
