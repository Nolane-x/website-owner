import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveActiveWallpaperAsset } from '@/lib/wallpaper/wallpaper-cache';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('active wallpaper asset cache', () => {
  it('coalesces concurrent reads for the same selected asset', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      wallpaper: {
        id: 'wp-1',
        type: 'image',
        localDataUrl: 'data:image/png;base64,AAAA',
        sourceUrl: null,
        filtersJson: { dim: 15 },
      },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const [first, second] = await Promise.all([
      resolveActiveWallpaperAsset('wp-1'),
      resolveActiveWallpaperAsset('wp-1'),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first).toEqual({
      url: 'data:image/png;base64,AAAA',
      type: 'image',
      filters: { dim: 15 },
    });
    expect(second).toEqual(first);
  });

  it('rejects unexpected IDs and malformed or failed server responses', async () => {
    await expect(resolveActiveWallpaperAsset('')).rejects.toThrow('Mã hình nền không hợp lệ.');

    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      wallpaper: { id: 'another-wallpaper', localDataUrl: 'data:image/png;base64,AAAA' },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })));

    await expect(resolveActiveWallpaperAsset('wp-expected')).rejects.toThrow('Không tải được hình nền đang chọn.');
  });

  it('uses a valid HTTPS source when no local upload exists', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      wallpaper: {
        id: 'wp-external',
        type: 'image',
        localDataUrl: null,
        sourceUrl: 'https://cdn.example.test/wallpaper.webp',
        filtersJson: null,
      },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })));

    await expect(resolveActiveWallpaperAsset('wp-external')).resolves.toMatchObject({
      url: 'https://cdn.example.test/wallpaper.webp',
      type: 'image',
    });
  });
});
