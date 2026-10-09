import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guard';
import { getDb, initializeDatabase } from '@/lib/db';
import { decisionRecords } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { sanitizePlain } from '@/lib/security/sanitize';
import { assertValidOrigin } from '@/lib/security/origin-guard';
import { DecisionStatus } from '@/lib/types';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await assertValidOrigin(req);
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    const { id } = await params;
    await initializeDatabase();
    const db = getDb();
    const body = await req.json();

    const [existing] = await db
      .select()
      .from(decisionRecords)
      .where(and(eq(decisionRecords.id, id), eq(decisionRecords.profileId, auth.profile.id)));

    if (!existing) {
      return NextResponse.json({ error: 'Không tìm thấy hồ sơ quyết định.' }, { status: 404 });
    }

    const updates: Partial<typeof decisionRecords.$inferInsert> = {};

    if (body.title !== undefined) updates.title = sanitizePlain(body.title);
    if (body.context !== undefined) updates.context = sanitizePlain(body.context);
    if (body.decision !== undefined) updates.decision = sanitizePlain(body.decision);
    if (body.consequences !== undefined) {
      updates.consequences = body.consequences ? sanitizePlain(body.consequences) : null;
    }
    if (body.status !== undefined) updates.status = body.status as DecisionStatus;
    if (body.projectId !== undefined) {
      updates.projectId = body.projectId ? sanitizePlain(body.projectId) : null;
    }

    await db
      .update(decisionRecords)
      .set(updates)
      .where(eq(decisionRecords.id, id));

    const [updated] = await db.select().from(decisionRecords).where(eq(decisionRecords.id, id));
    return NextResponse.json({ record: updated });
  } catch (error) {
    console.error('Lỗi cập nhật hồ sơ quyết định:', error);
    return NextResponse.json({ error: 'Không thể cập nhật hồ sơ quyết định.' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await assertValidOrigin(req);
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    const { id } = await params;
    await initializeDatabase();
    const db = getDb();

    const [existing] = await db
      .select()
      .from(decisionRecords)
      .where(and(eq(decisionRecords.id, id), eq(decisionRecords.profileId, auth.profile.id)));

    if (!existing) {
      return NextResponse.json({ error: 'Không tìm thấy hồ sơ quyết định.' }, { status: 404 });
    }

    await db.delete(decisionRecords).where(eq(decisionRecords.id, id));
    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    console.error('Lỗi xóa hồ sơ quyết định:', error);
    return NextResponse.json({ error: 'Không thể xóa hồ sơ quyết định.' }, { status: 500 });
  }
}
