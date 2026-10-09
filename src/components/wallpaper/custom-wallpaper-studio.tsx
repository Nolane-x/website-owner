'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CustomWallpaper, WallpaperMediaType, WallpaperFilters } from '@/lib/types';
import { ShaderMode } from './canvas-shaders';
import {
  Image as ImageIcon,
  Video,
  Sparkles,
  Sliders,
  Trash2,
  Heart,
  Upload,
  Check,
  Loader2,
  RefreshCw,
} from 'lucide-react';

export function CustomWallpaperStudio() {
  const [activeTab, setActiveTab] = useState<'library' | 'upload' | 'filters' | 'export'>('library');

  // Saved library
  const [wallpapers, setWallpapers] = useState<CustomWallpaper[]>([]);
  const [loading, setLoading] = useState(true);

  // Active current wallpaper selection with lazy initializer
  const [currentWallpaper, setCurrentWallpaper] = useState<{
    type: WallpaperMediaType;
    url: string;
    filters: WallpaperFilters;
    shader: ShaderMode;
  }>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('webos_active_wallpaper_v5');
        if (saved) return JSON.parse(saved);
      } catch {
        // Ignore
      }
    }
    return {
      type: 'image',
      url: '/images/hero-bg.jpg',
      filters: { dim: 20, blur: 0, contrast: 100, saturation: 100, vignette: false, scanlines: false },
      shader: 'none',
    };
  });

  // Upload & URL form
  const [inputTitle, setInputTitle] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const [inputType, setInputType] = useState<WallpaperMediaType>('image');
  const [localDataUrl, setLocalDataUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const saveActiveWallpaper = (wp: typeof currentWallpaper) => {
    setCurrentWallpaper(wp);
    try {
      localStorage.setItem('webos_active_wallpaper_v5', JSON.stringify(wp));
      window.dispatchEvent(new CustomEvent('webos_wallpaper_change', { detail: wp }));
    } catch {
      // Ignore
    }
  };

  const fetchWallpapers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/wallpapers');
      if (res.ok) {
        const data = await res.json();
        setWallpapers(data.wallpapers || []);
      }
    } catch (e) {
      console.error('Lỗi tải hình nền:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => {
      fetchWallpapers();
    });
  }, [fetchWallpapers]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    setInputType(isVideo ? 'video' : 'image');
    setInputTitle(file.name.replace(/\.[^/.]+$/, ''));

    const reader = new FileReader();
    reader.onload = (event) => {
      const res = event.target?.result as string;
      setLocalDataUrl(res);
      setInputUrl('');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveToLibrary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputTitle.trim()) return;

    try {
      setIsSaving(true);
      const res = await fetch('/api/admin/wallpapers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: inputTitle.trim(),
          sourceUrl: inputUrl.trim() || null,
          localDataUrl: localDataUrl || null,
          type: inputType,
          filtersJson: currentWallpaper.filters,
        }),
      });

      if (res.ok) {
        // Also apply as active
        saveActiveWallpaper({
          type: inputType,
          url: localDataUrl || inputUrl,
          filters: currentWallpaper.filters,
          shader: currentWallpaper.shader,
        });

        setInputTitle('');
        setInputUrl('');
        setLocalDataUrl(null);
        fetchWallpapers();
        setActiveTab('library');
      }
    } catch (e) {
      console.error('Lỗi lưu hình nền:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleFavorite = async (wp: CustomWallpaper) => {
    const nextFav = !wp.isFavorite;
    setWallpapers((prev) =>
      prev.map((w) => (w.id === wp.id ? { ...w, isFavorite: nextFav } : w))
    );
    try {
      await fetch(`/api/admin/wallpapers/${wp.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: nextFav }),
      });
    } catch (e) {
      console.error('Lỗi yêu thích hình nền:', e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa hình nền này khỏi thư viện?')) return;
    setWallpapers((prev) => prev.filter((w) => w.id !== id));
    try {
      await fetch(`/api/admin/wallpapers/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.error('Lỗi xóa hình nền:', e);
    }
  };

  const applyWallpaper = (wp: CustomWallpaper) => {
    const url = wp.localDataUrl || wp.sourceUrl || '';
    saveActiveWallpaper({
      type: wp.type,
      url,
      filters: wp.filtersJson || currentWallpaper.filters,
      shader: currentWallpaper.shader,
    });
  };

  const updateFilters = (changes: Partial<WallpaperFilters>) => {
    const nextFilters = { ...currentWallpaper.filters, ...changes };
    saveActiveWallpaper({
      ...currentWallpaper,
      filters: nextFilters,
    });
  };

  const updateShader = (shader: ShaderMode) => {
    saveActiveWallpaper({
      ...currentWallpaper,
      shader,
    });
  };

  return (
    <div className="flex flex-col h-full bg-stone-950 text-stone-200 text-xs">
      {/* Top Tabs */}
      <div className="p-2 border-b border-stone-800 bg-stone-900/60 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('library')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition ${
              activeTab === 'library'
                ? 'bg-stone-800 text-teal-400 border border-stone-700'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Thư viện ({wallpapers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition ${
              activeTab === 'upload'
                ? 'bg-stone-800 text-teal-400 border border-stone-700'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Tải lên & Video URL</span>
          </button>

          <button
            onClick={() => setActiveTab('filters')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition ${
              activeTab === 'filters'
                ? 'bg-stone-800 text-teal-400 border border-stone-700'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Hậu kỳ & Shaders</span>
          </button>
        </div>

        <button
          onClick={() => fetchWallpapers()}
          title="Làm mới"
          className="p-1 rounded hover:bg-stone-800 text-stone-400 hover:text-stone-200"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* 1. Library Tab */}
        {activeTab === 'library' && (
          <div className="space-y-3">
            {loading ? (
              <div className="py-12 text-center text-stone-500">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-teal-400" />
                <span>Đang tải thư viện hình nền...</span>
              </div>
            ) : wallpapers.length === 0 ? (
              <div className="py-12 text-center text-stone-600">
                Chưa có hình nền tùy chỉnh nào. Chuyển sang tab &quot;Tải lên & Video URL&quot; để thêm.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {wallpapers.map((wp) => {
                  const mediaUrl = wp.localDataUrl || wp.sourceUrl || '';
                  const isCurrent = currentWallpaper.url === mediaUrl;

                  return (
                    <div
                      key={wp.id}
                      className={`relative group rounded-xl overflow-hidden border transition flex flex-col bg-stone-900/80 ${
                        isCurrent
                          ? 'border-emerald-500 ring-1 ring-emerald-500'
                          : 'border-stone-800 hover:border-stone-700'
                      }`}
                    >
                      {/* Media preview */}
                      <div className="h-28 w-full bg-stone-950 overflow-hidden relative">
                        {wp.type === 'video' ? (
                          <video
                            src={mediaUrl}
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={mediaUrl}
                            alt={wp.title}
                            className="w-full h-full object-cover"
                          />
                        )}

                        <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
                          <button
                            onClick={() => handleToggleFavorite(wp)}
                            className={`p-1 rounded-full backdrop-blur-md transition ${
                              wp.isFavorite
                                ? 'bg-rose-500/80 text-white'
                                : 'bg-stone-900/60 text-stone-400 hover:text-white'
                            }`}
                          >
                            <Heart className="w-3 h-3 fill-current" />
                          </button>
                          <button
                            onClick={() => handleDelete(wp.id)}
                            className="p-1 rounded-full bg-stone-900/60 backdrop-blur-md text-stone-400 hover:text-rose-400 transition"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>

                        {wp.type === 'video' && (
                          <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/70 text-[10px] text-teal-300 font-mono flex items-center gap-1">
                            <Video className="w-2.5 h-2.5" />
                            <span>VIDEO</span>
                          </span>
                        )}
                      </div>

                      {/* Card footer */}
                      <div className="p-2 flex items-center justify-between gap-2">
                        <span className="font-semibold text-stone-200 truncate">{wp.title}</span>
                        <button
                          onClick={() => applyWallpaper(wp)}
                          className={`px-2 py-1 rounded text-[11px] font-medium transition ${
                            isCurrent
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
                          }`}
                        >
                          {isCurrent ? 'Đang dùng' : 'Áp dụng'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 2. Upload & URL Tab */}
        {activeTab === 'upload' && (
          <form onSubmit={handleSaveToLibrary} className="max-w-lg space-y-4">
            <div>
              <label className="block font-semibold text-stone-300 mb-1">
                Tải lên tệp ảnh hoặc video từ máy tính:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,video/mp4,video/webm"
                  onChange={handleFileUpload}
                  className="w-full text-stone-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-teal-600 file:text-stone-950 hover:file:bg-teal-500 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 my-2 text-stone-500">
              <div className="h-[1px] flex-1 bg-stone-800" />
              <span>HOẶC</span>
              <div className="h-[1px] flex-1 bg-stone-800" />
            </div>

            <div>
              <label className="block font-semibold text-stone-300 mb-1">
                Liên kết trực tiếp URL ảnh hoặc video động:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  value={inputUrl}
                  onChange={(e) => {
                    setInputUrl(e.target.value);
                    setLocalDataUrl(null);
                    if (e.target.value.endsWith('.mp4') || e.target.value.endsWith('.webm')) {
                      setInputType('video');
                    }
                  }}
                  placeholder="https://example.com/wallpaper.jpg hoặc .mp4"
                  className="flex-1 bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-stone-500 focus:outline-hidden"
                />
                <select
                  value={inputType}
                  onChange={(e) => setInputType(e.target.value as WallpaperMediaType)}
                  className="bg-stone-900 border border-stone-700 rounded-lg px-2 py-1.5 text-xs text-stone-300 focus:outline-hidden"
                >
                  <option value="image">Ảnh tĩnh</option>
                  <option value="video">Video Loop</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-stone-300 mb-1">Tiêu đề hình nền:</label>
              <input
                type="text"
                value={inputTitle}
                onChange={(e) => setInputTitle(e.target.value)}
                placeholder="VD: Cyberpunk City, Anime Landscape..."
                className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-stone-500 focus:outline-hidden"
                required
              />
            </div>

            {/* Live Preview */}
            {(localDataUrl || inputUrl) && (
              <div className="rounded-xl overflow-hidden border border-stone-700 h-36 bg-black">
                {inputType === 'video' ? (
                  <video
                    src={localDataUrl || inputUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={localDataUrl || inputUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isSaving || !inputTitle.trim() || (!localDataUrl && !inputUrl.trim())}
              className="w-full py-2 bg-teal-600 hover:bg-teal-500 text-stone-950 font-bold rounded-xl transition flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin text-stone-950" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>Lưu vào Thư viện & Đặt làm hình nền</span>
            </button>
          </form>
        )}

        {/* 3. Post-Processing & Shaders Tab */}
        {activeTab === 'filters' && (
          <div className="max-w-lg space-y-5">
            {/* Shaders Selection */}
            <div className="space-y-2">
              <span className="font-semibold text-stone-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Hiệu ứng Canvas Shaders (Hoạt họa động)</span>
              </span>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'none', title: 'Tắt Shader' },
                  { id: 'matrix', title: 'Matrix Digital Rain' },
                  { id: 'starfield', title: '3D Warp Starfield' },
                  { id: 'rain', title: 'Rain on Glass' },
                  { id: 'waves', title: 'Cosmic Audio Waves' },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => updateShader(s.id as ShaderMode)}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      currentWallpaper.shader === s.id
                        ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                        : 'bg-stone-900/50 border-stone-800 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    <span className="font-medium text-xs text-white block">{s.title}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Post-processing sliders */}
            <div className="space-y-3 pt-3 border-t border-stone-800">
              <span className="font-semibold text-stone-300 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-teal-400" />
                <span>Bộ lọc hậu kỳ hình nền</span>
              </span>

              <div className="space-y-3 p-3.5 rounded-xl bg-stone-900/60 border border-stone-800">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-stone-400">Độ tối lớp phủ (Dim Overlay):</span>
                    <span className="font-mono text-stone-200">{currentWallpaper.filters.dim || 0}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={90}
                    value={currentWallpaper.filters.dim || 0}
                    onChange={(e) => updateFilters({ dim: Number(e.target.value) })}
                    className="w-full accent-teal-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-stone-400">Độ mờ hậu cảnh (Backdrop Blur):</span>
                    <span className="font-mono text-stone-200">{currentWallpaper.filters.blur || 0}px</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={30}
                    value={currentWallpaper.filters.blur || 0}
                    onChange={(e) => updateFilters({ blur: Number(e.target.value) })}
                    className="w-full accent-teal-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-stone-400">Độ tương phản (Contrast):</span>
                    <span className="font-mono text-stone-200">{currentWallpaper.filters.contrast || 100}%</span>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={150}
                    value={currentWallpaper.filters.contrast || 100}
                    onChange={(e) => updateFilters({ contrast: Number(e.target.value) })}
                    className="w-full accent-teal-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-stone-400">Độ bão hòa màu (Saturation):</span>
                    <span className="font-mono text-stone-200">{currentWallpaper.filters.saturation || 100}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={200}
                    value={currentWallpaper.filters.saturation || 100}
                    onChange={(e) => updateFilters({ saturation: Number(e.target.value) })}
                    className="w-full accent-teal-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
