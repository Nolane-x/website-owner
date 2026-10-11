import { describe, it, expect } from 'vitest';
import { loadActiveWallpaperPreference, normalizeActiveWallpaperPreference, saveActiveWallpaperPreference } from '../src/lib/wallpaper/wallpaper-preferences';
import {
  generateCssFilterString,
  getShaderDimensions,
} from '../src/lib/wallpaper/wallpaper-utils';

describe('Wallpaper Matrix Utilities & Filter Generators', () => {
  it('tạo chuỗi CSS filter chính xác từ bộ thông số hậu kỳ', () => {
    const filters = {
      dim: 40,
      blur: 12,
      contrast: 110,
      saturation: 120,
      vignette: true,
      scanlines: false,
    };

    const cssString = generateCssFilterString(filters);
    expect(cssString).toContain('blur(12px)');
    expect(cssString).toContain('contrast(110%)');
    expect(cssString).toContain('saturate(120%)');
    expect(cssString).toContain('brightness(60%)'); // 100% - dim 40% = 60%
  });

  it('xử lý giá trị filter mặc định khi không truyền tham số', () => {
    const emptyCss = generateCssFilterString({});
    expect(emptyCss).toBe('none');
  });

  it('tính toán kích thước canvas cho shader theo DPR màn hình', () => {
    const bounds = getShaderDimensions(1920, 1080, 2);
    expect(bounds.width).toBe(1920);
    expect(bounds.height).toBe(1080);
    expect(bounds.pixelRatio).toBe(2);
    expect(bounds.scaledWidth).toBe(3840);
    expect(bounds.scaledHeight).toBe(2160);
  });
});

describe('Wallpaper persistence and shader preferences', () => {
  it('restores the user-selected shader and filters for database-backed uploads', () => {
    const records = new Map<string, string>();
    const storage = {
      getItem: (key: string) => records.get(key) ?? null,
      setItem: (key: string, value: string) => { records.set(key, value); },
      removeItem: (key: string) => { records.delete(key); },
      clear: () => records.clear(),
      key: (index: number) => [...records.keys()][index] ?? null,
      get length() { return records.size; },
    } as Storage;

    const active = {
      type: 'image' as const,
      url: 'data:image/png;base64,AAAA',
      wallpaperId: 'wallpaper-123',
      shader: 'waves' as const,
      filters: { dim: 37, blur: 7, contrast: 121, saturation: 143, vignette: true, scanlines: true },
    };

    expect(saveActiveWallpaperPreference(active, storage)).toBe(true);
    const raw = JSON.parse(storage.getItem('webos_active_wallpaper_v5') || '{}');
    expect(raw.url).toBe('');
    expect(raw.shader).toBe('waves');
    expect(raw.filters).toEqual(active.filters);

    const restored = loadActiveWallpaperPreference(storage);
    expect(restored).toEqual({ ...active, url: '' });
  });

  it('normalizes invalid shader, unsafe URL and hostile filter values without resetting valid preferences', () => {
    const normalized = normalizeActiveWallpaperPreference({
      type: 'image',
      url: 'javascript:alert(1)',
      wallpaperId: 'wallpaper-456',
      shader: 'javascript',
      filters: { dim: 500, blur: -7, contrast: 120, saturation: 999, vignette: 'yes', scanlines: true },
    });

    expect(normalized).toMatchObject({
      url: '',
      shader: 'none',
      filters: { dim: 100, blur: 0, contrast: 120, saturation: 300, vignette: false, scanlines: true },
    });
  });
});
