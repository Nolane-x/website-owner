'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Heart, Loader2, Play, Radio, Search, Globe2, Languages, Music2, Clock3, Wifi, ChevronDown, ExternalLink, RefreshCw } from 'lucide-react';
import {
  type RadioBrowserFacet,
  type RadioBrowserSort,
  type RadioBrowserStation,
} from '@/lib/audio/radio-browser';
import {
  loadRadioLibrary,
  recordRadioHistory,
  saveRadioLibrary,
  toggleRadioFavorite,
} from '@/lib/audio/radio-library';

type CatalogTab = 'discover' | 'favorites' | 'recent';

interface RadioBrowserPanelProps {
  onPlayStation: (station: RadioBrowserStation) => void;
  currentStreamUrl?: string | null;
}

interface SearchResponse {
  stations: RadioBrowserStation[];
  hasMore: boolean;
}

interface StatsResponse {
  stations: number;
  tags: number;
  languages: number;
  countries: number;
}

const QUICK_GENRES = ['pop', 'rock', 'jazz', 'classical', 'news', 'electronic', 'ambient', 'chillout', 'country', 'dance', 'hip-hop', 'talk'];

function formatCount(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value);
}

function stationSummary(station: RadioBrowserStation): string {
  return [
    station.country,
    station.codec,
    station.bitrate ? station.bitrate + ' kbps' : null,
  ].filter(Boolean).join(' · ') || 'Radio trực tuyến';
}

