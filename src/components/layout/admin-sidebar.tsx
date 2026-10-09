'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BrandLogo } from '@/components/ui/brand-logo';
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

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon?: string;
  visible?: boolean;
  pinned?: boolean;
}

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
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
  navItems?: NavItem[];
}) {
  const pathname = usePathname();

  const defaultItems: NavItem[] = [
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
      className={`h-screen border-r border-[var(--border-color)] bg-[var(--bg-surface)] flex flex-col justify-between transition-all duration-200 z-30 shrink-0 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Top Branding */}
      <div>
        <div className="h-14 border-b border-[var(--border-color)] px-4 flex items-center justify-between">
          {!collapsed && (
            <Link href="/admin" className="flex items-center gap-2.5 group">
              <BrandLogo size={22} className="text-[var(--accent)] transition-transform group-hover:scale-105" />
              <div className="flex flex-col">
                <span className="font-bold text-xs tracking-tight text-[var(--text-primary)]">
                  Personal Web OS
                </span>
                <span className="text-[9px] font-mono text-[var(--accent)] uppercase font-semibold">
                  Owner Workspace
                </span>
              </div>
            </Link>
          )}

          {collapsed && (
            <div className="mx-auto">
              <BrandLogo size={22} className="text-[var(--accent)]" />
            </div>
          )}

          <button
            onClick={onToggleCollapse}
            className={`p-1.5 rounded-[var(--radius-sm,0.375rem)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)] transition-colors ${
              collapsed ? 'hidden' : ''
            }`}
            title="Thu gọn thanh điều hướng"
          >
            <ChevronLeft size={16} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="p-2 space-y-1">
          {items.map((item) => {
            const Icon = item.icon && iconMap[item.icon] ? iconMap[item.icon] : LayoutDashboard;
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-[var(--radius-md,0.625rem)] text-xs font-medium transition-all group ${
                  isActive
                    ? 'bg-[var(--accent)] text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-subtle)] hover:text-[var(--text-primary)]'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={16} className={`shrink-0 ${isActive ? 'text-white' : 'text-[var(--text-muted)] group-hover:text-[var(--text-primary)]'}`} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section */}
      <div className="p-2 border-t border-[var(--border-color)] space-y-1">
        {/* Xem trang công khai */}
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-3 px-3 py-2 rounded-[var(--radius-md,0.625rem)] text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--bg-surface-subtle)] hover:text-[var(--text-primary)] transition-all group"
          title={collapsed ? 'Mở trang công khai' : undefined}
        >
          <ExternalLink size={16} className="shrink-0 text-[var(--text-muted)] group-hover:text-[var(--accent)]" />
          {!collapsed && <span>Xem trang Public</span>}
        </Link>

        {collapsed && (
          <button
            onClick={onToggleCollapse}
            className="w-full flex items-center justify-center p-2 rounded-[var(--radius-md,0.625rem)] text-[var(--text-muted)] hover:bg-[var(--bg-surface-subtle)] hover:text-[var(--text-primary)] transition-colors"
            title="Mở rộng menu"
          >
            <ChevronRight size={16} />
          </button>
        )}
      </div>
    </aside>
  );
}
