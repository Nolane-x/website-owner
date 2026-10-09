import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guard';
import { getDb, initializeDatabase } from '@/lib/db';
import { collections, collectionItems } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import crypto from 'crypto';
import { sanitizePlain } from '@/lib/security/sanitize';

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'col-' + Date.now();
}

export async function GET() {
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    await initializeDatabase();
    const db = getDb();

    const collectionList = await db
      .select()
      .from(collections)
      .where(eq(collections.profileId, auth.profile.id))
      .orderBy(desc(collections.createdAt));

    return NextResponse.json({ collections: collectionList });
  } catch (error) {
    console.error('Lỗi lấy danh sách bộ sưu tập:', error);
    return NextResponse.json({ error: 'Không thể tải danh sách bộ sưu tập.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    await initializeDatabase();
    const db = getDb();
    const body = await req.json();

    const {
      name,
      description,
      coverImage,
      icon,
      visibility = 'PRIVATE',
      status = 'DRAFT',
      isFeatured = false,
      itemIds = [],
    } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Tên bộ sưu tập không được để trống.' }, { status: 400 });
    }

    const colId = crypto.randomUUID();
    const baseSlug = generateSlug(name);
    const slug = `${baseSlug}-${colId.slice(0, 6)}`;
    const sanitizedName = sanitizePlain(name);
    const sanitizedDesc = description ? sanitizePlain(description) : null;
    const shareToken = visibility === 'UNLISTED' ? crypto.randomBytes(16).toString('hex') : null;

    await db.insert(collections).values({
      id: colId,
      profileId: auth.profile.id,
      name: sanitizedName,
      slug,
      description: sanitizedDesc,
      coverImage,
      icon,
      visibility,
      status,
      isFeatured: Boolean(isFeatured),
      sortOrder: 0,
      shareToken,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    if (Array.isArray(itemIds) && itemIds.length > 0) {
      for (let i = 0; i < itemIds.length; i++) {
        await db.insert(collectionItems).values({
          id: crypto.randomUUID(),
          collectionId: colId,
          contentItemId: itemIds[i],
          sortOrder: i,
          createdAt: new Date(),
        });
      }
    }

    const created = await db.select().from(collections).where(eq(collections.id, colId)).limit(1);

    return NextResponse.json({ success: true, collection: created[0] }, { status: 201 });
  } catch (error) {
    console.error('Lỗi khi tạo bộ sưu tập:', error);
    return NextResponse.json({ error: 'Không thể tạo bộ sưu tập mới.' }, { status: 500 });
  }
}
