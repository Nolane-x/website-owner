import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guard';
import { getDb, initializeDatabase } from '@/lib/db';
import { inboxItems } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import crypto from 'crypto';
import { sanitizePlain } from '@/lib/security/sanitize';
import { assertValidOrigin } from '@/lib/security/origin-guard';
import { InboxItemKind, InboxItemStatus } from '@/lib/types';

export async function GET(req: NextRequest) {
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    await initializeDatabase();
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as InboxItemStatus | null;
    const kind = searchParams.get('kind') as InboxItemKind | null;

    const conditions = [eq(inboxItems.profileId, auth.profile.id)];
    if (status) {
      conditions.push(eq(inboxItems.status, status));
    }
    if (kind) {
      conditions.push(eq(inboxItems.kind, kind));
    }

    const items = await db
      .select()
      .from(inboxItems)
      .where(and(...conditions))
      .orderBy(desc(inboxItems.createdAt));

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Lỗi lấy danh sách Inbox:', error);
    return NextResponse.json({ error: 'Không thể tải danh sách Inbox.' }, { status: 500 });
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
      return NextResponse.json({ error: 'Tiêu đề là bắt buộc.' }, { status: 400 });
    }

    const kind: InboxItemKind = body.kind || 'text';
    const textPreview = body.textPreview ? sanitizePlain(body.textPreview) : null;
    const sourceUri = body.sourceUri ? sanitizePlain(body.sourceUri) : null;
    const status: InboxItemStatus = body.status || 'inbox';
    const projectId = body.projectId ? sanitizePlain(body.projectId) : null;
    const tagsJson: string[] = Array.isArray(body.tagsJson)
      ? body.tagsJson.map((t: string) => sanitizePlain(t))
      : [];

    const id = 'inbox-' + crypto.randomUUID();

    await db.insert(inboxItems).values({
      id,
      profileId: auth.profile.id,
      title,
      kind,
      textPreview,
      sourceUri,
      status,
      tagsJson,
      projectId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const [created] = await db.select().from(inboxItems).where(eq(inboxItems.id, id));
    return NextResponse.json({ item: created }, { status: 201 });
  } catch (error) {
    console.error('Lỗi tạo mục Inbox:', error);
    return NextResponse.json({ error: 'Không thể tạo mục Inbox.' }, { status: 500 });
  }
}
