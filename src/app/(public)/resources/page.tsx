'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Bookmark, 
  ExternalLink, 
  Search, 
  ArrowLeft, 
  HardDrive, 
  Globe, 
  FileCode, 
  FolderDown,
  Layers
} from 'lucide-react';
import { GithubIcon as Github } from '@/components/ui/github-icon';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface Resource {
  id: string;
  title: string;
  slug: string;
  type: string;
  description: string;
  category?: string;
  tags?: string[];
  metadata?: any;
  publishedAt: string;
}

export default function PublicResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [filtered, setFiltered] = useState<Resource[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadResources() {
      try {
        setLoading(true);
        const res = await fetch('/api/public/resources');
        const data = await res.json();
        if (res.ok) {
          setResources(data.resources || []);
          setFiltered(data.resources || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadResources();
  }, []);

  useEffect(() => {
    let list = [...resources];
    if (selectedCat !== 'all') {
      list = list.filter((r) => r.category?.toLowerCase() === selectedCat.toLowerCase());
    }
    if (search.trim() !== '') {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.description?.toLowerCase().includes(q) ||
          r.category?.toLowerCase().includes(q) ||
          r.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }
    setFiltered(list);
  }, [selectedCat, search, resources]);

  const categories = ['all', ...Array.from(new Set(resources.map((r) => r.category).filter(Boolean)))];

  const getProviderIcon = (provider?: string) => {
    const p = provider?.toLowerCase() || '';
    if (p.includes('github')) return <Github size={16} className="text-zinc-400" />;
    if (p.includes('drive') || p.includes('google')) return <HardDrive size={16} className="text-blue-500" />;
    if (p.includes('mega')) return <FolderDown size={16} className="text-red-500" />;
    return <Globe size={16} className="text-emerald-500" />;
  };

  return (
    <div className="space-y-8">
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
              Thư Viện Tài Nguyên Tuyển Chọn
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Liên kết mở tới công cụ, tài liệu, kho lưu trữ đám mây và nguồn học tập giá trị.
            </p>
          </div>
          <div className="text-xs font-mono text-[var(--text-muted)]">
            Tổng cộng: {filtered.length} tài nguyên
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCat(cat as string)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all whitespace-nowrap ${
                selectedCat === cat
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
            placeholder="Tìm tài nguyên..."
            className="pl-8 text-xs"
          />
        </div>
      </div>

      {/* Resource Grid */}
      {loading ? (
        <div className="py-16 text-center text-xs font-mono text-[var(--text-muted)]">
          Đang tải danh sách tài nguyên...
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-color)] rounded-2xl">
          Không có tài nguyên nào phù hợp với bộ lọc hiện tại.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((item) => {
            const url = item.metadata?.url || '#';
            const provider = item.metadata?.provider || 'Web';

            return (
              <a
                key={item.id}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="p-5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] hover:border-[var(--accent)]/50 hover:bg-[var(--bg-surface-subtle)] transition-all flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getProviderIcon(provider)}
                      <span className="text-[11px] font-mono font-medium text-[var(--text-muted)]">
                        {provider}
                      </span>
                    </div>
                    {item.category && (
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                        {item.category}
                      </Badge>
                    )}
                  </div>

                  <h2 className="text-base font-serif font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors leading-snug">
                    {item.title}
                  </h2>

                  <p className="text-xs text-[var(--text-secondary)] line-clamp-3 leading-relaxed">
                    {item.description || 'Không có mô tả bổ sung.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-[var(--border-color)]/70 flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span className="text-[10px] font-mono">
                    {new Date(item.publishedAt).toLocaleDateString('vi-VN')}
                  </span>
                  <span className="text-[11px] font-medium text-[var(--accent)] flex items-center gap-1 group-hover:underline">
                    Truy cập <ExternalLink size={12} />
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
