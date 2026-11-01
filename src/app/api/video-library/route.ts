import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import crypto from 'node:crypto';
import { requireOwner } from '@/lib/auth/guard';
import { assertValidOrigin } from '@/lib/security/origin-guard';
import { getDb, initializeDatabase } from '@/lib/db';
import { settings } from '@/lib/db/schema';
import { emptyVideoLibrary, normalizeVideoLibrary } from '@/lib/video/video-library';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VIDEO_LIBRARY_SETTING_KEY = 'video_library';
const MAX_REQUEST_BYTES = 3 * 1024 * 1024;
const MAX_LIBRARY_CHARS = 768 * 1024;
const NO_STORE_HEADERS = { 'Cache-Control': 'private, no-store, max-age=0' };

export async function GET() {
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    await initializeDatabase();
    const [record] = await getDb()
      .select({ valueJson: settings.valueJson, updatedAt: settings.updatedAt })
      .from(settings)
      .where(and(
        eq(settings.profileId, auth.profile.id),
        eq(settings.key, VIDEO_LIBRARY_SETTING_KEY),
      ))
      .limit(1);

    return NextResponse.json({
      library: record ? normalizeVideoLibrary(record.valueJson) : emptyVideoLibrary(),
      hasSavedLibrary: Boolean(record),
      updatedAt: record?.updatedAt?.toISOString() ?? null,
    }, { headers: NO_STORE_HEADERS });
  } catch {
    console.error('Không thể tải Video Library từ cơ sở dữ liệu.');
    return NextResponse.json(
      { error: 'Không thể tải thư viện video từ máy chủ.' },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }
}

export async function PUT(request: NextRequest) {
  const originError = assertValidOrigin(request);
  if (originError) return originError;

  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BYTES) {
      return NextResponse.json(
        { error: 'Thư viện video vượt dung lượng cho phép.' },
        { status: 413, headers: NO_STORE_HEADERS },
      );
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Dữ liệu thư viện không hợp lệ.' }, { status: 400, headers: NO_STORE_HEADERS });
    }

    if (!body || typeof body !== 'object' || Array.isArray(body) ||
        !('library' in body)) {
      return NextResponse.json({ error: 'Thiếu dữ liệu thư viện video.' }, { status: 400, headers: NO_STORE_HEADERS });
    }

    const library = normalizeVideoLibrary((body as { library: unknown }).library);
    if (JSON.stringify(library).length > MAX_LIBRARY_CHARS) {
      return NextResponse.json(
        { error: 'Thư viện video vượt giới hạn lưu trữ. Hãy xóa bớt video hoặc lịch sử cũ.' },
        { status: 413, headers: NO_STORE_HEADERS },
      );
    }

    await initializeDatabase();
    const db = getDb();
    const now = new Date();

    await db.insert(settings).values({
      id: crypto.randomUUID(),
      profileId: auth.profile.id,
      key: VIDEO_LIBRARY_SETTING_KEY,
      valueJson: library,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: [settings.profileId, settings.key],
      set: {
        valueJson: library,
        updatedAt: now,
      },
    });

    return NextResponse.json({
      success: true,
      updatedAt: now.toISOString(),
    }, { headers: NO_STORE_HEADERS });
  } catch {
    console.error('Không thể lưu Video Library vào cơ sở dữ liệu.');
    return NextResponse.json(
      { error: 'Không thể đồng bộ thư viện video lên máy chủ.' },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }
}
