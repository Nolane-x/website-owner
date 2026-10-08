'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Globe, 
  Calendar, 
  Tag, 
  Share2, 
  Check, 
  ExternalLink 
} from 'lucide-react';
import { GithubIcon as Github } from '@/components/ui/github-icon';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { marked } from 'marked';
import { sanitizeHtml } from '@/lib/security/sanitize';

export function ProjectDetailClient({ slug }: { slug: string }) {
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadProject() {
      try {
        setLoading(true);
        const res = await fetch(`/api/public/content/${slug}`);
        const data = await res.json();
        if (res.ok) {
          setProject(data.item);
        } else {
          setError(data.error || 'Dự án không tồn tại.');
        }
      } catch {
        setError('Không thể kết nối đến máy chủ.');
      } finally {
        setLoading(false);
      }
    }
    loadProject();
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
        Đang tải thông tin dự án...
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="py-24 text-center max-w-md mx-auto space-y-4">
        <h2 className="text-xl font-serif font-bold text-[var(--text-primary)]">
          Không tìm thấy dự án
        </h2>
        <p className="text-xs text-[var(--text-secondary)]">
          {error || 'Dự án này có thể đã được gỡ hoặc chưa công khai.'}
        </p>
        <Link href="/projects">
          <Button variant="outline" size="sm">
            <ArrowLeft size={14} className="mr-1.5" /> Quay lại danh sách dự án
          </Button>
        </Link>
      </div>
    );
  }

  const rawHtml = project.content ? (marked.parse(project.content) as string) : '';
  const cleanHtml = sanitizeHtml(rawHtml);

  return (
    <article className="max-w-3xl mx-auto space-y-10">
      {/* Top Navigation */}
      <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-4">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft size={14} /> Tất cả dự án
        </Link>

        <button
          onClick={copyUrl}
          className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          {copied ? <Check size={14} className="text-emerald-500" /> : <Share2 size={14} />}
          <span>{copied ? 'Đã sao chép liên kết' : 'Chia sẻ'}</span>
        </button>
      </div>

      {/* Project Header */}
      <header className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-mono">
            {project.category || 'Dự án'}
          </Badge>
          {project.publishedAt && (
            <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
              <Calendar size={12} />
              {new Date(project.publishedAt).toLocaleDateString('vi-VN')}
            </span>
          )}
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-[var(--text-primary)] tracking-tight leading-tight">
          {project.title}
        </h1>

        {project.description && (
          <p className="text-base text-[var(--text-secondary)] leading-relaxed font-sans">
            {project.description}
          </p>
        )}

        {/* Action Links */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          {project.metadata?.demoUrl && (
            <a
              href={project.metadata.demoUrl}
              target="_blank"
              rel="noreferrer"
            >
              <Button className="flex items-center gap-2">
                <Globe size={15} /> Trải Nghiệm Demo Trực Tiếp <ExternalLink size={12} />
              </Button>
            </a>
          )}
          {project.metadata?.repoUrl && (
            <a
              href={project.metadata.repoUrl}
              target="_blank"
              rel="noreferrer"
            >
              <Button variant="outline" className="flex items-center gap-2">
                <Github size={15} /> Xem Mã Nguồn GitHub <ExternalLink size={12} />
              </Button>
            </a>
          )}
        </div>
      </header>

      {/* Render Markdown Content */}
      {cleanHtml ? (
        <div
          className="prose dark:prose-invert prose-stone max-w-none pt-6 border-t border-[var(--border-color)] text-sm sm:text-base leading-relaxed space-y-4"
          dangerouslySetInnerHTML={{ __html: cleanHtml }}
        />
      ) : (
        <div className="pt-6 border-t border-[var(--border-color)] text-xs text-[var(--text-muted)] italic">
          Chưa có bài viết chi tiết cho dự án này.
        </div>
      )}

      {/* Tags Footer */}
      {project.tags && project.tags.length > 0 && (
        <footer className="pt-6 border-t border-[var(--border-color)] flex items-center gap-2 flex-wrap">
          <Tag size={13} className="text-[var(--text-muted)]" />
          {project.tags.map((t: string, idx: number) => (
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
