'use client';

import React, { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { useRouter } from 'next/navigation';
import {
  Search,
  FileText,
  FolderGit2,
  Bookmark,
  Compass,
  Lock,
  LogOut,
  Plus,
  Home,
  Settings,
  Shield,
  Eye,
} from 'lucide-react';

export function CommandMenu({
  open,
  onOpenChange,
  onTriggerQuickAdd,
  onTriggerPanicLock,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTriggerQuickAdd?: () => void;
  onTriggerPanicLock?: () => void;
}) {
  const router = useRouter();
  const [search, setSearch] = useState('');

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);

  if (!open) return null;

  const runCommand = (cmd: () => void) => {
    onOpenChange(false);
    cmd();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50 backdrop-blur-sm animate-in fade-in-0 duration-150">
      <div
        className="w-full max-w-xl mx-4 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-[var(--radius-lg,0.875rem)] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <Command
          value={search}
          onValueChange={setSearch}
          className="w-full"
        >
          <div className="flex items-center px-4 py-3 border-b border-[var(--border-color)]">
            <Search className="mr-3 h-4 w-4 text-[var(--text-muted)] shrink-0" />
            <Command.Input
              placeholder="Nhập lệnh hoặc tìm kiếm nội dung... (ESC để đóng)"
              className="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
              autoFocus
            />
          </div>

          <Command.List className="max-h-80 overflow-y-auto p-2 space-y-1">
            <Command.Empty className="py-6 text-center text-xs text-[var(--text-muted)]">
              Không tìm thấy lệnh hoặc nội dung phù hợp.
            </Command.Empty>

            <Command.Group heading="Thao tác nhanh" className="text-[11px] font-semibold text-[var(--text-muted)] px-2 py-1">
              <Command.Item
                onSelect={() => runCommand(() => onTriggerQuickAdd?.())}
                className="flex items-center gap-2.5 px-3 py-2 text-xs text-[var(--text-primary)] rounded-[var(--radius-md,0.625rem)] cursor-pointer hover:bg-[var(--bg-surface-subtle)]"
              >
                <Plus size={15} className="text-[var(--accent)]" />
                <span>Thêm nhanh nội dung (+ Note, Project, Resource)</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => onTriggerPanicLock?.())}
                className="flex items-center gap-2.5 px-3 py-2 text-xs text-red-600 dark:text-red-400 rounded-[var(--radius-md,0.625rem)] cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                <Lock size={15} />
                <span>Khóa ngay không gian làm việc (Panic Lock - Ctrl+Shift+L)</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => window.open('/', '_blank'))}
                className="flex items-center gap-2.5 px-3 py-2 text-xs text-[var(--text-primary)] rounded-[var(--radius-md,0.625rem)] cursor-pointer hover:bg-[var(--bg-surface-subtle)]"
              >
                <Eye size={15} className="text-emerald-600" />
                <span>Mở xem Website công khai (Guest Mode)</span>
              </Command.Item>
            </Command.Group>

            <Command.Group heading="Điều hướng chính" className="text-[11px] font-semibold text-[var(--text-muted)] px-2 py-1 mt-2">
              <Command.Item
                onSelect={() => runCommand(() => router.push('/admin'))}
                className="flex items-center gap-2.5 px-3 py-2 text-xs text-[var(--text-primary)] rounded-[var(--radius-md,0.625rem)] cursor-pointer hover:bg-[var(--bg-surface-subtle)]"
              >
                <Home size={15} className="text-[var(--text-secondary)]" />
                <span>Bảng điều khiển (Dashboard)</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push('/admin/content'))}
                className="flex items-center gap-2.5 px-3 py-2 text-xs text-[var(--text-primary)] rounded-[var(--radius-md,0.625rem)] cursor-pointer hover:bg-[var(--bg-surface-subtle)]"
              >
                <FileText size={15} className="text-[var(--text-secondary)]" />
                <span>Ghi chú & Bài viết</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push('/admin/projects'))}
                className="flex items-center gap-2.5 px-3 py-2 text-xs text-[var(--text-primary)] rounded-[var(--radius-md,0.625rem)] cursor-pointer hover:bg-[var(--bg-surface-subtle)]"
              >
                <FolderGit2 size={15} className="text-[var(--text-secondary)]" />
                <span>Dự án</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push('/admin/resources'))}
                className="flex items-center gap-2.5 px-3 py-2 text-xs text-[var(--text-primary)] rounded-[var(--radius-md,0.625rem)] cursor-pointer hover:bg-[var(--bg-surface-subtle)]"
              >
                <Bookmark size={15} className="text-[var(--text-secondary)]" />
                <span>Thư viện tài nguyên Link-First</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push('/admin/pages'))}
                className="flex items-center gap-2.5 px-3 py-2 text-xs text-[var(--text-primary)] rounded-[var(--radius-md,0.625rem)] cursor-pointer hover:bg-[var(--bg-surface-subtle)]"
              >
                <Compass size={15} className="text-[var(--text-secondary)]" />
                <span>Trình dựng Trang (Page Canvas Builder)</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push('/admin/vault'))}
                className="flex items-center gap-2.5 px-3 py-2 text-xs text-[var(--text-primary)] rounded-[var(--radius-md,0.625rem)] cursor-pointer hover:bg-[var(--bg-surface-subtle)]"
              >
                <Shield size={15} className="text-[var(--text-secondary)]" />
                <span>Két mật mã bảo mật (Vault)</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push('/admin/settings'))}
                className="flex items-center gap-2.5 px-3 py-2 text-xs text-[var(--text-primary)] rounded-[var(--radius-md,0.625rem)] cursor-pointer hover:bg-[var(--bg-surface-subtle)]"
              >
                <Settings size={15} className="text-[var(--text-secondary)]" />
                <span>Cài đặt hệ thống</span>
              </Command.Item>
            </Command.Group>
          </Command.List>

          <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--border-color)] bg-[var(--bg-surface-subtle)] text-[11px] text-[var(--text-muted)]">
            <span>Dùng phím mũi tên để chọn, Enter để thực thi</span>
            <span>ESC để thoát</span>
          </div>
        </Command>
      </div>
    </div>
  );
}
