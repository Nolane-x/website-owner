'use client';

import React, { useState, useEffect } from 'react';
import { useWindowManager } from '@/lib/desktop/window-manager-context';
import {
  Monitor,
  LayoutGrid,
  Wifi,
  Sparkles,
  Maximize,
  Moon,
  Clock,
  Radio,
  Image as ImageIcon,
} from 'lucide-react';

interface DesktopTopbarProps {
  onOpenWallpaperStudio?: () => void;
  onOpenScreensaver?: () => void;
  onToggleRadio?: () => void;
  onOpenCommandPalette?: () => void;
}

export function DesktopTopbar({
  onOpenWallpaperStudio,
  onOpenScreensaver,
  onToggleRadio,
  onOpenCommandPalette,
}: DesktopTopbarProps) {
  const { desktopMode, toggleDesktopMode, activeWindowId, windows, openWindow } = useWindowManager();
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');
  const [ping, setPing] = useState<number>(24);

  // Update clock every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
      setDateStr(
        now.toLocaleDateString('vi-VN', {
          weekday: 'short',
          day: '2-digit',
          month: '2-digit',
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Simulate subtle ping fluctuations (realistic telemetry)
  useEffect(() => {
    const interval = setInterval(() => {
      setPing(Math.floor(18 + Math.random() * 14));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const activeWindow = windows.find((w) => w.id === activeWindowId);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-9 z-40 bg-stone-950/85 backdrop-blur-xl border-b border-stone-800/80 px-3 flex items-center justify-between text-xs text-stone-300 select-none">
      {/* Left branding & menu */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 font-bold tracking-tight text-white">
          <span className="w-4 h-4 rounded-md bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-[10px] text-stone-950 font-black shadow-sm">
            5
          </span>
          <span className="text-emerald-400 font-semibold">WebOS</span>
          <span className="text-stone-500 font-mono text-[10px]">v5.0</span>
        </div>

        <div className="h-3.5 w-[1px] bg-stone-800" />

        {/* Dual Mode Switcher Button */}
        <button
          onClick={toggleDesktopMode}
          title={
            desktopMode === 'desktop'
              ? 'Chuyển sang chế độ Không gian Làm việc (Workspace Grid)'
              : 'Chuyển sang chế độ Bàn làm việc Ảo (Virtual Desktop)'
          }
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium transition ${
            desktopMode === 'desktop'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
          }`}
        >
          {desktopMode === 'desktop' ? (
            <>
              <Monitor className="w-3.5 h-3.5 text-emerald-400" />
              <span>Chế độ Cửa sổ</span>
            </>
          ) : (
            <>
              <LayoutGrid className="w-3.5 h-3.5 text-sky-400" />
              <span>Không gian Lưới</span>
            </>
          )}
        </button>

        {/* Quick App launcher dropdown triggers */}
        <div className="hidden md:flex items-center gap-1 text-stone-400">
          <button
            onClick={() => openWindow('inbox')}
            className="px-2 py-0.5 rounded hover:bg-stone-800 hover:text-stone-200 transition"
          >
            Hộp thư
          </button>
          <button
            onClick={() => openWindow('tasks')}
            className="px-2 py-0.5 rounded hover:bg-stone-800 hover:text-stone-200 transition"
          >
            Nhiệm vụ
          </button>
          <button
            onClick={() => openWindow('research')}
            className="px-2 py-0.5 rounded hover:bg-stone-800 hover:text-stone-200 transition"
          >
            Nghiên cứu
          </button>
          <button
            onClick={() => openWindow('devtools')}
            className="px-2 py-0.5 rounded hover:bg-stone-800 hover:text-stone-200 transition"
          >
            Dev Lab
          </button>
        </div>
      </div>

      {/* Center active app indicator & Command Palette shortcut */}
      <div className="flex items-center gap-2">
        {activeWindow ? (
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-stone-900 border border-stone-800 text-stone-200 text-[11px] font-medium truncate max-w-[240px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="truncate">{activeWindow.title}</span>
          </div>
        ) : (
          <button
            onClick={onOpenCommandPalette}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-stone-900/60 hover:bg-stone-800 border border-stone-800 text-stone-400 hover:text-stone-200 text-[11px] transition"
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Lệnh nhanh (Ctrl+K)</span>
          </button>
        )}
      </div>

      {/* Right status & telemetry */}
      <div className="flex items-center gap-2.5">
        {/* Telemetry ping */}
        <div
          title={`Độ trễ mạng hệ thống: ${ping}ms`}
          className="hidden sm:flex items-center gap-1 text-[11px] text-stone-400 font-mono"
        >
          <Wifi className="w-3 h-3 text-emerald-400" />
          <span>{ping}ms</span>
        </div>

        {/* Wallpaper Studio quick icon */}
        {onOpenWallpaperStudio && (
          <button
            onClick={onOpenWallpaperStudio}
            title="Mở Wallpaper Studio & Hiệu ứng Shader"
            className="p-1 rounded hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition"
          >
            <ImageIcon className="w-3.5 h-3.5 text-teal-400" />
          </button>
        )}

        {/* Lo-Fi Radio toggle */}
        {onToggleRadio && (
          <button
            onClick={onToggleRadio}
            title="Bật/Tắt Radio Lo-Fi & Âm thanh tập trung"
            className="p-1 rounded hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition"
          >
            <Radio className="w-3.5 h-3.5 text-rose-400" />
          </button>
        )}

        {/* Screensaver toggle */}
        {onOpenScreensaver && (
          <button
            onClick={onOpenScreensaver}
            title="Bật chế độ Màn hình chờ (Screensaver)"
            className="p-1 rounded hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition"
          >
            <Moon className="w-3.5 h-3.5 text-indigo-400" />
          </button>
        )}

        {/* Fullscreen */}
        <button
          onClick={toggleFullScreen}
          title="Toàn màn hình"
          className="p-1 rounded hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition"
        >
          <Maximize className="w-3.5 h-3.5" />
        </button>

        <div className="h-3.5 w-[1px] bg-stone-800" />

        {/* Clock & Date */}
        <div className="flex items-center gap-1.5 font-mono text-[11px] text-stone-200 font-medium">
          <Clock className="w-3 h-3 text-emerald-400" />
          <span>{timeStr || '--:--:--'}</span>
          <span className="hidden md:inline text-stone-500 font-normal">{dateStr}</span>
        </div>
      </div>
    </header>
  );
}
