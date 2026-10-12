// @vitest-environment jsdom
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WallpaperEngine } from '@/components/ui/wallpaper-engine';
import { saveActiveWallpaperPreference } from '@/lib/wallpaper/wallpaper-preferences';

const selectedUpload = {
  type: 'image' as const,
  url: 'data:image/png;base64,AAAA',
  wallpaperId: 'wallpaper-local-test',
  shader: 'none' as const,
  filters: {
    dim: 20,
    blur: 0,
    contrast: 100,
    saturation: 100,
    vignette: false,
    scanlines: false,
  },
};

describe('wallpaper engine resilience', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ error: 'database unavailable' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    )));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it('renders a built-in wallpaper when the selected upload cannot be restored from the server', async () => {
    expect(saveActiveWallpaperPreference(selectedUpload)).toBe(true);

    const { container } = render(<WallpaperEngine />);

    await waitFor(() => expect(fetch).toHaveBeenCalledWith(
      '/api/admin/wallpapers/wallpaper-local-test',
      expect.objectContaining({ cache: 'no-store' }),
    ));
    expect(container.querySelector('[class*="animate-pulse"]')).not.toBeNull();
    expect(container.querySelector('img[alt="Desktop Wallpaper"]')).toBeNull();
  });

  it('clears the custom preference and reveals the selected preset when a preset is chosen', async () => {
    expect(saveActiveWallpaperPreference(selectedUpload)).toBe(true);

    const { container } = render(<WallpaperEngine />);
    await act(async () => {
      window.dispatchEvent(new CustomEvent('webos:set-wallpaper', { detail: 'aurora' }));
    });

    expect(window.localStorage.getItem('webos_active_wallpaper_v5')).toBeNull();
    expect(container.querySelector('[class*="bg-[#070a14]"]')).not.toBeNull();
    expect(container.querySelector('img[alt="Desktop Wallpaper"]')).toBeNull();
  });
});