export function RadioBrowserPanel({ onPlayStation, currentStreamUrl }: RadioBrowserPanelProps) {
  const [tab, setTab] = useState<CatalogTab>('discover');
  const [query, setQuery] = useState('');
  const [country, setCountry] = useState('');
  const [language, setLanguage] = useState('');
  const [tag, setTag] = useState('');
  const [codec, setCodec] = useState('');
  const [minBitrate, setMinBitrate] = useState('0');
  const [sort, setSort] = useState<RadioBrowserSort>('popular');
  const [offset, setOffset] = useState(0);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [stations, setStations] = useState<RadioBrowserStation[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [countries, setCountries] = useState<RadioBrowserFacet[]>([]);
  const [languages, setLanguages] = useState<RadioBrowserFacet[]>([]);
  const [genres, setGenres] = useState<RadioBrowserFacet[]>([]);
  const [library, setLibrary] = useState(() => loadRadioLibrary());

  const popularGenres = useMemo(() => {
    const fromDirectory = genres
      .filter((item) => item.stationCount > 0)
      .slice(0, 10)
      .map((item) => item.name.toLowerCase());
    return [...new Set([...QUICK_GENRES, ...fromDirectory])].slice(0, 12);
  }, [genres]);

  useEffect(() => {
    saveRadioLibrary(library);
  }, [library]);

  useEffect(() => {
    const controller = new AbortController();
    const loadFacets = async () => {
      const [statsResult, countriesResult, languagesResult, tagsResult] = await Promise.allSettled([
        fetch('/api/radio-browser?mode=stats', { signal: controller.signal }).then((response) => response.ok ? response.json() : null),
        fetch('/api/radio-browser?mode=countries', { signal: controller.signal }).then((response) => response.ok ? response.json() : null),
        fetch('/api/radio-browser?mode=languages', { signal: controller.signal }).then((response) => response.ok ? response.json() : null),
        fetch('/api/radio-browser?mode=tags', { signal: controller.signal }).then((response) => response.ok ? response.json() : null),
      ]);
      if (controller.signal.aborted) return;
      if (statsResult.status === 'fulfilled' && statsResult.value) setStats(statsResult.value as StatsResponse);
      if (countriesResult.status === 'fulfilled' && countriesResult.value?.items) setCountries(countriesResult.value.items as RadioBrowserFacet[]);
      if (languagesResult.status === 'fulfilled' && languagesResult.value?.items) setLanguages(languagesResult.value.items as RadioBrowserFacet[]);
      if (tagsResult.status === 'fulfilled' && tagsResult.value?.items) setGenres(tagsResult.value.items as RadioBrowserFacet[]);
    };
    void loadFacets();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (tab !== 'discover') return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          mode: 'search',
          q: query,
          country,
          language,
          tag,
          codec,
          minBitrate,
          sort,
          offset: String(offset),
          limit: '48',
        });
        const response = await fetch('/api/radio-browser?' + params.toString(), {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });
        const payload = await response.json() as SearchResponse & { error?: string };
        if (!response.ok) throw new Error(payload.error || 'Không thể tải danh sách radio.');
        setStations((previous) => offset === 0 ? payload.stations : [...previous, ...payload.stations.filter((item) => !previous.some((existing) => existing.id === item.id))]);
        setHasMore(payload.hasMore);
        setError(null);
        setLoading(false);
        setLoadingMore(false);
      } catch (cause) {
        if (controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : 'Không thể tải danh sách radio.');
        setLoading(false);
        setLoadingMore(false);
      }
    }, query.trim() ? 280 : 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [tab, query, country, language, tag, codec, minBitrate, sort, offset]);

  const visibleStations = tab === 'favorites'
    ? library.favorites
    : tab === 'recent'
      ? library.history
      : stations;

  const setFilter = (setter: (value: string) => void, value: string) => {
    setter(value);
    setOffset(0);
    setLoading(true);
  };

  const handleQuery = (value: string) => {
    setQuery(value);
    setOffset(0);
    setLoading(true);
  };

  const handlePlay = (station: RadioBrowserStation) => {
    onPlayStation(station);
    setLibrary((previous) => ({
      ...previous,
      history: recordRadioHistory(previous.history, station),
    }));
  };

  const handleFavorite = (station: RadioBrowserStation) => {
    setLibrary((previous) => ({
      ...previous,
      favorites: toggleRadioFavorite(previous.favorites, station),
    }));
  };

  const refresh = () => {
    setLoading(true);
    setOffset(0);
    setError(null);
    setRefreshNonce((value) => value + 1);
  };

  return (
    <section className="space-y-3 rounded-2xl border border-stone-800 bg-stone-900/40 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Globe2 className="h-4 w-4 text-emerald-400" />
            <h4 className="font-semibold text-sm text-stone-100">Thư viện radio toàn cầu</h4>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-stone-500">
            Tìm đài trực tuyến theo tên, quốc gia, ngôn ngữ, thể loại và chất lượng. Chỉ hiện luồng HTTPS trực tiếp đã vượt qua kiểm tra gần nhất.
          </p>
        </div>
        <button type="button" onClick={refresh} className="inline-flex items-center gap-1.5 rounded-lg border border-stone-700 px-2.5 py-1.5 text-[11px] text-stone-300 hover:border-emerald-600 hover:text-emerald-300">
          <RefreshCw className="h-3 w-3" /> Làm mới
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Đài trong kho', value: stats.stations },
            { label: 'Thể loại', value: stats.tags },
            { label: 'Ngôn ngữ', value: stats.languages },
            { label: 'Quốc gia', value: stats.countries },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-stone-800 bg-stone-950/70 px-2 py-2">
              <p className="text-sm font-semibold tabular-nums text-stone-100">{formatCount(item.value)}</p>
              <p className="mt-0.5 text-[9px] text-stone-500">{item.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-1.5 border-b border-stone-800 pb-2">
        {([
          ['discover', 'Khám phá', Search],
          ['favorites', 'Yêu thích', Heart],
          ['recent', 'Gần đây', Clock3],
        ] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={tab === key ? 'inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 py-2 text-[11px] font-semibold text-emerald-300' : 'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] text-stone-500 hover:bg-stone-800 hover:text-stone-200'}
          >
            <Icon className="h-3 w-3" /> {label}
            {key === 'favorites' && library.favorites.length > 0 ? ' ' + library.favorites.length : ''}
            {key === 'recent' && library.history.length > 0 ? ' ' + library.history.length : ''}
          </button>
        ))}
      </div>

      {tab === 'discover' && (
        <>
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
            <input
              type="search"
              value={query}
              onChange={(event) => handleQuery(event.target.value)}
              placeholder="Tìm tên đài: BBC, jazz, VOV, classical..."
              aria-label="Tìm đài radio"
              className="w-full rounded-xl border border-stone-700 bg-stone-950 py-2.5 pl-9 pr-3 text-xs text-stone-100 outline-none placeholder:text-stone-600 focus:border-emerald-500"
            />
          </label>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <label>
              <span className="mb-1 flex items-center gap-1 text-[10px] text-stone-500"><Globe2 className="h-3 w-3" /> Quốc gia</span>
              <select value={country} onChange={(event) => setFilter(setCountry, event.target.value)} className="w-full rounded-lg border border-stone-700 bg-stone-950 px-2 py-2 text-[11px] text-stone-200">
                <option value="">Tất cả quốc gia</option>
                {countries.map((item) => <option key={item.name} value={item.name}>{item.name} ({formatCount(item.stationCount)})</option>)}
              </select>
            </label>
            <label>
              <span className="mb-1 flex items-center gap-1 text-[10px] text-stone-500"><Languages className="h-3 w-3" /> Ngôn ngữ</span>
              <select value={language} onChange={(event) => setFilter(setLanguage, event.target.value)} className="w-full rounded-lg border border-stone-700 bg-stone-950 px-2 py-2 text-[11px] text-stone-200">
                <option value="">Tất cả ngôn ngữ</option>
                {languages.map((item) => <option key={item.name} value={item.name}>{item.name} ({formatCount(item.stationCount)})</option>)}
              </select>
            </label>
            <label>
              <span className="mb-1 flex items-center gap-1 text-[10px] text-stone-500"><Music2 className="h-3 w-3" /> Thể loại</span>
              <select value={tag} onChange={(event) => setFilter(setTag, event.target.value)} className="w-full rounded-lg border border-stone-700 bg-stone-950 px-2 py-2 text-[11px] text-stone-200">
                <option value="">Tất cả thể loại</option>
                {genres.map((item) => <option key={item.name} value={item.name}>{item.name} ({formatCount(item.stationCount)})</option>)}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-[10px] text-stone-500">Định dạng</span>
              <select value={codec} onChange={(event) => setFilter(setCodec, event.target.value)} className="w-full rounded-lg border border-stone-700 bg-stone-950 px-2 py-2 text-[11px] text-stone-200">
                <option value="">Mọi codec</option>
                {['MP3', 'AAC', 'AAC+', 'OGG', 'OPUS', 'FLAC'].map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-[10px] text-stone-500">Bitrate tối thiểu</span>
              <select value={minBitrate} onChange={(event) => setFilter(setMinBitrate, event.target.value)} className="w-full rounded-lg border border-stone-700 bg-stone-950 px-2 py-2 text-[11px] text-stone-200">
                <option value="0">Không giới hạn</option>
                <option value="64">64 kbps+</option>
                <option value="128">128 kbps+</option>
                <option value="192">192 kbps+</option>
                <option value="256">256 kbps+</option>
                <option value="320">320 kbps+</option>
              </select>
            </label>
            <label>
              <span className="mb-1 block text-[10px] text-stone-500">Sắp xếp</span>
              <select value={sort} onChange={(event) => { setSort(event.target.value as RadioBrowserSort); setOffset(0); setLoading(true); }} className="w-full rounded-lg border border-stone-700 bg-stone-950 px-2 py-2 text-[11px] text-stone-200">
                <option value="popular">Phổ biến</option>
                <option value="votes">Được bình chọn</option>
                <option value="bitrate">Chất lượng cao</option>
                <option value="recent">Kiểm tra gần đây</option>
                <option value="name">Tên A–Z</option>
                <option value="random">Ngẫu nhiên</option>
              </select>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-stone-500">Thể loại nhanh:</span>
            {popularGenres.slice(0, 8).map((genre) => (
              <button key={genre} type="button" onClick={() => setFilter(setTag, tag === genre ? '' : genre)} className={tag.toLowerCase() === genre ? 'rounded-full bg-emerald-500/20 px-2.5 py-1 text-[10px] text-emerald-300' : 'rounded-full border border-stone-800 px-2.5 py-1 text-[10px] text-stone-400 hover:border-stone-600 hover:text-stone-200'}>
                {genre}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-stone-400">
          {tab === 'favorites' ? library.favorites.length + ' đài yêu thích' : tab === 'recent' ? library.history.length + ' đài đã nghe' : loading ? 'Đang tìm đài...' : formatCount(stations.length) + ' đài trong trang'}
        </p>
        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400"><Wifi className="h-3 w-3" /> HTTPS · đã lọc nguồn lỗi</span>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-amber-900 bg-amber-950/30 px-3 py-2 text-[11px] text-amber-200">
          {error}
          <button type="button" onClick={refresh} className="ml-2 underline">Thử lại</button>
        </div>
      )}

      {loading && tab === 'discover' && stations.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-8 text-xs text-stone-500"><Loader2 className="h-4 w-4 animate-spin" /> Đang tải thư viện radio...</div>
      ) : visibleStations.length > 0 ? (
        <div className="grid grid-cols-1 gap-2">
          {visibleStations.map((station) => {
            const favorite = library.favorites.some((item) => item.id === station.id);
            const active = currentStreamUrl === station.streamUrl;
            return (
              <article key={station.id} className={active ? 'rounded-xl border border-emerald-700/70 bg-emerald-950/25 p-3' : 'rounded-xl border border-stone-800 bg-stone-950/65 p-3'}>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-stone-800 text-emerald-400">
                    {station.favicon ? (
                      <span aria-label="Biểu tượng đài" role="img" style={{ backgroundImage: 'url("' + station.favicon + '")' }} className="h-full w-full bg-cover bg-center" />
                    ) : <Radio className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-stone-100">{station.name}</p>
                    <p className="mt-0.5 truncate text-[10px] text-stone-500">{stationSummary(station)}</p>
                    {station.tags.length > 0 && <p className="mt-1 truncate text-[9px] text-stone-600">{station.tags.slice(0, 5).join(' · ')}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button type="button" onClick={() => handleFavorite(station)} aria-label={favorite ? 'Bỏ yêu thích ' + station.name : 'Thêm yêu thích ' + station.name} title={favorite ? 'Bỏ yêu thích' : 'Yêu thích'} className={favorite ? 'rounded-lg p-2 text-rose-400 hover:bg-stone-800' : 'rounded-lg p-2 text-stone-500 hover:bg-stone-800 hover:text-rose-300'}>
                      <Heart className="h-4 w-4" fill={favorite ? 'currentColor' : 'none'} />
                    </button>
                    <button type="button" onClick={() => handlePlay(station)} aria-label={'Phát ' + station.name} className="rounded-lg bg-emerald-600 p-2 text-white hover:bg-emerald-500">
                      {active ? <span className="block h-4 w-4 text-[9px] leading-4">ON</span> : <Play className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                {station.homepage && (
                  <div className="mt-2 flex justify-end">
                    <a href={station.homepage} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[9px] text-stone-600 hover:text-emerald-300">
                      Trang của đài <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-stone-800 px-3 py-8 text-center text-xs text-stone-500">
          {tab === 'favorites' ? 'Bạn chưa lưu đài yêu thích nào.' : tab === 'recent' ? 'Chưa có đài nào được nghe.' : 'Không tìm thấy đài HTTPS phù hợp với bộ lọc này.'}
        </div>
      )}

      {tab === 'discover' && hasMore && (
        <button type="button" disabled={loadingMore} onClick={() => { setLoadingMore(true); setOffset((value) => value + 48); }} className="flex w-full items-center justify-center gap-2 rounded-xl border border-stone-700 py-2.5 text-xs text-stone-300 hover:border-emerald-600 hover:text-emerald-300 disabled:opacity-50">
          {loadingMore ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ChevronDown className="h-3.5 w-3.5" />}
          Tải thêm 48 đài
        </button>
      )}
      <p className="text-[9px] leading-relaxed text-stone-600">
        Danh mục do cộng đồng Radio Browser tổng hợp và kiểm tra định kỳ. Tính khả dụng thay đổi theo máy chủ từng đài; nếu một luồng lỗi, thử đài khác. Chất lượng codec/bitrate là metadata lần kiểm tra gần nhất.
      </p>
    </section>
  );
}
