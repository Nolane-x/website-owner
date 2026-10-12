import type { WallpaperFilters, WallpaperMediaType } from '@/lib/types';
import type { ShaderMode } from '@/components/wallpaper/canvas-shaders';

export interface ActiveWallpaperPreference {
  type: WallpaperMediaType;
  url: string;
  filters: WallpaperFilters;
  shader: ShaderMode;
  wallpaperId?: string | null;
}

export const DEFAULT_WALLPAPER_FILTERS: WallpaperFilters = {
  dim: 20,
  blur: 0,
  contrast: 100,
  saturation: 100,
  vignette: false,
  scanlines: false,
};

const SHADER_MODES = new Set<ShaderMode>(['matrix', 'starfield', 'rain', 'waves', 'none']);
const MEDIA_TYPES = new Set<WallpaperMediaType>(['image', 'video', 'shader']);
// Large uploaded assets may be hydrated from IndexedDB into in-memory UI state.
// saveActiveWallpaperPreference strips Data URLs before they reach localStorage.
const MAX_URL_LENGTH = 7 * 1024 * 1024;
const MAX_ID_LENGTH = 160;

function boundedNumber(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(min, Math.min(max, value))
    : fallback;
}

function safeWallpaperUrl(value: unknown): string {
  if (typeof value !== 'string' || value.length > MAX_URL_LENGTH) return '';
  if (!value || value.startsWith('/') && !value.startsWith('//')) return value;
  if (/^data:(image|video)\//i.test(value)) return value;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
}

export function normalizeWallpaperFilters(value: unknown): WallpaperFilters {
  const raw = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  return {
    dim: boundedNumber(raw.dim, DEFAULT_WALLPAPER_FILTERS.dim ?? 20, 0, 100),
    blur: boundedNumber(raw.blur, DEFAULT_WALLPAPER_FILTERS.blur ?? 0, 0, 80),
    contrast: boundedNumber(raw.contrast, DEFAULT_WALLPAPER_FILTERS.contrast ?? 100, 0, 250),
    saturation: boundedNumber(raw.saturation, DEFAULT_WALLPAPER_FILTERS.saturation ?? 100, 0, 300),
    vignette: typeof raw.vignette === 'boolean' ? raw.vignette : false,
    scanlines: typeof raw.scanlines === 'boolean' ? raw.scanlines : false,
  };
}

export function normalizeActiveWallpaperPreference(value: unknown): ActiveWallpaperPreference | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const type = typeof raw.type === 'string' && MEDIA_TYPES.has(raw.type as WallpaperMediaType)
    ? raw.type as WallpaperMediaType
    : 'image';
  const shader = typeof raw.shader === 'string' && SHADER_MODES.has(raw.shader as ShaderMode)
    ? raw.shader as ShaderMode
    : 'none';
  const wallpaperId = typeof raw.wallpaperId === 'string' && raw.wallpaperId.length <= MAX_ID_LENGTH
    ? raw.wallpaperId
    : null;
  const url = safeWallpaperUrl(raw.url);
  return {
    type,
    url,
    filters: normalizeWallpaperFilters(raw.filters),
    shader,
    wallpaperId,
  };
}

export function loadActiveWallpaperPreference(storage?: Storage | null): ActiveWallpaperPreference | null {
  let target = storage;
  if (target === undefined) {
    if (typeof window === 'undefined') return null;
    try { target = window.localStorage; } catch { return null; }
  }
  if (!target) return null;
  try {
    const raw = target.getItem('webos_active_wallpaper_v5');
    if (!raw || raw.length > 3_000_000) return null;
    return normalizeActiveWallpaperPreference(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function clearActiveWallpaperPreference(storage?: Storage | null): boolean {
  let target = storage;
  if (target === undefined) {
    if (typeof window === 'undefined') return false;
    try { target = window.localStorage; } catch { return false; }
  }
  if (!target) return false;
  try {
    target.removeItem('webos_active_wallpaper_v5');
    return true;
  } catch {
    return false;
  }
}

export function saveActiveWallpaperPreference(
  value: ActiveWallpaperPreference,
  storage?: Storage | null,
): boolean {
  let target = storage;
  if (target === undefined) {
    if (typeof window === 'undefined') return false;
    try { target = window.localStorage; } catch { return false; }
  }
  if (!target) return false;
  try {
    const normalized = normalizeActiveWallpaperPreference(value);
    if (!normalized) return false;
    const persisted = normalized.url.startsWith('data:') && normalized.wallpaperId
      ? { ...normalized, url: '' }
      : normalized;
    target.setItem('webos_active_wallpaper_v5', JSON.stringify(persisted));
    return true;
  } catch {
    return false;
  }
}
