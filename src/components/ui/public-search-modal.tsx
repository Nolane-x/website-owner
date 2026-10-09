'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Search, FileText, FolderGit2, Bookmark, Compass, X, Loader2 } from 'lucide-react';
import { Badge } from './badge';

interface SearchResult {
  id: string;
  title: string;
  slug: string;
  type?: string;
  description?: string;
  resultType: 'content' | 'page';
}

export function PublicSearchModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) {
      setQuery('');
      setResults([]);
    }
  }

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/public/search?q=${encodeURIComponent(trimmed)}`);
        const data = (await res.json()) as { results?: SearchResult[] };
        if (res.ok) {
          setResults(data.results || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const displayedResults = query.trim() ? results : [];

  if (!open) return null;

  const getItemLink = (item: SearchResult) => {
    if (item.resultType === 'page') return `/p/${item.slug}`;
    if (item.type === 'PROJECT') return `/projects/${item.slug}`;
    if (item.type === 'RESOURCE') return `/resources`;
    return `/articles/${item.slug}`;
  };

  const getIcon = (item: SearchResult) => {
    if (item.resultType === 'page') return <Compass size={16} className="text-purple-500" />;
    if (item.type === 'PROJECT') return <FolderGit2 size={16} className="text-blue-500" />;
    if (item.type === 'RESOURCE') return <Bookmark size={16} className="text-emerald-500" />;
    return <FileText size={16} className="text-amber-500" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-150">
      <div 
        className="fixed inset-0" 
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-[var(--border-color)] gap-3 bg-[var(--bg-surface)]">
          <Search size={18} className="text-[var(--text-muted)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm kiếm bài viết, dự án, tài nguyên..."
            className="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-hidden"
          />
          {loading && <Loader2 size={16} className="animate-spin text-[var(--accent)] shrink-0" />}
          <button 
            onClick={onClose}
            className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
          {query.trim() === '' ? (
            <div className="py-8 text-center text-xs text-[var(--text-muted)]">
              Nhập từ khóa để tìm kiếm nội dung công khai đã xuất bản.
            </div>
          ) : loading ? (
            <div className="py-8 text-center text-xs text-[var(--text-muted)]">
              Đang tìm kiếm...
            </div>
          ) : displayedResults.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--text-muted)]">
              Không tìm thấy kết quả nào phù hợp với &ldquo;{query}&rdquo;.
            </div>
          ) : (
            displayedResults.map((item) => (
              <Link
                key={item.id}
                href={getItemLink(item)}
                onClick={onClose}
                className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-[var(--bg-surface-subtle)] transition-colors group"
              >
                <div className="mt-0.5 p-1.5 rounded bg-[var(--bg-surface-subtle)] group-hover:bg-[var(--bg-surface)]">
                  {getIcon(item)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] truncate">
                      {item.title}
                    </span>
                    <Badge variant="outline" className="text-[10px] py-0 px-1">
                      {item.resultType === 'page' ? 'Trang' : item.type || 'Nội dung'}
                    </Badge>
                  </div>
                  {item.description && (
                    <p className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">
                      {item.description}
                    </p>
                  )}
                </div>
              </Link>
            ))
          )}
        </div>

        <div className="px-4 py-2 border-t border-[var(--border-color)] bg-[var(--bg-surface-subtle)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
          <span>Tìm kiếm bảo mật theo thời gian thực</span>
          <span>ESC để đóng</span>
        </div>
      </div>
    </div>
  );
}
