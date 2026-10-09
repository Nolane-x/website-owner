import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guard';
import { getDb, initializeDatabase } from '@/lib/db';
import { claims } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import crypto from 'crypto';
import { sanitizePlain } from '@/lib/security/sanitize';
import { assertValidOrigin } from '@/lib/security/origin-guard';
import { ClaimStatus } from '@/lib/types';

export async function GET(req: NextRequest) {
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    await initializeDatabase();
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as ClaimStatus | null;

    const conditions = [eq(claims.profileId, auth.profile.id)];
    if (status) {
      conditions.push(eq(claims.status, status));
    }

    const claimList = await db
      .select()
      .from(claims)
      .where(and(...conditions))
      .orderBy(desc(claims.createdAt));

    return NextResponse.json({ claims: claimList });
  } catch (error) {
    console.error('Lỗi lấy danh sách mệnh đề bằng chứng:', error);
    return NextResponse.json({ error: 'Không thể tải danh sách mệnh đề.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  await assertValidOrigin(req);
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    await initializeDatabase();
    const db = getDb();
    const body = await req.json();

    const statement = sanitizePlain(body.statement || '');
    if (!statement) {
      return NextResponse.json({ error: 'Nội dung mệnh đề là bắt buộc.' }, { status: 400 });
    }

    const status: ClaimStatus = body.status || 'unreviewed';
    const notes = body.notes ? sanitizePlain(body.notes) : null;
    const sourceIdsJson: string[] = Array.isArray(body.sourceIdsJson)
      ? body.sourceIdsJson.map((s: string) => sanitizePlain(s))
      : [];

    const id = 'clm-' + crypto.randomUUID();

    await db.insert(claims).values({
      id,
      profileId: auth.profile.id,
      statement,
      status,
      sourceIdsJson,
      notes,
      createdAt: new Date(),
    });

    const [created] = await db.select().from(claims).where(eq(claims.id, id));
    return NextResponse.json({ claim: created }, { status: 201 });
  } catch (error) {
    console.error('Lỗi tạo mệnh đề:', error);
    return NextResponse.json({ error: 'Không thể tạo mệnh đề.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  await assertValidOrigin(req);
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    await initializeDatabase();
    const db = getDb();
    const body = await req.json();
    const id = body.id ? sanitizePlain(body.id) : null;

    if (!id) {
      return NextResponse.json({ error: 'ID mệnh đề là bắt buộc.' }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(claims)
      .where(and(eq(claims.id, id), eq(claims.profileId, auth.profile.id)));

    if (!existing) {
      return NextResponse.json({ error: 'Không tìm thấy mệnh đề.' }, { status: 404 });
    }

    const updates: Partial<typeof claims.$inferInsert> = {};
    if (body.statement !== undefined) updates.statement = sanitizePlain(body.statement);
    if (body.status !== undefined) updates.status = body.status as ClaimStatus;
    if (body.notes !== undefined) updates.notes = body.notes ? sanitizePlain(body.notes) : null;
    if (Array.isArray(body.sourceIdsJson)) {
      updates.sourceIdsJson = body.sourceIdsJson.map((s: string) => sanitizePlain(s));
    }

    await db.update(claims).set(updates).where(eq(claims.id, id));
    const [updated] = await db.select().from(claims).where(eq(claims.id, id));
    return NextResponse.json({ claim: updated });
  } catch (error) {
    console.error('Lỗi cập nhật mệnh đề:', error);
    return NextResponse.json({ error: 'Không thể cập nhật mệnh đề.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  await assertValidOrigin(req);
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    await initializeDatabase();
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID mệnh đề là bắt buộc.' }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(claims)
      .where(and(eq(claims.id, id), eq(claims.profileId, auth.profile.id)));

    if (!existing) {
      return NextResponse.json({ error: 'Không tìm thấy mệnh đề.' }, { status: 404 });
    }

    await db.delete(claims).where(eq(claims.id, id));
    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    console.error('Lỗi xóa mệnh đề:', error);
    return NextResponse.json({ error: 'Không thể xóa mệnh đề.' }, { status: 500 });
  }
}
