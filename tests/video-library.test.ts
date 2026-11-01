import { describe, expect, it } from 'vitest';
import {
  addVideoToLibrary,
  buildVideoRecommendationQuery,
  createVideoLibraryItem,
  createVideoPlaylist,
  emptyVideoLibrary,
  formatVideoDuration,
  normalizeVideoLibrary,
  parseIsoDuration,
  parseVideoUrl,
  recordVideoProgress,
  mergeVideoLibraries,
  normalizeVideoSearchOrder,
  rankVideoRecommendations,
  removeVideoFromLibrary,
  setVideoShort,
  toggleVideoFavorite,
  toggleFollowedVideoTopic,
  toggleHiddenVideoCreator,
  toggleMutedVideoTopic,
  toggleNotInterestedVideo,
  isVideoCreatorHidden,
  isVideoExcludedFromRecommendations,
  isVideoNotInterested,
  restoreHiddenVideoCreator,
  restoreNotInterestedVideo,
  toggleVideoInPlaylist,
  toggleVideoWatchLater,
} from '@/lib/video/video-library';

const YOUTUBE_ID = 'dQw4w9WgXcQ';
const TIKTOK_ID = '6718335390845095173';
const YOUTUBE_CHANNEL_ID = 'UCabcdefghijABCDEFGHIJ12';

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
    expect(parseVideoUrl('https://www.youtube.com/watch?v=short-id')).toBeNull();
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

describe('Video Library cloud merge', () => {
  it('keeps unique local and cloud videos, saved sets, history and playlist membership', () => {
    const localItem = createVideoLibraryItem({ platform: 'youtube', videoId: 'dQw4w9WgXcQ', title: 'Local video' })!;
    const cloudItem = createVideoLibraryItem({ platform: 'youtube', videoId: 'M7lc1UVf-VE', title: 'Cloud video' })!;
    const local = addVideoToLibrary(emptyVideoLibrary(), localItem);
    const cloud = addVideoToLibrary(emptyVideoLibrary(), cloudItem);
    const localWithFavorite = toggleVideoFavorite(local, localItem.id);
    const cloudWithLater = toggleVideoWatchLater(cloud, cloudItem.id);
    const localPlaylist = createVideoPlaylist(localWithFavorite, 'Local playlist');
    const localPlaylistWithItem = toggleVideoInPlaylist(localPlaylist, localPlaylist.playlists[0].id, localItem.id);
    const cloudPlaylist = createVideoPlaylist(cloudWithLater, 'Cloud playlist');
    const cloudPlaylistWithItem = toggleVideoInPlaylist(cloudPlaylist, cloudPlaylist.playlists[0].id, cloudItem.id);
    const localWithFollowedTopic = toggleMutedVideoTopic(
      toggleFollowedVideoTopic(localPlaylistWithItem, 'artificial-intelligence'), 'robotics',
    );
    const cloudWithFollowedTopic = toggleNotInterestedVideo(
      toggleFollowedVideoTopic(cloudPlaylistWithItem, 'robotics'), cloudItem,
    );
    const localHistory = recordVideoProgress(localWithFollowedTopic, localItem.id, 12, 60);
    const cloudHistory = recordVideoProgress(cloudWithFollowedTopic, cloudItem.id, 24, 60);
    const merged = mergeVideoLibraries(localHistory, cloudHistory);

    expect(merged.items.map((item) => item.id)).toEqual([localItem.id, cloudItem.id]);
    expect(merged.favorites).toContain(localItem.id);
    expect(merged.watchLater).toContain(cloudItem.id);
    expect(merged.history.map((entry) => entry.itemId)).toEqual(expect.arrayContaining([localItem.id, cloudItem.id]));
    expect(merged.playlists).toHaveLength(2);
    expect(merged.playlists.flatMap((playlist) => playlist.itemIds)).toEqual(expect.arrayContaining([localItem.id, cloudItem.id]));
    expect(merged.followedTopics).toEqual(expect.arrayContaining(['artificial-intelligence', 'robotics']));
    expect(merged.mutedTopics).toContain('robotics');
    expect(merged.notInterestedVideos.map((record) => record.id)).toContain(cloudItem.id);
  });
});

