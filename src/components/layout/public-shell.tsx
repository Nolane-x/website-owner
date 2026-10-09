'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { PublicHeader } from '@/components/layout/public-header';
import { PublicFooter } from '@/components/layout/public-footer';
import { PublicSearchModal } from '@/components/ui/public-search-modal';
import { GuestPasswordModal } from '@/components/ui/guest-password-modal';
import { DecorativeMesh } from '@/components/ui/decorative-mesh';

interface SiteData {
  profile: {
    displayName: string;
    bio: string;
    avatarUrl: string | null;
  };
  navigation: {
    items: Array<{ label: string; href: string }>;
  };
  accessProtection: {
    requirePassword: boolean;
    passwordHint?: string;
    isUnlocked: boolean;
  };
}

export function PublicShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [siteData, setSiteData] = useState<SiteData | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [guestLocked, setGuestLocked] = useState(false);

  const fetchSiteData = React.useCallback(() => {
    fetch('/api/public/site')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Fetch failed'))))
      .then((data: SiteData) => {
        setSiteData(data);
        if (data.accessProtection?.requirePassword && !data.accessProtection?.isUnlocked) {
          setGuestLocked(true);
        } else {
          setGuestLocked(false);
        }
      })
      .catch((e) => {
        console.error('Lỗi tải thông tin site công khai:', e);
      });
  }, []);

  useEffect(() => {
    fetchSiteData();

    // Global shortcut Ctrl+K / Cmd+K for public search
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [fetchSiteData]);

  return (
    <div className="relative min-h-screen flex flex-col bg-[var(--bg-page)] text-[var(--text-primary)] transition-colors selection:bg-[var(--accent)] selection:text-white overflow-x-hidden">
      <DecorativeMesh />
      {/* Public Header wrapped in Suspense for usePathname hook */}
      <Suspense fallback={<div className="h-16 border-b border-[var(--border-color)] bg-[var(--bg-surface)]" />}>
        <PublicHeader
          siteTitle={siteData?.profile?.displayName || 'Personal Web OS'}
          navItems={siteData?.navigation?.items}
          onOpenSearch={() => setSearchOpen(true)}
        />
      </Suspense>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-12 animate-in fade-in-50 duration-200">
        {guestLocked ? (
          <div className="py-24 text-center max-w-md mx-auto space-y-4">
            <h2 className="text-xl font-serif font-bold text-[var(--text-primary)]">
              Khu vực yêu cầu mật mã khách
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Chủ sở hữu đã thiết lập mã bảo vệ cho trang web công khai này. Vui lòng mở khóa để tiếp tục khám phá.
            </p>
            <GuestPasswordModal
              open={guestLocked}
              passwordHint={siteData?.accessProtection?.passwordHint}
              onSuccess={() => {
                setGuestLocked(false);
                fetchSiteData();
              }}
            />
          </div>
        ) : (
          children
        )}
      </main>

      {/* Public Footer */}
      <PublicFooter
        siteTitle={siteData?.profile?.displayName || 'Personal Web OS'}
        author={siteData?.profile?.displayName || 'Chủ Sở Hữu'}
      />

      {/* Public Search Modal */}
      <PublicSearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
      />
    </div>
  );
}
