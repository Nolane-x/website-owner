export type VideoPlatform = 'youtube' | 'tiktok';
export type VideoLibraryTab = 'discover' | 'topics' | 'watch' | 'shorts' | 'library' | 'playlists';
export type VideoSearchOrder = 'relevance' | 'date' | 'viewCount';

export function normalizeVideoSearchOrder(value: unknown): VideoSearchOrder {
  return value === 'date' || value === 'viewCount' || value === 'relevance' ? value : 'relevance';
}

export interface ParsedVideoLink {
  platform: VideoPlatform;
  videoId: string | null;
  canonicalUrl: string;
  isShort: boolean;
  needsResolve: boolean;
}

export interface VideoLibraryItem {
  id: string;
  platform: VideoPlatform;
  platformId: string;
  canonicalUrl: string;
  title: string;
  description: string;
  creator: string;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  viewCount: number | null;
  publishedAt: string | null;
  isShort: boolean;
  addedAt: number;
}

export interface VideoWatchRecord {
  itemId: string;
  progressSeconds: number;
  durationSeconds: number | null;
  watchedAt: number;
}

export interface VideoPlaylist {
  id: string;
  name: string;
  itemIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface VideoLibraryState {
  items: VideoLibraryItem[];
  favorites: string[];
  watchLater: string[];
  history: VideoWatchRecord[];
  playlists: VideoPlaylist[];
  followedTopics: string[];
}

const STORAGE_KEY = 'webos:video-library:v1';
const MAX_STORAGE_CHARS = 768 * 1024;
const MAX_ITEMS = 500;
const MAX_HISTORY = 120;
const MAX_PLAYLISTS = 60;
const MAX_PLAYLIST_ITEMS = 250;
const MAX_FOLLOWED_TOPICS = 40;
const VIDEO_TOPIC_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const TIKTOK_ID = /^\d{10,24}$/;

const YOUTUBE_HOSTS = new Set([
  'youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be',
  'www.youtu.be', 'youtube-nocookie.com', 'www.youtube-nocookie.com',
]);
const TIKTOK_HOSTS = new Set([
  'tiktok.com', 'www.tiktok.com', 'm.tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com',
]);

function cleanText(value: unknown, maxLength: number, fallback = ''): string {
  if (typeof value !== 'string') return fallback;
  const clean = value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
  return clean || fallback;
}

function safeHttpsImage(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    const host = url.hostname.toLowerCase();
    return host === 'i.ytimg.com' ||
      host === 'yt3.ggpht.com' ||
      host.endsWith('.tiktokcdn.com') ||
      host.endsWith('.ibytedtos.com')
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export function parseVideoUrl(value: string): ParsedVideoLink | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 2048) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.username || url.password) return null;
  const host = url.hostname.toLowerCase();

  if (YOUTUBE_HOSTS.has(host)) {
    let videoId: string | null = null;
    let isShort = false;
    if (host === 'youtu.be' || host === 'www.youtu.be') {
      videoId = url.pathname.split('/').filter(Boolean)[0] ?? null;
    } else {
      const path = url.pathname.split('/').filter(Boolean);
      if (url.pathname === '/watch') videoId = url.searchParams.get('v');
      else if (path[0] === 'shorts' || path[0] === 'live') {
        videoId = path[1] ?? null;
        isShort = path[0] === 'shorts';
      } else if (path[0] === 'embed') videoId = path[1] ?? null;
    }
    if (!videoId || !YOUTUBE_ID.test(videoId)) return null;
    return {
      platform: 'youtube',
      videoId,
      canonicalUrl: 'https://www.youtube.com/watch?v=' + videoId,
      isShort,
      needsResolve: false,
    };
  }

  if (TIKTOK_HOSTS.has(host)) {
    const playerMatch = url.pathname.match(/^\/player\/v1\/(\d{10,24})\/?$/);
    const videoMatch = url.pathname.match(/\/@[^/]+\/video\/(\d{10,24})/);
    const videoId = playerMatch?.[1] ?? videoMatch?.[1] ?? null;
    if (videoId && TIKTOK_ID.test(videoId)) {
      return {
        platform: 'tiktok',
        videoId,
        canonicalUrl: 'https://www.tiktok.com/player/v1/' + videoId,
        isShort: true,
        needsResolve: false,
      };
    }
    if (
      host === 'vm.tiktok.com' ||
      host === 'vt.tiktok.com' ||
      url.pathname.startsWith('/t/')
    ) {
      return {
        platform: 'tiktok',
        videoId: null,
        canonicalUrl: url.toString(),
        isShort: true,
        needsResolve: true,
      };
    }
  }
  return null;
}

