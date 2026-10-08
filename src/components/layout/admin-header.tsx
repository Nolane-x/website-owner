'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  User,
} from 'lucide-react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '../ui/dropdown';

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
  profile?: any;
}) {
  const router = useRouter();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark');
    setIsDark(isDarkMode);
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
      router.push('/admin/login');
    } catch {
      router.push('/admin/login');
    }
  };

  const handleLogoutAll = async () => {
    if (confirm('Bạn có chắc chắn muốn đăng xuất tất cả các phiên làm việc trên mọi thiết bị?')) {
      try {
        await fetch('/api/auth/logout-all', { method: 'POST' });
        router.push('/admin/login');
      } catch {
        router.push('/admin/login');
      }
    }
  };

  return (
    <header className="flex items-center justify-between h-14 px-4 border-b border-[var(--border-color)] bg-[var(--bg-surface)] shrink-0 select-none">
      {/* Command Palette Trigger */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenCommandPalette}
          className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-[var(--text-muted)] bg-[var(--bg-surface-subtle)] hover:text-[var(--text-primary)] border border-[var(--border-color)] rounded-[var(--radius-md,0.625rem)] transition-all w-56 md:w-72"
        >
          <Search size={14} className="text-[var(--text-muted)]" />
          <span className="truncate">Tìm kiếm hoặc lệnh...</span>
          <kbd className="ml-auto px-1.5 py-0.5 text-[10px] bg-[var(--bg-surface)] border border-[var(--border-color)] rounded text-[var(--text-muted)]">
            Ctrl K
          </kbd>
        </button>

        <Button
          size="sm"
          onClick={onOpenQuickAdd}
          className="hidden sm:inline-flex items-center gap-1.5"
        >
          <Plus size={15} />
          <span>Thêm nhanh</span>
        </Button>
      </div>

      {/* Action Controls & Utilities */}
      <div className="flex items-center gap-2">
        {/* Privacy Screen Toggle */}
        <button
          onClick={onTogglePrivacyMode}
          className={`p-2 rounded-md border text-xs transition-all ${
            isPrivacyMode
              ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
              : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)]'
          }`}
          title={isPrivacyMode ? 'Tắt chế độ che riêng tư' : 'Bật chế độ che riêng tư (Privacy Screen)'}
        >
          {isPrivacyMode ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>

        {/* Panic Lock Button */}
        <button
          onClick={onTriggerPanicLock}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 rounded-[var(--radius-md,0.625rem)] transition-all"
          title="Khóa ngay không gian làm việc (Ctrl + Shift + L)"
        >
          <Lock size={14} />
          <span className="hidden md:inline">Khóa ngay</span>
        </button>

        {/* Preview as Guest */}
        <button
          onClick={() => window.open('/', '_blank')}
          className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 rounded-[var(--radius-md,0.625rem)] transition-all"
          title="Xem website công khai chính xác như một khách thực tế"
        >
          <Eye size={14} />
          <span>Xem như khách</span>
        </button>

        {/* Theme Switcher */}
        <button
          onClick={toggleTheme}
          className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] rounded-md transition-all"
          title="Chuyển chế độ Sáng / Tối"
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 p-1 rounded-full border border-[var(--border-color)] hover:border-[var(--text-secondary)] transition-all focus:outline-none">
              <div className="w-7 h-7 rounded-full bg-[var(--accent)] text-white flex items-center justify-center font-bold text-xs uppercase overflow-hidden">
                {profile?.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
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
