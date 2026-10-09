import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guard';
import { getDb, initializeDatabase } from '@/lib/db';
import { scratchpads } from '@/lib/db/schema';
import { eq, desc, and, asc } from 'drizzle-orm';
import crypto from 'crypto';
import { sanitizePlain } from '@/lib/security/sanitize';
import { assertValidOrigin } from '@/lib/security/origin-guard';
import { ScratchpadColor } from '@/lib/types';

export async function GET() {
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    await initializeDatabase();
    const db = getDb();

    const items = await db
      .select()
      .from(scratchpads)
      .where(eq(scratchpads.profileId, auth.profile.id))
      .orderBy(desc(scratchpads.isPinned), asc(scratchpads.sortOrder), desc(scratchpads.createdAt));

    return NextResponse.json({ scratchpads: items });
  } catch (error) {
    console.error('Lỗi lấy danh sách ghi chú nháp:', error);
    return NextResponse.json({ error: 'Không thể tải danh sách ghi chú nháp.' }, { status: 500 });
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

    const content = body.content !== undefined ? sanitizePlain(body.content) : '';
    const title = body.title ? sanitizePlain(body.title) : null;
    const color: ScratchpadColor = body.color || 'amber';
    const isPinned = Boolean(body.isPinned);
    const sortOrder = Number(body.sortOrder) || 0;

    const newPad = {
      id: 'pad-' + crypto.randomUUID(),
      profileId: auth.profile.id,
      title,
      content,
      color,
      isPinned,
      sortOrder,
    };

    await db.insert(scratchpads).values(newPad);

    const [created] = await db.select().from(scratchpads).where(eq(scratchpads.id, newPad.id));
    return NextResponse.json({ scratchpad: created }, { status: 201 });
  } catch (error) {
    console.error('Lỗi tạo ghi chú nháp:', error);
    return NextResponse.json({ error: 'Không thể tạo ghi chú nháp mới.' }, { status: 500 });
  }
}