export function createVideoLibraryItem(input: {
  platform: VideoPlatform;
  videoId: string;
  title?: string;
  description?: string;
  creator?: string;
  thumbnailUrl?: string | null;
  durationSeconds?: number | null;
  viewCount?: number | null;
  publishedAt?: string | null;
  isShort?: boolean;
}): VideoLibraryItem | null {
  const validId = input.platform === 'youtube'
    ? YOUTUBE_ID.test(input.videoId)
    : TIKTOK_ID.test(input.videoId);
  if (!validId) return null;

  return {
    id: input.platform + ':' + input.videoId,
    platform: input.platform,
    platformId: input.videoId,
    canonicalUrl: input.platform === 'youtube'
      ? 'https://www.youtube.com/watch?v=' + input.videoId
      : 'https://www.tiktok.com/player/v1/' + input.videoId,
    title: cleanText(input.title, 240, input.platform === 'youtube' ? 'Video YouTube' : 'Video TikTok'),
    description: cleanText(input.description, 600),
    creator: cleanText(input.creator, 120),
    thumbnailUrl: safeHttpsImage(input.thumbnailUrl),
    durationSeconds: typeof input.durationSeconds === 'number' &&
      Number.isFinite(input.durationSeconds) &&
      input.durationSeconds >= 0
      ? Math.min(86_400, Math.floor(input.durationSeconds))
      : null,
    viewCount: Number.isSafeInteger(input.viewCount) && (input.viewCount ?? -1) >= 0
      ? Math.min(9_000_000_000_000, input.viewCount!)
      : null,
    publishedAt: typeof input.publishedAt === 'string' && Number.isFinite(Date.parse(input.publishedAt))
      ? new Date(input.publishedAt).toISOString()
      : null,
    isShort: Boolean(input.isShort || input.platform === 'tiktok'),
    addedAt: Date.now(),
  };
}

export function parseIsoDuration(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const match = value.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/);
  if (!match) return null;
  const total = Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0);
  return Number.isFinite(total) ? Math.min(86_400, Math.floor(total)) : null;
}

export function formatVideoDuration(value: number | null | undefined): string {
  if (!Number.isFinite(value) || (value ?? -1) < 0) return '';
  const seconds = Math.floor(value!);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return hours > 0
    ? hours + ':' + String(minutes).padStart(2, '0') + ':' + String(remainder).padStart(2, '0')
    : minutes + ':' + String(remainder).padStart(2, '0');
}

export function formatVideoCount(value: number | null | undefined): string {
  if (!Number.isFinite(value) || (value ?? -1) < 0) return '';
  return new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(value!);
}

export function emptyVideoLibrary(): VideoLibraryState {
  return { items: [], favorites: [], watchLater: [], history: [], playlists: [], followedTopics: [] };
}

function uniqueIds(values: unknown, allowed: Set<string>, max: number): string[] {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.filter((value): value is string =>
    typeof value === 'string' && allowed.has(value)
  ))].slice(0, max);
}

