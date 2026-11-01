'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Bookmark,
  Bot,
  BrainCircuit,
  Calculator,
  Code2,
  ChevronDown,
  ChevronUp,
  Clapperboard,
  Clock3,
  Compass,
  ExternalLink,
  EyeOff,
  Film,
  FlaskConical,
  Gamepad2,
  GraduationCap,
  Heart,
  Link2,
  Languages,
  ListVideo,
  Loader2,
  Music2,
  Play,
  Palette,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Telescope,
  ThumbsDown,
  Trophy,
  Trash2,
  X,
} from 'lucide-react';
import {
  addVideoToLibrary,
  buildVideoRecommendationQuery,
  canHideVideoCreator,
  createVideoLibraryItem,
  createVideoPlaylist,
  emptyVideoLibrary,
  formatVideoCount,
  formatVideoDuration,
  isVideoCreatorHidden,
  isVideoExcludedFromRecommendations,
  isVideoNotInterested,
  loadVideoLibrary,
  mergeVideoLibraries,
  normalizeVideoLibrary,
  parseVideoUrl,
  recordVideoProgress,
  rankVideoRecommendations,
  removeVideoFromLibrary,
  saveVideoLibrary,
  setVideoShort,
  toggleVideoFavorite,
  toggleFollowedVideoTopic,
  toggleHiddenVideoCreator,
  toggleMutedVideoTopic,
  toggleNotInterestedVideo,
  restoreHiddenVideoCreator,
  restoreNotInterestedVideo,
  toggleVideoInPlaylist,
  toggleVideoWatchLater,
  type VideoLibraryItem,
  type VideoLibraryState,
  type VideoLibraryTab,
  type VideoSearchOrder,
} from '@/lib/video/video-library';
import { VIDEO_TOPIC_GROUPS, VIDEO_TOPICS, type VideoTopicIcon } from '@/lib/video/video-topics';
import { VideoEmbedPlayer } from './video-embed-player';

interface YouTubeApiItem {
  platform: 'youtube';
  videoId: string;
  title: string;
  description: string;
  creator: string;
  creatorId: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  viewCount: number | null;
  publishedAt: string | null;
  isShort: boolean;
}

interface SearchResponse {
  items: YouTubeApiItem[];
  nextPageToken: string | null;
}

interface TikTokMetadata {
  platform: 'tiktok';
  videoId: string;
  title: string;
  creator: string;
  thumbnailUrl: string | null;
  canonicalUrl: string;
}

type Provider = 'youtube' | 'tiktok';
type LibraryFilter = 'all' | 'favorites' | 'watchLater' | 'history';

const TRENDING_CATEGORIES = [
  { id: '', label: 'Tổng hợp', description: 'Video đang thịnh hành' },
  { id: '10', label: 'Âm nhạc', description: 'Music & performances' },
  { id: '27', label: 'Giáo dục', description: 'Học tập & giải thích' },
  { id: '28', label: 'Công nghệ', description: 'Science & Technology' },
  { id: '20', label: 'Gaming', description: 'Game & livestream' },
  { id: '17', label: 'Thể thao', description: 'Sports & highlights' },
  { id: '22', label: 'Đời sống', description: 'People & Blogs' },
];

const TAB_ITEMS: Array<{ id: VideoLibraryTab; label: string; icon: React.ElementType }> = [
  { id: 'discover', label: 'Khám phá', icon: Compass },
  { id: 'topics', label: 'Chủ đề', icon: Sparkles },
  { id: 'shorts', label: 'Shorts', icon: Clapperboard },
  { id: 'library', label: 'Thư viện', icon: Film },
  { id: 'playlists', label: 'Playlist', icon: ListVideo },
];

const TOPIC_ICON_MAP: Record<VideoTopicIcon, React.ElementType> = {
  brain: BrainCircuit,
  code: Code2,
  robot: Bot,
  math: Calculator,
  science: FlaskConical,
  language: Languages,
  graduation: GraduationCap,
  space: Telescope,
  design: Palette,
  film: Clapperboard,
  music: Music2,
  gaming: Gamepad2,
  sports: Trophy,
  history: BookOpen,
};

const SEARCH_SORT_OPTIONS: Array<{ id: VideoSearchOrder; label: string }> = [
  { id: 'relevance', label: 'Liên quan' },
  { id: 'date', label: 'Mới nhất' },
  { id: 'viewCount', label: 'Lượt xem' },
];

