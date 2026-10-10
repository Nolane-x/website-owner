'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Sun, Moon, Lock, Menu, X } from 'lucide-react';
import { BrandLogo } from '@/components/ui/brand-logo';

interface NavItem {
  label: string;
  href: string;
}

export function PublicHeader({
  siteTitle = 'Personal Web OS',
  navItems = [
    { label: 'Trang chủ', href: '/' },
    { label: 'Giới thiệu', href: '/about' },
    { label: 'Dự án', href: '/projects' },
    { label: 'Tài nguyên', href: '/resources' },
    { label: 'Bài viết', href: '/articles' },
    { label: 'Bộ sưu tập', href: '/collections' },
  ],
  onOpenSearch,
}: {
  siteTitle?: string;
  navItems?: NavItem[];
  onOpenSearch?: () => void;
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  // Keep the public tool area discoverable even when the owner customizes navigation.
  const visibleNavItems = navItems.some((item) => item.href === '/tools')
    ? navItems
    : [...navItems, { label: 'Công cụ', href: '/tools' }];

  useEffect(() => {
    const handle = requestAnimationFrame(() => {
      const isDarkMode = document.documentElement.classList.contains('dark') ||
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDark(isDarkMode);
    });
    return () => cancelAnimationFrame(handle);
  }, []);

  const toggleDarkMode = () => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark');
      setIsDark(!isDark);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--border-color)] bg-[var(--bg-surface)]/90 backdrop-blur-md transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <Link href="/" className="group flex items-center gap-2">
          <BrandLogo size={36} subtitle={siteTitle} />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {visibleNavItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  isActive
                    ? 'text-[var(--accent)] bg-[var(--accent-light)] font-semibold shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)]'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Quick Search */}
          {onOpenSearch && (
            <button
              onClick={onOpenSearch}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs transition-colors"
              title="Tìm kiếm (Ctrl+K)"
            >
              <Search size={14} />
              <span className="hidden sm:inline">Tìm kiếm</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-color)] text-[10px] font-mono">
                ⌘K
              </kbd>
            </button>
          )}

          {/* Dark / Light Toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)] transition-colors"
            title={isDark ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
          >
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {/* Admin Login Portal Shortcut */}
          <Link
            href="/admin/login"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-transparent bg-transparent hover:border-[var(--border-color)] hover:bg-[var(--bg-surface-subtle)] text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            title="Dành riêng cho chủ sở hữu"
          >
            <Lock size={13} />
            <span>Chủ nhân</span>
          </Link>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)]"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[var(--border-color)] bg-[var(--bg-surface)] px-4 py-3 space-y-2 animate-in slide-in-from-top-2 duration-150">
          <nav className="flex flex-col gap-1">
            {visibleNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-[var(--accent)] bg-[var(--accent-light)] font-semibold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)]'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="pt-2 border-t border-[var(--border-color)] flex items-center justify-between">
            <Link
              href="/admin/login"
              className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <Lock size={14} />
              <span>Đăng nhập Chủ sở hữu</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
