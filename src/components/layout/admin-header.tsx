'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Search,
  Plus,
  Lock,
  Eye,
  EyeOff,
  Sun,
  Moon,
  LogOut,
  Settings,
  Shield,
} from 'lucide-react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '../ui/dropdown';

export interface AdminHeaderProfile {
  displayName?: string;
  username?: string;
  avatarUrl?: string | null;
}

export function AdminHeader({
  onOpenQuickAdd,
  onOpenCommandPalette,
  onTriggerPanicLock,
  isPrivacyMode,
  onTogglePrivacyMode,
  profile,
}: {
  onOpenQuickAdd: () => void;
  onOpenCommandPalette: () => void;
  onTriggerPanicLock: () => void;
  isPrivacyMode: boolean;
  onTogglePrivacyMode: () => void;
  profile?: AdminHeaderProfile | null;
}) {
  const router = useRouter();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const handle = requestAnimationFrame(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    return () => cancelAnimationFrame(handle);
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch {
      router.push('/login');
    }
  };

  const handleLogoutAll = async () => {
    if (confirm('Bạn có chắc chắn muốn đăng xuất khỏi tất cả các thiết bị?')) {
      try {
        await fetch('/api/auth/logout-all', { method: 'POST' });
        router.push('/login');
      } catch {
        router.push('/login');
      }
    }
  };

  return (
    <header className="h-14 border-b border-[var(--border-color)] bg-[var(--bg-surface)] px-4 flex items-center justify-between sticky top-0 z-40 transition-colors">
      {/* Search / Command Palette Trigger */}
      <div className="flex items-center gap-3 w-72">
        <button
          onClick={onOpenCommandPalette}
          className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-[var(--text-muted)] bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] rounded-[var(--radius-md,0.625rem)] hover:border-[var(--text-secondary)] transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-2">
            <Search size={14} className="group-hover:text-[var(--text-primary)] transition-colors" />
            <span>Tìm kiếm & Lệnh nhanh...</span>
          </div>
          <kbd className="text-[10px] bg-[var(--bg-surface)] px-1.5 py-0.5 rounded border border-[var(--border-color)] font-mono">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Quick Add */}
        <Button
          size="sm"
          onClick={onOpenQuickAdd}
          className="gap-1.5 text-xs font-semibold px-3 py-1.5 shadow-sm"
        >
          <Plus size={15} />
          <span>Thêm nhanh</span>
        </Button>

        {/* Privacy Screen Toggle */}
        <button
          onClick={onTogglePrivacyMode}
          title={isPrivacyMode ? 'Tắt chế độ làm mờ riêng tư' : 'Bật chế độ làm mờ riêng tư nơi công cộng'}
          className={`p-2 rounded-[var(--radius-md,0.625rem)] border border-[var(--border-color)] transition-colors ${
            isPrivacyMode
              ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
              : 'hover:bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)]'
          }`}
        >
          {isPrivacyMode ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>

        {/* Panic Lock Trigger */}
        <button
          onClick={onTriggerPanicLock}
          title="Khóa khẩn cấp (Panic Lock)"
          className="p-2 rounded-[var(--radius-md,0.625rem)] border border-[var(--border-color)] hover:bg-red-500/10 text-red-600 dark:text-red-400 hover:border-red-500/30 transition-colors"
        >
          <Lock size={16} />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          title={isDark ? 'Chuyển sang Giao diện Sáng' : 'Chuyển sang Giao diện Tối'}
          className="p-2 rounded-[var(--radius-md,0.625rem)] border border-[var(--border-color)] hover:bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] transition-colors"
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <div className="h-4 w-px bg-[var(--border-color)] mx-1" />

        {/* User Profile Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 p-1 rounded-full border border-[var(--border-color)] hover:border-[var(--text-secondary)] transition-all focus:outline-none">
              <div className="w-7 h-7 rounded-full bg-[var(--accent)] text-white flex items-center justify-center font-bold text-xs uppercase overflow-hidden relative">
                {profile?.avatarUrl ? (
                  <Image
                    src={profile.avatarUrl}
                    alt="Avatar"
                    width={28}
                    height={28}
                    unoptimized
                    className="w-full h-full object-cover"
                  />
                ) : (
                  profile?.displayName?.[0] || 'O'
                )}
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <div className="px-3 py-2 border-b border-[var(--border-color)]">
              <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                {profile?.displayName || 'Chủ Sở Hữu'}
              </p>
              <p className="text-[10px] text-[var(--text-muted)] truncate">
                @{profile?.username || 'admin'}
              </p>
            </div>
            <DropdownMenuItem onClick={() => router.push('/admin/settings')}>
              <Settings size={14} className="mr-2" />
              <span>Cài đặt tài khoản</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/admin/security')}>
              <Shield size={14} className="mr-2" />
              <span>Bảo mật & Phiên</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600 dark:text-red-400">
              <LogOut size={14} className="mr-2" />
              <span>Đăng xuất</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogoutAll} className="text-red-600 dark:text-red-400">
              <Lock size={14} className="mr-2" />
              <span>Đăng xuất tất cả thiết bị</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
