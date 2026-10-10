import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guard';
import { getDb, initializeDatabase } from '@/lib/db';
import {
  contentItems,
  pages,
  contentBlocks,
  contentLinks,
  contentRevisions,
  collections,
  collectionItems,
  settings,
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
  subscriptions,
  researchSources,
  claims,
  automationWorkflows,
  habits,
  calendarEvents,
  type WorkflowNode,
  type WorkflowEdge,
} from '@/lib/db/schema';
import crypto from 'crypto';
import { eq, and } from 'drizzle-orm';
import { logSecurityEvent } from '@/lib/security/audit';
import { SECURITY_EVENT_TYPES } from '@/lib/security/constants';
import { assertValidOrigin } from '@/lib/security/origin-guard';
import { sanitizePlain } from '@/lib/security/sanitize';
import { BACKUP_ARRAY_KEYS, getBackupRecordCounts, verifyBackupIntegrity } from '@/lib/backup/integrity';

const MAX_IMPORT_BYTES = 4.5 * 1024 * 1024; // 4.5MB giới hạn an toàn Vercel Functions (F2-17)

export async function POST(req: NextRequest) {
  // P0.5: CSRF / Origin Guard
  const originError = assertValidOrigin(req);
  if (originError) return originError;

  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  // F2-17: Kiểm tra giới hạn kích thước payload
  const contentLength = req.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_IMPORT_BYTES) {
    return NextResponse.json(
      { error: 'Tệp sao lưu vượt quá dung lượng tối đa cho phép (4.5 MB).' },
      { status: 413 }
    );
  }

  try {
    const rawBody = await req.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_IMPORT_BYTES) {
      return NextResponse.json({ error: 'Tệp sao lưu vượt quá dung lượng tối đa cho phép (4.5 MB).' }, { status: 413 });
    }
    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(rawBody) as unknown;
    } catch {
      return NextResponse.json({ error: 'Nội dung backup không phải JSON hợp lệ.' }, { status: 400 });
    }
    const body = parsedBody as {
      version?: string;
      mode?: string;
      integrity?: unknown;
      data?: {
        contentItems?: Array<Record<string, unknown>>;
        pages?: Array<Record<string, unknown>>;
        contentBlocks?: Array<Record<string, unknown>>;
        contentLinks?: Array<Record<string, unknown>>;
        contentRevisions?: Array<Record<string, unknown>>;
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
        settings?: Array<Record<string, unknown>>;
        subscriptions?: Array<Record<string, unknown>>;
        researchSources?: Array<Record<string, unknown>>;
        claims?: Array<Record<string, unknown>>;
        automationWorkflows?: Array<Record<string, unknown>>;
        habits?: Array<Record<string, unknown>>;
        calendarEvents?: Array<Record<string, unknown>>;
      };
    };

    // F2-15: Xác minh cấu trúc schema tệp backup
    if (!body || typeof body !== 'object' || Array.isArray(body) || !body.data || typeof body.data !== 'object' || Array.isArray(body.data)) {
      return NextResponse.json(
        { error: 'Tệp sao lưu không đúng cấu trúc schema hợp lệ.' },
        { status: 400 }
      );
    }

    if (body.version !== undefined && (typeof body.version !== 'string' || !body.version.startsWith('5.'))) {
      return NextResponse.json(
        { error: `Phiên bản sao lưu (${String(body.version)}) không tương thích với Web OS 5.0.` },
        { status: 400 }
      );
    }

    if (body.mode !== undefined && body.mode !== 'preview' && body.mode !== 'restore') {
      return NextResponse.json({ error: 'Chế độ import không hợp lệ. Hãy dùng preview hoặc restore.' }, { status: 400 });
    }

    const dataRecord = body.data as Record<string, unknown>;
    const validatedArrayKeys = [...BACKUP_ARRAY_KEYS, 'creatorItems'];
    for (const key of validatedArrayKeys) {
      const value = dataRecord[key];
      if (value !== undefined && !Array.isArray(value)) {
        return NextResponse.json({ error: `Trường dữ liệu "${key}" phải là một mảng.` }, { status: 400 });
      }
      if (Array.isArray(value) && value.some((row) => !row || typeof row !== 'object' || Array.isArray(row))) {
        return NextResponse.json({ error: `Trường dữ liệu "${key}" chứa hàng không hợp lệ.` }, { status: 400 });
      }
    }

    // A present checksum must always validate. Older backups without a manifest remain importable with an explicit warning.
    if (body.integrity !== undefined && !verifyBackupIntegrity(body.data, body.integrity)) {
      return NextResponse.json({ error: 'Checksum SHA-256 của backup không khớp. Tệp có thể đã hỏng hoặc bị chỉnh sửa; đã từ chối import.' }, { status: 400 });
    }

    const recordCounts = getBackupRecordCounts(body.data);
    if (body.mode === 'preview') {
      const totalRecords = Object.values(recordCounts).reduce((sum, count) => sum + count, 0);
      const warnings = [
        'Import sẽ thêm các bản ghi mới; không tự xóa hoặc ghi đè dữ liệu đang có.',
        'Các hàng thiếu trường bắt buộc hoặc liên kết tham chiếu không hợp lệ có thể bị bỏ qua khi restore.',
      ];
      if (body.integrity === undefined) warnings.unshift('Backup cũ không có manifest SHA-256; không thể xác minh tính toàn vẹn hồi tố.');
      return NextResponse.json({
        success: true,
        mode: 'preview',
        version: body.version || 'legacy',
        integrity: body.integrity === undefined ? 'legacy-unverified' : 'verified',
        digest: body.integrity && typeof body.integrity === 'object' && 'digest' in body.integrity
          ? String((body.integrity as { digest: unknown }).digest)
          : null,
        totalRecords,
        recordCounts,
        warnings,
      });
    }

    await initializeDatabase();
    const db = getDb();

    const {
      contentItems: items,
      pages: importedPages,
      contentBlocks: importedBlocks,
      contentLinks: importedLinks,
      contentRevisions: importedRevisions,
      folders: importedFolders,
      collections: importedCollections,
      collectionItems: importedColItems,
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
      settings: importedSettings,
      subscriptions: importedSubs,
      researchSources: importedResearch,
      claims: importedClaims,
      automationWorkflows: importedWorkflows,
      habits: importedHabits,
      calendarEvents: importedCalendarEvents,
    } = body.data;

    let importedCount = 0;

    // F2-14: Toàn bộ quá trình Import được thực thi trong một Transaction nguyên tử duy nhất (Rollback nếu lỗi)
    await db.transaction(async (tx) => {
      // 1. Nhập Thư mục (Folders)
      const folderIdMap = new Map<string, string>();
      if (Array.isArray(importedFolders)) {
        for (const f of importedFolders) {
          if (!f.name) continue;
          const oldId = String(f.id || '');
          const newId = crypto.randomUUID();
          if (oldId) folderIdMap.set(oldId, newId);

          await tx.insert(folders).values({
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

          await tx.insert(contentItems).values({
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

          await tx.insert(pages).values({
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

          await tx.insert(contentBlocks).values({
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
      const collectionIdMap = new Map<string, string>();
      if (Array.isArray(importedCollections)) {
        for (const c of importedCollections) {
          if (!c.name) continue;
          const oldColId = String(c.id || '');
          const newColId = crypto.randomUUID();
          if (oldColId) collectionIdMap.set(oldColId, newColId);

          await tx.insert(collections).values({
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

      // 4b. Nhập Quan hệ Collection Items (F2-13)
      if (Array.isArray(importedColItems)) {
        for (const ci of importedColItems) {
          const mappedColId = collectionIdMap.get(String(ci.collectionId || ''));
          const mappedItemId = contentIdMap.get(String(ci.contentItemId || ''));
          if (!mappedColId || !mappedItemId) continue;

          await tx.insert(collectionItems).values({
            id: crypto.randomUUID(),
            collectionId: mappedColId,
            contentItemId: mappedItemId,
            sortOrder: typeof ci.sortOrder === 'number' ? ci.sortOrder : 0,
            createdAt: new Date(),
          });
          importedCount++;
        }
      }

      // 5. Nhập Universal Inbox
      const inboxIdMap = new Map<string, string>();
      if (Array.isArray(importedInbox)) {
        for (const item of importedInbox) {
          if (!item.title) continue;
          const oldInboxId = String(item.id || '');
          const newInboxId = crypto.randomUUID();
          if (oldInboxId) inboxIdMap.set(oldInboxId, newInboxId);
          await tx.insert(inboxItems).values({
            id: newInboxId,
            profileId: auth.profile.id,
            title: sanitizePlain(String(item.title)),
            kind: String(item.kind || item.category || 'text'),
            textPreview: item.textPreview ? sanitizePlain(String(item.textPreview)) : (item.note ? sanitizePlain(String(item.note)) : null),
            sourceUri: item.sourceUri ? String(item.sourceUri) : (item.source ? String(item.source) : null),
            status: String(item.status || 'inbox'),
            tagsJson: Array.isArray(item.tagsJson) ? (item.tagsJson as string[]) : (Array.isArray(item.tags) ? (item.tags as string[]) : []),
            projectId: item.projectId ? (contentIdMap.get(String(item.projectId)) ?? null) : null,
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
          await tx.insert(kanbanTasks).values({
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
            relatedItemId: t.relatedItemId
              ? (contentIdMap.get(String(t.relatedItemId)) ?? inboxIdMap.get(String(t.relatedItemId)) ?? null)
              : null,
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
          await tx.insert(learningCards).values({
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
          await tx.insert(codeSnippets).values({
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
          await tx.insert(scratchpads).values({
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

          await tx.insert(customWallpapers).values({
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
          await tx.insert(vaultItems).values({
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
          await tx.insert(crmContacts).values({
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
          await tx.insert(contentPipelines).values({
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

      // 14. Nhập Project Goals và lưu map để phục hồi quan hệ với Decision Records.
      const projectGoalIdMap = new Map<string, string>();
      if (Array.isArray(importedGoals)) {
        for (const g of importedGoals) {
          if (!g.title) continue;
          const oldGoalId = String(g.id || '');
          const newGoalId = crypto.randomUUID();
          if (oldGoalId) projectGoalIdMap.set(oldGoalId, newGoalId);
          await tx.insert(projectGoals).values({
            id: newGoalId,
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
          await tx.insert(decisionRecords).values({
            id: crypto.randomUUID(),
            profileId: auth.profile.id,
            projectId: d.projectId ? (projectGoalIdMap.get(String(d.projectId)) ?? null) : null,
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

      // 16. Nhập Cài đặt Hệ thống & Giao diện (Settings - F2-13)
      if (Array.isArray(importedSettings)) {
        for (const s of importedSettings) {
          if (!s.key || typeof s.key !== 'string') continue;
          const val = (typeof s.valueJson === 'object' && s.valueJson !== null ? s.valueJson : {}) as Record<string, unknown>;

          // Bảo lưu passwordHash của public_access nếu bản backup không có passwordHash (bị ẩn)
          if (s.key === 'public_access' && !val.passwordHash) {
            const currentSetting = await tx
              .select()
              .from(settings)
              .where(and(eq(settings.key, 'public_access'), eq(settings.profileId, auth.profile.id)))
              .limit(1);
            if (currentSetting.length > 0) {
              const currentVal = (currentSetting[0].valueJson || {}) as Record<string, unknown>;
              if (currentVal.passwordHash) {
                val.passwordHash = currentVal.passwordHash;
              }
            }
          }

          const existingSetting = await tx
            .select()
            .from(settings)
            .where(and(eq(settings.key, s.key), eq(settings.profileId, auth.profile.id)))
            .limit(1);

          if (existingSetting.length > 0) {
            await tx
              .update(settings)
              .set({
                valueJson: val,
                updatedAt: new Date(),
              })
              .where(and(eq(settings.id, existingSetting[0].id), eq(settings.profileId, auth.profile.id)));
          } else {
            await tx.insert(settings).values({
              id: crypto.randomUUID(),
              profileId: auth.profile.id,
              key: s.key,
              valueJson: val,
              updatedAt: new Date(),
            });
          }
          importedCount++;
        }
      }

      // 17. Nhập Quản lý Đăng ký (Subscriptions)
      if (Array.isArray(importedSubs)) {
        for (const s of importedSubs) {
          if (!s.name) continue;
          await tx.insert(subscriptions).values({
            id: crypto.randomUUID(),
            profileId: auth.profile.id,
            name: sanitizePlain(String(s.name)),
            category: String(s.category || 'infrastructure'),
            cost: typeof s.cost === 'number' ? s.cost : 0,
            currency: String(s.currency || 'VND'),
            billingCycle: String(s.billingCycle || 'monthly'),
            nextBillingDate: String(s.nextBillingDate || new Date().toISOString().split('T')[0]),
            status: String(s.status || 'active'),
            url: s.url ? String(s.url) : null,
            notes: s.notes ? sanitizePlain(String(s.notes)) : null,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          importedCount++;
        }
      }

      // 18. Nhập Nguồn Nghiên cứu (Research Sources)
      const researchSourceIdMap = new Map<string, string>();
      if (Array.isArray(importedResearch)) {
        for (const r of importedResearch) {
          if (!r.title) continue;
          const oldSourceId = String(r.id || '');
          const newSourceId = crypto.randomUUID();
          if (oldSourceId) researchSourceIdMap.set(oldSourceId, newSourceId);
          await tx.insert(researchSources).values({
            id: newSourceId,
            profileId: auth.profile.id,
            title: sanitizePlain(String(r.title)),
            url: r.url ? String(r.url) : null,
            author: r.author ? sanitizePlain(String(r.author)) : null,
            excerpt: r.excerpt ? sanitizePlain(String(r.excerpt)) : null,
            status: String(r.status || 'captured'),
            tagsJson: Array.isArray(r.tagsJson) ? (r.tagsJson as string[]) : [],
            createdAt: new Date(),
          });
          importedCount++;
        }
      }

      // 19. Nhập Mệnh đề Nghiên cứu (Claims)
      if (Array.isArray(importedClaims)) {
        for (const c of importedClaims) {
          if (!c.statement) continue;
          await tx.insert(claims).values({
            id: crypto.randomUUID(),
            profileId: auth.profile.id,
            statement: sanitizePlain(String(c.statement)),
            status: String(c.status || 'unreviewed'),
            sourceIdsJson: Array.isArray(c.sourceIdsJson)
              ? (c.sourceIdsJson as string[]).map((sourceId) => researchSourceIdMap.get(String(sourceId))).filter((sourceId): sourceId is string => Boolean(sourceId))
              : [],
            notes: c.notes ? sanitizePlain(String(c.notes)) : null,
            createdAt: new Date(),
          });
          importedCount++;
        }
      }

      // 20. Nhập Quy trình Tự động hóa (Automation Workflows)
      if (Array.isArray(importedWorkflows)) {
        for (const w of importedWorkflows) {
          if (!w.name) continue;
          await tx.insert(automationWorkflows).values({
            id: crypto.randomUUID(),
            profileId: auth.profile.id,
            name: sanitizePlain(String(w.name)),
            description: w.description ? sanitizePlain(String(w.description)) : null,
            triggerType: String(w.triggerType || 'manual'),
            nodesJson: Array.isArray(w.nodesJson) ? (w.nodesJson as unknown as WorkflowNode[]) : [],
            edgesJson: Array.isArray(w.edgesJson) ? (w.edgesJson as unknown as WorkflowEdge[]) : [],
            isActive: Boolean(w.isActive),
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          importedCount++;
        }
      }

      // 21. Restore habits with validated, deduplicated local-date completion history.
      if (Array.isArray(importedHabits)) {
        for (const habit of importedHabits) {
          if (typeof habit.name !== 'string' || !habit.name.trim()) continue;
          const dates = Array.isArray(habit.completedDatesJson)
            ? [...new Set((habit.completedDatesJson as unknown[]).filter((value): value is string =>
                typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)))].slice(-1000).sort()
            : [];
          await tx.insert(habits).values({
            id: crypto.randomUUID(),
            profileId: auth.profile.id,
            name: sanitizePlain(habit.name).slice(0, 160),
            target: typeof habit.target === 'string' ? sanitizePlain(habit.target).slice(0, 100) : 'Hàng ngày',
            completedDatesJson: dates,
            isActive: typeof habit.isActive === 'boolean' ? habit.isActive : true,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          importedCount++;
        }
      }

      // 22. Restore calendar records only if their timestamps and timezone are valid.
      if (Array.isArray(importedCalendarEvents)) {
        for (const event of importedCalendarEvents) {
          if (typeof event.title !== 'string' || !event.title.trim() ||
              typeof event.startAt !== 'string' || !Number.isFinite(Date.parse(event.startAt))) continue;
          const endAt = typeof event.endAt === 'string' && event.endAt.trim() ? event.endAt : null;
          if (endAt && (!Number.isFinite(Date.parse(endAt)) || Date.parse(endAt) < Date.parse(event.startAt))) continue;
          const timezone = typeof event.timezone === 'string' ? event.timezone : 'Asia/Ho_Chi_Minh';
          try { new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(); }
          catch { continue; }
          await tx.insert(calendarEvents).values({
            id: crypto.randomUUID(),
            profileId: auth.profile.id,
            title: sanitizePlain(event.title).slice(0, 180),
            description: typeof event.description === 'string' ? sanitizePlain(event.description).slice(0, 6000) : null,
            startAt: event.startAt,
            endAt,
            timezone,
            isAllDay: event.isAllDay === true,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          importedCount++;
        }
      }

      // 23. Restore wiki links using remapped content IDs; stale references are not silently imported.
      if (Array.isArray(importedLinks)) {
        for (const link of importedLinks) {
          const sourceId = contentIdMap.get(String(link.sourceId || ''));
          const targetId = contentIdMap.get(String(link.targetId || ''));
          if (!sourceId || !targetId || !link.linkText) continue;
          await tx.insert(contentLinks).values({
            id: crypto.randomUUID(),
            sourceId,
            targetId,
            linkText: sanitizePlain(String(link.linkText)),
            createdAt: new Date(),
          });
          importedCount++;
        }
      }

      // 22. Restore content/page revision snapshots against the newly imported target IDs.
      if (Array.isArray(importedRevisions)) {
        for (const revision of importedRevisions) {
          const targetType = String(revision.targetType || 'content');
          const oldTargetId = String(revision.targetId || '');
          const targetId = targetType === 'page'
            ? pageIdMap.get(oldTargetId)
            : contentIdMap.get(oldTargetId);
          if (!targetId || !revision.titleSnapshot) continue;
          await tx.insert(contentRevisions).values({
            id: crypto.randomUUID(),
            targetId,
            targetType,
            revisionNumber: typeof revision.revisionNumber === 'number' && revision.revisionNumber > 0
              ? revision.revisionNumber
              : 1,
            titleSnapshot: sanitizePlain(String(revision.titleSnapshot)),
            bodySnapshot: typeof revision.bodySnapshot === 'string' ? revision.bodySnapshot : null,
            metadataSnapshot: (typeof revision.metadataSnapshot === 'object' && revision.metadataSnapshot !== null
              ? revision.metadataSnapshot
              : {}) as Record<string, unknown>,
            reason: revision.reason ? sanitizePlain(String(revision.reason)) : null,
            createdAt: new Date(),
          });
          importedCount++;
        }
      }
    });

    await logSecurityEvent(auth.profile.id, SECURITY_EVENT_TYPES.IMPORT_EXECUTED, { importedCount });

    return NextResponse.json({
      success: true,
      message: `Đã nhập thành công ${importedCount} mục dữ liệu trong transaction an toàn.`,
    });
  } catch (error) {
    console.error('Lỗi khi nhập dữ liệu:', error);
    return NextResponse.json({ error: 'Không thể nhập dữ liệu sao lưu.' }, { status: 500 });
  }
}
