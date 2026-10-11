'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CustomWallpaper, WallpaperMediaType, WallpaperFilters } from '@/lib/types';
import { ShaderMode } from './canvas-shaders';
import { loadActiveWallpaperPreference, normalizeActiveWallpaperPreference, saveActiveWallpaperPreference } from '@/lib/wallpaper/wallpaper-preferences';
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

  // Active wallpaper, post-processing filters and shader mode are durable owner
  // preferences. Validate local data before it can reach CSS/media/shader rendering.
  const [currentWallpaper, setCurrentWallpaper] = useState<{
    type: WallpaperMediaType;
    url: string;
    filters: WallpaperFilters;
    shader: ShaderMode;
    wallpaperId?: string | null;
  }>(() => loadActiveWallpaperPreference() ?? {
    type: 'image',
    url: '/images/hero-bg.jpg',
    filters: { dim: 20, blur: 0, contrast: 100, saturation: 100, vignette: false, scanlines: false },
    shader: 'none',
    wallpaperId: null,
  });
  const currentWallpaperRef = useRef(currentWallpaper);
  const [applyingWallpaperId, setApplyingWallpaperId] = useState<string | null>(null);

  useEffect(() => {
    currentWallpaperRef.current = currentWallpaper;
  }, [currentWallpaper]);

  // Upload & URL form
  const [inputTitle, setInputTitle] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const [inputType, setInputType] = useState<WallpaperMediaType>('image');
  const [localDataUrl, setLocalDataUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const saveActiveWallpaper = (wp: typeof currentWallpaper, wallpaperId: string | null = currentWallpaper.wallpaperId || null) => {
    const nextWallpaper = normalizeActiveWallpaperPreference({ ...wp, wallpaperId });
    if (!nextWallpaper) {
      setErrorMessage('Cấu hình hình nền không hợp lệ; lựa chọn trước đó vẫn được giữ.');
      return;
    }
    setCurrentWallpaper(nextWallpaper);
    // Always update the desktop immediately, even when browser storage is blocked.
    window.dispatchEvent(new CustomEvent('webos_wallpaper_change', { detail: nextWallpaper }));
    if (!saveActiveWallpaperPreference(nextWallpaper)) {
      setStatusMessage(null);
      setErrorMessage('Hình nền đã áp dụng trong phiên này nhưng trình duyệt không lưu được cấu hình. Hãy bật quyền lưu dữ liệu website để khôi phục sau khi đóng.');
      return;
    }
    setErrorMessage(null);
    setStatusMessage('Đã áp dụng hình nền, bộ lọc và shader; cấu hình đã lưu trên trình duyệt này.');
  };

  const fetchWallpapers = useCallback(async () => {
    setErrorMessage(null);
    try {
      const res = await fetch('/api/admin/wallpapers', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || ('Không tải được thư viện (HTTP ' + res.status + ').'));
      if (!Array.isArray(data.wallpapers)) throw new Error('API hình nền trả về dữ liệu không đúng định dạng.');
      setWallpapers(data.wallpapers as CustomWallpaper[]);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Không tải được thư viện hình nền.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => {
      fetchWallpapers();
    });
  }, [fetchWallpapers]);

  // Resolve just the selected uploaded asset. The library list is intentionally
  // lightweight and no longer contains every full-size base64 image/video.
  useEffect(() => {
    const wallpaperId = currentWallpaper.wallpaperId;
    if (!wallpaperId || currentWallpaper.url) return;
    let cancelled = false;
    void fetch('/api/admin/wallpapers/' + encodeURIComponent(wallpaperId), { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok || !payload.wallpaper) {
          throw new Error(payload.error || 'Không tải được hình nền đang chọn.');
        }
        const saved = payload.wallpaper as CustomWallpaper;
        const resolvedUrl = saved.localDataUrl || saved.sourceUrl || '';
        if (cancelled || saved.id !== wallpaperId || !resolvedUrl) return;
        const latest = currentWallpaperRef.current;
        const restored = normalizeActiveWallpaperPreference({
          ...latest,
          type: saved.type,
          url: resolvedUrl,
          filters: latest.filters ?? saved.filtersJson,
        });
        if (!restored) return;
        setCurrentWallpaper(restored);
        window.dispatchEvent(new CustomEvent('webos_wallpaper_change', { detail: restored }));
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'Không tải được hình nền đang chọn.');
        }
      });
    return () => { cancelled = true; };
  }, [currentWallpaper.wallpaperId, currentWallpaper.url]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMessage(null);
    setStatusMessage(null);
    const supportedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'];
    if (!supportedTypes.includes(file.type)) {
      setLocalDataUrl(null);
      setErrorMessage('Định dạng không được hỗ trợ. Chỉ chọn PNG, JPEG, WEBP, GIF, MP4 hoặc WEBM.');
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setLocalDataUrl(null);
      setErrorMessage('Tệp vượt quá giới hạn 5 MB của API. Hãy dùng URL HTTPS hoặc một tệp nhỏ hơn.');
      e.target.value = '';
      return;
    }

    const isVideo = file.type.startsWith('video/');
    setInputType(isVideo ? 'video' : 'image');
    setInputTitle(file.name.replace(/\.[^/.]+$/, ''));
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result !== 'string' || !result.startsWith('data:')) {
        setLocalDataUrl(null);
        setErrorMessage('Không đọc được tệp hình nền. Hãy thử lại.');
        return;
      }
      setLocalDataUrl(result);
      setInputUrl('');
    };
    reader.onerror = () => {
      setLocalDataUrl(null);
      setErrorMessage('Trình duyệt không thể đọc tệp đã chọn.');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveToLibrary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputTitle.trim()) return;
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      setIsSaving(true);
      let sourceUrl: string | null = null;
      if (inputUrl.trim()) {
        const parsed = new URL(inputUrl.trim());
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
          throw new Error('URL hình nền chỉ được dùng HTTP hoặc HTTPS.');
        }
        sourceUrl = parsed.toString();
      }
      if (!localDataUrl && !sourceUrl) throw new Error('Hãy tải tệp lên hoặc nhập URL HTTP/HTTPS trước khi lưu.');
      const res = await fetch('/api/admin/wallpapers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: inputTitle.trim(),
          sourceUrl,
          localDataUrl: localDataUrl || null,
          type: inputType,
          filtersJson: currentWallpaper.filters,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || ('Không lưu được hình nền (HTTP ' + res.status + ').'));
      if (!data.wallpaper?.id) throw new Error('Server không trả về bản ghi hình nền đã xác minh.');

      saveActiveWallpaper({
        type: inputType,
        url: localDataUrl || sourceUrl || '',
        filters: currentWallpaper.filters,
        shader: currentWallpaper.shader,
        wallpaperId: data.wallpaper.id,
      }, data.wallpaper.id);
      setInputTitle('');
      setInputUrl('');
      setLocalDataUrl(null);
      await fetchWallpapers();
      setStatusMessage('Đã lưu hình nền vào database và áp dụng cho phiên hiện tại.');
      setActiveTab('library');
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Lỗi không xác định khi lưu hình nền.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleFavorite = async (wp: CustomWallpaper) => {
    const nextFav = !wp.isFavorite;
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/admin/wallpapers/' + encodeURIComponent(wp.id), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: nextFav }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || ('Cập nhật yêu thích thất bại (HTTP ' + res.status + ').'));
      if (!data.wallpaper) throw new Error('Server không trả lại bản ghi sau khi cập nhật.');
      setWallpapers((prev) => prev.map((item) => item.id === wp.id ? data.wallpaper as CustomWallpaper : item));
      setStatusMessage(nextFav ? 'Đã thêm vào yêu thích.' : 'Đã bỏ khỏi yêu thích.');
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Lỗi không xác định khi cập nhật yêu thích.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa hình nền này khỏi thư viện?')) return;
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/admin/wallpapers/' + encodeURIComponent(id), { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || data.success !== true) throw new Error(data.error || ('Xóa hình nền thất bại (HTTP ' + res.status + ').'));
      setWallpapers((prev) => prev.filter((wp) => wp.id !== id));
      if (currentWallpaper.wallpaperId === id) {
        setStatusMessage('Đã xóa tệp khỏi thư viện; hình nền hiện tại vẫn có thể hiển thị cho tới khi bạn đổi hoặc tải lại trang.');
      } else {
        setStatusMessage('Đã xóa hình nền khỏi thư viện.');
      }
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Lỗi không xác định khi xóa hình nền.');
    }
  };

  const applyWallpaper = async (wp: CustomWallpaper) => {
    setErrorMessage(null);
    setStatusMessage(null);
    setApplyingWallpaperId(wp.id);
    try {
      let asset = wp;
      // Download the heavy payload only when this exact local file is selected.
      if (!asset.localDataUrl && asset.hasLocalDataUrl) {
        const response = await fetch('/api/admin/wallpapers/' + encodeURIComponent(wp.id), { cache: 'no-store' });
        const payload = await response.json();
        if (!response.ok || !payload.wallpaper) {
          throw new Error(payload.error || 'Không tải được nội dung hình nền.');
        }
        asset = payload.wallpaper as CustomWallpaper;
      }
      const url = asset.localDataUrl || asset.sourceUrl || wp.sourceUrl || '';
      if (!url) throw new Error('Hình nền không có nội dung tải được hoặc URL nguồn.');
      saveActiveWallpaper({
        type: asset.type,
        url,
        filters: asset.filtersJson || currentWallpaper.filters,
        shader: currentWallpaper.shader,
        wallpaperId: asset.id,
      }, asset.id);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể áp dụng hình nền.');
    } finally {
      setApplyingWallpaperId(null);
    }
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

      {(errorMessage || statusMessage) && (
        <div className="px-4 pt-3 space-y-2">
          {errorMessage && <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-800 bg-rose-950/25 p-3 text-rose-200 text-xs"><span className="font-semibold">Thao tác chưa hoàn tất:</span><span>{errorMessage}</span></div>}
          {statusMessage && <div role="status" className="flex items-start gap-2 rounded-xl border border-emerald-800 bg-emerald-950/20 p-3 text-emerald-200 text-xs"><Check className="w-4 h-4 shrink-0" /><span>{statusMessage}</span></div>}
        </div>
      )}

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
                  const mediaUrl = wp.sourceUrl || '';
                  const isCurrent = currentWallpaper.wallpaperId === wp.id;

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
                        {mediaUrl ? (
                          wp.type === 'video' ? (
                            <video
                              src={mediaUrl}
                              muted
                              playsInline
                              preload="none"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={mediaUrl}
                              alt={wp.title}
                              loading="lazy"
                              decoding="async"
                              className="w-full h-full object-cover"
                            />
                          )
                        ) : (
                          <div className="flex h-full flex-col items-center justify-center gap-1.5 text-stone-500">
                            {wp.type === 'video' ? <Video className="h-6 w-6" /> : <ImageIcon className="h-6 w-6" />}
                            <span className="text-[10px]">{wp.hasLocalDataUrl ? 'Tệp tải lên · tải khi chọn' : 'Chưa có bản xem trước'}</span>
                          </div>
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
                          {applyingWallpaperId === wp.id ? 'Đang tải…' : isCurrent ? 'Đang dùng' : 'Áp dụng'}
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
