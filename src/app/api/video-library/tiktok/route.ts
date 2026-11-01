import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guard';
import { assertValidOrigin } from '@/lib/security/origin-guard';
import { getClientIp, rateLimiter } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TIKTOK_HOSTS = new Set([
  'www.tiktok.com',
  'tiktok.com',
  'm.tiktok.com',
  'vm.tiktok.com',
  'vt.tiktok.com',
]);

function errorResponse(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, {
    status,
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  });
}

function isTikTokUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length < 12 || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' &&
      TIKTOK_HOSTS.has(url.hostname.toLowerCase()) &&
      !url.username &&
      !url.password;
  } catch {
    return false;
  }
}

function safeThumbnail(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return url.protocol === 'https:' &&
      (host.endsWith('.tiktokcdn.com') || host.endsWith('.ibytedtos.com'))
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  const originError = assertValidOrigin(request);
  if (originError) return originError;

  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  const ip = getClientIp(request.headers);
  const budget = rateLimiter.check('video-tiktok-oembed:' + ip, 30, 60);
  if (!budget.allowed) {
    return NextResponse.json(
      { error: 'Bạn đang thêm video quá nhanh. Hãy thử lại sau.' },
      { status: 429, headers: { 'Retry-After': '60', 'Cache-Control': 'private, no-store' } },
    );
  }

  try {
    const rawBody = await request.text();
    if (rawBody.length > 5000) return errorResponse('URL TikTok quá dài.', 413);
    const body = JSON.parse(rawBody) as { url?: unknown };
    if (!isTikTokUrl(body.url)) {
      return errorResponse('Chỉ chấp nhận URL chia sẻ video TikTok HTTPS.', 400);
    }

    // The only remote origin contacted is TikTok's official oEmbed endpoint.
    // The returned HTML is never injected; only bounded metadata and a numeric
    // post ID are used to construct the official Embed Player URL in the UI.
    const apiUrl = new URL('https://www.tiktok.com/oembed');
    apiUrl.searchParams.set('url', body.url);
    const response = await fetch(apiUrl, {
      headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0 (compatible; PersonalWebOS/5.0)' },
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return errorResponse('TikTok không cung cấp thông tin nhúng cho video này.', 422);
    const text = await response.text();
    if (text.length > 128 * 1024) return errorResponse('Phản hồi TikTok vượt giới hạn an toàn.', 502);

    const metadata = JSON.parse(text) as Record<string, unknown>;
    // TikTok's oEmbed payload usually exposes the numeric ID inside its
    // HTML snippet rather than a dedicated JSON field. Extract only that
    // numeric attribute; never inject or render the returned HTML.
    const embeddedHtml = typeof metadata.html === 'string' && metadata.html.length <= 64 * 1024
      ? metadata.html
      : '';
    const htmlVideoId = embeddedHtml.match(/data-video-id=["'](\d{10,24})["']/i)?.[1] ??
      embeddedHtml.match(/\/embed\/v2\/(\d{10,24})/i)?.[1] ??
      '';
    const directPathVideoId = (() => {
      try {
        const submitted = new URL(body.url as string);
        return submitted.pathname.match(/\/video\/(\d{10,24})/)?.[1] ?? '';
      } catch {
        return '';
      }
    })();
    const videoId = typeof metadata.embed_product_id === 'string'
      ? metadata.embed_product_id
      : typeof metadata.video_id === 'string'
        ? metadata.video_id
        : htmlVideoId || directPathVideoId;
    if (metadata.provider_name !== 'TikTok' || metadata.type !== 'video' || !/^\d{10,24}$/.test(videoId)) {
      return errorResponse('Liên kết này không phải video TikTok công khai có thể nhúng.', 422);
    }

    const title = typeof metadata.title === 'string'
      ? metadata.title.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 240)
      : 'Video TikTok';
    const creator = typeof metadata.author_name === 'string'
      ? metadata.author_name.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 120)
      : '';

    return NextResponse.json(
      {
        platform: 'tiktok',
        videoId,
        title: title || 'Video TikTok',
        creator,
        thumbnailUrl: safeThumbnail(metadata.thumbnail_url),
        canonicalUrl: 'https://www.tiktok.com/@_/video/' + videoId,
      },
      { headers: { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie' } },
    );
  } catch {
    return errorResponse('Không thể đọc video TikTok. Hãy thử URL đầy đủ từ nút Chia sẻ.', 502);
  }
}
