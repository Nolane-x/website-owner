'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowRight, 
  ExternalLink, 
  FolderGit2, 
  Bookmark, 
  FileText, 
  Sparkles, 
  Layers, 
  Compass, 
  Terminal, 
  HardDrive,
  Globe
} from 'lucide-react';
import { GithubIcon as Github } from '@/components/ui/github-icon';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ProjectItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  coverImage?: string;
  tags?: string[];
  category?: string;
  metadata?: any;
  isFeatured?: boolean;
}

interface ResourceItem {
  id: string;
  title: string;
  slug: string;
  type: string;
  description: string;
  category?: string;
  metadata?: any;
  publishedAt: string;
}

interface ContentItem {
  id: string;
  title: string;
  slug: string;
  type: string;
  description: string;
  category?: string;
  tags?: string[];
  publishedAt: string;
}

export default function PublicHomePage() {
  const [profile, setProfile] = useState<any>(null);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [articles, setArticles] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [siteRes, projRes, resRes, contRes] = await Promise.all([
          fetch('/api/public/site'),
          fetch('/api/public/projects'),
          fetch('/api/public/resources'),
          fetch('/api/public/content?limit=5'),
        ]);

        if (siteRes.ok) {
          const siteData = await siteRes.json();
          setProfile(siteData.profile);
        }
        if (projRes.ok) {
          const projData = await projRes.json();
          setProjects((projData.projects || []).slice(0, 4));
        }
        if (resRes.ok) {
          const resData = await resRes.json();
          setResources((resData.resources || []).slice(0, 6));
        }
        if (contRes.ok) {
          const contData = await contRes.json();
          // Lọc ra các bài viết hoặc ghi chú (không phải project)
          const arts = (contData.items || []).filter((i: any) => i.type !== 'project' && i.type !== 'resource');
          setArticles(arts.slice(0, 5));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="space-y-16 md:space-y-24">
      {/* 1. HERO SECTION */}
      <section className="pt-6 md:pt-12 pb-8 border-b border-[var(--border-color)] space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--border-color)] bg-[var(--bg-surface)] text-xs text-[var(--text-secondary)]">
          <Sparkles size={13} className="text-[var(--accent)]" />
          <span>Chào mừng bạn đến với Không gian số cá nhân</span>
        </div>

        <div className="space-y-4 max-w-3xl">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-serif font-bold text-[var(--text-primary)] tracking-tight leading-[1.15]">
            {profile?.displayName ? `${profile.displayName}` : 'Hệ Điều Hành Web Cá Nhân'}
          </h1>
          <p className="text-base sm:text-lg text-[var(--text-secondary)] font-sans leading-relaxed max-w-2xl">
            {profile?.bio || 'Nơi lưu trữ, tuyển chọn tri thức, dự án kỹ thuật và tài nguyên mở được xuất bản công khai có kiểm duyệt.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Link href="/projects">
            <Button className="flex items-center gap-2">
              <FolderGit2 size={16} /> Xem Dự Án
            </Button>
          </Link>
          <Link href="/articles">
            <Button variant="outline" className="flex items-center gap-2">
              <FileText size={16} /> Đọc Bài Viết
            </Button>
          </Link>
          <Link href="/resources">
            <Button variant="ghost" className="flex items-center gap-2 text-[var(--text-secondary)]">
              <Bookmark size={16} /> Thư Viện Tài Nguyên
            </Button>
          </Link>
        </div>
      </section>

      {/* 2. FEATURED PROJECTS SECTION */}
      <section className="space-y-6">
        <div className="flex items-end justify-between border-b border-[var(--border-color)] pb-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[var(--accent)]">
              <FolderGit2 size={14} /> Dự Án Kỹ Thuật
            </div>
            <h2 className="text-2xl font-serif font-bold text-[var(--text-primary)] mt-1">
              Các Dự Án Nổi Bật
            </h2>
          </div>
          <Link 
            href="/projects" 
            className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--accent)] flex items-center gap-1 group"
          >
            Xem tất cả dự án <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-[var(--text-muted)] font-mono">Đang tải danh sách dự án...</div>
        ) : projects.length === 0 ? (
          <div className="p-8 text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-color)] rounded-xl">
            Chưa có dự án nào được xuất bản công khai.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {projects.map((proj) => (
              <div 
                key={proj.id}
                className="group p-6 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] hover:border-[var(--accent)]/50 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {proj.category || 'Engineering'}
                    </Badge>
                    {proj.metadata?.repoUrl && (
                      <a 
                        href={proj.metadata.repoUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        title="Xem mã nguồn GitHub"
                      >
                        <Github size={15} />
                      </a>
                    )}
                  </div>

                  <h3 className="text-lg font-serif font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                    <Link href={`/projects/${proj.slug}`}>
                      {proj.title}
                    </Link>
                  </h3>

                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-2">
                    {proj.description || 'Không có mô tả chi tiết.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-[var(--border-color)]/60 flex items-center justify-between">
                  <div className="flex flex-wrap gap-1.5">
                    {(proj.tags || []).slice(0, 3).map((t, idx) => (
                      <span key={idx} className="text-[10px] font-mono text-[var(--text-muted)]">
                        #{t}
                      </span>
                    ))}
                  </div>

                  <Link 
                    href={`/projects/${proj.slug}`}
                    className="text-xs font-semibold text-[var(--accent)] flex items-center gap-1 group-hover:underline"
                  >
                    Chi tiết <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. CURATED RESOURCES SECTION */}
      <section className="space-y-6">
        <div className="flex items-end justify-between border-b border-[var(--border-color)] pb-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[var(--accent)]">
              <Bookmark size={14} /> Thư Viện Liên Kết
            </div>
            <h2 className="text-2xl font-serif font-bold text-[var(--text-primary)] mt-1">
              Tài Nguyên Tuyển Chọn
            </h2>
          </div>
          <Link 
            href="/resources" 
            className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--accent)] flex items-center gap-1 group"
          >
            Tất cả tài nguyên <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {resources.length === 0 && !loading ? (
          <div className="p-8 text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-color)] rounded-xl">
            Chưa có tài nguyên nào được chia sẻ.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {resources.map((res) => {
              const url = res.metadata?.url || '#';
              const provider = res.metadata?.provider || 'Web';
              return (
                <a
                  key={res.id}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] hover:border-[var(--accent)]/50 hover:bg-[var(--bg-surface-subtle)] transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] text-[var(--text-muted)]">
                        {provider}
                      </span>
                      <ExternalLink size={13} className="text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors" />
                    </div>
                    <div className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors line-clamp-1">
                      {res.title}
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] line-clamp-2">
                      {res.description || 'Liên kết tài nguyên bên ngoài.'}
                    </p>
                  </div>

                  <div className="pt-3 text-[10px] font-mono text-[var(--text-muted)] flex items-center gap-1">
                    <Globe size={11} /> Mở liên kết trực tiếp
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. LATEST WRITINGS & ARTICLES */}
      <section className="space-y-6">
        <div className="flex items-end justify-between border-b border-[var(--border-color)] pb-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[var(--accent)]">
              <FileText size={14} /> Ghi Chép & Bài Viết
            </div>
            <h2 className="text-2xl font-serif font-bold text-[var(--text-primary)] mt-1">
              Bài Viết Gần Đây
            </h2>
          </div>
          <Link 
            href="/articles" 
            className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--accent)] flex items-center gap-1 group"
          >
            Đọc tất cả bài viết <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {articles.length === 0 && !loading ? (
          <div className="p-8 text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-color)] rounded-xl">
            Chưa có bài viết nào được xuất bản công khai.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-color)]">
            {articles.map((art) => (
              <article 
                key={art.id} 
                className="py-5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 group"
              >
                <div className="space-y-1.5 flex-1 pr-4">
                  <div className="flex items-center gap-2">
                    {art.category && (
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--accent)]">
                        {art.category}
                      </span>
                    )}
                    <span className="text-xs text-[var(--text-muted)]">
                      {new Date(art.publishedAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>

                  <h3 className="text-base font-serif font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                    <Link href={`/articles/${art.slug}`}>
                      {art.title}
                    </Link>
                  </h3>

                  <p className="text-xs text-[var(--text-secondary)] line-clamp-2 max-w-2xl">
                    {art.description}
                  </p>
                </div>

                <Link
                  href={`/articles/${art.slug}`}
                  className="text-xs font-semibold text-[var(--accent)] flex items-center gap-1 sm:self-center shrink-0 group-hover:translate-x-1 transition-transform"
                >
                  Đọc tiếp <ArrowRight size={13} />
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