export function normalizeVideoLibrary(value: unknown): VideoLibraryState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return emptyVideoLibrary();
  const raw = value as Record<string, unknown>;
  const items = Array.isArray(raw.items)
    ? raw.items.slice(0, MAX_ITEMS).map((candidate) => {
      if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return null;
      const item = candidate as Record<string, unknown>;
      const platform = item.platform === 'youtube' || item.platform === 'tiktok' ? item.platform : null;
      if (!platform || typeof item.platformId !== 'string') return null;
      return createVideoLibraryItem({
        platform,
        videoId: item.platformId,
        title: item.title as string,
        description: item.description as string,
        creator: item.creator as string,
        thumbnailUrl: item.thumbnailUrl as string | null,
        durationSeconds: item.durationSeconds as number | null,
        viewCount: item.viewCount as number | null,
        publishedAt: item.publishedAt as string | null,
        isShort: item.isShort === true,
      });
    }).filter((item): item is VideoLibraryItem => item !== null)
    : [];

  const itemIds = new Set(items.map((item) => item.id));
  const favorites = uniqueIds(raw.favorites, itemIds, MAX_ITEMS);
  const watchLater = uniqueIds(raw.watchLater, itemIds, MAX_ITEMS);
  const history = Array.isArray(raw.history)
    ? raw.history.slice(0, MAX_HISTORY * 3)
      .filter((entry): entry is Record<string, unknown> =>
        Boolean(entry && typeof entry === 'object' && !Array.isArray(entry))
      )
      .filter((entry) => typeof entry.itemId === 'string' && itemIds.has(entry.itemId))
      .map((entry) => ({
        itemId: entry.itemId as string,
        progressSeconds: Number.isFinite(entry.progressSeconds)
          ? Math.max(0, Math.min(86_400, Number(entry.progressSeconds)))
          : 0,
        durationSeconds: Number.isFinite(entry.durationSeconds) && Number(entry.durationSeconds) > 0
          ? Math.min(86_400, Number(entry.durationSeconds))
          : null,
        watchedAt: Number.isFinite(entry.watchedAt) ? Number(entry.watchedAt) : Date.now(),
      }))
      .sort((a, b) => b.watchedAt - a.watchedAt)
      .slice(0, MAX_HISTORY)
    : [];
  const followedTopics = Array.isArray(raw.followedTopics)
    ? [...new Set(raw.followedTopics.filter((topicId): topicId is string =>
      typeof topicId === 'string' && VIDEO_TOPIC_ID.test(topicId)
    ))].slice(0, MAX_FOLLOWED_TOPICS)
    : [];
  const playlists = Array.isArray(raw.playlists)
    ? raw.playlists.slice(0, MAX_PLAYLISTS)
      .filter((entry): entry is Record<string, unknown> =>
        Boolean(entry && typeof entry === 'object' && !Array.isArray(entry))
      )
      .map((entry) => ({
        id: cleanText(entry.id, 80),
        name: cleanText(entry.name, 80, 'Playlist'),
        itemIds: uniqueIds(entry.itemIds, itemIds, MAX_PLAYLIST_ITEMS),
        createdAt: Number.isFinite(entry.createdAt) ? Number(entry.createdAt) : Date.now(),
        updatedAt: Number.isFinite(entry.updatedAt) ? Number(entry.updatedAt) : Date.now(),
      }))
      .filter((playlist) => Boolean(playlist.id))
    : [];
  return { items, favorites, watchLater, history, playlists, followedTopics };
}

