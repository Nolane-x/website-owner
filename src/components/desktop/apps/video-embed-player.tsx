'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { VideoLibraryItem } from '@/lib/video/video-library';

interface YouTubePlayerInstance {
  destroy: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  setVolume: (volume: number) => void;
  mute: () => void;
}

interface YouTubePlayerEvent {
  target: YouTubePlayerInstance;
  data?: number;
}

interface YouTubeApiGlobal {
  PlayerState: { ENDED: number; PLAYING: number; PAUSED: number; BUFFERING: number; CUED: number };
  Player: new (
    element: HTMLElement,
    options: {
      width: string;
      height: string;
      videoId: string;
      playerVars: Record<string, string | number>;
      events: {
        onReady: (event: YouTubePlayerEvent) => void;
        onStateChange: (event: YouTubePlayerEvent) => void;
        onError: (event: YouTubePlayerEvent) => void;
      };
    },
  ) => YouTubePlayerInstance;
}

declare global {
  interface Window {
    YT?: YouTubeApiGlobal;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeApiPromise: Promise<YouTubeApiGlobal> | null = null;

function loadYouTubeIframeApi(): Promise<YouTubeApiGlobal> {
  if (typeof window === 'undefined') return Promise.reject(new Error('YouTube Player chỉ chạy trong trình duyệt.'));
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubeApiPromise) return youtubeApiPromise;

  const pending = new Promise<YouTubeApiGlobal>((resolve, reject) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    const timeout = window.setTimeout(() => reject(new Error('YouTube Player tải quá lâu.')), 15_000);

    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      window.clearTimeout(timeout);
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error('YouTube Player API chưa sẵn sàng.'));
    };

    const existing = document.querySelector<HTMLScriptElement>('script[data-video-youtube-api="true"]');
    if (!existing) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.dataset.videoYoutubeApi = 'true';
      script.onerror = () => {
        window.clearTimeout(timeout);
        reject(new Error('Không tải được YouTube Player API. Hãy kiểm tra mạng hoặc chính sách chặn nội dung.'));
      };
      document.head.appendChild(script);
    }
  });

  youtubeApiPromise = pending.catch((error: unknown) => {
    youtubeApiPromise = null;
    throw error;
  });
  return youtubeApiPromise;
}

export interface VideoPlayerProps {
  item: VideoLibraryItem;
  shortMode?: boolean;
  onProgress?: (currentSeconds: number, durationSeconds: number | null) => void;
  onStateChange?: (state: 'ready' | 'playing' | 'paused' | 'ended' | 'error') => void;
}

function playerErrorMessage(code: number): string {
  if (code === 100) return 'Video đã bị xóa hoặc chuyển sang chế độ riêng tư.';
  if (code === 101 || code === 150) return 'Chủ video không cho phép nhúng. Hãy mở video trực tiếp trên YouTube.';
  if (code === 153) return 'YouTube cần thông tin nhận diện trang xem. Hãy tải lại website rồi thử lại.';
  return 'YouTube không thể phát video này trong trình nhúng.';
}

