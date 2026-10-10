import { NextRequest, NextResponse } from 'next/server';
import { and, asc, eq } from 'drizzle-orm';
import crypto from 'crypto';
import { requireOwner } from '@/lib/auth/guard';
import { getDb, initializeDatabase } from '@/lib/db';
import { habits } from '@/lib/db/schema';
import { assertValidOrigin } from '@/lib/security/origin-guard';
import { sanitizePlain } from '@/lib/security/sanitize';

export async function GET() {
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;
  try {
    await initializeDatabase();
    const db = getDb();
    const records = await db.select().from(habits)
      .where(eq(habits.profileId, auth.profile.id))
      .orderBy(asc(habits.createdAt));
    return NextResponse.json({ habits: records });
  } catch (error) {
    console.error('Không thể tải habits:', error);
    return NextResponse.json({ error: 'Không thể tải danh sách thói quen.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const originError = assertValidOrigin(req);
  if (originError) return originError;
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    const body = await req.json() as { name?: unknown; target?: unknown };
    const name = typeof body.name === 'string' ? sanitizePlain(body.name).trim() : '';
    const target = typeof body.target === 'string' ? sanitizePlain(body.target).trim() : 'Hàng ngày';
    if (!name || name.length > 160) {
      return NextResponse.json({ error: 'Tên thói quen phải có từ 1 đến 160 ký tự.' }, { status: 400 });
    }
    if (target.length > 100) {
      return NextResponse.json({ error: 'Mục tiêu thói quen không được quá 100 ký tự.' }, { status: 400 });
    }

    await initializeDatabase();
    const db = getDb();
    const id = `habit-${crypto.randomUUID()}`;
    await db.insert(habits).values({
      id,
      profileId: auth.profile.id,
      name,
      target: target || 'Hàng ngày',
      completedDatesJson: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const [created] = await db.select().from(habits).where(and(eq(habits.id, id), eq(habits.profileId, auth.profile.id))).limit(1);
    if (!created) return NextResponse.json({ error: 'Không thể xác minh bản ghi sau khi tạo.' }, { status: 500 });
    return NextResponse.json({ habit: created }, { status: 201 });
  } catch (error) {
    console.error('Không thể tạo habit:', error);
    return NextResponse.json({ error: 'Không thể tạo thói quen.' }, { status: 500 });
  }
}
