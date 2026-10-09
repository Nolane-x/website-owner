import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guard';
import { getDb, initializeDatabase } from '@/lib/db';
import { vaultItems } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { assertValidOrigin } from '@/lib/security/origin-guard';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const originErr = assertValidOrigin(req);
  if (originErr) return originErr;
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Thiếu ID mục cần xóa.' }, { status: 400 });
    }

    await initializeDatabase();
    const db = getDb();

    await db
      .delete(vaultItems)
      .where(and(eq(vaultItems.id, id), eq(vaultItems.profileId, auth.profile.id)));

    return NextResponse.json({ success: true, message: 'Đã xóa mục khỏi két bảo mật.' });
  } catch (error) {
    console.error('Lỗi xóa mục két bảo mật:', error);
    return NextResponse.json({ error: 'Không thể xóa mục két bảo mật.' }, { status: 500 });
  }
}