function YouTubePlayer({ item, shortMode = false, onProgress, onStateChange }: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayerInstance | null>(null);
  const callbacksRef = useRef({ onProgress, onStateChange });
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    callbacksRef.current = { onProgress, onStateChange };
  }, [onProgress, onStateChange]);

  useEffect(() => {
    let cancelled = false;
    let progressTimer: number | null = null;

    const createPlayer = async () => {
      try {
        const api = await loadYouTubeIframeApi();
        if (cancelled || !containerRef.current) return;

        const player = new api.Player(containerRef.current, {
          width: '100%',
          height: '100%',
          videoId: item.platformId,
          playerVars: {
            autoplay: shortMode ? 1 : 0,
            controls: 1,
            rel: 0,
            playsinline: 1,
            enablejsapi: 1,
            origin: window.location.origin,
            fs: 1,
            cc_load_policy: 1,
          },
          events: {
            onReady: (event) => {
              if (cancelled) return;
              playerRef.current = event.target;
              setReady(true);
              setError(null);
              callbacksRef.current.onStateChange?.('ready');
              if (shortMode) {
                event.target.mute();
                event.target.playVideo();
              }
            },
            onStateChange: (event) => {
              if (cancelled) return;
              const apiState = api.PlayerState;
              if (event.data === apiState.PLAYING) callbacksRef.current.onStateChange?.('playing');
              else if (event.data === apiState.PAUSED) callbacksRef.current.onStateChange?.('paused');
              else if (event.data === apiState.ENDED) {
                callbacksRef.current.onStateChange?.('ended');
                callbacksRef.current.onProgress?.(event.target.getDuration(), event.target.getDuration());
              }
            },
            onError: (event) => {
              if (cancelled) return;
              setError(playerErrorMessage(event.data ?? 0));
              callbacksRef.current.onStateChange?.('error');
            },
          },
        });

        playerRef.current = player;
        progressTimer = window.setInterval(() => {
          const current = playerRef.current;
          if (!current || current.getPlayerState() !== api.PlayerState.PLAYING) return;
          const duration = current.getDuration();
          const elapsed = current.getCurrentTime();
          if (Number.isFinite(elapsed) && elapsed >= 0) {
            callbacksRef.current.onProgress?.(elapsed, Number.isFinite(duration) && duration > 0 ? duration : null);
          }
        }, 5000);
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'Không thể tải YouTube Player.');
          callbacksRef.current.onStateChange?.('error');
        }
      }
    };

    void createPlayer();
    return () => {
      cancelled = true;
      if (progressTimer !== null) window.clearInterval(progressTimer);
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [item.platformId, shortMode]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl bg-black">
      <div ref={containerRef} className="h-full w-full" />
      {!ready && !error && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black text-xs text-stone-400">
          Đang tải YouTube Player...
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-stone-950/95 p-5 text-center">
          <p className="max-w-sm text-sm text-stone-200">{error}</p>
          <a href={item.canonicalUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500">
            Mở trên YouTube
          </a>
        </div>
      )}
    </div>
  );
}

function TikTokPlayer({ item, shortMode = false, onProgress, onStateChange }: VideoPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const callbacksRef = useRef({ onProgress, onStateChange });
  const [error, setError] = useState<string | null>(null);
  const embedUrl = 'https://www.tiktok.com/player/v1/' + item.platformId +
    '?controls=1&progress_bar=1&play_button=1&volume_control=1&fullscreen_button=1&timestamp=1&description=1&music_info=1&autoplay=' + (shortMode ? '1&force_muted=1' : '0') + '&loop=0&rel=0';

  useEffect(() => {
    callbacksRef.current = { onProgress, onStateChange };
  }, [onProgress, onStateChange]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://www.tiktok.com' || event.source !== iframeRef.current?.contentWindow) return;
      const data = event.data;
      if (!data || typeof data !== 'object' || data['x-tiktok-player'] !== true || typeof data.type !== 'string') return;

      if (data.type === 'onPlayerReady') {
        callbacksRef.current.onStateChange?.('ready');
      } else if (data.type === 'onStateChange') {
        if (data.value === 1) callbacksRef.current.onStateChange?.('playing');
        else if (data.value === 2 || data.value === 3) callbacksRef.current.onStateChange?.('paused');
        else if (data.value === 0) callbacksRef.current.onStateChange?.('ended');
      } else if (data.type === 'onCurrentTime' && data.value && typeof data.value === 'object') {
        const value = data.value as { currentTime?: unknown; duration?: unknown };
        if (typeof value.currentTime === 'number' && Number.isFinite(value.currentTime)) {
          callbacksRef.current.onProgress?.(
            value.currentTime,
            typeof value.duration === 'number' && Number.isFinite(value.duration) ? value.duration : null,
          );
        }
      } else if (data.type === 'onPlayerError') {
        setError('TikTok không thể tải hoặc phát bài đăng này. Video có thể đã bị xóa, giới hạn khu vực hoặc không cho phép nhúng.');
        callbacksRef.current.onStateChange?.('error');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [item.platformId]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl bg-black">
      <iframe
        ref={iframeRef}
        title={item.title}
        src={embedUrl}
        className="h-full w-full border-0"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen; web-share"
        allowFullScreen
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        onLoad={() => callbacksRef.current.onStateChange?.('ready')}
      />
      {error && (
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-black/90 p-3 text-[11px] text-amber-200">
          <span>{error}</span>
          <a href={item.canonicalUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 underline">Mở TikTok</a>
        </div>
      )}
    </div>
  );
}

export function VideoEmbedPlayer(props: VideoPlayerProps) {
  const shortMode = props.shortMode ?? false;
  return props.item.platform === 'youtube'
    ? <YouTubePlayer {...props} shortMode={shortMode} />
    : <TikTokPlayer {...props} shortMode={shortMode} />;
}
