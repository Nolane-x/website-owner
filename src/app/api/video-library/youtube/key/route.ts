import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guard';
import { assertValidOrigin } from '@/lib/security/origin-guard';
import { getClientIp, rateLimiter } from '@/lib/security/rate-limit';
import {
  deleteStoredYouTubeApiKey,
  getStoredYouTubeApiKey,
  isValidYouTubeApiKey,
  maskYouTubeApiKey,
  saveYouTubeApiKey,
} from '@/lib/video/youtube-api-key-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie' };

export async function GET(): Promise<Response> {
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    const storedKey = await getStoredYouTubeApiKey(auth.profile.id);
    if (storedKey) {
      return NextResponse.json({
        configured: true,
        source: 'personal',
        preview: maskYouTubeApiKey(storedKey),
      }, { headers: NO_STORE });
    }

    const environmentKey = process.env.YOUTUBE_API_KEY;
    if (isValidYouTubeApiKey(environmentKey)) {
      return NextResponse.json({
        configured: true,
        source: 'environment',
        preview: maskYouTubeApiKey(environmentKey),
      }, { headers: NO_STORE });
    }

    return NextResponse.json({
      configured: false,
      source: null,
      preview: null,
    }, { headers: NO_STORE });
  } catch {
    console.error('Không thể đọc cấu hình YouTube API key đã lưu.');
    return NextResponse.json(
      { error: 'Không thể đọc key đã lưu. Hãy kiểm tra cấu hình mã hóa của Video Library.' },
      { status: 503, headers: NO_STORE },
    );
  }
}

export async function PUT(request: NextRequest): Promise<Response> {
  const originError = assertValidOrigin(request);
  if (originError) return originError;

  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  const ip = getClientIp(request.headers);
  const budget = rateLimiter.check('video-youtube-key:' + ip, 6, 60);
  if (!budget.allowed) {
    return NextResponse.json(
      { error: 'Bạn đang thao tác key quá nhanh. Hãy đợi một phút rồi thử lại.' },
      { status: 429, headers: { ...NO_STORE, 'Retry-After': '60' } },
    );
  }

  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > 2_048) {
      return NextResponse.json({ error: 'Dữ liệu key vượt dung lượng cho phép.' }, { status: 413, headers: NO_STORE });
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Dữ liệu key không hợp lệ.' }, { status: 400, headers: NO_STORE });
    }

    const apiKey = body && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>).apiKey
      : null;
    if (!isValidYouTubeApiKey(apiKey)) {
      return NextResponse.json({ error: 'YouTube API key không hợp lệ.' }, { status: 400, headers: NO_STORE });
    }

    await saveYouTubeApiKey(auth.profile.id, apiKey);
    return NextResponse.json({
      success: true,
      configured: true,
      source: 'personal',
      preview: maskYouTubeApiKey(apiKey),
    }, { headers: NO_STORE });
  } catch {
    console.error('Không thể mã hóa và lưu YouTube API key.');
    return NextResponse.json(
      { error: 'Không thể lưu key an toàn. Hãy kiểm tra cấu hình mã hóa của Video Library.' },
      { status: 503, headers: NO_STORE },
    );
  }
}

export async function DELETE(request: NextRequest): Promise<Response> {
  const originError = assertValidOrigin(request);
  if (originError) return originError;

  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  const ip = getClientIp(request.headers);
  const budget = rateLimiter.check('video-youtube-key-delete:' + ip, 6, 60);
  if (!budget.allowed) {
    return NextResponse.json(
      { error: 'Bạn đang thao tác key quá nhanh. Hãy đợi một phút rồi thử lại.' },
      { status: 429, headers: { ...NO_STORE, 'Retry-After': '60' } },
    );
  }

  try {
    await deleteStoredYouTubeApiKey(auth.profile.id);
    const environmentKey = process.env.YOUTUBE_API_KEY;
    const hasEnvironmentKey = isValidYouTubeApiKey(environmentKey);
    return NextResponse.json({
      success: true,
      configured: hasEnvironmentKey,
      source: hasEnvironmentKey ? 'environment' : null,
      preview: hasEnvironmentKey ? maskYouTubeApiKey(environmentKey) : null,
    }, { headers: NO_STORE });
  } catch {
    console.error('Không thể xóa YouTube API key đã lưu.');
    return NextResponse.json(
      { error: 'Không thể xóa key đã lưu.' },
      { status: 503, headers: NO_STORE },
    );
  }
}
