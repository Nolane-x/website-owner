import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guard';
import { getDb, initializeDatabase } from '@/lib/db';
import { contentPipelines } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import crypto from 'crypto';
import { sanitizePlain } from '@/lib/security/sanitize';
import { assertValidOrigin } from '@/lib/security/origin-guard';

const ALLOWED_STAGES = ['idea', 'brief', 'research', 'draft', 'review', 'approved', 'published'] as const;
const ALLOWED_CHANNELS = ['blog', 'video', 'social', 'newsletter'] as const;

export async function GET() {
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;
  try {
    await initializeDatabase();
    const db = getDb();
    const items = await db.select().from(contentPipelines)
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
    const body: unknown = await req.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Dữ liệu nội dung không hợp lệ.' }, { status: 400 });
    }
    const input = body as Record<string, unknown>;
    const title = typeof input.title === 'string' ? sanitizePlain(input.title).trim() : '';
    if (!title || title.length > 240) {
      return NextResponse.json({ error: 'Tiêu đề phải có từ 1 đến 240 ký tự.' }, { status: 400 });
    }
    const stage = input.stage === undefined ? 'idea' : input.stage;
    if (typeof stage !== 'string' || !ALLOWED_STAGES.includes(stage as typeof ALLOWED_STAGES[number])) {
      return NextResponse.json({ error: 'Giai đoạn nội dung không hợp lệ.' }, { status: 400 });
    }
    const channel = input.channel === undefined ? 'blog' : input.channel;
    if (typeof channel !== 'string' || !ALLOWED_CHANNELS.includes(channel as typeof ALLOWED_CHANNELS[number])) {
      return NextResponse.json({ error: 'Kênh nội dung không hợp lệ.' }, { status: 400 });
    }
    const content = input.body === undefined ? '' : input.body;
    if (typeof content !== 'string' || content.length > 500_000) {
      return NextResponse.json({ error: 'Nội dung phải là văn bản và không quá 500.000 ký tự.' }, { status: 400 });
    }
    const outline = input.outline === undefined || input.outline === null
      ? null
      : typeof input.outline === 'string' && input.outline.length <= 100_000
      ? input.outline
      : null;
    if (input.outline !== undefined && input.outline !== null && outline === null) {
      return NextResponse.json({ error: 'Dàn ý phải là văn bản và không quá 100.000 ký tự.' }, { status: 400 });
    }
    const rawTags = Array.isArray(input.tags) ? input.tags : Array.isArray(input.tagsJson) ? input.tagsJson : [];
    if (rawTags.length > 100 || !rawTags.every((tag) => typeof tag === 'string' && tag.length <= 80)) {
      return NextResponse.json({ error: 'Danh sách tag không hợp lệ.' }, { status: 400 });
    }
    const tagsJson = rawTags.map((tag) => sanitizePlain(tag as string).trim()).filter(Boolean);
    const scheduledAt = input.scheduledAt === undefined || input.scheduledAt === null || input.scheduledAt === ''
      ? null
      : typeof input.scheduledAt === 'string' && Number.isFinite(Date.parse(input.scheduledAt))
      ? input.scheduledAt
      : null;
    if (input.scheduledAt && !scheduledAt) {
      return NextResponse.json({ error: 'Ngày giờ lên lịch không hợp lệ.' }, { status: 400 });
    }

    await initializeDatabase();
    const db = getDb();
    const isUpdate = input.id !== undefined;
    const id = isUpdate
      ? typeof input.id === 'string' && input.id.trim() ? input.id : null
      : crypto.randomUUID();
    if (!id) return NextResponse.json({ error: 'ID nội dung không hợp lệ.' }, { status: 400 });

    if (isUpdate) {
      const [existing] = await db.select({ id: contentPipelines.id }).from(contentPipelines)
        .where(and(eq(contentPipelines.id, id), eq(contentPipelines.profileId, auth.profile.id)))
        .limit(1);
      if (!existing) return NextResponse.json({ error: 'Không tìm thấy nội dung thuộc tài khoản này.' }, { status: 404 });
    }

    const itemData = {
      id,
      profileId: auth.profile.id,
      title,
      stage,
      channel,
      body: content,
      outline,
      tagsJson,
      scheduledAt,
      updatedAt: new Date(),
    };

    if (isUpdate) {
      await db.update(contentPipelines).set(itemData)
        .where(and(eq(contentPipelines.id, id), eq(contentPipelines.profileId, auth.profile.id)));
    } else {
      await db.insert(contentPipelines).values(itemData);
    }

    const [saved] = await db.select().from(contentPipelines).where(and(
      eq(contentPipelines.id, id),
      eq(contentPipelines.profileId, auth.profile.id),
    )).limit(1);
    if (!saved) {
      return NextResponse.json({ error: 'Không thể xác minh bản ghi sau khi lưu; hãy tải lại trước khi thử lại.' }, { status: 500 });
    }
    return NextResponse.json({ item: saved }, { status: isUpdate ? 200 : 201 });
  } catch (error) {
    console.error('Lỗi lưu content item:', error);
    return NextResponse.json({ error: 'Không thể lưu nội dung sáng tạo.' }, { status: 500 });
  }
}