describe('Negative video discovery preferences', () => {
  it('stores and restores individual not-interested videos without deleting saved metadata', () => {
    const item = createVideoLibraryItem({
      platform: 'youtube', videoId: YOUTUBE_ID, title: 'A video to avoid', creator: 'Creator',
    })!;
    const saved = addVideoToLibrary(emptyVideoLibrary(), item);
    const marked = toggleNotInterestedVideo(saved, item);

    expect(isVideoNotInterested(item, marked)).toBe(true);
    expect(isVideoExcludedFromRecommendations(item, marked)).toBe(true);
    expect(marked.items).toEqual(saved.items);
    expect(marked.notInterestedVideos[0]).toMatchObject({ id: item.id, title: item.title, creator: item.creator });

    const restored = restoreNotInterestedVideo(marked, item.id);
    expect(isVideoNotInterested(item, restored)).toBe(false);
    expect(restored.items).toEqual(saved.items);
  });

  it('hides a YouTube creator by stable channel ID instead of an ambiguous display name', () => {
    const creatorVideo = createVideoLibraryItem({
      platform: 'youtube', videoId: YOUTUBE_ID, title: 'Creator video',
      creator: 'Same channel title', creatorId: YOUTUBE_CHANNEL_ID,
    })!;
    const anotherChannel = createVideoLibraryItem({
      platform: 'youtube', videoId: 'M7lc1UVf-VE', title: 'Another creator video',
      creator: 'Same channel title', creatorId: 'UC1234567890123456789012',
    })!;
    const hidden = toggleHiddenVideoCreator(emptyVideoLibrary(), creatorVideo);

    expect(isVideoCreatorHidden(creatorVideo, hidden)).toBe(true);
    expect(isVideoExcludedFromRecommendations(creatorVideo, hidden)).toBe(true);
    expect(isVideoCreatorHidden(anotherChannel, hidden)).toBe(false);
    expect(hidden.hiddenCreators).toEqual([{ key: 'yt:' + YOUTUBE_CHANNEL_ID, label: 'Same channel title' }]);

    const restored = restoreHiddenVideoCreator(hidden, hidden.hiddenCreators[0].key);
    expect(isVideoCreatorHidden(creatorVideo, restored)).toBe(false);
  });

  it('uses a normalized creator-name fallback when a channel ID is unavailable', () => {
    const first = createVideoLibraryItem({ platform: 'youtube', videoId: YOUTUBE_ID, creator: 'Kênh Thử Nghiệm' })!;
    const second = createVideoLibraryItem({ platform: 'youtube', videoId: 'M7lc1UVf-VE', creator: 'kenh thu nghiem' })!;
    const hidden = toggleHiddenVideoCreator(emptyVideoLibrary(), first);

    expect(isVideoCreatorHidden(second, hidden)).toBe(true);
    expect(hidden.hiddenCreators[0].key).toBe('name:kenh thu nghiem');
  });

  it('reduces muted-topic signals in recommendation ranking and query generation', () => {
    const robotics = createVideoLibraryItem({
      platform: 'youtube', videoId: YOUTUBE_ID, title: 'Humanoid robotics and robotics engineering',
    })!;
    const unrelated = createVideoLibraryItem({
      platform: 'youtube', videoId: 'M7lc1UVf-VE', title: 'English speaking practice for IELTS',
    })!;
    const state = toggleMutedVideoTopic(emptyVideoLibrary(), 'robotics');

    expect(rankVideoRecommendations([robotics, unrelated], state, 2).map((item) => item.id))
      .toEqual([unrelated.id, robotics.id]);
    expect(toggleMutedVideoTopic(state, 'robotics').mutedTopics).toEqual([]);
    expect(toggleMutedVideoTopic(state, '../bad')).toBe(state);
  });

  it('excludes dismissed videos and hidden creators from recommendations', () => {
    const dismissed = createVideoLibraryItem({ platform: 'youtube', videoId: YOUTUBE_ID, title: 'Dismissed video' })!;
    const hiddenCreatorVideo = createVideoLibraryItem({
      platform: 'youtube', videoId: 'M7lc1UVf-VE', title: 'Hidden channel upload',
      creator: 'Hidden channel', creatorId: YOUTUBE_CHANNEL_ID,
    })!;
    const eligible = createVideoLibraryItem({ platform: 'youtube', videoId: 'jNQXAC9IVRw', title: 'Fresh discovery' })!;
    let state = toggleNotInterestedVideo(emptyVideoLibrary(), dismissed);
    state = toggleHiddenVideoCreator(state, hiddenCreatorVideo);

    expect(rankVideoRecommendations([dismissed, hiddenCreatorVideo, eligible], state, 10).map((item) => item.id))
      .toEqual([eligible.id]);
  });

  it('normalizes malformed feedback, deduplicates records and remains backward compatible', () => {
    const normalized = normalizeVideoLibrary({
      items: [],
      mutedTopics: ['robotics', '../admin', 'robotics'],
      notInterestedVideos: [
        { id: 'youtube:' + YOUTUBE_ID, title: 'First', updatedAt: 10 },
        { id: 'youtube:' + YOUTUBE_ID, title: 'Latest', updatedAt: 20 },
        { id: 'youtube:bad', title: 'Invalid', updatedAt: 30 },
      ],
      hiddenCreators: [
        { key: 'yt:' + YOUTUBE_CHANNEL_ID, label: 'Known channel' },
        { key: 'yt:invalid', label: 'Invalid channel' },
      ],
    });

    expect(normalized.mutedTopics).toEqual(['robotics']);
    expect(normalized.notInterestedVideos).toEqual([
      { id: 'youtube:' + YOUTUBE_ID, title: 'Latest', creator: '', updatedAt: 20 },
    ]);
    expect(normalized.hiddenCreators).toEqual([{ key: 'yt:' + YOUTUBE_CHANNEL_ID, label: 'Known channel' }]);
    expect(normalizeVideoLibrary({ items: [], favorites: [], watchLater: [], history: [], playlists: [] }))
      .toMatchObject({ mutedTopics: [], notInterestedVideos: [], hiddenCreators: [] });
  });
});

