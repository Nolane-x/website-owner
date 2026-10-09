import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guard';
import { getDb, initializeDatabase } from '@/lib/db';
import { vaultItems } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import crypto from 'crypto';
import { sanitizePlain } from '@/lib/security/sanitize';

import { assertValidOrigin } from '@/lib/security/origin-guard';

export async function GET() {
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    await initializeDatabase();
    const db = getDb();

    const items = await db
      .select({
        id: vaultItems.id,
        serviceName: vaultItems.serviceName,
        username: vaultItems.username,
        ciphertext: vaultItems.ciphertext,
        iv: vaultItems.iv,
        salt: vaultItems.salt,
        url: vaultItems.url,
        category: vaultItems.category,
        tags: vaultItems.tags,
        isFavorite: vaultItems.isFavorite,
        createdAt: vaultItems.createdAt,
        updatedAt: vaultItems.updatedAt,
      })
      .from(vaultItems)
      .where(eq(vaultItems.profileId, auth.profile.id))
      .orderBy(desc(vaultItems.isFavorite), desc(vaultItems.createdAt));

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Lỗi lấy danh sách két bảo mật:', error);
    return NextResponse.json({ error: 'Không thể tải két bảo mật.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const originErr = await assertValidOrigin(req);
  if (originErr) return originErr;
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    await initializeDatabase();
    const db = getDb();
    const body = await req.json();

    const {
      serviceName,
      username,
      ciphertext,
      iv,
      salt,
      url,
      category,
      tags = [],
      isFavorite = false,
    } = body;

    if (!serviceName || !ciphertext || !iv || !salt) {
      return NextResponse.json(
        { error: 'Dữ liệu mã hóa không đầy đủ (yêu cầu serviceName, ciphertext, iv, salt).' },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID();

    await db.insert(vaultItems).values({
      id,
      profileId: auth.profile.id,
      serviceName: sanitizePlain(serviceName),
      username: username ? sanitizePlain(username) : '',
      ciphertext,
      iv,
      salt,
      url: url ? sanitizePlain(url) : null,
      category: category ? sanitizePlain(category) : null,
      tags: Array.isArray(tags) ? tags : [],
      isFavorite: Boolean(isFavorite),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true, id }, { status: 201 });
  } catch (error) {
    console.error('Lỗi khi lưu mục két bảo mật:', error);
    return NextResponse.json({ error: 'Không thể lưu vào két bảo mật.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const originErr = await assertValidOrigin(req);
  if (originErr) return originErr;
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id');

    if (!id) {
      try {
        const body = await req.json();
        id = body?.id;
      } catch {
        // ignore
      }
    }

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
