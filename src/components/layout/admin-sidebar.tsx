'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  FolderGit2,
  Bookmark,
  Compass,
  Layers,
  ShieldCheck,
  Lock,
  Settings,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

const iconMap: Record<string, any> = {
  LayoutDashboard,
  FileText,
  FolderGit2,
  Bookmark,
  Compass,
  Layers,
  ShieldCheck,
  Lock,
  Settings,
};

export function AdminSidebar({
  collapsed,
  onToggleCollapse,
  navItems,
}: {
  collapsed: boolean;
  onToggleCollapse: () => void;
  navItems?: Array<{ id: string; label: string; href: string; icon: string; visible: boolean }>;
}) {
  const pathname = usePathname();

  const defaultItems = [
    { id: 'home', label: 'Bảng điều khiển', href: '/admin', icon: 'LayoutDashboard', visible: true },
    { id: 'notes', label: 'Ghi chú & Bài viết', href: '/admin/content', icon: 'FileText', visible: true },
    { id: 'projects', label: 'Dự án', href: '/admin/projects', icon: 'FolderGit2', visible: true },
    { id: 'resources', label: 'Tài nguyên Link', href: '/admin/resources', icon: 'Bookmark', visible: true },
    { id: 'pages', label: 'Trình dựng Trang', href: '/admin/pages', icon: 'Compass', visible: true },
    { id: 'collections', label: 'Bộ sưu tập', href: '/admin/collections', icon: 'Layers', visible: true },
    { id: 'vault', label: 'Két bảo mật', href: '/admin/vault', icon: 'ShieldCheck', visible: true },
    { id: 'security', label: 'Nhật ký bảo mật', href: '/admin/security', icon: 'Lock', visible: true },
    { id: 'settings', label: 'Cài đặt hệ thống', href: '/admin/settings', icon: 'Settings', visible: true },
  ];

  const items = (navItems && navItems.length > 0 ? navItems : defaultItems).filter(
    (i) => i.visible !== false
  );

  return (
    <aside
      className={`relative flex flex-col border-r border-[var(--border-color)] bg-[var(--bg-surface)] transition-all duration-200 shrink-0 select-none ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Brand & Workspace Identity */}
      <div className="flex items-center justify-between h-14 px-4 border-b border-[var(--border-color)]">
        {!collapsed ? (
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-[var(--accent)] flex items-center justify-center text-white font-bold text-xs shadow-sm">
              OS
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm text-[var(--text-primary)] tracking-tight leading-none">
                Web OS
              </span>
              <span className="text-[10px] text-[var(--text-muted)] mt-0.5">
                Private Workspace
              </span>
            </div>
          </div>
        ) : (
          <div className="w-7 h-7 mx-auto rounded-md bg-[var(--accent)] flex items-center justify-center text-white font-bold text-xs shadow-sm">
            OS
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          className="hidden md:flex p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)]"
          title={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {items.map((item) => {
          const Icon = iconMap[item.icon] || FileText;
          const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-[var(--radius-md,0.625rem)] transition-all duration-150 ${
                isActive
                  ? 'bg-[var(--accent-light)] text-[var(--accent)] font-semibold shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)]'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={17} className={isActive ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Public Site Quick View */}
      <div className="p-2 border-t border-[var(--border-color)]">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)] rounded-[var(--radius-md,0.625rem)] transition-all"
          title={collapsed ? 'Mở Website công khai' : undefined}
        >
          <ExternalLink size={16} className="text-emerald-600" />
          {!collapsed && <span>Xem Website ngoài</span>}
        </Link>
      </div>
    </aside>
  );
}