describe('Followed video topics', () => {
  it('toggles a topic in the persistent discovery profile and rejects malformed IDs', () => {
    let state = emptyVideoLibrary();
    state = toggleFollowedVideoTopic(state, 'artificial-intelligence');
    expect(state.followedTopics).toEqual(['artificial-intelligence']);

    state = toggleFollowedVideoTopic(state, 'robotics');
    expect(state.followedTopics).toEqual(['artificial-intelligence', 'robotics']);

    state = toggleFollowedVideoTopic(state, 'artificial-intelligence');
    expect(state.followedTopics).toEqual(['robotics']);
    expect(toggleFollowedVideoTopic(state, '../admin')).toBe(state);
  });

  it('changes only topic preferences and preserves existing video metadata', () => {
    const item = createVideoLibraryItem({
      platform: 'youtube',
      videoId: 'dQw4w9WgXcQ',
      title: 'Saved video',
    })!;
    const state = addVideoToLibrary(emptyVideoLibrary(), item);
    const addedAt = state.items[0].addedAt;
    const updated = toggleFollowedVideoTopic(state, 'artificial-intelligence');

    expect(updated.items[0]).toEqual(state.items[0]);
    expect(updated.items[0].addedAt).toBe(addedAt);
    expect(updated.followedTopics).toEqual(['artificial-intelligence']);
  });

  it('keeps the latest follow when the saved topic limit is reached', () => {
    const initial = normalizeVideoLibrary({
      items: [],
      followedTopics: Array.from({ length: 40 }, (_, index) => 'topic-' + index),
    });
    const updated = toggleFollowedVideoTopic(initial, 'new-topic');
    expect(updated.followedTopics).toHaveLength(40);
    expect(updated.followedTopics).not.toContain('topic-0');
    expect(updated.followedTopics.at(-1)).toBe('new-topic');
  });

  it('normalizes duplicate and invalid followed-topic values and supports older library snapshots', () => {
    const normalized = normalizeVideoLibrary({
      items: [],
      followedTopics: ['artificial-intelligence', 'robotics', 'artificial-intelligence', '../admin', ''],
    });
    expect(normalized.followedTopics).toEqual(['artificial-intelligence', 'robotics']);
    expect(normalizeVideoLibrary({ items: [], favorites: [], watchLater: [], history: [], playlists: [] }).followedTopics).toEqual([]);
  });
});

describe('YouTube discovery search options', () => {
  it('allows only supported search ordering values', () => {
    expect(normalizeVideoSearchOrder('date')).toBe('date');
    expect(normalizeVideoSearchOrder('viewCount')).toBe('viewCount');
    expect(normalizeVideoSearchOrder('relevance')).toBe('relevance');
    expect(normalizeVideoSearchOrder('rating')).toBe('relevance');
    expect(normalizeVideoSearchOrder('https://example.com')).toBe('relevance');
    expect(normalizeVideoSearchOrder(null)).toBe('relevance');
  });
});

