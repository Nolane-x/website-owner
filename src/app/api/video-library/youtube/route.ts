import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guard';
import { assertValidOrigin } from '@/lib/security/origin-guard';
import { getClientIp, rateLimiter } from '@/lib/security/rate-limit';
import { parseIsoDuration } from '@/lib/video/video-library';
import { getStoredYouTubeApiKey } from '@/lib/video/youtube-api-key-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface YouTubeSearchResult {
  id?: { kind?: string; videoId?: string } | string;
  snippet?: {
    publishedAt?: string;
    title?: string;
    description?: string;
    channelId?: string;
    channelTitle?: string;
    thumbnails?: Record<string, { url?: string }>;
  };
  contentDetails?: { duration?: string };
  statistics?: { viewCount?: string };
}

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, {
    status,
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  });
}

function validApiKey(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 20 && value.length <= 256 && !/[\r\n]/.test(value);
}

function countValue(value: unknown): number | null {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function safeThumbnail(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !['i.ytimg.com', 'yt3.ggpht.com'].includes(url.hostname.toLowerCase())) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function googleErrorReason(value: unknown): string {
  if (!value || typeof value !== 'object') return '';
  const raw = value as { error?: { errors?: Array<{ reason?: unknown }> } };
  const reason = raw.error?.errors?.[0]?.reason;
  return typeof reason === 'string' ? reason : '';
}

async function fetchGoogleJson(url: URL): Promise<unknown> {
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000),
  });
  const text = await response.text();
  if (text.length > 1024 * 1024) throw new Error('UPSTREAM_TOO_LARGE');

  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error('UPSTREAM_INVALID_JSON');
  }
  if (!response.ok) throw new Error(googleErrorReason(payload) || 'UPSTREAM_ERROR_' + response.status);
  return payload;
}

function parseApiError(error: unknown): NextResponse {
  const code = error instanceof Error ? error.message : '';
  if (code === 'quotaExceeded' || code === 'dailyLimitExceeded' || code === 'rateLimitExceeded') {
    return jsonError('YouTube API đã hết hạn mức tìm kiếm trong ngày. Hạn mức sẽ được làm mới theo giờ reset của Google Cloud.', 429);
  }
  if (code === 'keyInvalid' || code === 'invalid' || code === 'forbidden') {
    return jsonError('YouTube API key không hợp lệ hoặc chưa bật YouTube Data API v3.', 401);
  }
  return jsonError('Không kết nối được YouTube Data API. Hãy thử lại sau.', 502);
}

