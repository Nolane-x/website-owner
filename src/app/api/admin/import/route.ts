import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guard';
import { getDb, initializeDatabase } from '@/lib/db';
import { contentItems, pages, contentBlocks, collections, folders } from '@/lib/db/schema';
import crypto from 'crypto';
import { logSecurityEvent } from '@/lib/security/audit';
import { SECURITY_EVENT_TYPES } from '@/lib/security/constants';
import { assertValidOrigin } from '@/lib/security/origin-guard';

export async function POST(req: NextRequest) {
  // P0.5: CSRF / Origin Guard
  const originError = assertValidOrigin(req);
  if (originError) return originError;

  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    await initializeDatabase();
    const db = getDb();
    const body = (await req.json()) as {
      data?: {
        contentItems?: Array<Record<string, unknown>>;
        pages?: Array<Record<string, unknown>>;
        contentBlocks?: Array<Record<string, unknown>>;
        folders?: Array<Record<string, unknown>>;
        collections?: Array<Record<string, unknown>>;
        collectionItems?: Array<Record<string, unknown>>;
      };
    };

    if (!body || !body.data) {
      return NextResponse.json({ error: 'Tệp sao lưu không đúng định dạng.' }, { status: 400 });
    }

    const {
      contentItems: items,
      pages: importedPages,
      contentBlocks: importedBlocks,
      folders: importedFolders,
      collections: importedCollections,
    } = body.data;

    let importedCount = 0;

    // 1. Nhập Thư mục (Folders)
    const folderIdMap = new Map<string, string>();
    if (Array.isArray(importedFolders)) {
      for (const f of importedFolders) {
        if (!f.name) continue;
        const oldId = String(f.id || '');
        const newId = crypto.randomUUID();
        if (oldId) folderIdMap.set(oldId, newId);

        await db.insert(folders).values({
          id: newId,
          profileId: auth.profile.id,
          name: String(f.name),
          slug: `${f.slug || 'folder'}-${newId.slice(0, 6)}`,
          parentId: null,
          sortOrder: typeof f.sortOrder === 'number' ? f.sortOrder : 0,
          createdAt: new Date(),
        });
        importedCount++;
      }
    }

    // 2. Nhập Content Items
    const contentIdMap = new Map<string, string>();
    if (Array.isArray(items)) {
      for (const item of items) {
        if (!item.title) continue;
        const oldId = String(item.id || '');
        const newId = crypto.randomUUID();
        if (oldId) contentIdMap.set(oldId, newId);

        await db.insert(contentItems).values({
          id: newId,
          profileId: auth.profile.id,
          title: String(item.title),
          slug: `${item.slug || 'imported'}-${newId.slice(0, 6)}`,
          type: String(item.type || 'note'),
          description: item.description ? String(item.description) : null,
          content: item.content ? String(item.content) : null,
          coverImage: item.coverImage ? String(item.coverImage) : null,
          icon: item.icon ? String(item.icon) : null,
          visibility: String(item.visibility || 'PRIVATE'),
          status: String(item.status || 'DRAFT'),
          tags: Array.isArray(item.tags) ? (item.tags as string[]) : [],
          category: item.category ? String(item.category) : null,
          metadata: (typeof item.metadata === 'object' && item.metadata !== null ? item.metadata : {}) as Record<string, unknown>,
          sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : 0,
          isFeatured: Boolean(item.isFeatured),
          isPinned: Boolean(item.isPinned),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        importedCount++;
      }
    }

    // 3. Nhập Pages & Blocks
    const pageIdMap = new Map<string, string>();
    if (Array.isArray(importedPages)) {
      for (const p of importedPages) {
        if (!p.title) continue;
        const oldId = String(p.id || '');
        const newId = crypto.randomUUID();
        if (oldId) pageIdMap.set(oldId, newId);

        await db.insert(pages).values({
          id: newId,
          profileId: auth.profile.id,
          title: String(p.title),
          slug: `${p.slug || 'page'}-${newId.slice(0, 6)}`,
          description: p.description ? String(p.description) : null,
          coverImage: p.coverImage ? String(p.coverImage) : null,
          visibility: String(p.visibility || 'PRIVATE'),
          status: String(p.status || 'DRAFT'),
          sortOrder: typeof p.sortOrder === 'number' ? p.sortOrder : 0,
          isFeatured: Boolean(p.isFeatured),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        importedCount++;
      }
    }

    if (Array.isArray(importedBlocks)) {
      for (const b of importedBlocks) {
        const mappedPageId = pageIdMap.get(String(b.pageId || ''));
        if (!mappedPageId) continue;
        const newBlockId = crypto.randomUUID();

        await db.insert(contentBlocks).values({
          id: newBlockId,
          pageId: mappedPageId,
          blockType: String(b.blockType || 'text'),
          sortOrder: typeof b.sortOrder === 'number' ? b.sortOrder : 0,
          contentJson: (typeof b.contentJson === 'object' && b.contentJson !== null ? b.contentJson : {}) as Record<string, unknown>,
          settingsJson: (typeof b.settingsJson === 'object' && b.settingsJson !== null ? b.settingsJson : {}) as Record<string, unknown>,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        importedCount++;
      }
    }

    // 4. Nhập Collections
    if (Array.isArray(importedCollections)) {
      for (const c of importedCollections) {
        if (!c.name) continue;
        const newColId = crypto.randomUUID();

        await db.insert(collections).values({
          id: newColId,
          profileId: auth.profile.id,
          name: String(c.name),
          slug: `${c.slug || 'col'}-${newColId.slice(0, 6)}`,
          description: c.description ? String(c.description) : null,
          coverImage: c.coverImage ? String(c.coverImage) : null,
          icon: c.icon ? String(c.icon) : null,
          visibility: String(c.visibility || 'PRIVATE'),
          status: String(c.status || 'DRAFT'),
          sortOrder: typeof c.sortOrder === 'number' ? c.sortOrder : 0,
          isFeatured: Boolean(c.isFeatured),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        importedCount++;
      }
    }

    await logSecurityEvent(auth.profile.id, SECURITY_EVENT_TYPES.IMPORT_EXECUTED, { importedCount });

    return NextResponse.json({
      success: true,
      message: `Đã nhập thành công ${importedCount} mục dữ liệu.`,
    });
  } catch (error) {
    console.error('Lỗi khi nhập dữ liệu:', error);
    return NextResponse.json({ error: 'Không thể nhập dữ liệu sao lưu.' }, { status: 500 });
  }
}
