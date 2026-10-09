'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Globe, ArrowRight, ArrowLeft } from 'lucide-react';
import { GithubIcon as Github } from '@/components/ui/github-icon';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface Project {
  id: string;
  title: string;
  slug: string;
  description: string;
  tags?: string[];
  category?: string;
  metadata?: Record<string, unknown>;
  isFeatured?: boolean;
  publishedAt: string;
}

export default function PublicProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProjects() {
      try {
        setLoading(true);
        const res = await fetch('/api/public/projects');
        const data = await res.json();
        if (res.ok) {
          setProjects(data.projects || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadProjects();
  }, []);

  const filteredProjects = React.useMemo(() => {
    let result = [...projects];

    if (selectedCategory !== 'all') {
      result = result.filter((p) => p.category?.toLowerCase() === selectedCategory.toLowerCase());
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }

    return result;
  }, [projects, selectedCategory, searchQuery]);

  const categories = ['all', ...Array.from(new Set(projects.map((p) => p.category).filter(Boolean)))];

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
              Dự Án & Tác Phẩm Kỹ Thuật
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Tuyển tập các ứng dụng, hệ thống và mã nguồn mở được phát triển bởi chủ sở hữu.
            </p>
          </div>
          <div className="text-xs font-mono text-[var(--text-muted)]">
            Tổng cộng: {filteredProjects.length} dự án
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
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
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên hoặc tag..."
            className="pl-8 text-xs"
          />
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="py-16 text-center text-xs font-mono text-[var(--text-muted)]">
          Đang tải dữ liệu dự án...
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="py-16 text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-color)] rounded-2xl">
          Không tìm thấy dự án nào phù hợp với bộ lọc hiện tại.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredProjects.map((proj) => (
            <div
              key={proj.id}
              className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] hover:border-[var(--accent)]/50 hover:shadow-md transition-all flex flex-col justify-between space-y-5 group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {proj.category || 'Engineering'}
                  </Badge>
                  <div className="flex items-center gap-2">
                    {typeof proj.metadata?.repoUrl === 'string' && (
                      <a
                        href={proj.metadata.repoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                        title="Kho mã nguồn GitHub"
                      >
                        <Github size={15} />
                      </a>
                    )}
                    {typeof proj.metadata?.demoUrl === 'string' && (
                      <a
                        href={proj.metadata.demoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                        title="Bản thử nghiệm trực tiếp"
                      >
                        <Globe size={15} />
                      </a>
                    )}
                  </div>
                </div>

                <h2 className="text-xl font-serif font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                  <Link href={`/projects/${proj.slug}`}>
                    {proj.title}
                  </Link>
                </h2>

                <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-3">
                  {proj.description || 'Không có mô tả chi tiết cho dự án này.'}
                </p>
              </div>

              <div className="pt-4 border-t border-[var(--border-color)]/70 flex items-center justify-between">
                <div className="flex flex-wrap gap-1.5">
                  {(proj.tags || []).map((t, idx) => (
                    <span key={idx} className="text-[10px] font-mono text-[var(--text-muted)]">
                      #{t}
                    </span>
                  ))}
                </div>

                <Link
                  href={`/projects/${proj.slug}`}
                  className="text-xs font-semibold text-[var(--accent)] flex items-center gap-1 group-hover:translate-x-1 transition-transform"
                >
                  Xem bài viết <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
