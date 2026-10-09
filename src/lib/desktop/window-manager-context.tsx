'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { WindowState } from '@/lib/types';
import {
  createDefaultWindow,
  clampPosition,
  calculateSnapBounds,
  reorderZIndices,
} from './window-utils';

export type DesktopMode = 'desktop' | 'workspace';

interface WindowManagerContextType {
  windows: WindowState[];
  activeWindowId: string | null;
  desktopMode: DesktopMode;
  openWindow: (
    appId: string,
    title?: string,
    initialSize?: { width: number; height: number },
    icon?: string
  ) => void;
  closeWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  restoreWindow: (id: string) => void;
  maximizeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  moveWindow: (id: string, x: number, y: number) => void;
  resizeWindow: (
    id: string,
    width: number,
    height: number,
    x?: number,
    y?: number
  ) => void;
  snapWindow: (id: string, side: 'left' | 'right') => void;
  toggleDesktopMode: () => void;
  setDesktopMode: (mode: DesktopMode) => void;
  minimizeAll: () => void;
}

const WindowManagerContext = createContext<WindowManagerContextType | undefined>(undefined);

const STORAGE_KEY_WINDOWS = 'webos_windows_v5';
const STORAGE_KEY_MODE = 'webos_desktop_mode_v5';

const DEFAULT_APPS: Record<string, { title: string; icon?: string; defaultSize?: { width: number; height: number } }> = {
  tasks: { title: 'Quản lý công việc Kanban', defaultSize: { width: 1040, height: 680 } },
  inbox: { title: 'Universal Capture Inbox', defaultSize: { width: 860, height: 600 } },
  vault: { title: 'Két mật mã Zero-Knowledge', defaultSize: { width: 880, height: 560 } },
  devtools: { title: 'Developer Power Lab', defaultSize: { width: 1000, height: 680 } },
  notes: { title: 'Ghi chú nháp Scratchpad', defaultSize: { width: 720, height: 520 } },
  snippets: { title: 'Kho Code Snippets', defaultSize: { width: 860, height: 580 } },
  music: { title: 'Phòng thẩm âm & Lo-Fi Studio', defaultSize: { width: 840, height: 560 } },
  wallpapers: { title: 'Custom Wallpaper Studio', defaultSize: { width: 940, height: 620 } },
  research: { title: 'Kho nghiên cứu & Bằng chứng', defaultSize: { width: 960, height: 640 } },
  ai: { title: 'AI Copilot Dock', defaultSize: { width: 800, height: 620 } },
  settings: { title: 'Cài đặt hệ thống Web OS', defaultSize: { width: 760, height: 540 } },
};

