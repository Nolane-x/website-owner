import { NextResponse } from 'next/server';
import { checkPublicApiRateLimit } from '@/lib/security/public-api-guard';
import {
  buildRadioBrowserSearchParams,
  normalizeRadioBrowserFacets,
  normalizeRadioBrowserStation,
  type RadioBrowserFilters,
  type RadioBrowserSort,
} from '@/lib/audio/radio-browser';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const API_HOSTS = [
  'https://all.api.radio-browser.info',
  'https://de1.api.radio-browser.info',
  'https://nl1.api.radio-browser.info',
] as const;
const USER_AGENT = 'NolaneAudioLab/1.0 (https://caominhquan.vercel.app)';
const SORTS = new Set<RadioBrowserSort>(['popular', 'votes', 'bitrate', 'recent', 'name', 'random']);

async function fetchRadioBrowserJson(path: string): Promise<unknown> {
  let lastError: unknown = null;
  for (const host of API_HOSTS) {
    try {
      const response = await fetch(host + path, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': USER_AGENT,
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(8_000),
      });
      if (!response.ok) {
        lastError = new Error('Upstream returned an unavailable status.');
        continue;
      }
      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.toLowerCase().includes('application/json')) {
        lastError = new Error('Upstream did not return JSON.');
        continue;
      }
      return await response.json();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error('Radio Browser API is unavailable.');
}

function responseCache(mode: string): Record<string, string> {
  if (mode === 'search') return { 'Cache-Control': 'public, max-age=0, s-maxage=45, stale-while-revalidate=180' };
  if (mode === 'stats') return { 'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=900' };
  return { 'Cache-Control': 'public, max-age=0, s-maxage=600, stale-while-revalidate=1800' };
}

function getBoundedNumber(raw: string | null, fallback: number, max: number): number {
  if (!raw || !/^\d+$/.test(raw)) return fallback;
  return Math.min(max, Math.max(0, Number(raw)));
}

function getSafeFilter(raw: string | null, maxLength: number): string | undefined {
  if (!raw) return undefined;
  const value = raw.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, maxLength);
  return value || undefined;
}

export async function GET(request: Request): Promise<Response> {
  const limited = checkPublicApiRateLimit(request, 'radio-browser', 90);
  if (limited) return limited;

  const query = new URL(request.url).searchParams;
  const mode = query.get('mode') ?? 'search';
  if (!['search', 'tags', 'countries', 'languages', 'stats'].includes(mode)) {
    return NextResponse.json({ error: 'Chế độ Radio Browser không hợp lệ.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }

  try {
    if (mode === 'search') {
      const rawSort = query.get('sort') as RadioBrowserSort | null;
      const filters: RadioBrowserFilters = {
        query: getSafeFilter(query.get('q'), 80),
        country: getSafeFilter(query.get('country'), 80),
        language: getSafeFilter(query.get('language'), 60),
        tag: getSafeFilter(query.get('tag'), 60),
        codec: getSafeFilter(query.get('codec'), 24),
        minBitrate: getBoundedNumber(query.get('minBitrate'), 0, 512),
        sort: rawSort && SORTS.has(rawSort) ? rawSort : 'popular',
        offset: getBoundedNumber(query.get('offset'), 0, 100_000),
        limit: getBoundedNumber(query.get('limit'), 48, 60),
      };
      const params = buildRadioBrowserSearchParams(filters);
      const raw = await fetchRadioBrowserJson('/json/stations/search?' + params.toString());
      const rawItems = Array.isArray(raw) ? raw : [];
      const stations = rawItems
        .map(normalizeRadioBrowserStation)
        .filter((item): item is NonNullable<typeof item> => item !== null);

      return NextResponse.json({
        stations,
        offset: filters.offset ?? 0,
        pageSize: filters.limit ?? 48,
        hasMore: rawItems.length >= (filters.limit ?? 48),
      }, { headers: responseCache(mode) });
    }

    if (mode === 'stats') {
      const stats = await fetchRadioBrowserJson('/json/stats');
      const raw = stats && typeof stats === 'object' ? stats as Record<string, unknown> : {};
      return NextResponse.json({
        stations: getBoundedNumber(String(raw.stations ?? ''), 0, 10_000_000),
        tags: getBoundedNumber(String(raw.tags ?? ''), 0, 100_000),
        languages: getBoundedNumber(String(raw.languages ?? ''), 0, 10_000),
        countries: getBoundedNumber(String(raw.countries ?? ''), 0, 1_000),
      }, { headers: responseCache(mode) });
    }

    const path = mode === 'tags'
      ? '/json/tags?order=stationcount&reverse=true&hidebroken=true&limit=300'
      : mode === 'countries'
        ? '/json/countries?order=stationcount&reverse=true&hidebroken=true&limit=300'
        : '/json/languages?order=stationcount&reverse=true&hidebroken=true&limit=300';
    const raw = await fetchRadioBrowserJson(path);
    return NextResponse.json({ items: normalizeRadioBrowserFacets(raw) }, { headers: responseCache(mode) });
  } catch {
    return NextResponse.json(
      { error: 'Danh bạ Radio Browser hiện chưa kết nối được. Bạn có thể thử lại sau; các đài yêu thích vẫn được lưu trên thiết bị.' },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-store',
          'Retry-After': '10',
        },
      },
    );
  }
}

export async function POST(request: Request): Promise<Response> {
  const limited = checkPublicApiRateLimit(request, 'radio-browser-click', 90);
  if (limited) return limited;

  try {
    const body = await request.json() as { stationUuid?: unknown };
    const uuid = typeof body.stationUuid === 'string' ? body.stationUuid : '';
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid)) {
      return NextResponse.json({ error: 'Mã đài không hợp lệ.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    }
    // Radio Browser asks clients to count a station click when playback starts.
    // This request is server-side and never proxies the actual audio stream.
    await fetchRadioBrowserJson('/json/url/' + uuid);
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    // Click tracking is best-effort: playback must not be interrupted by it.
    return NextResponse.json({ ok: false }, { headers: { 'Cache-Control': 'no-store' } });
  }
}
