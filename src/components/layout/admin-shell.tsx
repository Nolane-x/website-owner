'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { AdminHeader } from '@/components/layout/admin-header';
import { CommandMenu } from '@/components/ui/command-menu';
import { QuickAddModal } from '@/components/ui/quick-add-modal';
import { PanicLockOverlay } from '@/components/ui/panic-lock-modal';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [navItems, setNavItems] = useState<any[]>([]);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [isPanicLocked, setIsPanicLocked] = useState(false);
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);

  // Không áp dụng shell cho trang login
  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    if (isLoginPage) {
      setLoading(false);
      return;
    }

    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.push('/admin/login');
          return;
        }
        const data = await res.json();
        setProfile(data.profile);

        // Tải cấu hình navigation
        const setRes = await fetch('/api/admin/settings');
        if (setRes.ok) {
          const setData = await setRes.json();
          if (setData.settings?.nav_config?.items) {
            setNavItems(setData.settings.nav_config.items);
          }
        }
      } catch {
        router.push('/admin/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [pathname, isLoginPage, router]);

  // Lắng nghe phím tắt Panic Lock: Ctrl + Shift + L
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault();
        setIsPanicLocked(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg-page)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-[var(--text-secondary)] font-medium">Đang khởi tạo Personal Web OS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen overflow-hidden bg-[var(--bg-page)] text-[var(--text-primary)] ${isPrivacyMode ? 'privacy-screen-active' : ''}`}>
      <AdminSidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        navItems={navItems}
      />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <AdminHeader
          onOpenQuickAdd={() => setQuickAddOpen(true)}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          onTriggerPanicLock={() => setIsPanicLocked(true)}
          isPrivacyMode={isPrivacyMode}
          onTogglePrivacyMode={() => setIsPrivacyMode(!isPrivacyMode)}
          profile={profile}
        />

        <main className={`flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 ${isPrivacyMode ? 'privacy-blur' : ''}`}>
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>

      {/* Global Modals */}
      <CommandMenu
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        onTriggerQuickAdd={() => setQuickAddOpen(true)}
        onTriggerPanicLock={() => setIsPanicLocked(true)}
      />

      <QuickAddModal
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        onSuccess={() => {
          // Trigger refresh event
          window.dispatchEvent(new Event('webos:refresh-content'));
        }}
      />

      <PanicLockOverlay
        isLocked={isPanicLocked}
        onUnlock={() => setIsPanicLocked(false)}
        onLogout={() => {
          fetch('/api/auth/logout', { method: 'POST' }).then(() => {
            router.push('/admin/login');
          });
        }}
      />
    </div>
  );
}