/** Merge a local snapshot with the cloud snapshot without losing unique saved items. */
export function mergeVideoLibraries(primary: VideoLibraryState, secondary: VideoLibraryState): VideoLibraryState {
  const items = [
    ...primary.items,
    ...secondary.items.filter((item) => !primary.items.some((saved) => saved.id === item.id)),
  ];

  const historyByItemId = new Map<string, VideoWatchRecord>();
  for (const entry of [...secondary.history, ...primary.history]) {
    const existing = historyByItemId.get(entry.itemId);
    if (!existing || entry.watchedAt >= existing.watchedAt) historyByItemId.set(entry.itemId, entry);
  }

  const playlistsById = new Map<string, VideoPlaylist>();
  for (const playlist of [...secondary.playlists, ...primary.playlists]) {
    const existing = playlistsById.get(playlist.id);
    if (!existing) {
      playlistsById.set(playlist.id, playlist);
      continue;
    }
    const newer = playlist.updatedAt >= existing.updatedAt ? playlist : existing;
    playlistsById.set(playlist.id, {
      ...newer,
      itemIds: [...new Set([...playlist.itemIds, ...existing.itemIds])],
      updatedAt: Math.max(playlist.updatedAt, existing.updatedAt),
    });
  }

  return normalizeVideoLibrary({
    items,
    favorites: [...primary.favorites, ...secondary.favorites],
    watchLater: [...primary.watchLater, ...secondary.watchLater],
    history: [...historyByItemId.values()].sort((a, b) => b.watchedAt - a.watchedAt),
    playlists: [...playlistsById.values()],
    followedTopics: [...primary.followedTopics, ...secondary.followedTopics],
  });
}

export function loadVideoLibrary(): VideoLibraryState {
  if (typeof window === 'undefined') return emptyVideoLibrary();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw || raw.length > MAX_STORAGE_CHARS) return emptyVideoLibrary();
    return normalizeVideoLibrary(JSON.parse(raw));
  } catch {
    return emptyVideoLibrary();
  }
}

export function saveVideoLibrary(value: VideoLibraryState): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const serialized = JSON.stringify(normalizeVideoLibrary(value));
    if (serialized.length > MAX_STORAGE_CHARS) return false;
    window.localStorage.setItem(STORAGE_KEY, serialized);
    return true;
  } catch {
    return false;
  }
}

export function addVideoToLibrary(state: VideoLibraryState, item: VideoLibraryItem): VideoLibraryState {
  return { ...state, items: [item, ...state.items.filter((entry) => entry.id !== item.id)].slice(0, MAX_ITEMS) };
}

export function removeVideoFromLibrary(state: VideoLibraryState, itemId: string): VideoLibraryState {
  return {
    ...state,
    items: state.items.filter((item) => item.id !== itemId),
    favorites: state.favorites.filter((id) => id !== itemId),
    watchLater: state.watchLater.filter((id) => id !== itemId),
    history: state.history.filter((entry) => entry.itemId !== itemId),
    playlists: state.playlists.map((playlist) => ({
      ...playlist,
      itemIds: playlist.itemIds.filter((id) => id !== itemId),
    })),
  };
}

export function toggleVideoFavorite(state: VideoLibraryState, itemId: string): VideoLibraryState {
  return {
    ...state,
    favorites: state.favorites.includes(itemId)
      ? state.favorites.filter((id) => id !== itemId)
      : [itemId, ...state.favorites].slice(0, MAX_ITEMS),
  };
}

/** Toggle a curated or user-defined topic in the persistent discovery profile. */
export function toggleFollowedVideoTopic(state: VideoLibraryState, topicId: string): VideoLibraryState {
  const normalizedId = cleanText(topicId, 64).toLowerCase();
  if (!VIDEO_TOPIC_ID.test(normalizedId)) return state;
  const followedTopics = state.followedTopics.includes(normalizedId)
    ? state.followedTopics.filter((id) => id !== normalizedId)
    : [...state.followedTopics, normalizedId];
  return normalizeVideoLibrary({ ...state, followedTopics });
}

export function toggleVideoWatchLater(state: VideoLibraryState, itemId: string): VideoLibraryState {
  return {
    ...state,
    watchLater: state.watchLater.includes(itemId)
      ? state.watchLater.filter((id) => id !== itemId)
      : [itemId, ...state.watchLater].slice(0, MAX_ITEMS),
  };
}

export function setVideoShort(state: VideoLibraryState, itemId: string, isShort: boolean): VideoLibraryState {
  return { ...state, items: state.items.map((item) => item.id === itemId ? { ...item, isShort } : item) };
}

