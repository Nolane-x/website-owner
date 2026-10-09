'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AdminSidebar, type NavItem } from '@/components/layout/admin-sidebar';
import { AdminHeader, type AdminHeaderProfile } from '@/components/layout/admin-header';
import { CommandMenu } from '@/components/ui/command-menu';
import { QuickAddModal } from '@/components/ui/quick-add-modal';
import { PanicLockOverlay } from '@/components/ui/panic-lock-modal';
import { DevToolsModal } from '@/components/ui/dev-tools-modal';
import { FocusStudioModal } from '@/components/ui/focus-studio-modal';
import { WallpaperEngine, WallpaperSelectorModal } from '@/components/ui/wallpaper-engine';
import { FloatingDock } from '@/components/ui/floating-dock';
import { playSound } from '@/lib/audio/sound-fx';
import {
  WindowManagerProvider,
  useWindowManager,
} from '@/lib/desktop/window-manager-context';
import { VirtualDesktop } from '@/components/desktop/virtual-desktop';
import { ScreensaverModal } from '@/components/wallpaper/screensaver-modal';

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <WindowManagerProvider>
      <AdminShellInner>{children}</AdminShellInner>
    </WindowManagerProvider>
  );
}

function AdminShellInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { desktopMode, openWindow } = useWindowManager();

  const isLoginPage = pathname === '/admin/login';
  const [loading, setLoading] = useState(!isLoginPage);
  const [profile, setProfile] = useState<AdminHeaderProfile | null>(null);
  const [navItems, setNavItems] = useState<NavItem[]>([]);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [isPanicLocked, setIsPanicLocked] = useState(false);
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);

  // Power Suite Modals
  const [devToolsOpen, setDevToolsOpen] = useState(false);
  const [focusStudioOpen, setFocusStudioOpen] = useState(false);
  const [wallpaperSelectorOpen, setWallpaperSelectorOpen] = useState(false);
  const [screensaverOpen, setScreensaverOpen] = useState(false);

  useEffect(() => {
    if (isLoginPage) {
      return;
    }

    let isMounted = true;
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.push('/admin/login');
          return;
        }
        const data = (await res.json()) as { profile?: AdminHeaderProfile };
        if (isMounted) {
          setProfile(data.profile || null);
        }

        // Tải cấu hình navigation
        const setRes = await fetch('/api/admin/settings');
        if (setRes.ok && isMounted) {
          const setData = (await setRes.json()) as { settings?: { nav_config?: { items?: NavItem[] } } };
          if (setData.settings?.nav_config?.items) {
            setNavItems(setData.settings.nav_config.items);
          }
        }
      } catch {
        router.push('/admin/login');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    checkAuth();
    return () => {
      isMounted = false;
    };
  }, [pathname, isLoginPage, router]);

  // Lắng nghe phím tắt:
  // Panic Lock: Ctrl + Shift + L
  // DevTools: Ctrl + Shift + D
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault();
        setIsPanicLocked(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        playSound('pop');
        setDevToolsOpen((prev) => !prev);
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
          <p className="text-xs text-[var(--text-secondary)] font-medium">Đang khởi tạo Personal Web OS 5.0...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen w-screen overflow-hidden bg-[var(--bg-page)] text-[var(--text-primary)] relative ${isPrivacyMode ? 'privacy-screen-active' : ''}`}>
      {/* Background Wallpaper Engine */}
      <WallpaperEngine />

      {/* Mode 1: Virtual Desktop (Window Manager) */}
      {desktopMode === 'desktop' ? (
        <VirtualDesktop
          wallpaperBackground={null}
          onOpenWallpaperStudio={() => openWindow('wallpapers', 'Custom Wallpaper Studio')}
          onOpenScreensaver={() => setScreensaverOpen(true)}
          onToggleRadio={() => openWindow('music', 'Phòng Thẩm Âm & Lo-Fi')}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        />
      ) : (
        /* Mode 2: Traditional Workspace Grid Shell */
        <div className="flex h-screen overflow-hidden relative z-10">
          <AdminSidebar
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            navItems={navItems}
          />

          <div className="flex flex-col flex-1 min-w-0 overflow-hidden relative z-10">
            <AdminHeader
              onOpenQuickAdd={() => setQuickAddOpen(true)}
              onOpenCommandPalette={() => setCommandPaletteOpen(true)}
              onTriggerPanicLock={() => setIsPanicLocked(true)}
              isPrivacyMode={isPrivacyMode}
              onTogglePrivacyMode={() => setIsPrivacyMode(!isPrivacyMode)}
              profile={profile}
            />

            <main className={`flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pb-20 ${isPrivacyMode ? 'privacy-blur' : ''}`}>
              <div className="max-w-7xl mx-auto">{children}</div>
            </main>
          </div>

          {/* macOS-style Floating Dock */}
          <FloatingDock
            onOpenFocusStudio={() => setFocusStudioOpen(true)}
            onOpenDevTools={() => setDevToolsOpen(true)}
            onOpenWallpaper={() => setWallpaperSelectorOpen(true)}
            onTriggerPanicLock={() => setIsPanicLocked(true)}
          />
        </div>
      )}

      {/* Global Modals & Power Tools */}
      <CommandMenu
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        onTriggerQuickAdd={() => setQuickAddOpen(true)}
        onTriggerPanicLock={() => setIsPanicLocked(true)}
        onTriggerDevTools={() => setDevToolsOpen(true)}
        onTriggerFocusStudio={() => setFocusStudioOpen(true)}
      />

      <QuickAddModal
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        onSuccess={() => {
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

      <DevToolsModal
        isOpen={devToolsOpen}
        onClose={() => setDevToolsOpen(false)}
      />

      <FocusStudioModal
        isOpen={focusStudioOpen}
        onClose={() => setFocusStudioOpen(false)}
      />

      <WallpaperSelectorModal
        isOpen={wallpaperSelectorOpen}
        onClose={() => setWallpaperSelectorOpen(false)}
      />

      <ScreensaverModal
        isOpen={screensaverOpen}
        onClose={() => setScreensaverOpen(false)}
      />
    </div>
  );
}
