import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guard';
import { getDb, initializeDatabase } from '@/lib/db';
import { researchSources } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { sanitizePlain } from '@/lib/security/sanitize';
import { assertValidOrigin } from '@/lib/security/origin-guard';
import { ResearchSourceStatus } from '@/lib/types';

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
      .from(researchSources)
      .where(and(eq(researchSources.id, id), eq(researchSources.profileId, auth.profile.id)));

    if (!existing) {
      return NextResponse.json({ error: 'Không tìm thấy tài liệu nghiên cứu.' }, { status: 404 });
    }

    const updates: Partial<typeof researchSources.$inferInsert> = {};

    if (body.title !== undefined) updates.title = sanitizePlain(body.title);
    if (body.url !== undefined) updates.url = body.url ? sanitizePlain(body.url) : null;
    if (body.author !== undefined) updates.author = body.author ? sanitizePlain(body.author) : null;
    if (body.excerpt !== undefined) updates.excerpt = body.excerpt ? sanitizePlain(body.excerpt) : null;
    if (body.status !== undefined) updates.status = body.status as ResearchSourceStatus;

    if (Array.isArray(body.tagsJson)) {
      updates.tagsJson = body.tagsJson.map((t: string) => sanitizePlain(t));
    }

    await db
      .update(researchSources)
      .set(updates)
      .where(eq(researchSources.id, id));

    const [updated] = await db.select().from(researchSources).where(eq(researchSources.id, id));
    return NextResponse.json({ source: updated });
  } catch (error) {
    console.error('Lỗi cập nhật tài liệu nghiên cứu:', error);
    return NextResponse.json({ error: 'Không thể cập nhật tài liệu nghiên cứu.' }, { status: 500 });
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
      .from(researchSources)
      .where(and(eq(researchSources.id, id), eq(researchSources.profileId, auth.profile.id)));

    if (!existing) {
      return NextResponse.json({ error: 'Không tìm thấy tài liệu nghiên cứu.' }, { status: 404 });
    }

    await db.delete(researchSources).where(eq(researchSources.id, id));
    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    console.error('Lỗi xóa tài liệu nghiên cứu:', error);
    return NextResponse.json({ error: 'Không thể xóa tài liệu nghiên cứu.' }, { status: 500 });
  }
}