export function recordVideoProgress(
  state: VideoLibraryState,
  itemId: string,
  progressSeconds: number,
  durationSeconds: number | null,
): VideoLibraryState {
  if (!state.items.some((item) => item.id === itemId) || !Number.isFinite(progressSeconds) || progressSeconds < 0) return state;
  return {
    ...state,
    history: [{
      itemId,
      progressSeconds: Math.min(86_400, Math.floor(progressSeconds)),
      durationSeconds: Number.isFinite(durationSeconds) && (durationSeconds ?? 0) > 0
        ? Math.min(86_400, Math.floor(durationSeconds!))
        : null,
      watchedAt: Date.now(),
    }, ...state.history.filter((entry) => entry.itemId !== itemId)].slice(0, MAX_HISTORY),
  };
}

export function createVideoPlaylist(state: VideoLibraryState, name: string): VideoLibraryState {
  const cleanName = cleanText(name, 80);
  if (!cleanName || state.playlists.length >= MAX_PLAYLISTS) return state;
  const now = Date.now();
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'playlist-' + now.toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  return {
    ...state,
    playlists: [{ id, name: cleanName, itemIds: [], createdAt: now, updatedAt: now }, ...state.playlists],
  };
}

export function toggleVideoInPlaylist(
  state: VideoLibraryState,
  playlistId: string,
  itemId: string,
): VideoLibraryState {
  if (!state.items.some((item) => item.id === itemId)) return state;
  return {
    ...state,
    playlists: state.playlists.map((playlist) => {
      if (playlist.id !== playlistId) return playlist;
      const itemIds = playlist.itemIds.includes(itemId)
        ? playlist.itemIds.filter((id) => id !== itemId)
        : [...playlist.itemIds, itemId].slice(0, MAX_PLAYLIST_ITEMS);
      return { ...playlist, itemIds, updatedAt: Date.now() };
    }),
  };
}


const RECOMMENDATION_STOP_WORDS = new Set([
  'video', 'youtube', 'tiktok', 'shorts', 'short', 'official', 'music',
  'the', 'and', 'for', 'with', 'from', 'this', 'that', 'you', 'your',
  'cua', 'voi', 'nhung', 'cac', 'mot', 'nhieu', 'trong', 'duoc', 'cho',
  'nhu', 'khi', 'tai', 'sao', 'la', 'va', 'co', 'khong', 'nay', 'do',
  've', 'den', 'tren', 'duoi', 'cach', 'phan', 'tap', 'hoc',
]);

function recommendationTokens(value: string): string[] {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .match(/[a-z0-9]{3,}/g)?.filter((token) => !RECOMMENDATION_STOP_WORDS.has(token)) ?? [];
}

/** Build a compact YouTube query from the owner's saved interests for fresh recommendations. */
export function buildVideoRecommendationQuery(state: VideoLibraryState, maxTerms = 5): string {
  const safeLimit = Number.isFinite(maxTerms) ? Math.max(0, Math.min(8, Math.floor(maxTerms))) : 5;
  if (safeLimit === 0) return '';
  const byId = new Map(state.items.map((item) => [item.id, item]));
  const weights = new Map<string, number>();
  const add = (value: string, weight: number) => {
    for (const token of new Set(recommendationTokens(value))) {
      weights.set(token, (weights.get(token) ?? 0) + weight);
    }
  };
  for (const topicId of state.followedTopics.slice(0, 20)) add(topicId.replace(/-/g, ' '), 4.5);
  for (const id of state.favorites.slice(0, 20)) {
    const item = byId.get(id);
    if (item) { add(item.title, 4); add(item.creator, 1.8); }
  }
  for (const id of state.watchLater.slice(0, 20)) {
    const item = byId.get(id);
    if (item) { add(item.title, 3); add(item.creator, 1.2); }
  }
  state.history.slice(0, 10).forEach((entry, index) => {
    const item = byId.get(entry.itemId);
    if (item) {
      const weight = Math.max(0.8, 2 - index * 0.12);
      add(item.title, weight);
      add(item.creator, weight * 0.55);
    }
  });
  return [...weights.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, safeLimit)
    .map(([token]) => token)
    .join(' ');
}

