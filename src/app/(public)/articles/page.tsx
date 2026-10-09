'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Search, ArrowRight, ArrowLeft, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Article {
  id: string;
  title: string;
  slug: string;
  type: string;
  description: string;
  category?: string;
  tags?: string[];
  publishedAt: string;
}

export default function PublicArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadArticles() {
      try {
        const res = await fetch('/api/public/content');
        const data = await res.json();
        if (res.ok) {
          // Chỉ lấy các nội dung dạng note hoặc article
          const list = (data.items || []).filter(
            (i: Article) => i.type !== 'project' && i.type !== 'resource' && i.type !== 'link'
          );
          setArticles(list);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadArticles();
  }, []);

  const filtered = useMemo(() => {
    let list = [...articles];
    if (selectedCategory !== 'all') {
      list = list.filter((a) => a.category?.toLowerCase() === selectedCategory.toLowerCase());
    }
    if (search.trim() !== '') {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.description?.toLowerCase().includes(q) ||
          a.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [selectedCategory, search, articles]);

  const categories = ['all', ...Array.from(new Set(articles.map((a) => a.category).filter(Boolean)))];

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b border-[var(--border-color)] pb-6 space-y-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft size={14} /> Quay về Trang chủ
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-[var(--text-primary)] tracking-tight">
              Bài Viết & Ghi Chép Công Khai
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Góc chia sẻ suy nghĩ, tài liệu kỹ thuật, kiến trúc và góc nhìn công nghệ.
            </p>
          </div>
          <div className="text-xs font-mono text-[var(--text-muted)]">
            Tổng cộng: {filtered.length} bài viết
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat as string)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-[var(--accent)] text-white font-semibold shadow-xs'
                  : 'bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {cat === 'all' ? 'Tất cả' : cat}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm bài viết..."
            className="pl-8 text-xs"
          />
        </div>
      </div>

      {/* Article List */}
      {loading ? (
        <div className="py-16 text-center text-xs font-mono text-[var(--text-muted)]">
          Đang tải danh sách bài viết...
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-color)] rounded-2xl">
          Chưa có bài viết nào trong danh mục này.
        </div>
      ) : (
        <div className="divide-y divide-[var(--border-color)]">
          {filtered.map((item) => (
            <article key={item.id} className="py-6 space-y-2 group">
              <div className="flex items-center gap-2">
                {item.category && (
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--accent)]">
                    {item.category}
                  </span>
                )}
                <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                  <Calendar size={11} />
                  {new Date(item.publishedAt).toLocaleDateString('vi-VN')}
                </span>
              </div>

              <h2 className="text-xl font-serif font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                <Link href={`/articles/${item.slug}`}>
                  {item.title}
                </Link>
              </h2>

              <p className="text-sm text-[var(--text-secondary)] leading-relaxed line-clamp-2 font-sans">
                {item.description || 'Không có bản xem trước mô tả.'}
              </p>

              <div className="pt-2 flex items-center justify-between">
                <div className="flex flex-wrap gap-1.5">
                  {(item.tags || []).map((t, idx) => (
                    <span key={idx} className="text-[11px] font-mono text-[var(--text-muted)]">
                      #{t}
                    </span>
                  ))}
                </div>

                <Link
                  href={`/articles/${item.slug}`}
                  className="text-xs font-semibold text-[var(--accent)] flex items-center gap-1 group-hover:translate-x-1 transition-transform"
                >
                  Đọc toàn văn <ArrowRight size={13} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
