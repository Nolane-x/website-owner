'use client';

import React, { useEffect } from 'react';
import { useWindowManager } from '@/lib/desktop/window-manager-context';
import {
  Image as ImageIcon,
  Moon,
  Layers,
  LayoutGrid,
  Inbox,
  Code2,
  Lock,
  Sparkles,
} from 'lucide-react';

interface DesktopContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onOpenWallpaperStudio?: () => void;
  onOpenScreensaver?: () => void;
}

export function DesktopContextMenu({
  x,
  y,
  onClose,
  onOpenWallpaperStudio,
  onOpenScreensaver,
}: DesktopContextMenuProps) {
  const { minimizeAll, toggleDesktopMode, openWindow, setOmniOpen } = useWindowManager();

  useEffect(() => {
    const handleClick = () => onClose();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Keep menu within screen boundaries
  const menuW = 230;
  const menuH = 260;
  const screenW = typeof window !== 'undefined' ? window.innerWidth : 1440;
  const screenH = typeof window !== 'undefined' ? window.innerHeight : 900;

  const posX = Math.min(x, screenW - menuW - 10);
  const posY = Math.min(y, screenH - menuH - 10);

  return (
    <div
      style={{ left: `${posX}px`, top: `${posY}px` }}
      onClick={(e) => e.stopPropagation()}
      className="fixed z-50 w-56 rounded-xl backdrop-blur-2xl bg-stone-900/95 border border-stone-700/80 shadow-2xl shadow-black p-1.5 text-xs text-stone-200 select-none animate-in fade-in zoom-in-95 duration-100"
    >
      <button
        onClick={() => {
          onClose();
          setOmniOpen(true);
        }}
        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-stone-800 hover:text-white transition text-left text-amber-300 font-medium"
      >
        <Sparkles className="w-4 h-4 text-amber-400" />
        <span>Lệnh nhanh Omni (Ctrl+K)</span>
      </button>

      <div className="h-[1px] bg-stone-800 my-1" />

      <button
        onClick={() => {
          onClose();
          onOpenWallpaperStudio?.();
        }}
        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-stone-800 hover:text-white transition text-left"
      >
        <ImageIcon className="w-4 h-4 text-teal-400" />
        <span>Tùy chỉnh hình nền & Shaders</span>
      </button>

      <button
        onClick={() => {
          onClose();
          onOpenScreensaver?.();
        }}
        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-stone-800 hover:text-white transition text-left"
      >
        <Moon className="w-4 h-4 text-indigo-400" />
        <span>Bật màn hình chờ (Screensaver)</span>
      </button>

      <div className="h-[1px] bg-stone-800 my-1" />

      <button
        onClick={() => {
          onClose();
          openWindow('inbox');
        }}
        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-stone-800 hover:text-white transition text-left"
      >
        <Inbox className="w-4 h-4 text-sky-400" />
        <span>Thu thập nhanh vào Inbox</span>
      </button>

      <button
        onClick={() => {
          onClose();
          openWindow('devtools');
        }}
        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-stone-800 hover:text-white transition text-left"
      >
        <Code2 className="w-4 h-4 text-emerald-400" />
        <span>Developer Power Lab</span>
      </button>

      <div className="h-[1px] bg-stone-800 my-1" />

      <button
        onClick={() => {
          onClose();
          minimizeAll();
        }}
        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-stone-800 hover:text-white transition text-left"
      >
        <Layers className="w-4 h-4 text-stone-400" />
        <span>Thu nhỏ tất cả cửa sổ</span>
      </button>

      <button
        onClick={() => {
          onClose();
          toggleDesktopMode();
        }}
        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-stone-800 hover:text-white transition text-left"
      >
        <LayoutGrid className="w-4 h-4 text-amber-400" />
        <span>Chuyển sang chế độ Không gian Lưới</span>
      </button>

      <div className="h-[1px] bg-stone-800 my-1" />

      <button
        onClick={() => {
          onClose();
          openWindow('vault');
        }}
        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-stone-800 hover:text-white transition text-left"
      >
        <Lock className="w-4 h-4 text-rose-400" />
        <span>Két mật mã bảo mật</span>
      </button>
    </div>
  );
}
