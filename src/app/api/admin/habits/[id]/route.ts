import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { requireOwner } from '@/lib/auth/guard';
import { getDb, initializeDatabase } from '@/lib/db';
import { habits } from '@/lib/db/schema';
import { assertValidOrigin } from '@/lib/security/origin-guard';
import { sanitizePlain } from '@/lib/security/sanitize';

function validDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const originError = assertValidOrigin(req);
  if (originError) return originError;
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    const { id } = await params;
    await initializeDatabase();
    const db = getDb();
    const [existing] = await db.select().from(habits).where(and(
      eq(habits.id, id), eq(habits.profileId, auth.profile.id),
    )).limit(1);
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy thói quen thuộc tài khoản này.' }, { status: 404 });

    const body = await req.json() as {
      name?: unknown; target?: unknown; completedDatesJson?: unknown; isActive?: unknown;
    };
    const updates: Partial<typeof habits.$inferInsert> = { updatedAt: new Date() };
    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || !body.name.trim() || body.name.length > 160) {
        return NextResponse.json({ error: 'Tên thói quen không hợp lệ.' }, { status: 400 });
      }
      updates.name = sanitizePlain(body.name).trim();
    }
    if (body.target !== undefined) {
      if (typeof body.target !== 'string' || body.target.length > 100) {
        return NextResponse.json({ error: 'Mục tiêu thói quen không hợp lệ.' }, { status: 400 });
      }
      updates.target = sanitizePlain(body.target).trim() || 'Hàng ngày';
    }
    if (body.isActive !== undefined) {
      if (typeof body.isActive !== 'boolean') return NextResponse.json({ error: 'isActive phải là boolean.' }, { status: 400 });
      updates.isActive = body.isActive;
    }
    if (body.completedDatesJson !== undefined) {
      if (!Array.isArray(body.completedDatesJson) || body.completedDatesJson.length > 1000 ||
          !body.completedDatesJson.every((item) => typeof item === 'string' && validDateKey(item))) {
        return NextResponse.json({ error: 'Danh sách ngày hoàn thành không hợp lệ.' }, { status: 400 });
      }
      updates.completedDatesJson = [...new Set(body.completedDatesJson as string[])].sort();
    }

    await db.update(habits).set(updates).where(and(eq(habits.id, id), eq(habits.profileId, auth.profile.id)));
    const [updated] = await db.select().from(habits).where(and(
      eq(habits.id, id), eq(habits.profileId, auth.profile.id),
    )).limit(1);
    return NextResponse.json({ habit: updated });
  } catch (error) {
    console.error('Không thể cập nhật habit:', error);
    return NextResponse.json({ error: 'Không thể cập nhật thói quen.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const originError = assertValidOrigin(req);
  if (originError) return originError;
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    const { id } = await params;
    await initializeDatabase();
    const db = getDb();
    const [existing] = await db.select({ id: habits.id }).from(habits).where(and(
      eq(habits.id, id), eq(habits.profileId, auth.profile.id),
    )).limit(1);
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy thói quen thuộc tài khoản này.' }, { status: 404 });
    await db.delete(habits).where(and(eq(habits.id, id), eq(habits.profileId, auth.profile.id)));
    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    console.error('Không thể xóa habit:', error);
    return NextResponse.json({ error: 'Không thể xóa thói quen.' }, { status: 500 });
  }
}
