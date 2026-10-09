'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useWindowManager } from '@/lib/desktop/window-manager-context';
import { WindowFrame } from './window-frame';
import { DesktopTopbar } from './desktop-topbar';
import { DesktopDock } from './desktop-dock';
import { DesktopWidgets } from './desktop-widgets';
import { DesktopContextMenu } from './desktop-context-menu';
import { renderAppContent } from './window-app-registry';
import { OmniCommandPalette } from './omni-command-palette';

interface VirtualDesktopProps {
  onOpenWallpaperStudio?: () => void;
  onOpenScreensaver?: () => void;
  onToggleRadio?: () => void;
  onOpenCommandPalette?: () => void;
  wallpaperBackground?: React.ReactNode;
}

export function VirtualDesktop({
  onOpenWallpaperStudio,
  onOpenScreensaver,
  onToggleRadio,
  onOpenCommandPalette,
  wallpaperBackground,
}: VirtualDesktopProps) {
  const { windows, desktopMode, isOmniOpen, setOmniOpen } = useWindowManager();
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOmniOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setOmniOpen]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    // Only open context menu when clicking on desktop canvas itself
    const target = e.target as HTMLElement;
    if (
      target.closest('.fixed.top-0.left-0.flex.flex-col') || // Inside a window frame
      target.closest('header') || // Topbar
      target.closest('.fixed.bottom-3') // Dock
    ) {
      return;
    }

    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  }, []);

  // When in workspace mode, we don't render floating desktop windows
  if (desktopMode === 'workspace') {
    return null;
  }

  return (
    <div
      onContextMenu={handleContextMenu}
      className="fixed inset-0 z-30 overflow-hidden select-none"
    >
      {/* Dynamic Wallpaper background slot */}
      {wallpaperBackground}

      {/* Desktop background widgets and shortcuts */}
      <DesktopWidgets />

      {/* Floating active and minimized windows */}
      {windows.map((win) => (
        <WindowFrame key={win.id} window={win}>
          {renderAppContent(win.appId)}
        </WindowFrame>
      ))}

      {/* Top system navigation bar */}
      <DesktopTopbar
        onOpenWallpaperStudio={onOpenWallpaperStudio}
        onOpenScreensaver={onOpenScreensaver}
        onToggleRadio={onToggleRadio}
        onOpenCommandPalette={() => setOmniOpen(true)}
      />

      {/* Bottom application launcher dock */}
      <DesktopDock />

      {/* Omni Spotlight Command Palette (Ctrl+K) */}
      <OmniCommandPalette
        isOpen={isOmniOpen}
        onClose={() => setOmniOpen(false)}
      />

      {/* Right-click desktop context menu */}
      {contextMenuPos && (
        <DesktopContextMenu
          x={contextMenuPos.x}
          y={contextMenuPos.y}
          onClose={() => setContextMenuPos(null)}
          onOpenWallpaperStudio={onOpenWallpaperStudio}
          onOpenScreensaver={onOpenScreensaver}
        />
      )}
    </div>
  );
}
