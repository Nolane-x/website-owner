import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guard';
import { getDb, initializeDatabase } from '@/lib/db';
import { contentItems, pages, contentBlocks, collections, collectionItems } from '@/lib/db/schema';
import crypto from 'crypto';
import { logSecurityEvent } from '@/lib/security/audit';
import { SECURITY_EVENT_TYPES } from '@/lib/security/constants';

export async function POST(req: NextRequest) {
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    await initializeDatabase();
    const db = getDb();
    const body = await req.json();

    if (!body || !body.data) {
      return NextResponse.json({ error: 'Tệp sao lưu không đúng định dạng.' }, { status: 400 });
    }

    const { contentItems: items, pages: importedPages, contentBlocks: importedBlocks, collections: importedCollections } = body.data;

    let importedCount = 0;

    // Nhập content items
    if (Array.isArray(items)) {
      for (const item of items) {
        if (!item.title) continue;
        const id = crypto.randomUUID();
        await db.insert(contentItems).values({
          id,
          profileId: auth.profile.id,
          title: item.title,
          slug: `${item.slug || 'imported'}-${id.slice(0, 6)}`,
          type: item.type || 'note',
          description: item.description || null,
          content: item.content || null,
          coverImage: item.coverImage || null,
          icon: item.icon || null,
          visibility: item.visibility || 'PRIVATE',
          status: item.status || 'DRAFT',
          tags: Array.isArray(item.tags) ? item.tags : [],
          category: item.category || null,
          metadata: item.metadata || {},
          sortOrder: item.sortOrder || 0,
          isFeatured: Boolean(item.isFeatured),
          isPinned: Boolean(item.isPinned),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        importedCount++;
      }
    }

    await logSecurityEvent(auth.profile.id, SECURITY_EVENT_TYPES.IMPORT_EXECUTED, { importedCount });

    return NextResponse.json({
      success: true,
      message: `Đã nhập thành công ${importedCount} mục nội dung.`,
    });
  } catch (error) {
    console.error('Lỗi khi nhập dữ liệu:', error);
    return NextResponse.json({ error: 'Không thể nhập dữ liệu sao lưu.' }, { status: 500 });
  }
}