export async function POST(request: NextRequest): Promise<Response> {
  const originError = assertValidOrigin(request);
  if (originError) return originError;

  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  const ip = getClientIp(request.headers);
  const budget = rateLimiter.check('video-youtube:' + ip, 18, 60);
  if (!budget.allowed) {
    return NextResponse.json(
      { error: 'Bạn đang tìm kiếm quá nhanh. Hãy đợi một phút rồi thử lại.' },
      { status: 429, headers: { 'Retry-After': '60', 'Cache-Control': 'private, no-store' } },
    );
  }

  try {
    const rawBody = await request.text();
    if (rawBody.length > 12_000) return jsonError('Yêu cầu tìm kiếm vượt dung lượng cho phép.', 413);
    const body = JSON.parse(rawBody) as Record<string, unknown>;

    const mode = body.mode === 'trending' ? 'trending' : body.mode === 'shorts' ? 'shorts' : 'search';
    const query = typeof body.query === 'string'
      ? body.query.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 120)
      : '';
    const region = typeof body.regionCode === 'string' && /^[A-Z]{2}$/.test(body.regionCode)
      ? body.regionCode
      : 'VN';
    const categoryId = typeof body.categoryId === 'string' && /^\d{1,4}$/.test(body.categoryId)
      ? body.categoryId
      : '';
    const pageToken = typeof body.pageToken === 'string' && /^[A-Za-z0-9_=-]{1,2048}$/.test(body.pageToken)
      ? body.pageToken
      : '';
    const savedApiKey = await getStoredYouTubeApiKey(auth.profile.id);
    const apiKey = savedApiKey ?? (
      validApiKey(process.env.YOUTUBE_API_KEY) ? process.env.YOUTUBE_API_KEY : null
    );

    if (!apiKey) {
      return jsonError('Cần YouTube Data API key. Hãy nhập và lưu key trong phần cài đặt của Video Library.', 428);
    }
    if (mode === 'search' && query.length < 2) return jsonError('Nhập ít nhất 2 ký tự để tìm video.', 400);

    const endpoint = mode === 'trending' ? 'videos' : 'search';
    const requestUrl = new URL('https://www.googleapis.com/youtube/v3/' + endpoint);
    requestUrl.searchParams.set('key', apiKey);
    requestUrl.searchParams.set('maxResults', '24');
    requestUrl.searchParams.set('regionCode', region);

    let rawItems: YouTubeSearchResult[] = [];
    let nextPageToken: string | null = null;
    let details: YouTubeSearchResult[] = [];

    if (mode !== 'trending') {
      requestUrl.searchParams.set('part', 'snippet');
      requestUrl.searchParams.set('type', 'video');
      requestUrl.searchParams.set('q', mode === 'shorts' ? (query || 'shorts') : query);
      requestUrl.searchParams.set('order', mode === 'shorts' ? 'viewCount' : 'relevance');
      requestUrl.searchParams.set('safeSearch', 'moderate');
      requestUrl.searchParams.set('videoEmbeddable', 'true');
      requestUrl.searchParams.set('videoSyndicated', 'true');
      if (mode === 'shorts') requestUrl.searchParams.set('videoDuration', 'short');
      if (categoryId) requestUrl.searchParams.set('videoCategoryId', categoryId);
      if (pageToken) requestUrl.searchParams.set('pageToken', pageToken);

      const response = await fetchGoogleJson(requestUrl) as {
        items?: YouTubeSearchResult[];
        nextPageToken?: string;
      };
      rawItems = Array.isArray(response.items) ? response.items : [];
      nextPageToken = typeof response.nextPageToken === 'string' ? response.nextPageToken.slice(0, 2048) : null;

      const ids = rawItems
        .map((item) => typeof item.id === 'object' ? item.id?.videoId : null)
        .filter((id): id is string => typeof id === 'string' && /^[A-Za-z0-9_-]{11}$/.test(id));
      if (ids.length) {
        const detailsUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
        detailsUrl.searchParams.set('key', apiKey);
        detailsUrl.searchParams.set('part', 'contentDetails,statistics');
        detailsUrl.searchParams.set('id', ids.join(','));
        try {
          const detailResponse = await fetchGoogleJson(detailsUrl) as { items?: YouTubeSearchResult[] };
          details = Array.isArray(detailResponse.items) ? detailResponse.items : [];
        } catch {
          // The search results remain useful without optional duration/statistics.
        }
      }
    } else {
      requestUrl.searchParams.set('part', 'snippet,contentDetails,statistics');
      requestUrl.searchParams.set('chart', 'mostPopular');
      if (categoryId) requestUrl.searchParams.set('videoCategoryId', categoryId);
      if (pageToken) requestUrl.searchParams.set('pageToken', pageToken);
      const response = await fetchGoogleJson(requestUrl) as {
        items?: YouTubeSearchResult[];
        nextPageToken?: string;
      };
      rawItems = Array.isArray(response.items) ? response.items : [];
      details = rawItems;
      nextPageToken = typeof response.nextPageToken === 'string' ? response.nextPageToken.slice(0, 2048) : null;
    }

    const detailsById = new Map(details.map((item) => [
      typeof item.id === 'string' ? item.id : item.id?.videoId ?? '',
      item,
    ]));
    const items = rawItems.flatMap((item) => {
      const videoId = typeof item.id === 'string'
        ? item.id
        : item.id?.videoId ?? '';
      if (!/^[A-Za-z0-9_-]{11}$/.test(videoId) || !item.snippet) return [];
      const detail = detailsById.get(videoId);
      const thumbnails = item.snippet.thumbnails ?? {};
      const thumbnailUrl = safeThumbnail(
        thumbnails.maxres?.url ?? thumbnails.standard?.url ?? thumbnails.high?.url ??
        thumbnails.medium?.url ?? thumbnails.default?.url,
      );
      return [{
        platform: 'youtube' as const,
        videoId,
        title: typeof item.snippet.title === 'string' ? item.snippet.title.slice(0, 240) : 'Video YouTube',
        description: typeof item.snippet.description === 'string' ? item.snippet.description.slice(0, 600) : '',
        creator: typeof item.snippet.channelTitle === 'string' ? item.snippet.channelTitle.slice(0, 120) : '',
        thumbnailUrl,
        durationSeconds: parseIsoDuration(detail?.contentDetails?.duration),
        viewCount: countValue(detail?.statistics?.viewCount),
        publishedAt: typeof item.snippet.publishedAt === 'string' ? item.snippet.publishedAt : null,
        isShort: mode === 'shorts',
      }];
    }).filter((item) => mode !== 'shorts' || (item.durationSeconds !== null && item.durationSeconds > 0 && item.durationSeconds <= 180));

    return NextResponse.json(
      { items, nextPageToken, regionCode: region, mode },
      { headers: { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie' } },
    );
  } catch (error) {
    return parseApiError(error);
  }
}
