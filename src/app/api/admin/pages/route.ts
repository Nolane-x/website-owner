import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guard';
import { getDb, initializeDatabase } from '@/lib/db';
import { pages, contentBlocks } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import crypto from 'crypto';
import { sanitizePlain } from '@/lib/security/sanitize';
import { logSecurityEvent } from '@/lib/security/audit';
import { SECURITY_EVENT_TYPES } from '@/lib/security/constants';
import { getClientIp } from '@/lib/security/rate-limit';
import { assertValidOrigin } from '@/lib/security/origin-guard';

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'page-' + Date.now();
}

export async function GET() {
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    await initializeDatabase();
    const db = getDb();

    const pageList = await db
      .select()
      .from(pages)
      .where(eq(pages.profileId, auth.profile.id))
      .orderBy(desc(pages.createdAt));

    return NextResponse.json({ pages: pageList });
  } catch (error) {
    console.error('Lỗi lấy danh sách trang:', error);
    return NextResponse.json({ error: 'Không thể tải danh sách trang.' }, { status: 500 });
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

    const {
      title,
      description,
      coverImage,
      visibility = 'PRIVATE',
      status = 'DRAFT',
      isFeatured = false,
      initialBlocks = [],
    } = body;

    if (!title || title.trim() === '') {
      return NextResponse.json({ error: 'Tiêu đề trang không được để trống.' }, { status: 400 });
    }

    const pageId = crypto.randomUUID();
    const baseSlug = generateSlug(title);
    const slug = `${baseSlug}-${pageId.slice(0, 6)}`;
    const sanitizedTitle = sanitizePlain(title);
    const sanitizedDesc = description ? sanitizePlain(description) : null;
    const publishedAt = status === 'PUBLISHED' ? new Date() : null;
    const shareToken = visibility === 'UNLISTED' ? crypto.randomBytes(16).toString('hex') : null;

    await db.insert(pages).values({
      id: pageId,
      profileId: auth.profile.id,
      title: sanitizedTitle,
      slug,
      description: sanitizedDesc,
      coverImage,
      visibility,
      status,
      sortOrder: 0,
      isFeatured: Boolean(isFeatured),
      shareToken,
      createdAt: new Date(),
      updatedAt: new Date(),
      publishedAt,
    });

    // Tạo các khối khởi đầu nếu có
    if (Array.isArray(initialBlocks) && initialBlocks.length > 0) {
      for (let i = 0; i < initialBlocks.length; i++) {
        const b = initialBlocks[i];
        await db.insert(contentBlocks).values({
          id: crypto.randomUUID(),
          pageId,
          blockType: b.blockType || 'text',
          sortOrder: i,
          contentJson: b.contentJson || {},
          settingsJson: b.settingsJson || {},
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    } else {
      // Thêm khối heading mặc định
      await db.insert(contentBlocks).values({
        id: crypto.randomUUID(),
        pageId,
        blockType: 'heading',
        sortOrder: 0,
        contentJson: { text: sanitizedTitle, level: 1 },
        settingsJson: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    const ip = getClientIp(req.headers);
    const userAgent = req.headers.get('user-agent') || 'Unknown';
    await logSecurityEvent(auth.profile.id, SECURITY_EVENT_TYPES.PAGE_CREATED, { pageId, title: sanitizedTitle, slug }, ip, userAgent);

    const created = await db
      .select()
      .from(pages)
      .where(and(eq(pages.id, pageId), eq(pages.profileId, auth.profile.id)))
      .limit(1);

    return NextResponse.json({ success: true, page: created[0] }, { status: 201 });
  } catch (error) {
    console.error('Lỗi khi tạo trang mới:', error);
    return NextResponse.json({ error: 'Không thể tạo trang mới.' }, { status: 500 });
  }
}
