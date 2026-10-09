'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { playSound } from '@/lib/audio/sound-fx';

export type WallpaperStyle = 'default' | 'aurora' | 'matrix' | 'starfield' | 'obsidian';

export function WallpaperEngine() {
  const [style, setStyle] = useState<WallpaperStyle>(() => {
    if (typeof window === 'undefined') return 'default';
    return (localStorage.getItem('webos_wallpaper_mode') as WallpaperStyle) || 'default';
  });

  useEffect(() => {
    const handleStyleChange = (e: Event) => {
      const customEvent = e as CustomEvent<WallpaperStyle>;
      if (customEvent.detail) {
        setStyle(customEvent.detail);
        localStorage.setItem('webos_wallpaper_mode', customEvent.detail);
      }
    };

    window.addEventListener('webos:set-wallpaper', handleStyleChange);
    return () => window.removeEventListener('webos:set-wallpaper', handleStyleChange);
  }, []);

  if (style === 'default') return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden transition-opacity duration-1000">
      {style === 'aurora' && (
        <div className="absolute inset-0 opacity-40">
          <div className="absolute -top-[30%] -left-[10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-br from-indigo-600/30 via-purple-600/20 to-transparent blur-[120px] animate-pulse duration-1000" />
          <div className="absolute -bottom-[20%] -right-[10%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-tl from-teal-500/20 via-emerald-600/20 to-transparent blur-[100px] animate-pulse duration-700" />
        </div>
      )}

      {style === 'matrix' && (
        <div className="absolute inset-0 opacity-20">
          <div
            className="w-full h-full"
            style={{
              backgroundImage:
                'linear-gradient(rgba(16, 185, 129, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 185, 129, 0.1) 1px, transparent 1px)',
              backgroundSize: '36px 36px',
            }}
          />
        </div>
      )}

      {style === 'starfield' && (
        <div className="absolute inset-0 opacity-30">
          <div
            className="w-full h-full"
            style={{
              backgroundImage:
                'radial-gradient(rgba(255, 255, 255, 0.25) 1px, transparent 1px), radial-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px)',
              backgroundSize: '48px 48px, 96px 96px',
              backgroundPosition: '0 0, 24px 24px',
            }}
          />
        </div>
      )}

      {style === 'obsidian' && (
        <div className="absolute inset-0 bg-[#07080b]/90">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(120,119,198,0.12),transparent_70%)]" />
        </div>
      )}
    </div>
  );
}

export function WallpaperSelectorModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState<WallpaperStyle>(() => {
    if (typeof window === 'undefined') return 'default';
    return (localStorage.getItem('webos_wallpaper_mode') as WallpaperStyle) || 'default';
  });

  const handleSelect = (s: WallpaperStyle) => {
    playSound('snap');
    setCurrent(s);
    localStorage.setItem('webos_wallpaper_mode', s);
    window.dispatchEvent(new CustomEvent('webos:set-wallpaper', { detail: s }));
  };

  if (!isOpen) return null;

  const WALLPAPERS: { id: WallpaperStyle; label: string; desc: string }[] = [
    { id: 'default', label: 'Mặc định (Minimal)', desc: 'Giao diện trung tính gốc của Web OS' },
    { id: 'aurora', label: 'Cực quang huyền ảo (Digital Aurora)', desc: 'Dải cực quang tím và lục mờ ảo nhẹ nhàng' },
    { id: 'matrix', label: 'Mạng lưới Cybernetic (Cyber Grid)', desc: 'Lưới tọa độ xanh lục công nghệ hiện đại' },
    { id: 'starfield', label: 'Vũ trụ sao đêm (Starfield)', desc: 'Không gian tĩnh lặng với bụi sao lấp lánh' },
    { id: 'obsidian', label: 'Hắc thạch chuyên sâu (Obsidian Ember)', desc: 'Màu đen tuyệt đối hắc thạch cho sự tập trung' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-surface-subtle)]">
          <div className="flex items-center gap-2">
            <Sparkles className="text-[var(--accent)]" size={18} />
            <span className="font-semibold text-sm text-[var(--text-primary)]">
              Hình nền Không gian Web OS (Wallpaper Engine)
            </span>
          </div>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded">
            ✕
          </button>
        </div>

        <div className="p-4 space-y-2.5">
          {WALLPAPERS.map((wp) => (
            <button
              key={wp.id}
              onClick={() => handleSelect(wp.id)}
              className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                current === wp.id
                  ? 'bg-[var(--accent)]/15 border-[var(--accent)] text-[var(--accent)] font-semibold shadow-sm'
                  : 'bg-[var(--bg-surface-subtle)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]'
              }`}
            >
              <div>
                <div className="text-xs font-semibold">{wp.label}</div>
                <div className="text-[11px] text-[var(--text-muted)] mt-0.5">{wp.desc}</div>
              </div>
              {current === wp.id && (
                <span className="text-xs font-mono font-bold">✓ Đang dùng</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
