// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CustomWallpaperStudio } from '@/components/wallpaper/custom-wallpaper-studio';

const uploadedAsset = 'data:image/png;base64,LOCAL_UPLOAD_CONTENT';
const externalSource = 'https://cdn.example.test/wallpaper.webp';

describe('custom wallpaper selection', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.stubGlobal('indexedDB', undefined);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('prefers the saved uploaded asset over sourceUrl when applying a library item', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/admin/wallpapers') {
        return new Response(JSON.stringify({
          wallpapers: [{
            id: 'wp-both',
            profileId: 'owner-1',
            title: 'Uploaded wallpaper with source fallback',
            sourceUrl: externalSource,
            // List API intentionally omits the large data URL.
            hasLocalDataUrl: true,
            type: 'image',
            tagsJson: [],
            filtersJson: { dim: 25 },
            isFavorite: false,
            createdAt: '2026-10-12T00:00:00.000Z',
          }],
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      if (url === '/api/admin/wallpapers/wp-both') {
        return new Response(JSON.stringify({
          wallpaper: {
            id: 'wp-both',
            type: 'image',
            localDataUrl: uploadedAsset,
            sourceUrl: externalSource,
            filtersJson: { dim: 25 },
          },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({ error: 'Unexpected request' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const applied = vi.fn();
    window.addEventListener('webos_wallpaper_change', applied);

    try {
      render(<CustomWallpaperStudio />);
      await screen.findByText('Uploaded wallpaper with source fallback');
      expect(screen.queryByRole('img', { name: 'Uploaded wallpaper with source fallback' })).toBeNull();
      fireEvent.click(await screen.findByRole('button', { name: 'Áp dụng' }));

      await waitFor(() => expect(applied).toHaveBeenCalled());
      const event = applied.mock.calls
        .map(([value]) => value)
        .find((value) => value instanceof CustomEvent && value.detail?.wallpaperId === 'wp-both') as
          | CustomEvent<{ url: string; wallpaperId: string }>
          | undefined;

      expect(event?.detail.url).toBe(uploadedAsset);
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/admin/wallpapers/wp-both',
        expect.objectContaining({ cache: 'no-store', credentials: 'same-origin' }),
      );
    } finally {
      window.removeEventListener('webos_wallpaper_change', applied);
    }
  });
});
