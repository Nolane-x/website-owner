import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guard';
import { getDb, initializeDatabase } from '@/lib/db';
import {
  contentItems,
  pages,
  contentBlocks,
  collections,
  folders,
  inboxItems,
  kanbanTasks,
  learningCards,
  codeSnippets,
  scratchpads,
  customWallpapers,
  vaultItems,
  crmContacts,
  contentPipelines,
  projectGoals,
  decisionRecords,
} from '@/lib/db/schema';
import crypto from 'crypto';
import { logSecurityEvent } from '@/lib/security/audit';
import { SECURITY_EVENT_TYPES } from '@/lib/security/constants';
import { assertValidOrigin } from '@/lib/security/origin-guard';
import { sanitizePlain } from '@/lib/security/sanitize';

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
      version?: string;
      data?: {
        contentItems?: Array<Record<string, unknown>>;
        pages?: Array<Record<string, unknown>>;
        contentBlocks?: Array<Record<string, unknown>>;
        folders?: Array<Record<string, unknown>>;
        collections?: Array<Record<string, unknown>>;
        collectionItems?: Array<Record<string, unknown>>;
        inboxItems?: Array<Record<string, unknown>>;
        kanbanTasks?: Array<Record<string, unknown>>;
        learningCards?: Array<Record<string, unknown>>;
        codeSnippets?: Array<Record<string, unknown>>;
        scratchpads?: Array<Record<string, unknown>>;
        customWallpapers?: Array<Record<string, unknown>>;
        vaultItems?: Array<Record<string, unknown>>;
        crmContacts?: Array<Record<string, unknown>>;
        contentPipelines?: Array<Record<string, unknown>>;
        creatorItems?: Array<Record<string, unknown>>;
        projectGoals?: Array<Record<string, unknown>>;
        decisionRecords?: Array<Record<string, unknown>>;
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
      inboxItems: importedInbox,
      kanbanTasks: importedTasks,
      learningCards: importedCards,
      codeSnippets: importedSnippets,
      scratchpads: importedNotes,
      customWallpapers: importedWallpapers,
      vaultItems: importedVault,
      crmContacts: importedContacts,
      contentPipelines: importedPipelines,
      creatorItems: importedCreator,
      projectGoals: importedGoals,
      decisionRecords: importedDecisions,
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
          name: sanitizePlain(String(f.name)),
          slug: `${sanitizePlain(String(f.slug || 'folder'))}-${newId.slice(0, 6)}`,
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
          title: sanitizePlain(String(item.title)),
          slug: `${sanitizePlain(String(item.slug || 'imported'))}-${newId.slice(0, 6)}`,
          type: String(item.type || 'note'),
          description: item.description ? sanitizePlain(String(item.description)) : null,
          content: item.content ? String(item.content) : null,
          coverImage: item.coverImage ? String(item.coverImage) : null,
          icon: item.icon ? String(item.icon) : null,
          visibility: String(item.visibility || 'PRIVATE'),
          status: String(item.status || 'DRAFT'),
          tags: Array.isArray(item.tags) ? (item.tags as string[]) : [],
          category: item.category ? sanitizePlain(String(item.category)) : null,
          metadata: (typeof item.metadata === 'object' && item.metadata !== null ? item.metadata : {}) as Record<string, unknown>,
          sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : 0,
          isFeatured: Boolean(item.isFeatured),
          isPinned: Boolean(item.isPinned),
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: item.deletedAt ? new Date(String(item.deletedAt)) : null,
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
          title: sanitizePlain(String(p.title)),
          slug: `${sanitizePlain(String(p.slug || 'page'))}-${newId.slice(0, 6)}`,
          description: p.description ? sanitizePlain(String(p.description)) : null,
          coverImage: p.coverImage ? String(p.coverImage) : null,
          visibility: String(p.visibility || 'PRIVATE'),
          status: String(p.status || 'DRAFT'),
          sortOrder: typeof p.sortOrder === 'number' ? p.sortOrder : 0,
          isFeatured: Boolean(p.isFeatured),
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: p.deletedAt ? new Date(String(p.deletedAt)) : null,
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
          name: sanitizePlain(String(c.name)),
          slug: `${sanitizePlain(String(c.slug || 'col'))}-${newColId.slice(0, 6)}`,
          description: c.description ? sanitizePlain(String(c.description)) : null,
          coverImage: c.coverImage ? String(c.coverImage) : null,
          icon: c.icon ? String(c.icon) : null,
          visibility: String(c.visibility || 'PRIVATE'),
          status: String(c.status || 'DRAFT'),
          sortOrder: typeof c.sortOrder === 'number' ? c.sortOrder : 0,
          isFeatured: Boolean(c.isFeatured),
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: c.deletedAt ? new Date(String(c.deletedAt)) : null,
        });
        importedCount++;
      }
    }

    // 5. Nhập Universal Inbox
    if (Array.isArray(importedInbox)) {
      for (const item of importedInbox) {
        if (!item.title) continue;
        await db.insert(inboxItems).values({
          id: crypto.randomUUID(),
          profileId: auth.profile.id,
          title: sanitizePlain(String(item.title)),
          kind: String(item.kind || item.category || 'text'),
          textPreview: item.textPreview ? sanitizePlain(String(item.textPreview)) : (item.note ? sanitizePlain(String(item.note)) : null),
          sourceUri: item.sourceUri ? String(item.sourceUri) : (item.source ? String(item.source) : null),
          status: String(item.status || 'inbox'),
          tagsJson: Array.isArray(item.tagsJson) ? (item.tagsJson as string[]) : (Array.isArray(item.tags) ? (item.tags as string[]) : []),
          projectId: item.projectId ? String(item.projectId) : null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        importedCount++;
      }
    }

    // 6. Nhập Kanban Tasks
    if (Array.isArray(importedTasks)) {
      for (const t of importedTasks) {
        if (!t.title) continue;
        await db.insert(kanbanTasks).values({
          id: crypto.randomUUID(),
          profileId: auth.profile.id,
          title: sanitizePlain(String(t.title)),
          description: t.description ? sanitizePlain(String(t.description)) : null,
          status: String(t.status || 'todo'),
          priority: String(t.priority || 'medium'),
          dueDate: t.dueDate ? String(t.dueDate) : null,
          tags: Array.isArray(t.tags) ? (t.tags as string[]) : [],
          subtasksJson: Array.isArray(t.subtasksJson) ? (t.subtasksJson as Array<{ id: string; title: string; completed: boolean }>) : [],
          sortOrder: typeof t.sortOrder === 'number' ? t.sortOrder : (typeof t.order === 'number' ? t.order : 0),
          relatedItemId: t.relatedItemId ? String(t.relatedItemId) : null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        importedCount++;
      }
    }

    // 7. Nhập Learning Cards
    if (Array.isArray(importedCards)) {
      for (const c of importedCards) {
        if (!c.front || !c.back) continue;
        await db.insert(learningCards).values({
          id: crypto.randomUUID(),
          profileId: auth.profile.id,
          deckName: sanitizePlain(String(c.deckName || c.deckId || 'default')),
          front: sanitizePlain(String(c.front)),
          back: sanitizePlain(String(c.back)),
          difficulty: typeof c.difficulty === 'number' ? c.difficulty : 1,
          intervalDays: typeof c.intervalDays === 'number' ? c.intervalDays : (typeof c.interval === 'number' ? c.interval : 1),
          repetitions: typeof c.repetitions === 'number' ? c.repetitions : (typeof c.repetition === 'number' ? c.repetition : 0),
          easeFactor: typeof c.easeFactor === 'number' ? (c.easeFactor > 10 ? Math.round(c.easeFactor) : Math.round(c.easeFactor * 100)) : 250,
          nextReviewDate: String(c.nextReviewDate || c.dueDate || new Date().toISOString().split('T')[0]),
          createdAt: new Date(),
        });
        importedCount++;
      }
    }

    // 8. Nhập Code Snippets
    if (Array.isArray(importedSnippets)) {
      for (const s of importedSnippets) {
        if (!s.title || !s.code) continue;
        await db.insert(codeSnippets).values({
          id: crypto.randomUUID(),
          profileId: auth.profile.id,
          title: sanitizePlain(String(s.title)),
          description: s.description ? sanitizePlain(String(s.description)) : null,
          language: String(s.language || 'typescript'),
          code: String(s.code),
          tags: Array.isArray(s.tags) ? (s.tags as string[]) : [],
          isFavorite: Boolean(s.isFavorite),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        importedCount++;
      }
    }

    // 9. Nhập Scratchpads
    if (Array.isArray(importedNotes)) {
      for (const n of importedNotes) {
        if (!n.content) continue;
        await db.insert(scratchpads).values({
          id: crypto.randomUUID(),
          profileId: auth.profile.id,
          title: n.title ? sanitizePlain(String(n.title)) : null,
          content: sanitizePlain(String(n.content)),
          color: String(n.color || 'amber'),
          sortOrder: typeof n.sortOrder === 'number' ? n.sortOrder : 0,
          isPinned: Boolean(n.isPinned),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        importedCount++;
      }
    }

    // 10. Nhập Wallpapers
    if (Array.isArray(importedWallpapers)) {
      for (const w of importedWallpapers) {
        if (!w.title) continue;
        const sourceUrl = w.sourceUrl ? String(w.sourceUrl) : (w.url ? String(w.url) : null);
        const localDataUrl = w.localDataUrl ? String(w.localDataUrl) : null;
        if (!sourceUrl && !localDataUrl) continue;

        await db.insert(customWallpapers).values({
          id: crypto.randomUUID(),
          profileId: auth.profile.id,
          title: sanitizePlain(String(w.title)),
          type: String(w.type || 'image'),
          sourceUrl,
          localDataUrl,
          tagsJson: Array.isArray(w.tagsJson) ? (w.tagsJson as string[]) : (Array.isArray(w.tags) ? (w.tags as string[]) : []),
          filtersJson: (typeof w.filtersJson === 'object' && w.filtersJson !== null ? w.filtersJson : {}) as {
            dim?: number;
            blur?: number;
            contrast?: number;
            saturation?: number;
            vignette?: boolean;
            scanlines?: boolean;
          },
          isFavorite: Boolean(w.isFavorite),
          createdAt: new Date(),
        });
        importedCount++;
      }
    }

    // 11. Nhập Vault Items
    if (Array.isArray(importedVault)) {
      for (const v of importedVault) {
        if (!v.serviceName || !v.ciphertext || !v.iv || !v.salt) continue;
        await db.insert(vaultItems).values({
          id: crypto.randomUUID(),
          profileId: auth.profile.id,
          serviceName: sanitizePlain(String(v.serviceName)),
          username: v.username ? sanitizePlain(String(v.username)) : '',
          ciphertext: String(v.ciphertext),
          iv: String(v.iv),
          salt: String(v.salt),
          url: v.url ? String(v.url) : null,
          category: v.category ? sanitizePlain(String(v.category)) : null,
          tags: Array.isArray(v.tags) ? (v.tags as string[]) : [],
          isFavorite: Boolean(v.isFavorite),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        importedCount++;
      }
    }

    // 12. Nhập CRM Contacts
    if (Array.isArray(importedContacts)) {
      for (const c of importedContacts) {
        if (!c.name) continue;
        await db.insert(crmContacts).values({
          id: crypto.randomUUID(),
          profileId: auth.profile.id,
          name: sanitizePlain(String(c.name)),
          role: c.role ? sanitizePlain(String(c.role)) : '',
          organization: c.organization ? sanitizePlain(String(c.organization)) : (c.company ? sanitizePlain(String(c.company)) : undefined),
          category: String(c.category || 'other'),
          email: c.email ? sanitizePlain(String(c.email)) : undefined,
          phone: c.phone ? sanitizePlain(String(c.phone)) : undefined,
          lastInteractionAt: c.lastInteractionAt ? String(c.lastInteractionAt) : undefined,
          followUpDays: typeof c.followUpDays === 'number' ? c.followUpDays : 14,
          notes: c.notes ? sanitizePlain(String(c.notes)) : undefined,
          neverCloudAi: Boolean(c.neverCloudAi),
          createdAt: new Date(),
        });
        importedCount++;
      }
    }

    // 13. Nhập Chuỗi Nội dung Creator (Content Pipelines)
    const pipelinesToImport = Array.isArray(importedPipelines)
      ? importedPipelines
      : Array.isArray(importedCreator)
      ? importedCreator
      : null;

    if (Array.isArray(pipelinesToImport)) {
      for (const cr of pipelinesToImport) {
        if (!cr.title) continue;
        await db.insert(contentPipelines).values({
          id: crypto.randomUUID(),
          profileId: auth.profile.id,
          title: sanitizePlain(String(cr.title)),
          channel: String(cr.channel || cr.platform || 'blog'),
          stage: String(cr.stage || cr.status || 'idea'),
          body: String(cr.body || cr.notes || ''),
          outline: cr.outline ? String(cr.outline) : (cr.outlineJson ? JSON.stringify(cr.outlineJson) : null),
          tagsJson: Array.isArray(cr.tagsJson) ? (cr.tagsJson as string[]) : (Array.isArray(cr.tags) ? (cr.tags as string[]) : []),
          scheduledAt: cr.scheduledAt ? String(cr.scheduledAt) : (cr.scheduledDate ? String(cr.scheduledDate) : null),
          updatedAt: new Date(),
        });
        importedCount++;
      }
    }

    // 14. Nhập Project Goals
    if (Array.isArray(importedGoals)) {
      for (const g of importedGoals) {
        if (!g.title) continue;
        await db.insert(projectGoals).values({
          id: crypto.randomUUID(),
          profileId: auth.profile.id,
          title: sanitizePlain(String(g.title)),
          description: g.description ? sanitizePlain(String(g.description)) : null,
          category: String(g.category || 'delivery'),
          targetDate: String(g.targetDate || new Date().toISOString().split('T')[0]),
          status: String(g.status || 'active'),
          progress: typeof g.progress === 'number' ? g.progress : 0,
          createdAt: new Date(),
        });
        importedCount++;
      }
    }

    // 15. Nhập Decision Records
    if (Array.isArray(importedDecisions)) {
      for (const d of importedDecisions) {
        if (!d.title) continue;
        await db.insert(decisionRecords).values({
          id: crypto.randomUUID(),
          profileId: auth.profile.id,
          projectId: d.projectId ? String(d.projectId) : null,
          title: sanitizePlain(String(d.title)),
          context: sanitizePlain(String(d.context || '')),
          decision: sanitizePlain(String(d.decision || '')),
          consequences: d.consequences ? sanitizePlain(String(d.consequences)) : null,
          status: String(d.status || 'proposed'),
          createdAt: new Date(),
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