export function WindowManagerProvider({ children }: { children: React.ReactNode }) {
  const [windows, setWindows] = useState<WindowState[]>([]);
  const [activeWindowId, setActiveWindowId] = useState<string | null>(null);
  const [desktopMode, setDesktopModeState] = useState<DesktopMode>('desktop');
  const [isHydrated, setIsHydrated] = useState(false);

  // Rehydrate safely after mount
  useEffect(() => {
    try {
      const savedMode = localStorage.getItem(STORAGE_KEY_MODE) as DesktopMode | null;
      if (savedMode === 'desktop' || savedMode === 'workspace') {
        setDesktopModeState(savedMode);
      }

      const savedWindowsRaw = localStorage.getItem(STORAGE_KEY_WINDOWS);
      if (savedWindowsRaw) {
        const parsed: WindowState[] = JSON.parse(savedWindowsRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setWindows(parsed);
          const topWindow = parsed.filter((w) => !w.isMinimized).sort((a, b) => b.zIndex - a.zIndex)[0];
          if (topWindow) {
            setActiveWindowId(topWindow.id);
          }
        }
      }
    } catch (e) {
      console.warn('Lỗi đọc cấu hình desktop từ localStorage:', e);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Save to localStorage whenever windows change
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY_WINDOWS, JSON.stringify(windows));
      localStorage.setItem(STORAGE_KEY_MODE, desktopMode);
    } catch (e) {
      console.warn('Lỗi lưu cấu hình desktop vào localStorage:', e);
    }
  }, [windows, desktopMode, isHydrated]);

  const focusWindow = useCallback((id: string) => {
    setWindows((prev) => reorderZIndices(prev, id));
    setActiveWindowId(id);
  }, []);

  const openWindow = useCallback(
    (appId: string, title?: string, initialSize?: { width: number; height: number }, icon?: string) => {
      setWindows((prev) => {
        const existing = prev.find((w) => w.appId === appId);
        if (existing) {
          // Unminimize and focus
          const updated = prev.map((w) =>
            w.id === existing.id ? { ...w, isMinimized: false } : w
          );
          return reorderZIndices(updated, existing.id);
        }

        const appDef = DEFAULT_APPS[appId];
        const effectiveTitle = title || appDef?.title || appId.toUpperCase();
        const effectiveSize = initialSize || appDef?.defaultSize || { width: 860, height: 580 };
        const id = `win-${appId}-${Date.now()}`;

        // Stagger position based on number of existing open windows
        const stagger = (prev.length % 6) * 32;
        const screenW = typeof window !== 'undefined' ? window.innerWidth : 1440;
        const screenH = typeof window !== 'undefined' ? window.innerHeight : 900;
        const clamped = clampPosition(
          { x: 80 + stagger, y: 56 + stagger },
          effectiveSize,
          screenW,
          screenH
        );

        const newWin = createDefaultWindow({
          id,
          appId,
          title: effectiveTitle,
          icon: icon || appDef?.icon,
          initialSize: effectiveSize,
          initialPosition: clamped,
        });

        const withNew = [...prev, newWin];
        return reorderZIndices(withNew, id);
      });

      // Update active window id
      setTimeout(() => {
        setWindows((current) => {
          const match = current.find((w) => w.appId === appId);
          if (match) setActiveWindowId(match.id);
          return current;
        });
      }, 0);
    },
    []
  );

  const closeWindow = useCallback((id: string) => {
    setWindows((prev) => {
      const remaining = prev.filter((w) => w.id !== id);
      const topNext = remaining.filter((w) => !w.isMinimized).sort((a, b) => b.zIndex - a.zIndex)[0];
      setActiveWindowId(topNext ? topNext.id : null);
      return remaining;
    });
  }, []);

  const minimizeWindow = useCallback((id: string) => {
    setWindows((prev) => {
      const updated = prev.map((w) => (w.id === id ? { ...w, isMinimized: true } : w));
      const topNext = updated.filter((w) => !w.isMinimized).sort((a, b) => b.zIndex - a.zIndex)[0];
      setActiveWindowId(topNext ? topNext.id : null);
      return updated;
    });
  }, []);

  const restoreWindow = useCallback((id: string) => {
    setWindows((prev) => {
      const updated = prev.map((w) => (w.id === id ? { ...w, isMinimized: false } : w));
      return reorderZIndices(updated, id);
    });
    setActiveWindowId(id);
  }, []);

  const maximizeWindow = useCallback((id: string) => {
    const screenW = typeof window !== 'undefined' ? window.innerWidth : 1440;
    const screenH = typeof window !== 'undefined' ? window.innerHeight : 900;

    setWindows((prev) =>
      prev.map((w) => {
        if (w.id !== id) return w;

        if (w.isMaximized) {
          // Restore previous position and size
          const prevBounds = w.prevBounds || {
            x: 100,
            y: 80,
            width: 860,
            height: 580,
          };
          return {
            ...w,
            isMaximized: false,
            position: { x: prevBounds.x, y: prevBounds.y },
            size: { width: prevBounds.width, height: prevBounds.height },
          };
        } else {
          // Maximize
          const maxBounds = calculateSnapBounds('maximize', screenW, screenH);
          return {
            ...w,
            isMaximized: true,
            prevBounds: {
              x: w.position.x,
              y: w.position.y,
              width: w.size.width,
              height: w.size.height,
            },
            position: { x: maxBounds.x, y: maxBounds.y },
            size: { width: maxBounds.width, height: maxBounds.height },
          };
        }
      })
    );
    setActiveWindowId(id);
  }, []);

  const moveWindow = useCallback((id: string, x: number, y: number) => {
    const screenW = typeof window !== 'undefined' ? window.innerWidth : 1440;
    const screenH = typeof window !== 'undefined' ? window.innerHeight : 900;

    setWindows((prev) =>
      prev.map((w) => {
        if (w.id !== id) return w;
        const clamped = clampPosition({ x, y }, w.size, screenW, screenH);
        return {
          ...w,
          position: clamped,
          isMaximized: false, // Dragging titlebar un-maximizes
        };
      })
    );
  }, []);

  const resizeWindow = useCallback(
    (id: string, width: number, height: number, x?: number, y?: number) => {
      setWindows((prev) =>
        prev.map((w) => {
          if (w.id !== id) return w;
          const minW = 380;
          const minH = 260;
          return {
            ...w,
            size: {
              width: Math.max(minW, width),
              height: Math.max(minH, height),
            },
            position: {
              x: x !== undefined ? x : w.position.x,
              y: y !== undefined ? y : w.position.y,
            },
            isMaximized: false,
          };
        })
      );
    },
    []
  );

  const snapWindow = useCallback((id: string, side: 'left' | 'right') => {
    const screenW = typeof window !== 'undefined' ? window.innerWidth : 1440;
    const screenH = typeof window !== 'undefined' ? window.innerHeight : 900;
    const snapBounds = calculateSnapBounds(side, screenW, screenH);

    setWindows((prev) =>
      prev.map((w) => {
        if (w.id !== id) return w;
        return {
          ...w,
          isMaximized: false,
          prevBounds: {
            x: w.position.x,
            y: w.position.y,
            width: w.size.width,
            height: w.size.height,
          },
          position: { x: snapBounds.x, y: snapBounds.y },
          size: { width: snapBounds.width, height: snapBounds.height },
        };
      })
    );
    setActiveWindowId(id);
  }, []);

  const toggleDesktopMode = useCallback(() => {
    setDesktopModeState((prev) => (prev === 'desktop' ? 'workspace' : 'desktop'));
  }, []);

  const setDesktopMode = useCallback((mode: DesktopMode) => {
    setDesktopModeState(mode);
  }, []);

  const minimizeAll = useCallback(() => {
    setWindows((prev) => prev.map((w) => ({ ...w, isMinimized: true })));
    setActiveWindowId(null);
  }, []);

  const value = useMemo(
    () => ({
      windows,
      activeWindowId,
      desktopMode,
      openWindow,
      closeWindow,
      minimizeWindow,
      restoreWindow,
      maximizeWindow,
      focusWindow,
      moveWindow,
      resizeWindow,
      snapWindow,
      toggleDesktopMode,
      setDesktopMode,
      minimizeAll,
    }),
    [
      windows,
      activeWindowId,
      desktopMode,
      openWindow,
      closeWindow,
      minimizeWindow,
      restoreWindow,
      maximizeWindow,
      focusWindow,
      moveWindow,
      resizeWindow,
      snapWindow,
      toggleDesktopMode,
      setDesktopMode,
      minimizeAll,
    ]
  );

  return (
    <WindowManagerContext.Provider value={value}>
      {children}
    </WindowManagerContext.Provider>
  );
}

export function useWindowManager() {
  const context = useContext(WindowManagerContext);
  if (!context) {
    throw new Error('useWindowManager must be used within a WindowManagerProvider');
  }
  return context;
}