describe('Video Library recommendations', () => {
  it('ranks matching interests above unrelated popularity and excludes recently watched videos', () => {
    const favorite = createVideoLibraryItem({ platform: 'youtube', videoId: 'dQw4w9WgXcQ', title: 'Machine learning with neural networks', creator: 'AI Research Lab' })!;
    const recent = createVideoLibraryItem({ platform: 'youtube', videoId: 'M7lc1UVf-VE', title: 'Neural networks explained in depth', creator: 'AI Research Lab' })!;
    const relevant = createVideoLibraryItem({ platform: 'youtube', videoId: 'jNQXAC9IVRw', title: 'Deep learning neural network tutorial', creator: 'AI Research Lab', viewCount: 1200 })!;
    const popular = createVideoLibraryItem({ platform: 'youtube', videoId: '9bZkp7q19f0', title: 'Unrelated comedy compilation', creator: 'Entertainment channel', viewCount: 900000000 })!;
    let state = addVideoToLibrary(emptyVideoLibrary(), favorite);
    state = addVideoToLibrary(state, recent);
    state = toggleVideoFavorite(state, favorite.id);
    state = recordVideoProgress(state, recent.id, 30, 100);
    const ranked = rankVideoRecommendations([popular, recent, relevant], state, 5);
    expect(ranked.map((item) => item.id)).toEqual([relevant.id, popular.id]);
  });

  it('builds a focused YouTube query from favorites, watch-later and viewing history', () => {
    const favorite = createVideoLibraryItem({ platform: 'youtube', videoId: 'dQw4w9WgXcQ', title: 'Machine learning neural networks', creator: 'AI Research Lab' })!;
    const saved = addVideoToLibrary(emptyVideoLibrary(), favorite);
    const interested = toggleFollowedVideoTopic(toggleVideoFavorite(saved, favorite.id), 'artificial-intelligence');
    const query = buildVideoRecommendationQuery(interested, 8);
    expect(query).toContain('learning');
    expect(query).toContain('neural');
    expect(query).toContain('artificial');
    expect(query).toContain('intelligence');
    expect(query.split(' ')).toHaveLength(8);
    expect(buildVideoRecommendationQuery(emptyVideoLibrary())).toBe('');
  });

  it('scores new recommendations against explicitly followed topics', () => {
    const relevant = createVideoLibraryItem({
      platform: 'youtube',
      videoId: 'M7lc1UVf-VE',
      title: 'Artificial intelligence agents explained',
      creator: 'AI Research Channel',
      viewCount: 2_000,
    })!;
    const popular = createVideoLibraryItem({
      platform: 'youtube',
      videoId: '9bZkp7q19f0',
      title: 'Unrelated comedy compilation',
      creator: 'Entertainment Channel',
      viewCount: 900_000_000,
    })!;
    const state = toggleFollowedVideoTopic(emptyVideoLibrary(), 'artificial-intelligence');
    expect(rankVideoRecommendations([popular, relevant], state, 2).map((item) => item.id))
      .toEqual([relevant.id, popular.id]);
  });

  it('limits creator repetition when ranking a recommendation shelf', () => {
    const favorite = createVideoLibraryItem({ platform: 'youtube', videoId: 'dQw4w9WgXcQ', title: 'Machine learning neural networks', creator: 'AI Research Lab' })!;
    const candidates = [
      createVideoLibraryItem({ platform: 'youtube', videoId: 'M7lc1UVf-VE', title: 'Machine learning neural networks explained', creator: 'AI Research Lab', viewCount: 1000 })!,
      createVideoLibraryItem({ platform: 'youtube', videoId: 'jNQXAC9IVRw', title: 'AI deep learning neural network tutorial', creator: 'AI Research Lab', viewCount: 900 })!,
      createVideoLibraryItem({ platform: 'youtube', videoId: '9bZkp7q19f0', title: 'Neural networks and artificial intelligence', creator: 'AI Research Lab', viewCount: 800 })!,
      createVideoLibraryItem({ platform: 'youtube', videoId: 'aqz-KE-bpKQ', title: 'Machine learning research explained', creator: 'Science Channel', viewCount: 700 })!,
    ];
    let state = addVideoToLibrary(emptyVideoLibrary(), favorite);
    state = toggleVideoFavorite(state, favorite.id);
    const ranked = rankVideoRecommendations(candidates, state, 4);
    const leadingThreeCreators = ranked.slice(0, 3).map((item) => item.creator);
    expect(leadingThreeCreators.filter((creator) => creator === 'AI Research Lab')).toHaveLength(2);
    expect(ranked).toHaveLength(4);
  });

  it('uses popularity as a cold-start signal and respects the requested result limit', () => {
    const low = createVideoLibraryItem({ platform: 'youtube', videoId: 'dQw4w9WgXcQ', title: 'New discovery', viewCount: 10 })!;
    const high = createVideoLibraryItem({ platform: 'youtube', videoId: 'M7lc1UVf-VE', title: 'Popular discovery', viewCount: 100000 })!;
    expect(rankVideoRecommendations([low, high], emptyVideoLibrary(), 1).map((item) => item.id)).toEqual([high.id]);
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
      canonicalUrl: 'https://www.tiktok.com/player/v1/' + TIKTOK_ID,
      isShort: true,
    });
    expect(createVideoLibraryItem({ platform: 'youtube', videoId: YOUTUBE_ID })?.durationSeconds).toBeNull();
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
