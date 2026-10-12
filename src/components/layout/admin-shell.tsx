'use client';

import React, { useState, useEffect, useRef } from 'react';
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

  const isAuthExemptPage = pathname === '/admin/login' || pathname === '/admin/bootstrap';
  const [loading, setLoading] = useState(!isAuthExemptPage);
  const [authUnavailable, setAuthUnavailable] = useState(false);
  const [authRetryNonce, setAuthRetryNonce] = useState(0);
  const [profile, setProfile] = useState<AdminHeaderProfile | null>(null);
  const profileLoadedRef = useRef(false);
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
    // Default to dark theme even when browser storage is unavailable.
    try {
      const savedTheme = localStorage.getItem('webos_theme');
      if (savedTheme === 'light') {
        document.documentElement.classList.remove('dark');
      } else {
        document.documentElement.classList.add('dark');
        if (!savedTheme) localStorage.setItem('webos_theme', 'dark');
      }
    } catch {
      document.documentElement.classList.add('dark');
    }
  }, []);

  useEffect(() => {
    if (isAuthExemptPage) {
      return;
    }

    let isMounted = true;
    const checkAuth = async () => {
      try {
        const profileUrl = profileLoadedRef.current ? '/api/auth/me?summary=1' : '/api/auth/me';
        const res = await fetch(profileUrl, { cache: 'no-store', credentials: 'same-origin' });
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            router.replace('/admin/login');
          } else if (isMounted) {
            // A server/database outage is not the same as a logged-out session.
            setAuthUnavailable(true);
          }
          return;
        }

        const data = (await res.json()) as { profile?: AdminHeaderProfile };
        if (!isMounted) return;
        setProfile((current) => data.profile ? { ...current, ...data.profile } : null);
        profileLoadedRef.current = true;
        setAuthUnavailable(false);

        // Load navigation once per authenticated shell, not on every route change.
        // Navigation failure should not undo a successfully verified owner session.
        try {
          const setRes = await fetch('/api/admin/settings?keys=nav_config', {
            cache: 'no-store',
            credentials: 'same-origin',
          });
          if (setRes.ok && isMounted) {
            const setData = (await setRes.json()) as { settings?: { nav_config?: { items?: NavItem[] } } };
            if (setData.settings?.nav_config?.items) {
              setNavItems(setData.settings.nav_config.items);
            }
          }
        } catch {
          // The sidebar can fall back to its built-in navigation configuration.
        }
      } catch {
        if (isMounted) setAuthUnavailable(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    checkAuth();
    return () => {
      isMounted = false;
    };
  }, [isAuthExemptPage, router, authRetryNonce]);

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
    const handleGlobalPanicLock = () => setIsPanicLocked(true);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('webos:panic-lock', handleGlobalPanicLock);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('webos:panic-lock', handleGlobalPanicLock);
    };
  }, []);

  if (isAuthExemptPage) {
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

  if (authUnavailable) {
    return (
      <main className="relative grid min-h-screen place-items-center overflow-hidden bg-transparent px-5 py-10 text-stone-100">
        {/* The wallpaper remains independent of DB-backed private content. IndexedDB can
            restore the selected upload; otherwise WallpaperEngine renders its built-in fallback. */}
        <WallpaperEngine />
        <div aria-hidden="true" className="pointer-events-none absolute -left-32 -top-32 h-[60vh] w-[60vh] rounded-full bg-teal-600/20 blur-[100px]" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -right-20 h-[65vh] w-[65vh] rounded-full bg-indigo-600/20 blur-[120px]" />
        <section className="relative z-10 w-full max-w-lg space-y-5 rounded-2xl border border-white/10 bg-black/35 p-7 shadow-2xl backdrop-blur-xl" aria-live="polite">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl border border-amber-300/20 bg-amber-300/10 text-xl text-amber-200">!</span>
            <div>
              <h1 className="text-lg font-semibold">Không thể kết nối để xác minh phiên</h1>
              <p className="mt-1 text-xs text-stone-400">Personal Web OS</p>
            </div>
          </div>
          <p className="text-sm leading-6 text-stone-300">
            Máy chủ dữ liệu đang tạm thời không phản hồi. Điều này chưa có nghĩa là bạn đã đăng xuất.
            Vì quyền đăng nhập chưa thể được xác minh, khu vực riêng tư vẫn được khóa an toàn.
            Hình nền mặc định được hiển thị độc lập với dữ liệu cá nhân.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                setAuthUnavailable(false);
                setLoading(true);
                setAuthRetryNonce((value) => value + 1);
              }}
              className="rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-300"
            >
              Thử kết nối lại
            </button>
            <button
              type="button"
              onClick={() => router.replace('/admin/login')}
              className="rounded-lg border border-white/15 px-4 py-2.5 text-sm text-stone-200 transition hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-white/30"
            >
              Về trang đăng nhập
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <div className={`h-screen w-screen overflow-hidden ${
      desktopMode === 'desktop'
        ? 'bg-[#080b11] text-stone-100 dark'
        : 'bg-[var(--bg-page)] text-[var(--text-primary)]'
    } relative ${isPrivacyMode ? 'privacy-screen-active' : ''}`}>
      {/* Background Wallpaper Engine */}
      <WallpaperEngine />

      {/* Mode 1: Virtual Desktop (Window Manager) */}
      {desktopMode === 'desktop' ? (
        <VirtualDesktop
          wallpaperBackground={null}
          onOpenWallpaperStudio={() => openWindow('wallpapers', 'Custom Wallpaper Studio')}
          onOpenScreensaver={() => setScreensaverOpen(true)}
          onToggleRadio={() => openWindow('music', 'Phòng Thẩm Âm & Lo-Fi')}
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
