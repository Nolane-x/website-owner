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
  Globe,
  Copy,
  Check,
  ShieldCheck,
  Quote,
  Clock,
  Code2
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
  createdAt: string;
}

export default function PublicHomePage() {
  const [profile, setProfile] = useState<any>(null);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [articles, setArticles] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const copyResourceLink = (url: string, id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div className="space-y-20 md:space-y-28">
      {/* 1. HERO SECTION WITH HIGH-CRAFT NUI ATMOSPHERE */}
      <section className="relative pt-6 md:pt-14 pb-10 border-b border-[var(--border-color)] space-y-8">
        {/* Floating System Status Pill */}
        <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-surface)]/80 backdrop-blur-md text-xs text-[var(--text-secondary)] shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--accent)] font-semibold">
            Hệ Điều Hành Web Cá Nhân
          </span>
          <span className="text-[var(--border-color)]">|</span>
          <span className="text-[11px] font-sans">Phiên bản 2.0 Sovereign Web</span>
        </div>

        {/* Hero Typography */}
        <div className="space-y-5 max-w-4xl">
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-serif font-bold text-[var(--text-primary)] tracking-tight leading-[1.1]">
            {profile?.displayName ? profile.displayName : 'Không Gian Số Cá Nhân'}
          </h1>
          <p className="text-lg sm:text-xl text-[var(--text-secondary)] font-sans leading-relaxed max-w-3xl font-light">
            {profile?.bio || 'Nơi lưu trữ, tuyển chọn tri thức, dự án kỹ thuật và tài nguyên mở được xuất bản công khai có kiểm duyệt.'}
          </p>
        </div>

        {/* Technical Architecture Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono text-[var(--text-muted)]">
          <span className="px-2.5 py-1 rounded-md border border-[var(--border-color)] bg-[var(--bg-surface-subtle)] flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-emerald-600" /> Phân tách Backend Độc quyền
          </span>
          <span className="px-2.5 py-1 rounded-md border border-[var(--border-color)] bg-[var(--bg-surface-subtle)] flex items-center gap-1.5">
            <Code2 size={13} className="text-[var(--accent)]" /> Next.js 16 + PostgreSQL
          </span>
          <span className="px-2.5 py-1 rounded-md border border-[var(--border-color)] bg-[var(--bg-surface-subtle)] flex items-center gap-1.5">
            <HardDrive size={13} className="text-amber-600" /> Link-First Zero Clutter
          </span>
        </div>

        {/* Action CTAs */}
        <div className="flex flex-wrap items-center gap-3 pt-3">
          <Link href="/projects">
            <Button className="flex items-center gap-2 shadow-sm hover:shadow transition-all group">
              <FolderGit2 size={16} />
              <span>Khám Phá Dự Án</span>
              <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </Link>
          <Link href="/articles">
            <Button variant="outline" className="flex items-center gap-2">
              <FileText size={16} />
              <span>Đọc Ghi Chép & Bài Viết</span>
            </Button>
          </Link>
          <Link href="/resources">
            <Button variant="ghost" className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
              <Bookmark size={16} />
              <span>Kho Tài Nguyên Mở</span>
            </Button>
          </Link>
        </div>
      </section>

      {/* 2. FEATURED PROJECTS SECTION */}
      <section className="space-y-8">
        <div className="flex items-end justify-between border-b border-[var(--border-color)] pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[var(--accent)] font-semibold">
              <FolderGit2 size={14} /> Dự Án Kỹ Thuật
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[var(--text-primary)] mt-1.5">
              Các Dự Án Nổi Bật
            </h2>
          </div>
          <Link 
            href="/projects" 
            className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--accent)] flex items-center gap-1.5 group transition-colors"
          >
            <span>Tất cả dự án</span>
            <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-[var(--text-muted)] font-mono animate-pulse">
            Đang tải dữ liệu dự án từ máy chủ...
          </div>
        ) : projects.length === 0 ? (
          <div className="p-12 text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-color)] rounded-2xl bg-[var(--bg-surface)]/50">
            Chưa có dự án nào được xuất bản công khai.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {projects.map((proj, idx) => (
              <div 
                key={proj.id}
                className="group p-6 sm:p-7 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] card-hover-glow flex flex-col justify-between space-y-5"
              >
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-[var(--accent)]">
                        #{(idx + 1).toString().padStart(2, '0')}
                      </span>
                      <Badge variant="outline" className="text-[10px] font-mono uppercase tracking-wide">
                        {proj.category || 'Engineering'}
                      </Badge>
                    </div>

                    {proj.metadata?.repoUrl && (
                      <a 
                        href={proj.metadata.repoUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-md hover:bg-[var(--bg-surface-subtle)] transition-colors"
                        title="Xem mã nguồn GitHub"
                      >
                        <Github size={16} />
                      </a>
                    )}
                  </div>

                  <h3 className="text-xl font-serif font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors leading-snug">
                    <Link href={`/projects/${proj.slug}`}>
                      {proj.title}
                    </Link>
                  </h3>

                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed line-clamp-2 font-light">
                    {proj.description || 'Không có mô tả chi tiết.'}
                  </p>
                </div>

                <div className="pt-4 border-t border-[var(--border-color)]/70 flex items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-1.5">
                    {(proj.tags || []).slice(0, 3).map((t, tIdx) => (
                      <span key={tIdx} className="text-[11px] font-mono text-[var(--text-muted)] bg-[var(--bg-surface-subtle)] px-2 py-0.5 rounded">
                        #{t}
                      </span>
                    ))}
                  </div>

                  <Link 
                    href={`/projects/${proj.slug}`}
                    className="text-xs font-semibold text-[var(--accent)] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform flex-shrink-0"
                  >
                    <span>Chi tiết</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. CURATED LINK-FIRST RESOURCES */}
      <section className="space-y-8">
        <div className="flex items-end justify-between border-b border-[var(--border-color)] pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[var(--accent)] font-semibold">
              <Bookmark size={14} /> Thư Viện Liên Kết
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[var(--text-primary)] mt-1.5">
              Tài Nguyên Tuyển Chọn
            </h2>
          </div>
          <Link 
            href="/resources" 
            className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--accent)] flex items-center gap-1.5 group transition-colors"
          >
            <span>Tất cả tài nguyên</span>
            <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {resources.length === 0 && !loading ? (
          <div className="p-12 text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-color)] rounded-2xl bg-[var(--bg-surface)]/50">
            Chưa có tài nguyên nào được chia sẻ.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {resources.map((res) => {
              const url = res.metadata?.url || '#';
              const provider = res.metadata?.provider || 'Web';
              const isCopied = copiedId === res.id;

              return (
                <div
                  key={res.id}
                  className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] card-hover-glow flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--accent-light)] text-[var(--accent)] font-semibold">
                        {provider}
                      </span>
                      
                      <div className="flex items-center gap-1">
                        {url !== '#' && (
                          <button
                            onClick={(e) => copyResourceLink(url, res.id, e)}
                            className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)] transition-colors"
                            title="Sao chép liên kết"
                          >
                            {isCopied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                          </button>
                        )}
                        <a 
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--bg-surface-subtle)] transition-colors"
                          title="Mở liên kết mới"
                        >
                          <ExternalLink size={13} />
                        </a>
                      </div>
                    </div>

                    <a 
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-base font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors line-clamp-1 leading-snug"
                    >
                      {res.title}
                    </a>

                    <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed font-light">
                      {res.description || 'Liên kết tài nguyên đã được lưu trữ và tuyển chọn.'}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[var(--border-color)]/60 text-[11px] font-mono text-[var(--text-muted)] flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Globe size={12} /> {provider}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">
                      {isCopied ? 'Đã sao chép link!' : 'Liên kết an toàn'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. LATEST WRITINGS & ARTICLES (FIXED VIETNAMESE TYPOGRAPHY) */}
      <section className="space-y-8">
        <div className="flex items-end justify-between border-b border-[var(--border-color)] pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[var(--accent)] font-semibold">
              <FileText size={14} /> Ghi Chép & Bài Viết
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[var(--text-primary)] mt-1.5">
              Bài Viết Gần Đây
            </h2>
          </div>
          <Link 
            href="/articles" 
            className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--accent)] flex items-center gap-1.5 group transition-colors"
          >
            <span>Tất cả bài viết</span>
            <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {articles.length === 0 && !loading ? (
          <div className="p-12 text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-color)] rounded-2xl bg-[var(--bg-surface)]/50">
            Chưa có bài viết nào được xuất bản công khai.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-color)]">
            {articles.map((art) => (
              <article 
                key={art.id} 
                className="py-6 flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 group hover:bg-[var(--bg-surface-subtle)]/30 px-3 -mx-3 rounded-xl transition-colors"
              >
                <div className="space-y-2 flex-1 pr-4">
                  <div className="flex items-center gap-2.5">
                    {art.category && (
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--accent)] font-semibold bg-[var(--accent-light)] px-2 py-0.5 rounded">
                        {art.category}
                      </span>
                    )}
                    <span className="text-xs font-mono text-[var(--text-muted)] flex items-center gap-1">
                      <Clock size={12} /> 4 phút đọc
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-serif font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors leading-snug">
                    <Link href={`/articles/${art.slug}`}>
                      {art.title}
                    </Link>
                  </h3>

                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] line-clamp-2 font-light leading-relaxed">
                    {art.description || 'Ghi chép chuyên sâu về kiến trúc hệ thống và công nghệ.'}
                  </p>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center flex-shrink-0">
                  <span className="text-xs font-mono text-[var(--text-muted)]">
                    {art.publishedAt ? new Date(art.publishedAt).toLocaleDateString('vi-VN') : 'Mới đây'}
                  </span>
                  <Link
                    href={`/articles/${art.slug}`}
                    className="p-2 rounded-lg border border-[var(--border-color)] text-[var(--text-muted)] group-hover:text-[var(--accent)] group-hover:border-[var(--accent)]/50 transition-colors"
                    title="Đọc bài viết"
                  >
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* 5. EDITORIAL MANIFESTO / PHILOSOPHY QUOTE BOX */}
      <section className="p-8 sm:p-10 rounded-3xl border border-[var(--border-color)] bg-gradient-to-br from-[var(--bg-surface)] to-[var(--bg-surface-subtle)]/70 relative overflow-hidden shadow-sm">
        <Quote size={48} className="absolute -bottom-4 -right-4 text-[var(--accent)]/10 pointer-events-none" />
        <div className="max-w-2xl space-y-3">
          <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--accent)] font-semibold">
            Triết Lý Thiết Kế · NUI Bàn Giấy
          </span>
          <p className="text-base sm:text-lg font-serif italic text-[var(--text-primary)] leading-relaxed">
            &ldquo;Tri thức được tuyển chọn có chủ đích, bảo mật nghiêm ngặt ở lõi, và mở ra thế giới với tinh thần tối giản, độc lập và bền vững.&rdquo;
          </p>
          <p className="text-xs font-mono text-[var(--text-muted)]">
            — Personal Web OS Architecture Manifesto
          </p>
        </div>
      </section>
    </div>
  );
}
