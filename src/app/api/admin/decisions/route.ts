import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guard';
import { getDb, initializeDatabase } from '@/lib/db';
import { decisionRecords } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import crypto from 'crypto';
import { sanitizePlain } from '@/lib/security/sanitize';
import { assertValidOrigin } from '@/lib/security/origin-guard';
import { DecisionStatus } from '@/lib/types';

export async function GET(req: NextRequest) {
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    await initializeDatabase();
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as DecisionStatus | null;
    const projectId = searchParams.get('projectId');

    const conditions = [eq(decisionRecords.profileId, auth.profile.id)];
    if (status) {
      conditions.push(eq(decisionRecords.status, status));
    }
    if (projectId) {
      conditions.push(eq(decisionRecords.projectId, projectId));
    }

    const records = await db
      .select()
      .from(decisionRecords)
      .where(and(...conditions))
      .orderBy(desc(decisionRecords.createdAt));

    return NextResponse.json({ records });
  } catch (error) {
    console.error('Lỗi lấy danh sách quyết định:', error);
    return NextResponse.json({ error: 'Không thể tải danh sách quyết định.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const originError = assertValidOrigin(req);
  if (originError) return originError;
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    await initializeDatabase();
    const db = getDb();
    const body = await req.json();

    const title = sanitizePlain(body.title || '');
    const context = sanitizePlain(body.context || '');
    const decision = sanitizePlain(body.decision || '');

    if (!title || !context || !decision) {
      return NextResponse.json(
        { error: 'Tiêu đề, bối cảnh và quyết định là bắt buộc.' },
        { status: 400 }
      );
    }

    const consequences = body.consequences ? sanitizePlain(body.consequences) : null;
    const status: DecisionStatus = body.status || 'proposed';
    const projectId = body.projectId ? sanitizePlain(body.projectId) : null;

    const id = 'dec-' + crypto.randomUUID();

    await db.insert(decisionRecords).values({
      id,
      profileId: auth.profile.id,
      projectId,
      title,
      context,
      decision,
      consequences,
      status,
      createdAt: new Date(),
    });

    const [created] = await db.select().from(decisionRecords).where(eq(decisionRecords.id, id));
    return NextResponse.json({ record: created }, { status: 201 });
  } catch (error) {
    console.error('Lỗi tạo hồ sơ quyết định:', error);
    return NextResponse.json({ error: 'Không thể tạo hồ sơ quyết định.' }, { status: 500 });
  }
}
