import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guard';
import { getDb, initializeDatabase } from '@/lib/db';
import { contentPipelines } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import crypto from 'crypto';
import { sanitizePlain } from '@/lib/security/sanitize';
import { assertValidOrigin } from '@/lib/security/origin-guard';

export async function GET() {
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    await initializeDatabase();
    const db = getDb();

    const items = await db
      .select()
      .from(contentPipelines)
      .where(eq(contentPipelines.profileId, auth.profile.id))
      .orderBy(desc(contentPipelines.updatedAt));

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Lỗi lấy danh sách Content Pipeline:', error);
    return NextResponse.json({ error: 'Không thể tải pipeline sáng tạo.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const originErr = assertValidOrigin(req);
  if (originErr) return originErr;

  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    await initializeDatabase();
    const db = getDb();
    const body = await req.json();

    const title = sanitizePlain(body.title || '');
    if (!title) {
      return NextResponse.json({ error: 'Tiêu đề nội dung là bắt buộc.' }, { status: 400 });
    }

    const id = body.id || crypto.randomUUID();
    const tags = Array.isArray(body.tags)
      ? body.tags
      : Array.isArray(body.tagsJson)
      ? body.tagsJson
      : [];

    const itemData = {
      id,
      profileId: auth.profile.id,
      title,
      stage: body.stage || 'idea',
      channel: body.channel || 'blog',
      body: body.body || '',
      outline: body.outline ? sanitizePlain(body.outline) : null,
      tagsJson: tags,
      scheduledAt: body.scheduledAt || null,
      updatedAt: new Date(),
    };

    if (body.id) {
      await db
        .update(contentPipelines)
        .set(itemData)
        .where(and(eq(contentPipelines.id, body.id), eq(contentPipelines.profileId, auth.profile.id)));
    } else {
      await db.insert(contentPipelines).values(itemData);
    }

    return NextResponse.json({ item: itemData }, { status: 200 });
  } catch (error) {
    console.error('Lỗi lưu content item:', error);
    return NextResponse.json({ error: 'Không thể lưu nội dung sáng tạo.' }, { status: 500 });
  }
}