function VideoThumbnail({ item }: { item: VideoLibraryItem }) {
  return (
    <div
      className="relative aspect-video w-full overflow-hidden rounded-lg bg-gradient-to-br from-stone-800 via-stone-900 to-black"
      style={item.thumbnailUrl ? { backgroundImage: 'linear-gradient(to top, rgba(0,0,0,.35), transparent), url("' + item.thumbnailUrl + '")', backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
    >
      {!item.thumbnailUrl && (
        <div className="absolute inset-0 flex items-center justify-center">
          {item.platform === 'youtube'
            ? <Play className="h-10 w-10 text-red-500/80" />
            : <Music2 className="h-10 w-10 text-pink-400/80" />}
        </div>
      )}
      <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-md bg-black/75 px-2 py-1 text-[9px] font-semibold text-white">
        {item.platform === 'youtube' ? <Play className="h-3 w-3 text-red-400" /> : <Music2 className="h-3 w-3 text-pink-300" />}
        {item.platform === 'youtube' ? 'YouTube' : 'TikTok'}
      </div>
      {item.durationSeconds !== null && (
        <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 font-mono text-[9px] text-white">
          {formatVideoDuration(item.durationSeconds)}
        </span>
      )}
      {item.isShort && (
        <span className="absolute right-2 top-2 rounded-md bg-fuchsia-600/90 px-1.5 py-1 text-[9px] font-bold text-white">
          SHORT
        </span>
      )}
    </div>
  );
}

interface VideoCardProps {
  item: VideoLibraryItem;
  onWatch: (item: VideoLibraryItem) => void;
  onFavorite?: (item: VideoLibraryItem) => void;
  onSave?: (item: VideoLibraryItem) => void;
  onMarkShort?: (item: VideoLibraryItem) => void;
  onRemove?: (item: VideoLibraryItem) => void;
  onNotInterested?: (item: VideoLibraryItem) => void;
  onHideCreator?: (item: VideoLibraryItem) => void;
  favorite?: boolean;
  notInterested?: boolean;
  creatorHidden?: boolean;
  saved?: boolean;
  removable?: boolean;
  showShortAction?: boolean;
}

function VideoCard({
  item,
  onWatch,
  onFavorite,
  onSave,
  onMarkShort,
  onRemove,
  onNotInterested,
  onHideCreator,
  favorite = false,
  notInterested = false,
  creatorHidden = false,
  saved = false,
  removable = false,
  showShortAction = false,
}: VideoCardProps) {
  return (
    <article className="group overflow-hidden rounded-xl border border-stone-800 bg-stone-900/65 transition hover:border-stone-600 hover:bg-stone-900">
      <button type="button" onClick={() => onWatch(item)} className="block w-full text-left">
        <VideoThumbnail item={item} />
      </button>
      <div className="space-y-2 p-3">
        <button type="button" onClick={() => onWatch(item)} className="block w-full text-left">
          <p className="line-clamp-2 min-h-9 text-[11px] font-semibold leading-relaxed text-stone-100 group-hover:text-white">{item.title}</p>
          <p className="mt-1 truncate text-[10px] text-stone-500">{item.creator || (item.platform === 'youtube' ? 'YouTube' : 'TikTok')}</p>
        </button>
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[9px] text-stone-600">
            {item.viewCount !== null ? formatVideoCount(item.viewCount) + ' lượt xem' : item.platform === 'tiktok' ? 'Video ngắn' : 'Video trực tuyến'}
          </span>
          <div className="flex shrink-0 items-center gap-1">
            {showShortAction && onMarkShort && !item.isShort && (
              <button type="button" title="Đưa vào Shorts" onClick={() => onMarkShort(item)} className="rounded-md p-1.5 text-stone-500 hover:bg-stone-800 hover:text-fuchsia-300">
                <Clapperboard className="h-3.5 w-3.5" />
              </button>
            )}
            {onNotInterested && (
              <button type="button" title={notInterested ? 'Bỏ đánh dấu không quan tâm' : 'Không quan tâm video này'} aria-pressed={notInterested} onClick={() => onNotInterested(item)} className={notInterested ? 'rounded-md bg-amber-950/60 p-1.5 text-amber-300' : 'rounded-md p-1.5 text-stone-500 hover:bg-stone-800 hover:text-amber-300'}>
                <ThumbsDown className="h-3.5 w-3.5" />
              </button>
            )}
            {onHideCreator && canHideVideoCreator(item) && (
              <button type="button" title={creatorHidden ? 'Hiện lại nhà sáng tạo này' : 'Ẩn nhà sáng tạo này'} aria-pressed={creatorHidden} onClick={() => onHideCreator(item)} className={creatorHidden ? 'rounded-md bg-rose-950/60 p-1.5 text-rose-300' : 'rounded-md p-1.5 text-stone-500 hover:bg-stone-800 hover:text-rose-300'}>
                <EyeOff className="h-3.5 w-3.5" />
              </button>
            )}
            {onSave && (
              <button type="button" title={saved ? 'Đã lưu vào Xem sau' : 'Lưu xem sau'} onClick={() => onSave(item)} className={saved ? 'rounded-md p-1.5 text-emerald-400 hover:bg-stone-800' : 'rounded-md p-1.5 text-stone-500 hover:bg-stone-800 hover:text-emerald-300'}>
                <Bookmark className="h-3.5 w-3.5" fill={saved ? 'currentColor' : 'none'} />
              </button>
            )}
            {onFavorite && (
              <button type="button" title={favorite ? 'Bỏ yêu thích' : 'Yêu thích'} onClick={() => onFavorite(item)} className={favorite ? 'rounded-md p-1.5 text-rose-400 hover:bg-stone-800' : 'rounded-md p-1.5 text-stone-500 hover:bg-stone-800 hover:text-rose-300'}>
                <Heart className="h-3.5 w-3.5" fill={favorite ? 'currentColor' : 'none'} />
              </button>
            )}
            {removable && onRemove && (
              <button type="button" title="Xóa khỏi thư viện" onClick={() => onRemove(item)} className="rounded-md p-1.5 text-stone-600 hover:bg-stone-800 hover:text-rose-300">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
            <button type="button" onClick={() => onWatch(item)} title="Xem ngay" className="rounded-md bg-emerald-600 p-1.5 text-white hover:bg-emerald-500">
              <Play className="h-3.5 w-3.5 fill-current" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function ApiKeyNotice({
  apiKey,
  setApiKey,
  configured,
  source,
  preview,
  saving,
  status,
  onSave,
  onDelete,
}: {
  apiKey: string;
  setApiKey: (value: string) => void;
  configured: boolean;
  source: 'personal' | 'environment' | null;
  preview: string | null;
  saving: boolean;
  status: string;
  onSave: () => void;
  onDelete: () => void;
}) {
  const [showKey, setShowKey] = useState(false);
  return (
    <section className="rounded-xl border border-amber-800/70 bg-amber-950/25 p-3">
      <div className="flex items-start gap-2">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-amber-100">Kết nối YouTube Data API</p>
          <p className="mt-1 text-[10px] leading-relaxed text-amber-200/70">
            Key được mã hóa AES-256-GCM trước khi lưu vào Neon. Chỉ tài khoản owner được dùng; server giải mã khi gọi YouTube. Trình duyệt không lưu key vào localStorage và không nhận lại key đầy đủ.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={configured ? 'rounded-full border border-emerald-800/70 bg-emerald-950/30 px-2 py-1 text-[9px] text-emerald-300' : 'rounded-full border border-amber-800/70 bg-amber-950/30 px-2 py-1 text-[9px] text-amber-200'}>
              {configured ? source === 'environment' ? 'Key từ Vercel Environment' : 'Đã lưu key cá nhân' : 'Chưa có key'}
            </span>
            {configured && preview && <span className="font-mono text-[9px] text-stone-400">{preview}</span>}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder={configured ? 'Nhập key mới để thay thế key hiện tại' : 'AIza...'}
              autoComplete="new-password"
              spellCheck={false}
              className="min-w-0 flex-1 rounded-lg border border-amber-900/70 bg-stone-950 px-3 py-2 text-[11px] text-stone-100 outline-none placeholder:text-stone-600 focus:border-amber-500"
              aria-label="YouTube Data API key"
            />
            <button type="button" onClick={() => setShowKey((value) => !value)} className="rounded-lg border border-amber-900/70 px-2.5 text-[10px] text-amber-200 hover:bg-amber-900/30">
              {showKey ? 'Ẩn' : 'Hiện'}
            </button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button type="button" onClick={onSave} disabled={saving || apiKey.trim().length < 20} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-[10px] font-semibold text-stone-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40">
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />}
              {saving ? 'Đang lưu an toàn…' : configured ? 'Lưu key mới' : 'Lưu key'}
            </button>
            {source === 'personal' && (
              <button type="button" onClick={onDelete} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg border border-red-900/70 px-3 py-2 text-[10px] text-red-300 hover:bg-red-950/40 disabled:opacity-40">
                <Trash2 className="h-3 w-3" /> Xóa key đã lưu
              </button>
            )}
          </div>
          {status && <p role="status" className="mt-2 text-[9px] text-amber-200/80">{status}</p>}
        </div>
      </div>
    </section>
  );
}

export function VideoApp() {
  const [library, setLibrary] = useState<VideoLibraryState>(() => emptyVideoLibrary());
  const [hydrated, setHydrated] = useState(false);
  const [remoteHydrated, setRemoteHydrated] = useState(false);
  const [cloudSyncEnabled, setCloudSyncEnabled] = useState(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'loading' | 'local' | 'pending' | 'syncing' | 'synced' | 'error'>('loading');
  const [tab, setTab] = useState<VideoLibraryTab>('discover');
  const [provider, setProvider] = useState<Provider>('youtube');
  const [query, setQuery] = useState('');
  const [topicSearch, setTopicSearch] = useState('');
  const [topicGroup, setTopicGroup] = useState<(typeof VIDEO_TOPIC_GROUPS)[number]>('Tất cả');
  const [activeTopic, setActiveTopic] = useState<{ id: string; label: string; query: string } | null>(null);
  const [searchOrder, setSearchOrder] = useState<VideoSearchOrder>('relevance');
  const [resultSort, setResultSort] = useState<VideoSearchOrder>('relevance');
  const [apiKey, setApiKey] = useState('');
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);
  const [apiKeySource, setApiKeySource] = useState<'personal' | 'environment' | null>(null);
  const [apiKeyPreview, setApiKeyPreview] = useState<string | null>(null);
  const [apiKeySaving, setApiKeySaving] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState('');
  const [showApiKeyPanel, setShowApiKeyPanel] = useState(false);
  const [needsApiKey, setNeedsApiKey] = useState(false);
  const [results, setResults] = useState<VideoLibraryItem[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [resultMode, setResultMode] = useState<'search' | 'trending' | 'shorts'>('search');
  const [resultQuery, setResultQuery] = useState('');
  const [resultCategoryId, setResultCategoryId] = useState('');
  const [resultHeading, setResultHeading] = useState('Khám phá video');
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<VideoLibraryItem | null>(null);
  const [playerStatus, setPlayerStatus] = useState<'ready' | 'playing' | 'paused' | 'ended' | 'error'>('ready');
  const [libraryFilter, setLibraryFilter] = useState<LibraryFilter>('all');
  const [playlistName, setPlaylistName] = useState('');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState('');
  const [shortIndex, setShortIndex] = useState(0);
  const shortsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const hydrationFrame = window.requestAnimationFrame(() => {
      const localLibrary = loadVideoLibrary();
      setLibrary(localLibrary);
      setHydrated(true);

      void fetch('/api/video-library', { cache: 'no-store' })
        .then(async (response) => {
          if (!response.ok) {
            if (!cancelled) {
              setCloudSyncStatus(response.status === 401 ? 'local' : 'error');
              setRemoteHydrated(true);
            }
            return;
          }
          const payload = await response.json() as {
            library?: unknown;
            hasSavedLibrary?: boolean;
            updatedAt?: string | null;
          };
          if (cancelled) return;
          const remoteLibrary = normalizeVideoLibrary(payload.library);
          const merged = payload.hasSavedLibrary
            ? mergeVideoLibraries(localLibrary, remoteLibrary)
            : localLibrary;
          setLibrary(merged);
          setCloudSyncEnabled(true);
          setCloudSyncStatus(payload.hasSavedLibrary ? 'synced' : 'pending');
          setRemoteHydrated(true);
        })
        .catch(() => {
          if (!cancelled) {
            setCloudSyncStatus('error');
            setRemoteHydrated(true);
          }
        });
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(hydrationFrame);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetch('/api/video-library/youtube/key', { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json() as {
          configured?: boolean;
          source?: 'personal' | 'environment' | null;
          preview?: string | null;
          error?: string;
        };
        if (!response.ok) throw new Error(payload.error || 'Không thể đọc trạng thái YouTube API key.');
        if (cancelled) return;
        setApiKeyConfigured(payload.configured === true);
        setApiKeySource(payload.source ?? null);
        setApiKeyPreview(payload.preview ?? null);
      })
      .catch((cause) => {
        if (!cancelled) setApiKeyStatus(cause instanceof Error ? cause.message : 'Không thể đọc trạng thái key.');
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (hydrated) saveVideoLibrary(library);
  }, [hydrated, library]);

  useEffect(() => {
    if (!hydrated || !remoteHydrated || !cloudSyncEnabled) return;
    const syncTimer = window.setTimeout(async () => {
      setCloudSyncStatus('syncing');
      try {
        const response = await fetch('/api/video-library', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ library }),
        });
        if (response.status === 401) {
          setCloudSyncEnabled(false);
          setCloudSyncStatus('local');
          return;
        }
        if (!response.ok) throw new Error('Cloud sync failed');
        setCloudSyncStatus('synced');
      } catch {
        setCloudSyncStatus('error');
      }
    }, 1800);
    return () => window.clearTimeout(syncTimer);
  }, [hydrated, remoteHydrated, cloudSyncEnabled, library]);

  const saveApiKey = async () => {
    const key = apiKey.trim();
    if (key.length < 20) {
      setApiKeyStatus('Key cần có ít nhất 20 ký tự.');
      return;
    }
    setApiKeySaving(true);
    setApiKeyStatus('');
    try {
      const response = await fetch('/api/video-library/youtube/key', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key }),
      });
      const payload = await response.json() as {
        configured?: boolean;
        source?: 'personal' | 'environment' | null;
        preview?: string | null;
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error || 'Không thể lưu YouTube API key.');
      setApiKeyConfigured(true);
      setApiKeySource(payload.source ?? 'personal');
      setApiKeyPreview(payload.preview ?? null);
      setApiKey('');
      setNeedsApiKey(false);
      setApiKeyStatus('Đã mã hóa và lưu key vào Neon. Lần sau mở website vẫn dùng được.');
    } catch (cause) {
      setApiKeyStatus(cause instanceof Error ? cause.message : 'Không thể lưu YouTube API key.');
    } finally {
      setApiKeySaving(false);
    }
  };

  const deleteApiKey = async () => {
    setApiKeySaving(true);
    setApiKeyStatus('');
    try {
      const response = await fetch('/api/video-library/youtube/key', { method: 'DELETE' });
      const payload = await response.json() as {
        configured?: boolean;
        source?: 'personal' | 'environment' | null;
        preview?: string | null;
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error || 'Không thể xóa YouTube API key.');
      setApiKeyConfigured(payload.configured === true);
      setApiKeySource(payload.source ?? null);
      setApiKeyPreview(payload.preview ?? null);
      setApiKeyStatus(payload.configured
        ? 'Đã xóa key cá nhân. Website đang dùng key do Vercel cung cấp.'
        : 'Đã xóa key khỏi Neon.');
    } catch (cause) {
      setApiKeyStatus(cause instanceof Error ? cause.message : 'Không thể xóa YouTube API key.');
    } finally {
      setApiKeySaving(false);
    }
  };

  const libraryItemsById = useMemo(
    () => new Map(library.items.map((item) => [item.id, item])),
    [library.items],
  );

  const shortsQueue = useMemo(
    () => library.items.filter((item) => item.isShort && !isVideoExcludedFromRecommendations(item, library)),
    [library.items, library.notInterestedVideos, library.hiddenCreators],
  );

  const visibleResults = useMemo(
    () => results.filter((item) => !isVideoExcludedFromRecommendations(item, library)),
    [results, library],
  );

  const recommendedVideos = useMemo(() => {
    const candidates = new Map<string, VideoLibraryItem>();
    for (const item of [...results, ...library.items]) candidates.set(item.id, item);
    return rankVideoRecommendations([...candidates.values()], library, 6);
  }, [results, library]);

  const visibleTopics = useMemo(
    () => topicGroup === 'Tất cả'
      ? VIDEO_TOPICS
      : VIDEO_TOPICS.filter((topic) => topic.group === topicGroup),
    [topicGroup],
  );

  const followedTopicItems = useMemo(
    () => VIDEO_TOPICS.filter((topic) => library.followedTopics.includes(topic.id)),
    [library.followedTopics],
  );

  const continueWatching = useMemo(() => {
    return library.history
      .filter((entry) => entry.progressSeconds > 5 && (!entry.durationSeconds || entry.progressSeconds < entry.durationSeconds - 10))
      .map((entry) => ({ entry, item: libraryItemsById.get(entry.itemId) }))
      .filter((record): record is { entry: typeof record.entry; item: VideoLibraryItem } => Boolean(record.item))
      .slice(0, 8);
  }, [library.history, libraryItemsById]);

  const handleProgress = useCallback((itemId: string, currentSeconds: number, durationSeconds: number | null) => {
    setLibrary((previous) => recordVideoProgress(previous, itemId, currentSeconds, durationSeconds));
  }, []);

  const addAndWatch = (item: VideoLibraryItem) => {
    setLibrary((previous) => addVideoToLibrary(previous, item));
    setSelectedVideo(item);
    setPlayerStatus('ready');
    setTab('watch');
    setError(null);
  };

  const playExisting = (item: VideoLibraryItem) => {
    setLibrary((previous) => addVideoToLibrary(previous, item));
    setSelectedVideo(item);
    setPlayerStatus('ready');
    setTab('watch');
    setError(null);
  };

  const toggleFavorite = (item: VideoLibraryItem) => {
    setLibrary((previous) => addVideoToLibrary(
      toggleVideoFavorite(previous, item.id),
      item,
    ));
  };

  const toggleWatchLater = (item: VideoLibraryItem) => {
    setLibrary((previous) => addVideoToLibrary(
      toggleVideoWatchLater(previous, item.id),
      item,
    ));
  };

  const toggleFollowTopic = (topicId: string) => {
    setLibrary((previous) => toggleFollowedVideoTopic(previous, topicId));
  };

  const toggleMutedTopic = (topicId: string) => {
    setLibrary((previous) => toggleMutedVideoTopic(previous, topicId));
  };

  const markNotInterested = (item: VideoLibraryItem) => {
    setLibrary((previous) => toggleNotInterestedVideo(previous, item));
  };

  const hideCreator = (item: VideoLibraryItem) => {
    setLibrary((previous) => toggleHiddenVideoCreator(previous, item));
  };

  const executeYouTubeRequest = async (mode: 'search' | 'trending' | 'shorts', pageToken?: string | null, categoryId = '', queryOverride?: string, headingOverride?: string, orderOverride?: VideoSearchOrder) => {
    const requestQuery = pageToken ? resultQuery : mode === 'search' ? (queryOverride ?? query.trim()) : mode === 'shorts' ? (query.trim().length >= 2 ? query.trim() : 'shorts') : '';
    const requestOrder: VideoSearchOrder = mode === 'shorts' ? 'viewCount' : pageToken ? resultSort : orderOverride ?? searchOrder;
    setLoading(true);
    setError(null);
    setNeedsApiKey(false);
    try {
      const response = await fetch('/api/video-library/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, query: requestQuery, regionCode: 'VN', categoryId, pageToken: pageToken || '', order: requestOrder }),
      });
      const payload = await response.json() as SearchResponse & { error?: string };
      if (response.status === 428) {
        setNeedsApiKey(true);
        setShowApiKeyPanel(true);
        throw new Error(payload.error || 'Cần YouTube Data API key.');
      }
      if (!response.ok) throw new Error(payload.error || 'Không thể tải video từ YouTube.');
      const items = (payload.items ?? []).flatMap((result) => {
        const item = createVideoLibraryItem({
          platform: 'youtube', videoId: result.videoId, title: result.title,
          description: result.description, creator: result.creator, creatorId: result.creatorId, thumbnailUrl: result.thumbnailUrl,
          durationSeconds: result.durationSeconds, viewCount: result.viewCount,
          publishedAt: result.publishedAt, isShort: result.isShort,
        });
        return item ? [item] : [];
      });
      setResults((previous) => pageToken ? [...previous, ...items.filter((item) => !previous.some((entry) => entry.id === item.id))] : items);
      setResultMode(mode);
      setResultCategoryId(categoryId);
      setResultQuery(requestQuery);
      setResultSort(requestOrder);
      setNextPageToken(payload.nextPageToken ?? null);
      if (!pageToken) {
        setResultHeading(headingOverride || (mode === 'trending'
          ? categoryId ? 'Video thịnh hành theo chủ đề' : 'Đang thịnh hành tại Việt Nam'
          : mode === 'shorts' ? 'Video ngắn đủ điều kiện nhúng từ YouTube' : 'Kết quả YouTube: ' + requestQuery));
      }
      if (mode === 'shorts' && items.length > 0) {
        setLibrary((previous) => {
          const newIds = new Set(items.map((item) => item.id));
          const existing = previous.items.filter((item) => !newIds.has(item.id));
          const merged = pageToken
            ? [...previous.items, ...items.filter((item) => !previous.items.some((saved) => saved.id === item.id))]
            : [...items, ...existing];
          return { ...previous, items: merged.slice(0, 500) };
        });
        if (!pageToken) {
          setShortIndex(0);
          window.requestAnimationFrame(() => shortsContainerRef.current?.scrollTo({ top: 0 }));
        }
      }
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể tải danh sách video.');
    } finally {
      setLoading(false);
    }
  };
  const submitSearch = (event?: FormEvent) => {
    event?.preventDefault();
    if (provider === 'youtube') {
      void executeYouTubeRequest('search');
      return;
    }
    const destination = 'https://www.tiktok.com/search?q=' + encodeURIComponent(query.trim());
    window.open(destination, '_blank', 'noopener,noreferrer');
  };

  const loadTrending = (categoryId = '') => {
    setProvider('youtube');
    void executeYouTubeRequest('trending', null, categoryId);
  };

  const loadRecommended = () => {
    setProvider('youtube');
    const recommendationQuery = buildVideoRecommendationQuery(library);
    if (!recommendationQuery) {
      loadTrending();
      return;
    }
    void executeYouTubeRequest(
      'search', null, '', recommendationQuery,
      'Gợi ý theo sở thích: ' + recommendationQuery,
    );
  };

  const loadTopic = (topic: { id: string; label: string; query: string }, order = searchOrder) => {
    setProvider('youtube');
    setActiveTopic(topic);
    setTab('topics');
    setResults([]);
    setNextPageToken(null);
    void executeYouTubeRequest('search', null, '', topic.query, 'Chủ đề · ' + topic.label, order);
  };

  const submitTopicSearch = (event?: FormEvent) => {
    event?.preventDefault();
    const value = topicSearch.trim();
    if (value.length < 2) return;
    loadTopic({ id: 'custom-topic', label: value, query: value });
  };

  const changeTopicSort = (order: VideoSearchOrder) => {
    if (!activeTopic || order === resultSort) return;
    setSearchOrder(order);
    setResults([]);
    setNextPageToken(null);
    void executeYouTubeRequest(
      'search', null, '', activeTopic.query,
      'Chủ đề · ' + activeTopic.label,
      order,
    );
  };

  const discoverShorts = () => {
    setProvider('youtube');
    setTab('shorts');
    void executeYouTubeRequest('shorts');
  };

  const importVideoUrl = async (event?: FormEvent) => {
    event?.preventDefault();
    const parsed = parseVideoUrl(urlInput);
    if (!parsed) {
      setError('URL không hợp lệ. Hãy dán liên kết trực tiếp từ YouTube hoặc TikTok.');
      return;
    }

    setImporting(true);
    setError(null);
    try {
      let item: VideoLibraryItem | null = null;
      if (parsed.platform === 'tiktok') {
        let metadata: TikTokMetadata | null = null;
        try {
          const response = await fetch('/api/video-library/tiktok', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: parsed.canonicalUrl }),
          });
          const payload = await response.json() as TikTokMetadata & { error?: string };
          if (response.ok) metadata = payload;
          else if (parsed.needsResolve) throw new Error(payload.error || 'Không phân giải được liên kết TikTok.');
        } catch (cause) {
          if (parsed.needsResolve) throw cause;
        }

        const videoId = metadata?.videoId ?? parsed.videoId;
        if (!videoId) throw new Error('TikTok không trả về ID video. Hãy dùng liên kết đầy đủ từ nút Chia sẻ.');
        item = createVideoLibraryItem({
          platform: 'tiktok',
          videoId,
          title: metadata?.title || 'Video TikTok ' + videoId,
          creator: metadata?.creator,
          thumbnailUrl: metadata?.thumbnailUrl,
          isShort: true,
        });
      } else if (parsed.videoId) {
        item = createVideoLibraryItem({
          platform: 'youtube',
          videoId: parsed.videoId,
          title: 'Video YouTube ' + parsed.videoId,
          creator: 'YouTube',
          isShort: parsed.isShort,
        });
      }

      if (!item) throw new Error('Không thể thêm video này vào thư viện.');
      setUrlInput('');
      addAndWatch(item);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể thêm video.');
    } finally {
      setImporting(false);
    }
  };

  const openTikTokSearch = () => {
    const destination = 'https://www.tiktok.com/search?q=' + encodeURIComponent(query.trim());
    window.open(destination, '_blank', 'noopener,noreferrer');
  };

  const removeVideo = (item: VideoLibraryItem) => {
    setLibrary((previous) => removeVideoFromLibrary(previous, item.id));
    if (selectedVideo?.id === item.id) {
      setSelectedVideo(null);
      setTab('library');
    }
  };

  const createPlaylist = (event: FormEvent) => {
    event.preventDefault();
    setLibrary((previous) => createVideoPlaylist(previous, playlistName));
    setPlaylistName('');
  };

  const shorts = shortsQueue;

  const scrollShortsTo = (index: number) => {
    const next = Math.max(0, Math.min(shorts.length - 1, index));
    setShortIndex(next);
    const container = shortsContainerRef.current;
    if (container) container.scrollTo({ top: next * container.clientHeight, behavior: 'smooth' });
  };

  const visibleLibraryItems = libraryFilter === 'favorites'
    ? library.favorites.map((id) => libraryItemsById.get(id)).filter((item): item is VideoLibraryItem => Boolean(item))
    : libraryFilter === 'watchLater'
      ? library.watchLater.map((id) => libraryItemsById.get(id)).filter((item): item is VideoLibraryItem => Boolean(item))
      : libraryFilter === 'history'
        ? library.history.map((entry) => libraryItemsById.get(entry.itemId)).filter((item): item is VideoLibraryItem => Boolean(item))
        : library.items;

  const playerProgress = selectedVideo
    ? (currentSeconds: number, durationSeconds: number | null) => handleProgress(selectedVideo.id, currentSeconds, durationSeconds)
    : undefined;

  const renderCard = (item: VideoLibraryItem, options: { removable?: boolean; shortAction?: boolean } = {}) => (
    <VideoCard
      key={item.id}
      item={item}
      onWatch={playExisting}
      onFavorite={(video) => toggleFavorite(video)}
      onSave={(video) => toggleWatchLater(video)}
      onMarkShort={(video) => setLibrary((previous) => setVideoShort(addVideoToLibrary(previous, video), video.id, true))}
      onRemove={options.removable ? removeVideo : undefined}
      onNotInterested={markNotInterested}
      onHideCreator={hideCreator}
      favorite={library.favorites.includes(item.id)}
      notInterested={isVideoNotInterested(item, library)}
      creatorHidden={isVideoCreatorHidden(item, library)}
      saved={library.watchLater.includes(item.id)}
      removable={options.removable}
      showShortAction={options.shortAction}
    />
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-stone-950 text-stone-200">
      <header className="shrink-0 border-b border-stone-800 bg-stone-950/95 px-4 pb-3 pt-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rose-500/25 bg-rose-500/10 text-rose-300">
              <Clapperboard className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold tracking-wide text-stone-100">Video Library</h2>
              <p className="mt-0.5 text-[10px] text-stone-500">YOUR PERSONAL VIDEO CENTER · STREAMING ONLY</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[9px]">
            <span className="inline-flex items-center gap-1 rounded-full border border-red-900/60 bg-red-950/30 px-2 py-1 text-red-300"><Play className="h-3 w-3" /> YouTube</span>
            <span className="inline-flex items-center gap-1 rounded-full border border-pink-900/60 bg-pink-950/30 px-2 py-1 text-pink-300"><Music2 className="h-3 w-3" /> TikTok</span>
            <button type="button" onClick={() => setShowApiKeyPanel((value) => !value)} title="Cài đặt API YouTube" className="rounded-lg border border-stone-800 p-2 text-stone-400 hover:border-stone-600 hover:text-white"><Settings2 className="h-3.5 w-3.5" /></button>
          </div>
        </div>
        <nav className="mt-3 flex gap-1 overflow-x-auto">
          {TAB_ITEMS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => setTab(id)} className={tab === id ? 'inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 py-2 text-[10px] font-semibold text-emerald-300' : 'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[10px] text-stone-500 transition hover:bg-stone-900 hover:text-stone-200'}>
              <Icon className="h-3.5 w-3.5" /> {label}
              {id === 'shorts' && shorts.length > 0 ? <span className="rounded bg-fuchsia-500/20 px-1.5 text-[9px] text-fuchsia-300">{shorts.length}</span> : null}
            </button>
          ))}
        </nav>
      </header>

      {showApiKeyPanel && (
        <div className="shrink-0 border-b border-stone-800 px-4 py-3">
          <ApiKeyNotice apiKey={apiKey} setApiKey={setApiKey} configured={apiKeyConfigured} source={apiKeySource} preview={apiKeyPreview} saving={apiKeySaving} status={apiKeyStatus} onSave={saveApiKey} onDelete={deleteApiKey} />
        </div>
      )}

      {error && (
        <div role="alert" className="mx-4 mt-3 flex shrink-0 items-start gap-2 rounded-lg border border-amber-800/70 bg-amber-950/25 px-3 py-2 text-[10px] text-amber-200">
          <span className="min-w-0 flex-1">{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Đóng thông báo"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      <main className="min-h-0 flex-1 overflow-y-auto p-4">
        {tab === 'discover' && (
          <div className="space-y-5">
            <section className="relative overflow-hidden rounded-2xl border border-stone-800 bg-gradient-to-br from-stone-900 via-stone-950 to-rose-950/30 p-5">
              <div className="pointer-events-none absolute -right-10 -top-14 h-48 w-48 rounded-full bg-rose-500/10 blur-3xl" />
              <div className="relative max-w-3xl">
                <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-rose-300">Watch · Discover · Collect</p>
                <h1 className="mt-2 text-xl font-bold text-white sm:text-2xl">Mọi video bạn muốn xem, ở cùng một nơi.</h1>
                <p className="mt-2 max-w-2xl text-[11px] leading-relaxed text-stone-400">
                  Tìm video YouTube, mở video TikTok bằng liên kết chia sẻ, tạo playlist riêng và lướt Shorts theo chiều dọc. Video phát từ nền tảng gốc — website không tải hay lưu tệp media.
                </p>
                <p className="mt-2 flex items-center gap-1.5 text-[9px] text-stone-500" aria-live="polite">
                  <span className={cloudSyncStatus === 'synced' ? 'h-1.5 w-1.5 rounded-full bg-emerald-400' : cloudSyncStatus === 'error' ? 'h-1.5 w-1.5 rounded-full bg-amber-400' : 'h-1.5 w-1.5 rounded-full bg-stone-500'} />
                  {cloudSyncStatus === 'loading' ? 'Đang kết nối thư viện riêng…'
                    : cloudSyncStatus === 'local' ? 'Đang lưu trên thiết bị này · Đăng nhập owner để đồng bộ cloud'
                      : cloudSyncStatus === 'pending' ? 'Có thay đổi đang chờ đồng bộ'
                        : cloudSyncStatus === 'syncing' ? 'Đang đồng bộ metadata với PostgreSQL…'
                          : cloudSyncStatus === 'synced' ? 'Đã đồng bộ metadata với PostgreSQL'
                            : 'Đồng bộ cloud tạm lỗi · Bản lưu trên thiết bị vẫn được giữ'} 
                </p>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-stone-800 bg-black/20 p-2.5"><p className="text-lg font-bold tabular-nums text-white">{library.items.length}</p><p className="text-[9px] text-stone-500">Video đã lưu</p></div>
                  <div className="rounded-xl border border-stone-800 bg-black/20 p-2.5"><p className="text-lg font-bold tabular-nums text-white">{library.playlists.length}</p><p className="text-[9px] text-stone-500">Playlist</p></div>
                  <div className="rounded-xl border border-stone-800 bg-black/20 p-2.5"><p className="text-lg font-bold tabular-nums text-white">{shorts.length}</p><p className="text-[9px] text-stone-500">Shorts cá nhân</p></div>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => setProvider('youtube')} className={provider === 'youtube' ? 'inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-[10px] font-semibold text-white' : 'inline-flex items-center gap-2 rounded-lg border border-stone-800 px-3 py-2 text-[10px] text-stone-400 hover:text-white'}><Play className="h-3.5 w-3.5" /> Tìm trên YouTube</button>
                <button type="button" onClick={() => setProvider('tiktok')} className={provider === 'tiktok' ? 'inline-flex items-center gap-2 rounded-lg bg-pink-600 px-3 py-2 text-[10px] font-semibold text-white' : 'inline-flex items-center gap-2 rounded-lg border border-stone-800 px-3 py-2 text-[10px] text-stone-400 hover:text-white'}><Music2 className="h-3.5 w-3.5" /> Khám phá TikTok</button>
                <button type="button" onClick={discoverShorts} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-fuchsia-800/70 bg-fuchsia-950/25 px-3 py-2 text-[10px] text-fuchsia-200 hover:bg-fuchsia-900/40 disabled:opacity-40"><Clapperboard className="h-3.5 w-3.5" /> Tìm Shorts</button>
              </div>
              <form onSubmit={submitSearch} className="flex gap-2">
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={provider === 'youtube' ? 'Tìm video, kênh, chủ đề, kiến thức...' : 'Nhập từ khóa để tìm trên TikTok...'} className="w-full rounded-xl border border-stone-700 bg-stone-900 px-10 py-3 text-xs text-stone-100 outline-none placeholder:text-stone-600 focus:border-emerald-500" />
                </div>
                <button type="submit" disabled={loading || query.trim().length < 2} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-[10px] font-semibold text-white hover:bg-emerald-500 disabled:opacity-40">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Tìm
                </button>
              </form>
              {provider === 'tiktok' && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-pink-900/60 bg-pink-950/20 p-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-pink-100">Tìm kiếm TikTok chính thức</p>
                    <p className="mt-1 text-[9px] leading-relaxed text-pink-200/60">TikTok chưa cấp API tìm mọi video công khai cho ứng dụng phổ thông. Mở kết quả trên TikTok, dùng Chia sẻ → Sao chép liên kết rồi dán lại ở đây để xem trong Video Library.</p>
                  </div>
                  <button type="button" onClick={openTikTokSearch} disabled={query.trim().length < 2} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-pink-800 px-3 py-2 text-[10px] text-pink-200 hover:bg-pink-900/30 disabled:opacity-40">Mở TikTok <ExternalLink className="h-3 w-3" /></button>
                </div>
              )}
            </section>

            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><h3 className="text-xs font-semibold text-stone-100">Dành cho bạn</h3><p className="mt-1 text-[9px] text-stone-500">Gợi ý truy vấn video mới từ chủ đề bạn yêu thích, xem sau và lịch sử; sau đó xếp hạng theo độ liên quan. Khi chưa có dữ liệu cá nhân, hệ thống dùng xu hướng Việt Nam.</p></div>
                <button type="button" onClick={loadRecommended} disabled={loading} className="rounded-lg border border-stone-800 px-3 py-2 text-[9px] text-stone-300 hover:border-emerald-600 hover:text-emerald-300 disabled:opacity-40">Làm mới gợi ý</button>
              </div>
              {followedTopicItems.length > 0 ? (
                <div className="space-y-2 rounded-xl border border-sky-900/50 bg-sky-950/15 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-sky-300">Chủ đề bạn theo dõi</p>
                    <button type="button" onClick={() => setTab('topics')} className="text-[9px] text-stone-500 hover:text-sky-300">Quản lý chủ đề</button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {followedTopicItems.map((topic) => (
                      <button key={topic.id} type="button" onClick={() => loadTopic(topic)} disabled={loading} className="inline-flex items-center gap-1.5 rounded-full border border-sky-800/60 bg-sky-950/40 px-2.5 py-1.5 text-[9px] text-sky-200 transition hover:border-sky-500 hover:bg-sky-900/40 disabled:opacity-50">
                        <Sparkles className="h-3 w-3" /> {topic.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[9px] text-stone-500">Các chủ đề này được ưu tiên khi tạo truy vấn gợi ý và đồng bộ cùng thư viện của bạn.</p>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-stone-800 px-3 py-2.5">
                  <p className="text-[9px] text-stone-500">Theo dõi lĩnh vực yêu thích để cá nhân hóa video gợi ý.</p>
                  <button type="button" onClick={() => setTab('topics')} className="inline-flex items-center gap-1.5 rounded-lg border border-sky-900/70 px-2.5 py-1.5 text-[9px] text-sky-300 hover:bg-sky-950/40">
                    <Sparkles className="h-3 w-3" /> Chọn chủ đề
                  </button>
                </div>
              )}
              {recommendedVideos.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {recommendedVideos.map((item) => renderCard(item, { shortAction: true }))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-stone-800 px-4 py-5 text-center">
                  <Sparkles className="mx-auto h-5 w-5 text-emerald-400/70" />
                  <p className="mt-2 text-[10px] text-stone-400">Tìm hoặc thêm vài video để tạo gợi ý theo sở thích của bạn.</p>
                  <button type="button" onClick={loadRecommended} disabled={loading} className="mt-3 rounded-lg bg-emerald-600 px-3 py-2 text-[9px] font-semibold text-white hover:bg-emerald-500 disabled:opacity-40">Tạo gợi ý video mới</button>
                </div>
              )}
            </section>

            <details className="rounded-xl border border-stone-800 bg-stone-900/45 p-3">
              <summary className="cursor-pointer list-none text-[10px] font-semibold text-stone-300 marker:hidden">
                Sở thích & bộ lọc nội dung
                <span className="ml-2 text-[9px] font-normal text-stone-600">
                  {library.mutedTopics.length + library.hiddenCreators.length + library.notInterestedVideos.length} quy tắc đang áp dụng
                </span>
              </summary>
              <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
                <section className="min-w-0">
                  <h4 className="text-[9px] font-semibold uppercase tracking-wider text-sky-300">Chủ đề giảm ưu tiên</h4>
                  {library.mutedTopics.length > 0 ? (
                    <div className="mt-2 space-y-1.5">
                      {library.mutedTopics.map((topicId) => {
                        const topic = VIDEO_TOPICS.find((candidate) => candidate.id === topicId);
                        return (
                          <div key={topicId} className="flex items-center justify-between gap-2 rounded-lg bg-black/20 px-2.5 py-2">
                            <span className="min-w-0 truncate text-[9px] text-stone-300">{topic?.label ?? topicId}</span>
                            <button type="button" onClick={() => toggleMutedTopic(topicId)} className="shrink-0 text-[9px] text-sky-300 hover:text-white">Ưu tiên lại</button>
                          </div>
                        );
                      })}
                    </div>
                  ) : <p className="mt-2 text-[9px] text-stone-600">Chưa giảm ưu tiên chủ đề nào.</p>}
                </section>
                <section className="min-w-0">
                  <h4 className="text-[9px] font-semibold uppercase tracking-wider text-rose-300">Nhà sáng tạo đã ẩn</h4>
                  {library.hiddenCreators.length > 0 ? (
                    <div className="mt-2 space-y-1.5">
                      {library.hiddenCreators.map((creator) => (
                        <div key={creator.key} className="flex items-center justify-between gap-2 rounded-lg bg-black/20 px-2.5 py-2">
                          <span className="min-w-0 truncate text-[9px] text-stone-300">{creator.label}</span>
                          <button type="button" onClick={() => setLibrary((previous) => restoreHiddenVideoCreator(previous, creator.key))} className="shrink-0 text-[9px] text-rose-300 hover:text-white">Hiện lại</button>
                        </div>
                      ))}
                    </div>
                  ) : <p className="mt-2 text-[9px] text-stone-600">Chưa ẩn nhà sáng tạo nào.</p>}
                </section>
                <section className="min-w-0">
                  <h4 className="text-[9px] font-semibold uppercase tracking-wider text-amber-300">Video không quan tâm</h4>
                  {library.notInterestedVideos.length > 0 ? (
                    <div className="mt-2 space-y-1.5">
                      {library.notInterestedVideos.slice(0, 8).map((record) => (
                        <div key={record.id} className="flex items-center justify-between gap-2 rounded-lg bg-black/20 px-2.5 py-2">
                          <span className="min-w-0 truncate text-[9px] text-stone-300" title={record.title}>{record.title}</span>
                          <button type="button" onClick={() => setLibrary((previous) => restoreNotInterestedVideo(previous, record.id))} className="shrink-0 text-[9px] text-amber-300 hover:text-white">Hoàn tác</button>
                        </div>
                      ))}
                      {library.notInterestedVideos.length > 8 && <p className="text-[8px] text-stone-600">Hiển thị 8 trong {library.notInterestedVideos.length} video gần đây nhất.</p>}
                    </div>
                  ) : <p className="mt-2 text-[9px] text-stone-600">Chưa đánh dấu video nào.</p>}
                </section>
              </div>
              <p className="mt-3 text-[8px] leading-relaxed text-stone-600">Các lựa chọn này được lưu trong thư viện cá nhân và đồng bộ khi đăng nhập owner. Chúng có thể được khôi phục bất cứ lúc nào.</p>
            </details>

            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><h3 className="text-xs font-semibold text-stone-100">Thịnh hành tại Việt Nam</h3><p className="mt-1 text-[9px] text-stone-500">Dữ liệu cập nhật trực tiếp từ YouTube Data API</p></div>
                <button type="button" onClick={() => setShowApiKeyPanel(true)} className="text-[9px] text-stone-500 hover:text-emerald-300">API settings</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {TRENDING_CATEGORIES.map((category) => (
                  <button key={category.id || 'all'} type="button" onClick={() => loadTrending(category.id)} disabled={loading} className="rounded-lg border border-stone-800 bg-stone-900/70 px-3 py-2 text-left transition hover:border-emerald-700 hover:bg-emerald-950/20 disabled:opacity-50">
                    <span className="block text-[10px] font-semibold text-stone-200">{category.label}</span>
                    <span className="mt-0.5 block text-[8px] text-stone-600">{category.description}</span>
                  </button>
                ))}
              </div>
            </section>

            {needsApiKey && <ApiKeyNotice apiKey={apiKey} setApiKey={setApiKey} configured={apiKeyConfigured} source={apiKeySource} preview={apiKeyPreview} saving={apiKeySaving} status={apiKeyStatus} onSave={saveApiKey} onDelete={deleteApiKey} />}

            <form onSubmit={importVideoUrl} className="rounded-xl border border-stone-800 bg-stone-900/55 p-3">
              <div className="mb-2 flex items-center gap-2"><Link2 className="h-4 w-4 text-emerald-400" /><span className="text-[10px] font-semibold text-stone-200">Thêm video bằng liên kết</span></div>
              <div className="flex gap-2">
                <input value={urlInput} onChange={(event) => setUrlInput(event.target.value)} type="url" inputMode="url" placeholder="Dán link YouTube, Shorts hoặc TikTok..." className="min-w-0 flex-1 rounded-lg border border-stone-700 bg-stone-950 px-3 py-2.5 text-[10px] text-stone-100 outline-none placeholder:text-stone-600 focus:border-emerald-500" />
                <button type="submit" disabled={importing || !urlInput.trim()} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-stone-100 px-3 py-2 text-[10px] font-semibold text-stone-950 hover:bg-white disabled:opacity-40">
                  {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Thêm & xem
                </button>
              </div>
            </form>

            {continueWatching.length > 0 && (
              <section className="space-y-2">
                <div className="flex items-center gap-2"><Clock3 className="h-3.5 w-3.5 text-emerald-400" /><h3 className="text-xs font-semibold text-stone-100">Tiếp tục xem</h3></div>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {continueWatching.map(({ entry, item }) => (
                    <div key={entry.itemId} className="space-y-1.5">
                      {renderCard(item)}
                      {entry.durationSeconds && <div className="h-1 overflow-hidden rounded-full bg-stone-800"><div className="h-full rounded-full bg-emerald-500" style={{ width: Math.min(100, entry.progressSeconds / entry.durationSeconds * 100) + '%' }} /></div>}
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div><h3 className="text-xs font-semibold text-stone-100">{resultHeading}</h3><p className="mt-1 text-[9px] text-stone-500">{visibleResults.length} kết quả hiển thị</p></div>
                {loading && <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />}
              </div>
              {visibleResults.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {visibleResults.map((item) => renderCard(item, { shortAction: true }))}
                  </div>
                  {nextPageToken && (
                    <button type="button" disabled={loading} onClick={() => void executeYouTubeRequest(resultMode, nextPageToken, resultCategoryId)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-stone-700 py-2.5 text-[10px] text-stone-300 hover:border-emerald-600 hover:text-emerald-300 disabled:opacity-50">
                      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ChevronDown className="h-3.5 w-3.5" />} Tải thêm kết quả
                    </button>
                  )}
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-stone-800 px-4 py-8 text-center">
                  <Sparkles className="mx-auto h-6 w-6 text-stone-700" />
                  <p className="mt-2 text-[10px] text-stone-400">Chọn một chủ đề thịnh hành hoặc tìm kiếm video để bắt đầu.</p>
                  <p className="mt-1 text-[9px] text-stone-600">Bạn cũng có thể thêm video trực tiếp bằng URL mà không cần API key.</p>
                </div>
              )}
            </section>
          </div>
        )}

        {tab === 'topics' && (
          <div className="space-y-5">
            <section className="relative overflow-hidden rounded-2xl border border-sky-900/60 bg-gradient-to-br from-slate-900 via-stone-950 to-indigo-950/35 p-4 sm:p-5">
              <div className="pointer-events-none absolute -right-12 -top-14 h-48 w-48 rounded-full bg-sky-500/10 blur-3xl" />
              <div className="relative">
                <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-sky-300">Explore · Learn · Discover</p>
                <h1 className="mt-2 text-xl font-bold text-white sm:text-2xl">Khám phá video theo chủ đề</h1>
                <p className="mt-2 max-w-2xl text-[10px] leading-relaxed text-stone-400 sm:text-[11px]">
                  Chọn một lĩnh vực để tìm nội dung mới từ YouTube, hoặc tự nhập chủ đề bạn đang tò mò. Chỉ gọi API khi bạn chọn tìm kiếm.
                </p>
                <form onSubmit={submitTopicSearch} className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <input
                    value={topicSearch}
                    onChange={(event) => setTopicSearch(event.target.value)}
                    maxLength={120}
                    placeholder="Ví dụ: AI agents, thiên văn, IELTS Writing, Blender..."
                    className="min-w-0 flex-1 rounded-xl border border-stone-700 bg-black/40 px-3 py-3 text-xs text-white outline-none placeholder:text-stone-600 focus:border-sky-500"
                    aria-label="Tìm video theo chủ đề tùy chỉnh"
                  />
                  <button type="submit" disabled={loading || topicSearch.trim().length < 2} className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-[10px] font-semibold text-white hover:bg-sky-500 disabled:opacity-40">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Khám phá chủ đề
                  </button>
                </form>
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-semibold text-stone-100">Chọn lĩnh vực</h3>
                  <p className="mt-1 text-[9px] text-stone-500">{visibleTopics.length} bộ khám phá · Nội dung được tải khi bạn mở chủ đề</p>
                </div>
                <span className="text-[9px] text-stone-600">YouTube · Việt Nam & quốc tế</span>
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {VIDEO_TOPIC_GROUPS.map((group) => (
                  <button
                    key={group}
                    type="button"
                    onClick={() => setTopicGroup(group)}
                    aria-pressed={topicGroup === group}
                    className={topicGroup === group
                      ? 'shrink-0 rounded-full bg-sky-500/15 px-3 py-2 text-[10px] font-semibold text-sky-300 ring-1 ring-sky-500/30'
                      : 'shrink-0 rounded-full border border-stone-800 px-3 py-2 text-[10px] text-stone-500 hover:border-stone-600 hover:text-stone-200'}
                  >
                    {group}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {visibleTopics.map((topic) => {
                  const Icon = TOPIC_ICON_MAP[topic.icon];
                  const active = activeTopic?.id === topic.id;
                  const followed = library.followedTopics.includes(topic.id);
                  return (
                    <article key={topic.id} className={active
                      ? 'group flex min-h-[124px] flex-col rounded-xl border border-sky-500/60 bg-sky-950/35 p-3 transition'
                      : 'group flex min-h-[124px] flex-col rounded-xl border border-stone-800 bg-stone-900/55 p-3 transition hover:border-sky-800 hover:bg-slate-900/80'}>
                      <button
                        type="button"
                        onClick={() => loadTopic(topic)}
                        disabled={loading}
                        aria-pressed={active}
                        className="flex min-w-0 flex-1 items-start gap-3 text-left disabled:opacity-50"
                      >
                        <span className={active ? 'rounded-xl bg-sky-500/15 p-2.5 text-sky-300' : 'rounded-xl bg-stone-800 p-2.5 text-stone-400 group-hover:bg-sky-950/60 group-hover:text-sky-300'}>
                          <Icon className="h-5 w-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[11px] font-semibold text-stone-100">{topic.label}</span>
                          <span className="mt-1 block text-[9px] leading-relaxed text-stone-500">{topic.description}</span>
                          <span className="mt-2 inline-flex items-center gap-1 text-[8px] font-semibold uppercase tracking-wider text-sky-400/80">{topic.group} <ChevronDown className="h-3 w-3 -rotate-90" /></span>
                        </span>
                      </button>
                      <div className="mt-3 grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => toggleFollowTopic(topic.id)}
                          aria-pressed={followed}
                          className={followed
                            ? 'inline-flex items-center justify-center gap-1 rounded-lg bg-sky-500/15 px-2 py-2 text-[8px] font-semibold text-sky-300 ring-1 ring-sky-500/30'
                            : 'inline-flex items-center justify-center gap-1 rounded-lg border border-stone-800 px-2 py-2 text-[8px] text-stone-500 transition hover:border-sky-700 hover:text-sky-300'}
                        >
                          <Bookmark className="h-3 w-3" fill={followed ? 'currentColor' : 'none'} />
                          {followed ? 'Đang theo dõi' : 'Theo dõi'}
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleMutedTopic(topic.id)}
                          aria-pressed={library.mutedTopics.includes(topic.id)}
                          className={library.mutedTopics.includes(topic.id)
                            ? 'inline-flex items-center justify-center gap-1 rounded-lg bg-amber-950/50 px-2 py-2 text-[8px] font-semibold text-amber-300 ring-1 ring-amber-900/60'
                            : 'inline-flex items-center justify-center gap-1 rounded-lg border border-stone-800 px-2 py-2 text-[8px] text-stone-500 transition hover:border-amber-800 hover:text-amber-300'}
                        >
                          <ThumbsDown className="h-3 w-3" />
                          {library.mutedTopics.includes(topic.id) ? 'Đã giảm' : 'Ít nội dung hơn'}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            {activeTopic && (
              <section className="space-y-3">
                <div className="flex flex-col gap-3 rounded-xl border border-stone-800 bg-stone-900/55 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-sky-400">Đang khám phá</p>
                    <h3 className="mt-1 truncate text-sm font-bold text-white">{activeTopic.label}</h3>
                    <p className="mt-1 text-[9px] text-stone-500">{visibleResults.length} kết quả tải được · Sắp xếp theo {SEARCH_SORT_OPTIONS.find((option) => option.id === resultSort)?.label.toLowerCase()}</p>
                    {activeTopic.id !== 'custom-topic' && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <button type="button" onClick={() => toggleFollowTopic(activeTopic.id)} aria-pressed={library.followedTopics.includes(activeTopic.id)} className={library.followedTopics.includes(activeTopic.id)
                          ? 'inline-flex items-center gap-1.5 rounded-lg bg-sky-500/15 px-2.5 py-1.5 text-[9px] font-semibold text-sky-300'
                          : 'inline-flex items-center gap-1.5 rounded-lg border border-stone-700 px-2.5 py-1.5 text-[9px] text-stone-400 hover:border-sky-700 hover:text-sky-300'}>
                          <Bookmark className="h-3 w-3" fill={library.followedTopics.includes(activeTopic.id) ? 'currentColor' : 'none'} />
                          {library.followedTopics.includes(activeTopic.id) ? 'Đang theo dõi' : 'Theo dõi chủ đề này'}
                        </button>
                        <button type="button" onClick={() => toggleMutedTopic(activeTopic.id)} aria-pressed={library.mutedTopics.includes(activeTopic.id)} className={library.mutedTopics.includes(activeTopic.id)
                          ? 'inline-flex items-center gap-1.5 rounded-lg bg-amber-950/50 px-2.5 py-1.5 text-[9px] font-semibold text-amber-300'
                          : 'inline-flex items-center gap-1.5 rounded-lg border border-stone-700 px-2.5 py-1.5 text-[9px] text-stone-400 hover:border-amber-800 hover:text-amber-300'}>
                          <ThumbsDown className="h-3 w-3" />
                          {library.mutedTopics.includes(activeTopic.id) ? 'Đã giảm ưu tiên' : 'Ít chủ đề này hơn'}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5" aria-label="Sắp xếp kết quả chủ đề">
                    {SEARCH_SORT_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => changeTopicSort(option.id)}
                        disabled={loading}
                        aria-pressed={resultSort === option.id}
                        className={resultSort === option.id
                          ? 'rounded-lg bg-sky-500/15 px-3 py-2 text-[9px] font-semibold text-sky-300 ring-1 ring-sky-500/30'
                          : 'rounded-lg border border-stone-800 px-3 py-2 text-[9px] text-stone-500 hover:text-stone-200 disabled:opacity-40'}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {visibleResults.length > 0 ? (
                  <>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {visibleResults.map((item) => renderCard(item, { shortAction: true }))}
                    </div>
                    {nextPageToken && (
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => void executeYouTubeRequest('search', nextPageToken, resultCategoryId)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-stone-700 py-3 text-[10px] text-stone-300 hover:border-sky-600 hover:text-sky-300 disabled:opacity-50"
                      >
                        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ChevronDown className="h-3.5 w-3.5" />} Tải thêm video chủ đề
                      </button>
                    )}
                  </>
                ) : loading ? (
                  <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-stone-800 py-12 text-[10px] text-stone-500">
                    <Loader2 className="h-4 w-4 animate-spin text-sky-400" /> Đang tìm nội dung phù hợp…
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-stone-800 px-4 py-10 text-center">
                    <Sparkles className="mx-auto h-6 w-6 text-sky-400/70" />
                    <p className="mt-2 text-[10px] text-stone-300">Chưa có kết quả cho chủ đề này.</p>
                    <p className="mt-1 text-[9px] text-stone-600">Thử chủ đề khác hoặc thay đổi từ khóa tìm kiếm.</p>
                  </div>
                )}
              </section>
            )}
          </div>
        )}

        {tab === 'watch' && (
          <div className="space-y-4">
            {selectedVideo ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button type="button" onClick={() => setTab('discover')} className="inline-flex items-center gap-1.5 text-[10px] text-stone-500 hover:text-white"><ArrowLeft className="h-3.5 w-3.5" /> Quay lại khám phá</button>
                  <span className="text-[9px] uppercase tracking-widest text-stone-600">Đang phát từ nền tảng gốc</span>
                </div>
                <div className={selectedVideo.platform === 'tiktok' || selectedVideo.isShort ? 'mx-auto h-[min(66vh,680px)] max-w-[420px]' : 'mx-auto aspect-video w-full max-w-5xl'}>
                  <VideoEmbedPlayer item={selectedVideo} shortMode={selectedVideo.isShort} onProgress={playerProgress} onStateChange={setPlayerStatus} />
                </div>
                <section className="mx-auto max-w-5xl rounded-xl border border-stone-800 bg-stone-900/60 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-stone-500">
                        {selectedVideo.platform === 'youtube' ? <Play className="h-3 w-3 text-red-400" /> : <Music2 className="h-3 w-3 text-pink-400" />}
                        {selectedVideo.platform} · {playerStatus === 'playing' ? 'Đang phát' : playerStatus === 'error' ? 'Lỗi trình phát' : playerStatus === 'ended' ? 'Đã xem xong' : 'Sẵn sàng'}
                      </div>
                      <h2 className="text-sm font-semibold leading-relaxed text-white">{selectedVideo.title}</h2>
                      <p className="mt-1 text-[10px] text-stone-500">{selectedVideo.creator}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button type="button" onClick={() => toggleFavorite(selectedVideo)} className={library.favorites.includes(selectedVideo.id) ? 'inline-flex items-center gap-1.5 rounded-lg bg-rose-950/50 px-3 py-2 text-[10px] text-rose-300' : 'inline-flex items-center gap-1.5 rounded-lg border border-stone-700 px-3 py-2 text-[10px] text-stone-300 hover:text-rose-300'}><Heart className="h-3.5 w-3.5" fill={library.favorites.includes(selectedVideo.id) ? 'currentColor' : 'none'} /> Yêu thích</button>
                      <button type="button" onClick={() => toggleWatchLater(selectedVideo)} className={library.watchLater.includes(selectedVideo.id) ? 'inline-flex items-center gap-1.5 rounded-lg bg-emerald-950/50 px-3 py-2 text-[10px] text-emerald-300' : 'inline-flex items-center gap-1.5 rounded-lg border border-stone-700 px-3 py-2 text-[10px] text-stone-300 hover:text-emerald-300'}><Bookmark className="h-3.5 w-3.5" /> Xem sau</button>
                      <button type="button" onClick={() => setLibrary((previous) => setVideoShort(previous, selectedVideo.id, !selectedVideo.isShort))} className="inline-flex items-center gap-1.5 rounded-lg border border-stone-700 px-3 py-2 text-[10px] text-stone-300 hover:text-fuchsia-300"><Clapperboard className="h-3.5 w-3.5" /> {selectedVideo.isShort ? 'Bỏ Shorts' : 'Đưa vào Shorts'}</button>
                      <a href={selectedVideo.canonicalUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-stone-700 px-3 py-2 text-[10px] text-stone-300 hover:text-white">Mở gốc <ExternalLink className="h-3.5 w-3.5" /></a>
                    </div>
                  </div>
                  {selectedVideo.description && <p className="mt-3 whitespace-pre-line text-[10px] leading-relaxed text-stone-500">{selectedVideo.description}</p>}
                  {library.playlists.length > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-stone-800 pt-3">
                      <ListVideo className="h-3.5 w-3.5 text-stone-500" />
                      <select value={selectedPlaylistId} onChange={(event) => setSelectedPlaylistId(event.target.value)} className="rounded-lg border border-stone-700 bg-stone-950 px-2.5 py-2 text-[10px] text-stone-300">
                        <option value="">Chọn playlist...</option>
                        {library.playlists.map((playlist) => <option key={playlist.id} value={playlist.id}>{playlist.name}</option>)}
                      </select>
                      <button type="button" disabled={!selectedPlaylistId} onClick={() => setLibrary((previous) => toggleVideoInPlaylist(previous, selectedPlaylistId, selectedVideo.id))} className="rounded-lg bg-stone-800 px-3 py-2 text-[10px] text-stone-300 hover:bg-stone-700 disabled:opacity-40">Thêm / bỏ khỏi playlist</button>
                    </div>
                  )}
                </section>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-stone-800 px-5 py-16 text-center">
                <Play className="mx-auto h-8 w-8 text-stone-700" />
                <p className="mt-3 text-xs text-stone-300">Chưa chọn video để xem.</p>
                <button type="button" onClick={() => setTab('discover')} className="mt-3 rounded-lg bg-emerald-600 px-3 py-2 text-[10px] font-semibold text-white">Khám phá video</button>
              </div>
            )}
          </div>
        )}

        {tab === 'shorts' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><h3 className="text-sm font-bold text-white">Shorts Feed</h3><p className="mt-1 text-[9px] text-stone-500">Vuốt dọc để chuyển video. Player tự phát im lặng khi có thể. Kết quả YouTube được lọc tối đa 3 phút nhưng không phải video nào cũng chắc chắn là định dạng Shorts dọc.</p></div>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={discoverShorts} disabled={loading} className="inline-flex items-center gap-1.5 rounded-lg bg-fuchsia-600 px-3 py-2 text-[9px] font-semibold text-white hover:bg-fuchsia-500 disabled:opacity-40">{loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} Khám phá Shorts</button>
                <span className="text-[9px] text-stone-500">{shorts.length ? (shortIndex + 1) + ' / ' + shorts.length : 'Chưa có video'}</span>
                <button type="button" onClick={() => scrollShortsTo(shortIndex - 1)} disabled={shortIndex <= 0} className="rounded-lg border border-stone-800 p-2 text-stone-400 hover:text-white disabled:opacity-30"><ChevronUp className="h-3.5 w-3.5" /></button>
                <button type="button" onClick={() => scrollShortsTo(shortIndex + 1)} disabled={shortIndex >= shorts.length - 1} className="rounded-lg border border-stone-800 p-2 text-stone-400 hover:text-white disabled:opacity-30"><ChevronDown className="h-3.5 w-3.5" /></button>
              </div>
            </div>
            {shorts.length > 0 ? (
              <div
                ref={shortsContainerRef}
                onScroll={(event) => {
                  const element = event.currentTarget;
                  if (element.clientHeight > 0) {
                    const next = Math.max(0, Math.min(shorts.length - 1, Math.round(element.scrollTop / element.clientHeight)));
                    setShortIndex((current) => current === next ? current : next);
                  }
                }}
                className="mx-auto h-[min(70vh,720px)] min-h-[420px] max-w-5xl snap-y snap-mandatory overflow-y-auto overscroll-contain rounded-2xl border border-stone-800 bg-black"
              >
                {shorts.map((item, index) => (
                  <section key={item.id} className="flex h-full min-h-full snap-start flex-col items-center justify-center gap-3 p-3 md:flex-row md:gap-6 md:p-5">
                    <div className="h-[min(58vh,640px)] w-full max-w-[360px] shrink-0 overflow-hidden rounded-2xl bg-stone-900">
                      {index === shortIndex ? (
                        <VideoEmbedPlayer item={item} shortMode onProgress={(current, duration) => handleProgress(item.id, current, duration)} onStateChange={(state) => {
                          setPlayerStatus(state);
                          if (state === 'ended' && index < shorts.length - 1) scrollShortsTo(index + 1);
                        }} />
                      ) : (
                        <button type="button" onClick={() => scrollShortsTo(index)} className="relative flex h-full w-full items-center justify-center bg-stone-900">
                          <VideoThumbnail item={item} />
                          <span className="absolute inset-0 flex items-center justify-center bg-black/20"><Play className="h-10 w-10 text-white drop-shadow" /></span>
                        </button>
                      )}
                    </div>
                    <div className="w-full max-w-sm space-y-3">
                      <div className="flex items-center gap-2 text-[9px] uppercase tracking-wider text-stone-500">{item.platform === 'youtube' ? <Play className="h-3 w-3 text-red-400" /> : <Music2 className="h-3 w-3 text-pink-400" />}{item.platform} · SHORTS</div>
                      <h4 className="text-sm font-semibold leading-relaxed text-white">{item.title}</h4>
                      <p className="text-[10px] text-stone-500">{item.creator}</p>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => playExisting(item)} className="rounded-lg bg-emerald-600 px-3 py-2 text-[10px] font-semibold text-white hover:bg-emerald-500">Mở trang xem</button>
                        <button type="button" onClick={() => toggleFavorite(item)} className="rounded-lg border border-stone-700 px-3 py-2 text-[10px] text-stone-300 hover:text-rose-300"><Heart className="mr-1 inline h-3 w-3" /> Yêu thích</button>
                        <button type="button" onClick={() => toggleWatchLater(item)} className="rounded-lg border border-stone-700 px-3 py-2 text-[10px] text-stone-300 hover:text-emerald-300"><Bookmark className="mr-1 inline h-3 w-3" /> {library.watchLater.includes(item.id) ? 'Đã lưu' : 'Xem sau'}</button>
                        <button type="button" onClick={() => markNotInterested(item)} className="rounded-lg border border-stone-700 px-3 py-2 text-[10px] text-stone-400 hover:text-amber-300"><ThumbsDown className="mr-1 inline h-3 w-3" /> Không quan tâm</button>
                        {item.creator && <button type="button" onClick={() => hideCreator(item)} className="rounded-lg border border-stone-700 px-3 py-2 text-[10px] text-stone-400 hover:text-rose-300"><EyeOff className="mr-1 inline h-3 w-3" /> Ẩn kênh</button>}
                        <a href={item.canonicalUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-stone-700 px-3 py-2 text-[10px] text-stone-300 hover:text-white">Mở gốc <ExternalLink className="ml-1 inline h-3 w-3" /></a>
                      </div>
                      <p className="text-[9px] leading-relaxed text-stone-600">Cuộn dọc hoặc dùng nút mũi tên để chuyển video. Player chỉ được tạo cho mục đang hiển thị nhằm giảm số iframe hoạt động.</p>
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-stone-800 px-5 py-14 text-center">
                <Clapperboard className="mx-auto h-8 w-8 text-fuchsia-400/70" />
                <p className="mt-3 text-xs font-semibold text-stone-200">Shorts Feed đang chờ video đầu tiên</p>
                <p className="mx-auto mt-1 max-w-md text-[10px] leading-relaxed text-stone-500">Thêm link TikTok hoặc YouTube Shorts bằng ô liên kết ở Khám phá. Với video YouTube thường, bạn cũng có thể chọn “Đưa vào Shorts” trong thẻ video.</p>
                <button type="button" onClick={discoverShorts} disabled={loading} className="mt-4 rounded-lg bg-fuchsia-600 px-4 py-2 text-[10px] font-semibold text-white hover:bg-fuchsia-500 disabled:opacity-40">Khám phá Shorts YouTube</button>
                <button type="button" onClick={() => setTab('discover')} className="ml-2 mt-4 rounded-lg border border-stone-700 px-4 py-2 text-[10px] text-stone-300 hover:text-white">Tìm hoặc dán link TikTok</button>
              </div>
            )}
            {resultMode === 'shorts' && nextPageToken && (
              <button type="button" disabled={loading} onClick={() => void executeYouTubeRequest('shorts', nextPageToken)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-fuchsia-800/70 py-2.5 text-[10px] text-fuchsia-200 hover:bg-fuchsia-950/30 disabled:opacity-50">
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ChevronDown className="h-3.5 w-3.5" />} Tải thêm video ngắn
              </button>
            )}
          </div>
        )}

        {tab === 'library' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h3 className="text-sm font-bold text-white">Thư viện của bạn</h3><p className="mt-1 text-[9px] text-stone-500">Metadata, URL, yêu thích và lịch sử được lưu trên trình duyệt này.</p></div>
              <span className="rounded-full border border-stone-800 px-2.5 py-1 text-[9px] text-stone-500">{library.items.length} video</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {([
                ['all', 'Tất cả', library.items.length],
                ['favorites', 'Yêu thích', library.favorites.length],
                ['watchLater', 'Xem sau', library.watchLater.length],
                ['history', 'Đã xem gần đây', library.history.length],
              ] as const).map(([id, label, count]) => (
                <button key={id} type="button" onClick={() => setLibraryFilter(id)} className={libraryFilter === id ? 'rounded-lg bg-emerald-500/15 px-3 py-2 text-[10px] text-emerald-300' : 'rounded-lg border border-stone-800 px-3 py-2 text-[10px] text-stone-500 hover:text-stone-200'}>{label} <span className="ml-1 opacity-60">{count}</span></button>
              ))}
            </div>
            {visibleLibraryItems.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">{visibleLibraryItems.map((item) => renderCard(item, { removable: true, shortAction: true }))}</div>
            ) : (
              <div className="rounded-xl border border-dashed border-stone-800 px-4 py-12 text-center">
                <Film className="mx-auto h-7 w-7 text-stone-700" />
                <p className="mt-2 text-[10px] text-stone-400">Danh mục này chưa có video.</p>
                <button type="button" onClick={() => setTab('discover')} className="mt-3 rounded-lg border border-stone-700 px-3 py-2 text-[10px] text-stone-300 hover:border-emerald-600">Tìm video</button>
              </div>
            )}
          </div>
        )}

        {tab === 'playlists' && (
          <div className="space-y-4">
            <div><h3 className="text-sm font-bold text-white">Playlist cá nhân</h3><p className="mt-1 text-[9px] text-stone-500">Tạo danh sách theo chủ đề: học tập, công nghệ, âm nhạc, giải trí...</p></div>
            <form onSubmit={createPlaylist} className="flex gap-2 rounded-xl border border-stone-800 bg-stone-900/60 p-3">
              <input value={playlistName} onChange={(event) => setPlaylistName(event.target.value)} maxLength={80} placeholder="Tên playlist mới..." className="min-w-0 flex-1 rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-[10px] text-stone-100 outline-none placeholder:text-stone-600 focus:border-emerald-500" />
              <button type="submit" disabled={!playlistName.trim()} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-[10px] font-semibold text-white hover:bg-emerald-500 disabled:opacity-40"><Plus className="h-3.5 w-3.5" /> Tạo playlist</button>
            </form>
            {library.playlists.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {library.playlists.map((playlist) => {
                  const playlistItems = playlist.itemIds.map((id) => libraryItemsById.get(id)).filter((item): item is VideoLibraryItem => Boolean(item));
                  return (
                    <section key={playlist.id} className="rounded-xl border border-stone-800 bg-stone-900/55 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2"><div className="rounded-lg bg-stone-800 p-2 text-emerald-400"><ListVideo className="h-4 w-4" /></div><div className="min-w-0"><h4 className="truncate text-xs font-semibold text-white">{playlist.name}</h4><p className="text-[9px] text-stone-500">{playlistItems.length} video</p></div></div>
                        <button type="button" onClick={() => setLibrary((previous) => ({ ...previous, playlists: previous.playlists.filter((item) => item.id !== playlist.id) }))} title="Xóa playlist" className="rounded-lg p-2 text-stone-600 hover:bg-stone-800 hover:text-rose-300"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                      {playlistItems.length > 0 ? (
                        <div className="mt-3 space-y-2">
                          {playlistItems.slice(0, 8).map((item) => (
                            <div key={item.id} className="flex items-center gap-2">
                              <button type="button" onClick={() => playExisting(item)} className="min-w-0 flex-1 truncate text-left text-[10px] text-stone-300 hover:text-emerald-300">{item.title}</button>
                              <button type="button" onClick={() => setLibrary((previous) => toggleVideoInPlaylist(previous, playlist.id, item.id))} className="rounded p-1 text-stone-600 hover:text-rose-300"><X className="h-3 w-3" /></button>
                            </div>
                          ))}
                          {playlistItems.length > 8 && <p className="text-[9px] text-stone-600">Và {playlistItems.length - 8} video khác</p>}
                        </div>
                      ) : <p className="mt-3 text-[9px] text-stone-600">Playlist còn trống. Hãy mở video và thêm vào danh sách này.</p>}
                    </section>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-stone-800 px-4 py-12 text-center"><ListVideo className="mx-auto h-7 w-7 text-stone-700" /><p className="mt-2 text-[10px] text-stone-400">Chưa có playlist nào.</p></div>
            )}
          </div>
        )}
      </main>

      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-stone-800 bg-stone-950 px-4 py-2 text-[9px] text-stone-600">
        <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3 w-3 text-emerald-500" /> Nhúng chính thức · Không tải video · Không lưu media</span>
        <span>{library.items.length} mục trong thư viện · {library.playlists.length} playlist</span>
      </footer>
    </div>
  );
}
