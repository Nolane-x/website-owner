'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowUp, ShieldCheck, Heart } from 'lucide-react';

export function PublicFooter({
  siteTitle = 'Personal Web OS',
  author = 'Chủ Sở Hữu',
}: {
  siteTitle?: string;
  author?: string;
}) {
  const scrollToTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const [currentYear, setCurrentYear] = React.useState<number>(2026);

  React.useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="w-full border-t border-[var(--border-color)] bg-[var(--bg-surface)] py-12 mt-auto transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-base text-[var(--text-primary)]">
                {siteTitle}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent-light)] text-[var(--accent)] font-medium">
                V1.0
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] max-w-sm">
              Không gian số cá nhân được lưu trữ bảo mật với kiến trúc phân tách độc lập Public và Private API.
            </p>
          </div>

          <div className="flex items-center gap-6 text-xs text-[var(--text-secondary)]">
            <Link href="/about" className="hover:text-[var(--accent)] transition-colors">
              Giới thiệu
            </Link>
            <Link href="/projects" className="hover:text-[var(--accent)] transition-colors">
              Dự án
            </Link>
            <Link href="/resources" className="hover:text-[var(--accent)] transition-colors">
              Tài nguyên
            </Link>
            <Link href="/articles" className="hover:text-[var(--accent)] transition-colors">
              Bài viết
            </Link>
            <button
              onClick={scrollToTop}
              className="p-2 rounded-lg border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)] transition-colors flex items-center gap-1"
              title="Cuộn lên đầu trang"
            >
              <ArrowUp size={14} />
              <span>Lên đầu</span>
            </button>
          </div>
        </div>

        <div className="pt-6 border-t border-[var(--border-color)] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-1">
            <span>© {currentYear} {author}. Bản quyền được bảo lưu.</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
              <ShieldCheck size={14} /> Hệ thống bảo vệ riêng tư
            </span>
            <Link href="/admin/login" className="hover:text-[var(--text-primary)] text-[11px]">
              Khu vực chủ nhân
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
