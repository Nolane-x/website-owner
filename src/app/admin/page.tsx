'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileText,
  FolderGit2,
  Bookmark,
  ArrowUpRight,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VisibilityBadge, StatusBadge } from '@/components/ui/badge';
import { ScratchpadDesk } from '@/components/ui/scratchpad-desk';
import { ContentItem, Profile } from '@/lib/types';

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    drafts: 0,
    projects: 0,
    resources: 0,
    pages: 0,
  });
  const [recentItems, setRecentItems] = useState<ContentItem[]>([]);
  const [pinnedProjects, setPinnedProjects] = useState<ContentItem[]>([]);
  const [recentResources, setRecentResources] = useState<ContentItem[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [itemsRes, meRes, pagesRes] = await Promise.all([
        fetch('/api/admin/content'),
        fetch('/api/auth/me'),
        fetch('/api/admin/pages'),
      ]);

      if (itemsRes.ok && meRes.ok) {
        const itemsData = await itemsRes.json();
        const meData = await meRes.json();
        const pagesData = pagesRes.ok ? await pagesRes.json() : { pages: [] };

        const all: ContentItem[] = itemsData.items || [];
        setProfile(meData.profile);

        const publishedCount = all.filter((i) => i.status === 'PUBLISHED').length;
        const draftCount = all.filter((i) => i.status === 'DRAFT').length;
        const projCount = all.filter((i) => i.type === 'project').length;
        const resCount = all.filter((i) => i.type === 'resource' || i.type === 'link').length;
        const pCount = pagesData.pages?.length || 0;

        setStats({
          total: all.length,
          published: publishedCount,
          drafts: draftCount,
          projects: projCount,
          resources: resCount,
          pages: pCount,
        });

        setRecentItems(all.slice(0, 5));
        setPinnedProjects(all.filter((i) => i.type === 'project' && (i.isPinned || i.isFeatured)).slice(0, 4));
        setRecentResources(all.filter((i) => i.type === 'resource' || i.type === 'link').slice(0, 4));
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu bảng điều khiển:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function loadInitialData() {
      try {
        const [itemsRes, meRes, pagesRes] = await Promise.all([
          fetch('/api/admin/content'),
          fetch('/api/auth/me'),
          fetch('/api/admin/pages'),
        ]);

        if (itemsRes.ok && meRes.ok && !ignore) {
          const itemsData = await itemsRes.json();
          const meData = await meRes.json();
          const pagesData = pagesRes.ok ? await pagesRes.json() : { pages: [] };

          const all: ContentItem[] = itemsData.items || [];
          setProfile(meData.profile);

          const publishedCount = all.filter((i) => i.status === 'PUBLISHED').length;
          const draftCount = all.filter((i) => i.status === 'DRAFT').length;
          const projCount = all.filter((i) => i.type === 'project').length;
          const resCount = all.filter((i) => i.type === 'resource' || i.type === 'link').length;
          const pCount = pagesData.pages?.length || 0;

          setStats({
            total: all.length,
            published: publishedCount,
            drafts: draftCount,
            projects: projCount,
            resources: resCount,
            pages: pCount,
          });

          setRecentItems(all.slice(0, 5));
          setPinnedProjects(all.filter((i) => i.type === 'project' && (i.isPinned || i.isFeatured)).slice(0, 4));
          setRecentResources(all.filter((i) => i.type === 'resource' || i.type === 'link').slice(0, 4));
        }
      } catch (err) {
        console.error('Lỗi tải dữ liệu bảng điều khiển:', err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    loadInitialData();

    const handleRefresh = () => {
      fetchDashboardData();
    };
    window.addEventListener('webos:refresh-content', handleRefresh);
    return () => {
      ignore = true;
      window.removeEventListener('webos:refresh-content', handleRefresh);
    };
  }, []);

  return (
    <div className="space-y-6 pb-12">
      {/* Greeting Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--accent)] uppercase tracking-wider">
            <Sparkles size={14} />
            <span>Personal Web OS · Phiên bản 1.0</span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
            Xin chào, {profile?.displayName || 'Chủ Sở Hữu'}
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Hôm nay là {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}. Không gian số riêng tư của bạn đang hoạt động an toàn.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/admin/content">
            <Button size="sm" variant="secondary" className="gap-1.5">
              <FileText size={15} />
              <span>Ghi chép mới</span>
            </Button>
          </Link>
          <Link href="/" target="_blank">
            <Button size="sm" variant="outline" className="gap-1.5 text-emerald-600 border-emerald-600/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/20">
              <Eye size={15} />
              <span>Xem trang ngoài</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Statistics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl space-y-1">
          <span className="text-[11px] font-medium text-[var(--text-muted)]">Tổng nội dung</span>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.total}</p>
        </div>
        <div className="p-4 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl space-y-1">
          <span className="text-[11px] font-medium text-emerald-600">Đã xuất bản (Public)</span>
          <p className="text-2xl font-bold text-emerald-600">{stats.published}</p>
        </div>
        <div className="p-4 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl space-y-1">
          <span className="text-[11px] font-medium text-amber-600">Bản nháp (Drafts)</span>
          <p className="text-2xl font-bold text-amber-600">{stats.drafts}</p>
        </div>
        <div className="p-4 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl space-y-1">
          <span className="text-[11px] font-medium text-[var(--text-muted)]">Dự án</span>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.projects}</p>
        </div>
        <div className="p-4 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl space-y-1">
          <span className="text-[11px] font-medium text-[var(--text-muted)]">Tài nguyên Link</span>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.resources}</p>
        </div>
        <div className="p-4 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl space-y-1">
          <span className="text-[11px] font-medium text-[var(--text-muted)]">Trang động</span>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.pages}</p>
        </div>
      </div>

      {/* Dual Column Layout: Content & Resources */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Content & Drafts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Content */}
          <div className="p-5 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                <FileText size={16} className="text-[var(--accent)]" />
                <span>Nội dung & Soạn thảo gần đây</span>
              </h2>
              <Link href="/admin/content" className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1 font-medium">
                <span>Xem tất cả</span>
                <ArrowUpRight size={13} />
              </Link>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-[var(--text-muted)] animate-pulse">
                Đang tải dữ liệu...
              </div>
            ) : recentItems.length === 0 ? (
              <div className="py-8 text-center space-y-2 border border-dashed border-[var(--border-color)] rounded-xl">
                <p className="text-xs text-[var(--text-muted)]">Chưa có nội dung nào.</p>
                <Link href="/admin/content">
                  <Button size="sm" variant="outline">Tạo ghi chú đầu tiên</Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-color)]">
                {recentItems.map((item) => (
                  <div key={item.id} className="py-3 flex items-center justify-between gap-4 hover:bg-[var(--bg-surface-subtle)] px-2 rounded-lg transition-colors">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-[var(--text-primary)] truncate">
                          {item.title}
                        </span>
                        <VisibilityBadge visibility={item.visibility} />
                        <StatusBadge status={item.status} />
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] truncate">
                        {item.description || 'Không có mô tả'}
                      </p>
                    </div>

                    <div className="text-[10px] text-[var(--text-muted)] whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pinned Projects */}
          <div className="p-5 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                <FolderGit2 size={16} className="text-[var(--accent)]" />
                <span>Dự án nổi bật & Đã ghim</span>
              </h2>
              <Link href="/admin/projects" className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1 font-medium">
                <span>Quản lý dự án</span>
                <ArrowUpRight size={13} />
              </Link>
            </div>

            {pinnedProjects.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] py-4 text-center">Chưa có dự án nào được ghim.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {pinnedProjects.map((p) => (
                  <div key={p.id} className="p-3.5 border border-[var(--border-color)] rounded-xl space-y-2 hover:border-[var(--text-secondary)] transition-all">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-[var(--text-primary)] truncate">{p.title}</span>
                      <VisibilityBadge visibility={p.visibility} />
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2">{p.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Link-First Resources & Security Mini */}
        <div className="space-y-6">
          {/* Link-First Resources Widget */}
          <div className="p-5 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                <Bookmark size={16} className="text-[var(--accent)]" />
                <span>Tài nguyên Link-First</span>
              </h2>
              <Link href="/admin/resources" className="text-xs text-[var(--accent)] hover:underline font-medium">
                Tất cả →
              </Link>
            </div>

            <p className="text-[11px] text-[var(--text-muted)]">
              Quản lý tài nguyên lưu trữ ngoài (Google Drive, GitHub, OneDrive...).
            </p>

            <div className="space-y-2">
              {recentResources.map((r) => {
                const meta = (r.metadata || {}) as Record<string, unknown>;
                return (
                  <div key={r.id} className="p-3 bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] rounded-xl flex items-center justify-between gap-3">
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{r.title}</p>
                      <span className="text-[10px] text-[var(--accent)] font-medium">
                        {(meta.provider as string) || 'Liên kết ngoài'}
                      </span>
                    </div>
                    {typeof meta.url === 'string' && (
                      <a
                        href={meta.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-md border border-[var(--border-color)] bg-[var(--bg-surface)]"
                        title="Mở liên kết"
                      >
                        <ExternalLink size={13} />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Security Status Mini */}
          <div className="p-5 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl space-y-3">
            <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-600" />
              <span>Trạng thái bảo mật</span>
            </h2>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-[var(--text-secondary)]">
                <span>Ranh giới API Backend:</span>
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 size={12} /> Tách biệt 100%
                </span>
              </div>
              <div className="flex items-center justify-between text-[var(--text-secondary)]">
                <span>Khóa Panic Lock:</span>
                <span className="text-[var(--text-primary)] font-medium">Ctrl + Shift + L</span>
              </div>
              <div className="flex items-center justify-between text-[var(--text-secondary)]">
                <span>Bảo vệ Mật khẩu Khách:</span>
                <span className="text-[var(--text-muted)]">Tùy chọn trong Cài đặt</span>
              </div>
            </div>

            <div className="pt-2">
              <Link href="/admin/security">
                <Button size="sm" variant="outline" className="w-full text-xs">
                  Xem nhật ký bảo mật & Phiên
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Scratchpad Sticky Notes Desk */}
      <div className="pt-4 border-t border-[var(--border-color)]">
        <ScratchpadDesk />
      </div>
    </div>
  );
}
