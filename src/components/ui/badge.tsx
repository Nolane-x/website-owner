import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Visibility, ContentStatus } from '@/lib/types';

export function VisibilityBadge({ visibility }: { visibility: Visibility | string }) {
  const configs: Record<string, { label: string; glyph: string; className: string }> = {
    PUBLIC: {
      label: 'Công khai',
      glyph: '●',
      className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    },
    UNLISTED: {
      label: 'Không liệt kê',
      glyph: '◐',
      className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    },
    PRIVATE: {
      label: 'Riêng tư',
      glyph: '○',
      className: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20',
    },
  };

  const item = configs[visibility] || configs.PRIVATE;

  return (
    <span
      className={twMerge(
        'inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full border select-none',
        item.className
      )}
      title={`Mức độ hiển thị: ${item.label}`}
    >
      <span className="text-[10px] leading-none font-bold">{item.glyph}</span>
      <span>{item.label}</span>
    </span>
  );
}

export function StatusBadge({ status }: { status: ContentStatus | string }) {
  const configs: Record<string, { label: string; className: string }> = {
    PUBLISHED: {
      label: 'Đã xuất bản',
      className: 'bg-[var(--accent-light)] text-[var(--accent)] border-[var(--accent)]/30',
    },
    DRAFT: {
      label: 'Bản nháp',
      className: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20',
    },
    ARCHIVED: {
      label: 'Lưu trữ',
      className: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
    },
  };

  const item = configs[status] || configs.DRAFT;

  return (
    <span
      className={twMerge(
        'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border select-none',
        item.className
      )}
    >
      {item.label}
    </span>
  );
}

export function Badge({
  children,
  variant = 'default',
  className,
}: {
  children: React.ReactNode;
  variant?: 'default' | 'outline' | 'accent' | 'success' | 'danger';
  className?: string;
}) {
  const variants = {
    default: 'bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] border-[var(--border-color)]',
    outline: 'bg-transparent text-[var(--text-secondary)] border-[var(--border-color)]',
    accent: 'bg-[var(--accent-light)] text-[var(--accent)] border-[var(--accent)]/20',
    success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    danger: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  };

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md border select-none',
          variants[variant],
          className
        )
      )}
    >
      {children}
    </span>
  );
}
