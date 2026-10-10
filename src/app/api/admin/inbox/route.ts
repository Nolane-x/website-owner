import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import crypto from 'crypto';
import { requireOwner } from '@/lib/auth/guard';
import { getDb, initializeDatabase } from '@/lib/db';
import { inboxItems } from '@/lib/db/schema';
import { assertValidOrigin } from '@/lib/security/origin-guard';
import { parseInboxCreateInput, parseInboxListQuery } from '@/lib/inbox/validation';
import { inboxValidationErrorResponse, readInboxJsonBody } from '@/lib/inbox/request';

export async function GET(req: NextRequest) {
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const query = parseInboxListQuery({
      status: searchParams.get('status'),
      kind: searchParams.get('kind'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    });

    await initializeDatabase();
    const db = getDb();
    const conditions = [eq(inboxItems.profileId, auth.profile.id)];
    if (query.status) conditions.push(eq(inboxItems.status, query.status));
    if (query.kind) conditions.push(eq(inboxItems.kind, query.kind));

    const rows = await db
      .select()
      .from(inboxItems)
      .where(and(...conditions))
      .orderBy(desc(inboxItems.createdAt), desc(inboxItems.id))
      .limit(query.limit + 1)
      .offset(query.offset);

    return NextResponse.json({
      items: rows.slice(0, query.limit),
      pagination: {
        limit: query.limit,
        offset: query.offset,
        hasMore: rows.length > query.limit,
      },
    });
  } catch (error) {
    const response = inboxValidationErrorResponse(error);
    if (response) return response;
    console.error('Lỗi lấy danh sách Inbox:', error);
    return NextResponse.json({ error: 'Không thể tải danh sách Inbox.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const originError = assertValidOrigin(req);
  if (originError) return originError;
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    const body = await readInboxJsonBody(req);
    const input = parseInboxCreateInput(body);
    await initializeDatabase();

    const db = getDb();
    const id = 'inbox-' + crypto.randomUUID();
    await db.insert(inboxItems).values({
      id,
      profileId: auth.profile.id,
      ...input,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const [created] = await db
      .select()
      .from(inboxItems)
      .where(and(eq(inboxItems.id, id), eq(inboxItems.profileId, auth.profile.id)))
      .limit(1);
    if (!created) return NextResponse.json({ error: 'Không thể xác minh mục Inbox sau khi tạo.' }, { status: 500 });
    return NextResponse.json({ item: created }, { status: 201 });
  } catch (error) {
    const response = inboxValidationErrorResponse(error);
    if (response) return response;
    console.error('Lỗi tạo mục Inbox:', error);
    return NextResponse.json({ error: 'Không thể tạo mục Inbox.' }, { status: 500 });
  }
}
