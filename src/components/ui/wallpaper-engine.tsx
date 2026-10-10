'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { playSound } from '@/lib/audio/sound-fx';
import { CanvasShaders, ShaderMode } from '@/components/wallpaper/canvas-shaders';
import { generateCssFilterString } from '@/lib/wallpaper/wallpaper-utils';
import { WallpaperFilters, WallpaperMediaType } from '@/lib/types';

export type WallpaperStyle = 'default' | 'aurora' | 'matrix' | 'starfield' | 'obsidian';

interface ActiveWallpaper5State {
  type: WallpaperMediaType;
  url: string;
  filters: WallpaperFilters;
  shader: ShaderMode;
  wallpaperId?: string | null;
}

export function WallpaperEngine() {
  const [style, setStyle] = useState<WallpaperStyle>(() => {
    if (typeof window === 'undefined') return 'default';
    return (localStorage.getItem('webos_wallpaper_mode') as WallpaperStyle) || 'default';
  });

  const [activeCustom, setActiveCustom] = useState<ActiveWallpaper5State | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const saved = localStorage.getItem('webos_active_wallpaper_v5');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const handleStyleChange = (e: Event) => {
      const customEvent = e as CustomEvent<WallpaperStyle>;
      if (customEvent.detail) {
        setStyle(customEvent.detail);
        localStorage.setItem('webos_wallpaper_mode', customEvent.detail);
      }
    };

    const handleCustomChange = (e: Event) => {
      const customEvent = e as CustomEvent<ActiveWallpaper5State>;
      if (customEvent.detail) {
        setActiveCustom(customEvent.detail);
      }
    };

    window.addEventListener('webos:set-wallpaper', handleStyleChange);
    window.addEventListener('webos_wallpaper_change', handleCustomChange);
    return () => {
      window.removeEventListener('webos:set-wallpaper', handleStyleChange);
      window.removeEventListener('webos_wallpaper_change', handleCustomChange);
    };
  }, []);

  // Rehydrate uploaded local assets by ID; avoid storing multi-megabyte Base64 payloads in localStorage.
  useEffect(() => {
    if (!activeCustom?.wallpaperId || activeCustom.url) return;
    let cancelled = false;
    void Promise.resolve().then(async () => {
      try {
        const response = await fetch('/api/admin/wallpapers', { cache: 'no-store' });
        const payload = await response.json();
        if (!response.ok || !Array.isArray(payload.wallpapers)) return;
        const saved = (payload.wallpapers as Array<{
          id: string; type: WallpaperMediaType; localDataUrl?: string | null; sourceUrl?: string | null; filtersJson?: WallpaperFilters;
        }>).find((item) => item.id === activeCustom.wallpaperId);
        const url = saved?.localDataUrl || saved?.sourceUrl || '';
        if (cancelled || !saved || !url) return;
        const restored: ActiveWallpaper5State = {
          ...activeCustom,
          type: saved.type,
          url,
          filters: saved.filtersJson || activeCustom.filters,
        };
        setActiveCustom(restored);
      } catch {
        // The desktop keeps its built-in fallback when the saved asset cannot be loaded.
      }
    });
    return () => { cancelled = true; };
  }, [activeCustom]);

  // 1. If 5.0 Custom Wallpaper is configured
  if (activeCustom && activeCustom.url) {
    const filterCss = generateCssFilterString(activeCustom.filters || {});

    return (
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#080b11]">
        {/* Media Background layer */}
        <div
          style={{ filter: filterCss }}
          className="absolute inset-0 w-full h-full transition-all duration-500 overflow-hidden"
        >
          {activeCustom.type === 'video' ? (
            <video
              src={activeCustom.url}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={activeCustom.url}
              alt="Desktop Wallpaper"
              className="w-full h-full object-cover"
            />
          )}
        </div>

        {/* Dim overlay */}
        {activeCustom.filters?.dim && activeCustom.filters.dim > 0 && (
          <div
            style={{ opacity: activeCustom.filters.dim / 100 }}
            className="absolute inset-0 bg-black pointer-events-none"
          />
        )}

        {/* Active Canvas Shader */}
        {activeCustom.shader && activeCustom.shader !== 'none' && (
          <CanvasShaders mode={activeCustom.shader} />
        )}
      </div>
    );
  }

  // 2. Built-in Preset Wallpapers with deep, eye-comfort dark background
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#080b11] transition-opacity duration-700">
      {/* 2.1 Default Flagship Web OS 5.0 Wallpaper: Deep Cyber Space Nebula */}
      {style === 'default' && (
        <div className="absolute inset-0">
          {/* Subtle Ambient Nebula Glow Orbs */}
          <div className="absolute -top-[20%] left-[8%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-br from-emerald-900/30 via-teal-950/20 to-transparent blur-[140px] pointer-events-none animate-pulse duration-1000" />
          <div className="absolute top-[35%] -right-[15%] w-[55vw] h-[55vw] rounded-full bg-gradient-to-tl from-indigo-950/35 via-blue-950/20 to-transparent blur-[150px] pointer-events-none" />
          <div className="absolute -bottom-[20%] left-[25%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-tr from-cyan-950/25 via-emerald-950/20 to-transparent blur-[130px] pointer-events-none" />

          {/* Minimalist Micro-grid texture for high-tech OS depth */}
          <div
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.4) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />

          {/* Vignette border shading to eliminate any edge glare */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.6)_100%)] pointer-events-none" />
        </div>
      )}

      {/* 2.2 Aurora Borealis */}
      {style === 'aurora' && (
        <div className="absolute inset-0 bg-[#070a14]">
          <div className="absolute inset-0 opacity-60">
            <div className="absolute -top-[30%] -left-[10%] w-[65vw] h-[65vw] rounded-full bg-gradient-to-br from-indigo-600/35 via-purple-600/25 to-transparent blur-[140px] animate-pulse duration-1000" />
            <div className="absolute -bottom-[20%] -right-[10%] w-[55vw] h-[55vw] rounded-full bg-gradient-to-tl from-teal-500/25 via-emerald-600/25 to-transparent blur-[120px] animate-pulse duration-700" />
          </div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(0,0,0,0.65)_100%)] pointer-events-none" />
        </div>
      )}

      {/* 2.3 Cyber Grid Matrix */}
      {style === 'matrix' && (
        <div className="absolute inset-0 bg-[#050807]">
          <div className="absolute inset-0 opacity-30">
            <div
              className="w-full h-full"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(16, 185, 129, 0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 185, 129, 0.15) 1px, transparent 1px)',
                backgroundSize: '36px 36px',
              }}
            />
          </div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(0,0,0,0.7)_100%)] pointer-events-none" />
        </div>
      )}

      {/* 2.4 Deep Starfield */}
      {style === 'starfield' && (
        <div className="absolute inset-0 bg-[#04060a]">
          <div className="absolute inset-0 opacity-40">
            <div
              className="w-full h-full"
              style={{
                backgroundImage:
                  'radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px), radial-gradient(rgba(255, 255, 255, 0.25) 1px, transparent 1px)',
                backgroundSize: '48px 48px, 96px 96px',
                backgroundPosition: '0 0, 24px 24px',
              }}
            />
          </div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(0,0,0,0.7)_100%)] pointer-events-none" />
        </div>
      )}

      {/* 2.5 Pure OLED Obsidian */}
      {style === 'obsidian' && (
        <div className="absolute inset-0 bg-[#050608]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(120,119,198,0.18),transparent_70%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.8)_100%)] pointer-events-none" />
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
    { id: 'default', label: 'Vũ trụ Không gian (Cyber Nebula)', desc: 'Nền không gian hắc thạch dịu mắt, chống chói lóa và bảo vệ thị giác' },
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
