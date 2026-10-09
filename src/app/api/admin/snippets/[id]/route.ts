import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guard';
import { getDb, initializeDatabase } from '@/lib/db';
import { codeSnippets } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { sanitizePlain } from '@/lib/security/sanitize';
import { assertValidOrigin } from '@/lib/security/origin-guard';

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

    const existing = await db
      .select()
      .from(codeSnippets)
      .where(and(eq(codeSnippets.id, id), eq(codeSnippets.profileId, auth.profile.id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Không tìm thấy đoạn mã' }, { status: 404 });
    }

    const body = await req.json();
    const { title, description, language, code, tags, isFavorite } = body;

    const updates: Partial<typeof codeSnippets.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (title !== undefined) updates.title = sanitizePlain(String(title).trim());
    if (description !== undefined) updates.description = description ? sanitizePlain(String(description).trim()) : null;
    if (language !== undefined) updates.language = sanitizePlain(String(language).toLowerCase().trim());
    if (code !== undefined) updates.code = String(code);
    if (tags !== undefined) updates.tags = Array.isArray(tags) ? tags.map((t: unknown) => sanitizePlain(String(t).trim())) : [];
    if (isFavorite !== undefined) updates.isFavorite = Boolean(isFavorite);

    await db
      .update(codeSnippets)
      .set(updates)
      .where(and(eq(codeSnippets.id, id), eq(codeSnippets.profileId, auth.profile.id)));

    return NextResponse.json({ success: true, updates });
  } catch (err) {
    console.error('Lỗi cập nhật Code Snippet:', err);
    return NextResponse.json({ error: 'Không thể cập nhật đoạn mã' }, { status: 500 });
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

    const existing = await db
      .select()
      .from(codeSnippets)
      .where(and(eq(codeSnippets.id, id), eq(codeSnippets.profileId, auth.profile.id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Không tìm thấy đoạn mã' }, { status: 404 });
    }

    await db
      .delete(codeSnippets)
      .where(and(eq(codeSnippets.id, id), eq(codeSnippets.profileId, auth.profile.id)));

    return NextResponse.json({ success: true, message: 'Đã xóa đoạn mã thành công' });
  } catch (err) {
    console.error('Lỗi xóa Code Snippet:', err);
    return NextResponse.json({ error: 'Không thể xóa đoạn mã' }, { status: 500 });
  }
}
