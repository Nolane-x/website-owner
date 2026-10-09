import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guard';
import { getDb, initializeDatabase } from '@/lib/db';
import { contentItems } from '@/lib/db/schema';
import { eq, desc, asc, and, like, or, isNull, isNotNull } from 'drizzle-orm';
import crypto from 'crypto';
import { sanitizeHtml, sanitizePlain } from '@/lib/security/sanitize';
import { logSecurityEvent } from '@/lib/security/audit';
import { SECURITY_EVENT_TYPES } from '@/lib/security/constants';
import { getClientIp } from '@/lib/security/rate-limit';

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'item-' + Date.now();
}

export async function GET(req: NextRequest) {
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    await initializeDatabase();
    const db = getDb();
    const { searchParams } = new URL(req.url);

    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const visibility = searchParams.get('visibility');
    const query = searchParams.get('q');
    const isPinned = searchParams.get('isPinned');

    const conditions: any[] = [eq(contentItems.profileId, auth.profile.id)];

    const trash = searchParams.get('trash');
    if (trash === 'true') {
      conditions.push(isNotNull(contentItems.deletedAt));
    } else {
      conditions.push(isNull(contentItems.deletedAt));
    }

    if (type) conditions.push(eq(contentItems.type, type));
    if (status) conditions.push(eq(contentItems.status, status));
    if (visibility) conditions.push(eq(contentItems.visibility, visibility));
    if (isPinned === 'true') conditions.push(eq(contentItems.isPinned, true));
    if (query && query.trim() !== '') {
      const q = `%${query.trim().toLowerCase()}%`;
      conditions.push(
        or(
          like(contentItems.title, q),
          like(contentItems.description, q)
        )
      );
    }

    const items = await db
      .select()
      .from(contentItems)
      .where(and(...conditions))
      .orderBy(desc(contentItems.isPinned), desc(contentItems.createdAt));

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Lỗi lấy danh sách nội dung:', error);
    return NextResponse.json({ error: 'Không thể tải danh sách nội dung.' }, { status: 500 });
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
      title,
      type = 'note',
      description,
      content,
      coverImage,
      icon,
      visibility = 'PRIVATE',
      status = 'DRAFT',
      tags = [],
      category,
      metadata = {},
      isFeatured = false,
      isPinned = false,
    } = body;

    if (!title || title.trim() === '') {
      return NextResponse.json({ error: 'Tiêu đề không được để trống.' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const baseSlug = generateSlug(title);
    const slug = `${baseSlug}-${id.slice(0, 6)}`;
    const sanitizedTitle = sanitizePlain(title);
    const sanitizedDesc = description ? sanitizePlain(description) : null;
    const sanitizedContent = content ? sanitizeHtml(content) : null;

    const publishedAt = status === 'PUBLISHED' ? new Date() : null;
    const shareToken = visibility === 'UNLISTED' ? crypto.randomBytes(16).toString('hex') : null;

    await db.insert(contentItems).values({
      id,
      profileId: auth.profile.id,
      title: sanitizedTitle,
      slug,
      type,
      description: sanitizedDesc,
      content: sanitizedContent,
      coverImage,
      icon,
      visibility,
      status,
      tags: Array.isArray(tags) ? tags : [],
      category: category ? sanitizePlain(category) : null,
      metadata: typeof metadata === 'object' ? metadata : {},
      sortOrder: 0,
      isFeatured: Boolean(isFeatured),
      isPinned: Boolean(isPinned),
      shareToken,
      createdAt: new Date(),
      updatedAt: new Date(),
      publishedAt,
    });

    const ip = getClientIp(req.headers);
    const userAgent = req.headers.get('user-agent') || 'Unknown';
    await logSecurityEvent(
      auth.profile.id,
      status === 'PUBLISHED' ? SECURITY_EVENT_TYPES.CONTENT_PUBLISHED : SECURITY_EVENT_TYPES.CONTENT_CREATED,
      { id, title: sanitizedTitle, type, visibility, status },
      ip,
      userAgent
    );

    const created = await db.select().from(contentItems).where(eq(contentItems.id, id)).limit(1);

    return NextResponse.json({ success: true, item: created[0] }, { status: 201 });
  } catch (error) {
    console.error('Lỗi khi tạo nội dung:', error);
    return NextResponse.json({ error: 'Không thể lưu nội dung mới.' }, { status: 500 });
  }
}
