'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Layers, 
  ExternalLink, 
  FileText, 
  FolderGit2, 
  Bookmark, 
  ArrowRight,
  Share2,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function CollectionDetailClient({ slug }: { slug: string }) {
  const [collection, setCollection] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadCollection() {
      try {
        setLoading(true);
        const res = await fetch(`/api/public/collections/${slug}`);
        const data = await res.json();
        if (res.ok) {
          setCollection(data.collection);
          setItems(data.items || []);
        } else {
          setError(data.error || 'Bộ sưu tập không tồn tại.');
        }
      } catch {
        setError('Lỗi kết nối máy chủ.');
      } finally {
        setLoading(false);
      }
    }
    loadCollection();
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
        Đang tải bộ sưu tập...
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className="py-24 text-center max-w-md mx-auto space-y-4">
        <h2 className="text-xl font-serif font-bold text-[var(--text-primary)]">
          Không tìm thấy bộ sưu tập
        </h2>
        <p className="text-xs text-[var(--text-secondary)]">
          {error || 'Bộ sưu tập này chưa xuất bản hoặc không tồn tại.'}
        </p>
        <Link href="/collections">
          <Button variant="outline" size="sm">
            <ArrowLeft size={14} className="mr-1.5" /> Danh sách bộ sưu tập
          </Button>
        </Link>
      </div>
    );
  }

  const getItemLink = (item: any) => {
    if (item.type === 'project') return `/projects/${item.slug}`;
    if (item.type === 'resource' || item.type === 'link') return item.metadata?.url || `/resources`;
    return `/articles/${item.slug}`;
  };

  const getItemIcon = (type: string) => {
    if (type === 'project') return <FolderGit2 size={16} className="text-blue-500" />;
    if (type === 'resource' || type === 'link') return <Bookmark size={16} className="text-emerald-500" />;
    return <FileText size={16} className="text-amber-500" />;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-4">
        <Link
          href="/collections"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft size={14} /> Tất cả bộ sưu tập
        </Link>

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
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-[var(--accent-light)] text-[var(--accent)]">
            <Layers size={20} />
          </div>
          <span className="text-xs font-mono uppercase tracking-wider text-[var(--accent)]">
            Bộ sưu tập chuyên đề
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[var(--text-primary)] tracking-tight">
          {collection.name}
        </h1>

        {collection.description && (
          <p className="text-base text-[var(--text-secondary)] leading-relaxed max-w-2xl font-sans">
            {collection.description}
          </p>
        )}
      </header>

      {/* Item List */}
      <section className="space-y-4 pt-4 border-t border-[var(--border-color)]">
        <h2 className="text-lg font-serif font-bold text-[var(--text-primary)]">
          Nội dung trong bộ sưu tập ({items.length})
        </h2>

        {items.length === 0 ? (
          <div className="py-12 text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-color)] rounded-xl">
            Chưa có mục nào được công khai trong bộ sưu tập này.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {items.map((item) => {
              const link = getItemLink(item);
              const isExternal = item.type === 'resource' || item.type === 'link';

              return (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] hover:border-[var(--accent)]/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-[var(--bg-surface-subtle)] mt-0.5">
                      {getItemIcon(item.type)}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={link}
                          target={isExternal ? '_blank' : undefined}
                          className="font-serif font-bold text-base text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors"
                        >
                          {item.title}
                        </Link>
                        <Badge variant="outline" className="text-[10px] uppercase font-mono">
                          {item.type}
                        </Badge>
                      </div>
                      {item.description && (
                        <p className="text-xs text-[var(--text-secondary)] line-clamp-2 max-w-xl">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <Link
                    href={link}
                    target={isExternal ? '_blank' : undefined}
                    className="self-end sm:self-center text-xs font-semibold text-[var(--accent)] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform shrink-0"
                  >
                    <span>{isExternal ? 'Mở liên kết' : 'Xem chi tiết'}</span>
                    {isExternal ? <ExternalLink size={12} /> : <ArrowRight size={12} />}
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
