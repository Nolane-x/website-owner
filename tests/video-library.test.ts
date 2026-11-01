import { describe, expect, it } from 'vitest';
import {
  addVideoToLibrary,
  createVideoLibraryItem,
  createVideoPlaylist,
  emptyVideoLibrary,
  formatVideoDuration,
  normalizeVideoLibrary,
  parseIsoDuration,
  parseVideoUrl,
  recordVideoProgress,
  removeVideoFromLibrary,
  setVideoShort,
  toggleVideoFavorite,
  toggleVideoInPlaylist,
  toggleVideoWatchLater,
} from '@/lib/video/video-library';

const YOUTUBE_ID = 'dQw4w9WgXcQ';
const TIKTOK_ID = '6718335390845095173';

function youtubeItem() {
  return createVideoLibraryItem({
    platform: 'youtube',
    videoId: YOUTUBE_ID,
    title: 'A YouTube video',
    creator: 'Test channel',
    thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    durationSeconds: 123,
    viewCount: 12345,
  })!;
}

function tiktokItem() {
  return createVideoLibraryItem({
    platform: 'tiktok',
    videoId: TIKTOK_ID,
    title: 'A TikTok video',
    creator: 'Test creator',
    isShort: true,
  })!;
}

describe('Video Library URL parsing', () => {
  it('parses YouTube watch, short, youtu.be and embed URLs', () => {
    expect(parseVideoUrl('https://www.youtube.com/watch?v=' + YOUTUBE_ID + '&t=20')).toMatchObject({
      platform: 'youtube',
      videoId: YOUTUBE_ID,
      canonicalUrl: 'https://www.youtube.com/watch?v=' + YOUTUBE_ID,
      isShort: false,
      needsResolve: false,
    });
    expect(parseVideoUrl('https://youtu.be/' + YOUTUBE_ID)).toMatchObject({ platform: 'youtube', videoId: YOUTUBE_ID });
    expect(parseVideoUrl('https://www.youtube.com/shorts/' + YOUTUBE_ID)).toMatchObject({ platform: 'youtube', videoId: YOUTUBE_ID, isShort: true });
    expect(parseVideoUrl('https://www.youtube-nocookie.com/embed/' + YOUTUBE_ID)).toMatchObject({ platform: 'youtube', videoId: YOUTUBE_ID });
  });

  it('rejects non-HTTPS, lookalike hosts, credentials and invalid YouTube IDs', () => {
    expect(parseVideoUrl('http://www.youtube.com/watch?v=' + YOUTUBE_ID)).toBeNull();
    expect(parseVideoUrl('https://youtube.com.evil.example/watch?v=' + YOUTUBE_ID)).toBeNull();
    expect(parseVideoUrl('https://user:pass@www.youtube.com/watch?v=' + YOUTUBE_ID)).toBeNull();
    expect(parseVideoUrl('https://www.youtube.com/watch?v=not-a-video')).toBeNull();
    expect(parseVideoUrl('https://example.com/video/' + YOUTUBE_ID)).toBeNull();
  });

  it('parses TikTok public video and official player URLs, and flags short share links for resolution', () => {
    expect(parseVideoUrl('https://www.tiktok.com/@creator/video/' + TIKTOK_ID)).toMatchObject({
      platform: 'tiktok',
      videoId: TIKTOK_ID,
      isShort: true,
      needsResolve: false,
    });
    expect(parseVideoUrl('https://www.tiktok.com/player/v1/' + TIKTOK_ID)).toMatchObject({
      platform: 'tiktok',
      videoId: TIKTOK_ID,
    });
    expect(parseVideoUrl('https://vm.tiktok.com/ZMExample123/')).toMatchObject({
      platform: 'tiktok',
      videoId: null,
      needsResolve: true,
    });
    expect(parseVideoUrl('https://tiktok.com.evil.example/@creator/video/' + TIKTOK_ID)).toBeNull();
  });
});

