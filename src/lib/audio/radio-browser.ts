/**
 * Safe client/server types and normalization for the community Radio Browser
 * directory. Directory metadata is untrusted; only direct public HTTPS stream
 * URLs are allowed to reach the page-lifetime audio player.
 */

export type RadioBrowserSort = 'popular' | 'votes' | 'bitrate' | 'recent' | 'name' | 'random';

export interface RadioBrowserFilters {
  query?: string;
  country?: string;
  language?: string;
  tag?: string;
  codec?: string;
  minBitrate?: number;
  sort?: RadioBrowserSort;
  offset?: number;
  limit?: number;
}

export interface RadioBrowserStation {
  id: string;
  name: string;
  streamUrl: string;
  homepage: string | null;
  favicon: string | null;
  country: string | null;
  countryCode: string | null;
  language: string | null;
  tags: string[];
  codec: string | null;
  bitrate: number | null;
  votes: number;
  clickCount: number;
  clickTrend: number;
}

export interface RadioBrowserFacet {
  name: string;
  stationCount: number;
}

export interface RadioBrowserStats {
  stations: number;
  tags: number;
  languages: number;
  countries: number;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SORT_ORDER: Record<RadioBrowserSort, string> = {
  popular: 'clickcount',
  votes: 'votes',
  bitrate: 'bitrate',
  recent: 'lastchecktime',
  name: 'name',
  random: 'random',
};

function boundedInteger(value: number | undefined, fallback: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(0, Math.floor(value)));
}

function cleanFilter(value: string | undefined, maxLength = 80): string | null {
  if (typeof value !== 'string') return null;
  const clean = value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, maxLength);
  return clean || null;
}

function isUnsafeHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.lan') ||
    host.endsWith('.home.arpa') ||
    host === '0.0.0.0' ||
    host === '::' ||
    host === '::1'
  ) return true;

  // Reject private, loopback, link-local and reserved IPv4 literals.
  if (/^(?:0|10|127|169\.254|192\.168)\./.test(host)) return true;
  const parts = host.split('.');
  if (parts.length === 4 && parts.every((part) => /^\d{1,3}$/.test(part))) {
    const octets = parts.map(Number);
    if (octets.some((part) => part > 255)) return true;
    if (octets[0] >= 224 || (octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127)) return true;
    if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return true;
  }

  // IPv6 literals are uncommon in the directory. Reject them rather than
  // accidentally allowing browser requests to local/link-scoped addresses.
  if (host.includes(':')) return true;
  return false;
}

export function normalizePublicHttpsUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0 || value.length > 2_048) return null;
  try {
    const url = new URL(value.trim());
    if (
      url.protocol !== 'https:' ||
      !url.hostname ||
      url.username ||
      url.password ||
      isUnsafeHostname(url.hostname)
    ) return null;
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

function finiteCount(value: unknown): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
}

function safeNullableText(value: unknown, limit: number): string | null {
  if (typeof value !== 'string') return null;
  const clean = value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, limit);
  return clean || null;
}

/**
 * Converts untrusted Radio Browser API or localStorage data into a small,
 * browser-playable station record. HTTP, HLS and failed-check entries are
 * rejected because the app is served over HTTPS and uses native HTMLAudio.
 */
export function normalizeRadioBrowserStation(value: unknown): RadioBrowserStation | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const id = safeNullableText(raw.stationuuid ?? raw.id, 64);
  const name = safeNullableText(raw.name, 160);
  const resolvedUrl = normalizePublicHttpsUrl(raw.url_resolved ?? raw.streamUrl);
  const fallbackUrl = resolvedUrl ? null : normalizePublicHttpsUrl(raw.url);
  const streamUrl = resolvedUrl ?? fallbackUrl;
  if (!id || !UUID_PATTERN.test(id) || !name || !streamUrl) return null;
  if (Number(raw.hls) === 1) return null;
  if (raw.lastcheckok !== undefined && raw.lastcheckok !== null && Number(raw.lastcheckok) === 0) return null;

  const tags = (typeof raw.tags === 'string' ? raw.tags.split(',') : Array.isArray(raw.tags) ? raw.tags : [])
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 40))
    .filter(Boolean)
    .slice(0, 12);

  const countryCode = safeNullableText(raw.countrycode ?? raw.countryCode, 2)?.toUpperCase() ?? null;
  const bitrate = finiteCount(raw.bitrate);
  return {
    id,
    name,
    streamUrl,
    homepage: normalizePublicHttpsUrl(raw.homepage),
    favicon: normalizePublicHttpsUrl(raw.favicon),
    country: safeNullableText(raw.country, 80),
    countryCode: countryCode && /^[A-Z]{2}$/.test(countryCode) ? countryCode : null,
    language: safeNullableText(raw.language, 80),
    tags,
    codec: safeNullableText(raw.codec, 24)?.toUpperCase() ?? null,
    bitrate: bitrate > 0 ? Math.min(10_000, bitrate) : null,
    votes: finiteCount(raw.votes),
    clickCount: finiteCount(raw.clickcount ?? raw.clickCount),
    clickTrend: Number.isFinite(Number(raw.clicktrend ?? raw.clickTrend))
      ? Math.max(-1_000_000, Math.min(1_000_000, Number(raw.clicktrend ?? raw.clickTrend)))
      : 0,
  };
}

export function buildRadioBrowserSearchParams(filters: RadioBrowserFilters = {}): URLSearchParams {
  const params = new URLSearchParams();
  params.set('is_https', 'true');
  params.set('hidebroken', 'true');
  params.set('limit', String(Math.min(60, Math.max(1, boundedInteger(filters.limit, 48, 60)))));
  params.set('offset', String(Math.min(100_000, boundedInteger(filters.offset, 0, 100_000))));

  const sort = filters.sort && SORT_ORDER[filters.sort] ? filters.sort : 'popular';
  params.set('order', SORT_ORDER[sort]);
  params.set('reverse', sort === 'name' ? 'false' : 'true');

  const query = cleanFilter(filters.query, 80);
  const country = cleanFilter(filters.country, 80);
  const language = cleanFilter(filters.language, 60);
  const tag = cleanFilter(filters.tag, 60);
  const codec = cleanFilter(filters.codec, 24);

  if (query) params.set('name', query);
  if (country) params.set('country', country);
  if (language) params.set('language', language);
  if (tag) params.set('tag', tag);
  if (codec) params.set('codec', codec);

  const minBitrate = boundedInteger(filters.minBitrate, 0, 512);
  if (minBitrate > 0) params.set('bitrateMin', String(minBitrate));
  return params;
}

export function normalizeRadioBrowserFacets(value: unknown): RadioBrowserFacet[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const raw = item as Record<string, unknown>;
      const name = safeNullableText(raw.name, 80);
      if (!name) return null;
      const key = name.toLocaleLowerCase();
      if (seen.has(key)) return null;
      seen.add(key);
      return { name, stationCount: finiteCount(raw.stationcount ?? raw.stationCount) };
    })
    .filter((item): item is RadioBrowserFacet => item !== null)
    .sort((a, b) => b.stationCount - a.stationCount || a.name.localeCompare(b.name))
    .slice(0, 300);
}