/** Rank provider candidates using only local favorites, watch-later and history metadata. */
export function rankVideoRecommendations(candidates: VideoLibraryItem[], state: VideoLibraryState, limit = 8): VideoLibraryItem[] {
  const safeLimit = Number.isFinite(limit) ? Math.max(0, Math.min(24, Math.floor(limit))) : 8;
  if (safeLimit === 0 || candidates.length === 0) return [];
  const byId = new Map(state.items.map((item) => [item.id, item]));
  const profile = new Map<string, number>();
  const addProfile = (text: string, weight: number) => {
    for (const token of new Set(recommendationTokens(text))) profile.set(token, (profile.get(token) ?? 0) + weight);
  };
  for (const id of state.favorites.slice(0, 30)) {
    const item = byId.get(id);
    if (item) { addProfile(item.title, 4); addProfile(item.creator, 2.5); addProfile(item.description, 0.8); }
  }
  for (const id of state.watchLater.slice(0, 30)) {
    const item = byId.get(id);
    if (item) { addProfile(item.title, 3); addProfile(item.creator, 2); addProfile(item.description, 0.6); }
  }
  state.history.slice(0, 15).forEach((entry, index) => {
    const item = byId.get(entry.itemId);
    if (!item) return;
    const weight = Math.max(0.75, 2.5 - index * 0.12);
    addProfile(item.title, weight);
    addProfile(item.creator, weight * 0.65);
    addProfile(item.description, weight * 0.25);
  });
  const recentlyWatched = new Set(state.history.slice(0, 3).map((entry) => entry.itemId));
  const unique = new Map<string, VideoLibraryItem>();
  for (const item of candidates) if (item && !recentlyWatched.has(item.id)) unique.set(item.id, item);
  const now = Date.now();
  const ranked = [...unique.values()].map((item, originalIndex) => {
    const titleTokens = new Set(recommendationTokens(item.title));
    const creatorTokens = new Set(recommendationTokens(item.creator));
    const descriptionTokens = new Set(recommendationTokens(item.description));
    let score = 0;
    for (const token of titleTokens) score += (profile.get(token) ?? 0) * 3;
    for (const token of creatorTokens) score += (profile.get(token) ?? 0) * 2;
    for (const token of descriptionTokens) score += (profile.get(token) ?? 0) * 0.35;
    score += Math.log10((item.viewCount ?? 0) + 1) * 0.22;
    if (item.publishedAt) {
      const ageDays = Math.max(0, (now - Date.parse(item.publishedAt)) / 86_400_000);
      score += Math.max(0, 1.2 - ageDays / 45);
    }
    return { item, score, originalIndex };
  }).sort((a, b) => b.score - a.score || a.originalIndex - b.originalIndex);

  // Avoid a recommendation shelf dominated by one channel. Keep the ranking
  // order, allow at most two videos per creator on the first pass, then fill
  // any remaining slots so small candidate sets do not look empty.
  const selected: VideoLibraryItem[] = [];
  const deferred: VideoLibraryItem[] = [];
  const creatorCounts = new Map<string, number>();
  for (const candidate of ranked) {
    const creatorKey = candidate.item.creator.trim().toLocaleLowerCase() || candidate.item.id;
    const count = creatorCounts.get(creatorKey) ?? 0;
    if (count >= 2) {
      deferred.push(candidate.item);
      continue;
    }
    selected.push(candidate.item);
    creatorCounts.set(creatorKey, count + 1);
    if (selected.length >= safeLimit) return selected;
  }
  for (const item of deferred) {
    if (selected.length >= safeLimit) break;
    selected.push(item);
  }
  return selected;
}