describe('Video Library metadata and persistence', () => {
  it('creates canonical item URLs without retaining arbitrary submitted URLs', () => {
    expect(youtubeItem()).toMatchObject({
      id: 'youtube:' + YOUTUBE_ID,
      canonicalUrl: 'https://www.youtube.com/watch?v=' + YOUTUBE_ID,
      thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    });
    expect(tiktokItem()).toMatchObject({
      id: 'tiktok:' + TIKTOK_ID,
      canonicalUrl: 'https://www.tiktok.com/@_/video/' + TIKTOK_ID,
      isShort: true,
    });
    expect(createVideoLibraryItem({ platform: 'youtube', videoId: 'bad' })).toBeNull();
    expect(createVideoLibraryItem({ platform: 'tiktok', videoId: 'not-a-number' })).toBeNull();
  });

  it('parses and formats provider ISO-8601 video durations', () => {
    expect(parseIsoDuration('PT1H2M3S')).toBe(3723);
    expect(parseIsoDuration('PT4M5S')).toBe(245);
    expect(parseIsoDuration('invalid')).toBeNull();
    expect(formatVideoDuration(3723)).toBe('1:02:03');
    expect(formatVideoDuration(245)).toBe('4:05');
  });

  it('stores only validated item IDs in favorites, watch-later, history and playlists', () => {
    const youtube = youtubeItem();
    const tiktok = tiktokItem();
    let state = addVideoToLibrary(emptyVideoLibrary(), youtube);
    state = addVideoToLibrary(state, tiktok);
    state = toggleVideoFavorite(state, youtube.id);
    state = toggleVideoWatchLater(state, tiktok.id);
    state = recordVideoProgress(state, youtube.id, 45, 123);
    state = createVideoPlaylist(state, 'AI learning');
    const playlistId = state.playlists[0].id;
    state = toggleVideoInPlaylist(state, playlistId, youtube.id);

    expect(state.favorites).toEqual([youtube.id]);
    expect(state.watchLater).toEqual([tiktok.id]);
    expect(state.history[0]).toMatchObject({ itemId: youtube.id, progressSeconds: 45, durationSeconds: 123 });
    expect(state.playlists[0]).toMatchObject({ name: 'AI learning', itemIds: [youtube.id] });

    state = toggleVideoFavorite(state, youtube.id);
    state = toggleVideoWatchLater(state, tiktok.id);
    state = setVideoShort(state, youtube.id, true);
    expect(state.favorites).toEqual([]);
    expect(state.watchLater).toEqual([]);
    expect(state.items.find((item) => item.id === youtube.id)?.isShort).toBe(true);

    state = removeVideoFromLibrary(state, youtube.id);
    expect(state.items.some((item) => item.id === youtube.id)).toBe(false);
    expect(state.history).toEqual([]);
    expect(state.playlists[0].itemIds).toEqual([]);
  });

  it('drops unknown IDs and malformed records when restoring local metadata', () => {
    const restored = normalizeVideoLibrary({
      items: [
        {
          platform: 'youtube',
          platformId: YOUTUBE_ID,
          title: 'Saved video',
          description: '',
          creator: '',
          thumbnailUrl: 'https://untrusted.example/image.jpg',
          durationSeconds: 120,
          isShort: false,
        },
        { platform: 'youtube', platformId: 'bad', title: 'Invalid' },
      ],
      favorites: ['youtube:' + YOUTUBE_ID, 'youtube:missing'],
      watchLater: ['youtube:missing'],
      history: [
        { itemId: 'youtube:' + YOUTUBE_ID, progressSeconds: 30, durationSeconds: 120, watchedAt: 100 },
        { itemId: 'youtube:missing', progressSeconds: 10, durationSeconds: 20, watchedAt: 200 },
      ],
      playlists: [
        { id: 'p1', name: 'Saved', itemIds: ['youtube:' + YOUTUBE_ID, 'youtube:missing'] },
      ],
    });

    expect(restored.items).toHaveLength(1);
    expect(restored.items[0].thumbnailUrl).toBeNull();
    expect(restored.favorites).toEqual(['youtube:' + YOUTUBE_ID]);
    expect(restored.watchLater).toEqual([]);
    expect(restored.history).toHaveLength(1);
    expect(restored.playlists[0].itemIds).toEqual(['youtube:' + YOUTUBE_ID]);
  });
});
