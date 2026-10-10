import { NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guard';
import { getDb, initializeDatabase } from '@/lib/db';
import {
  contentItems,
  pages,
  contentBlocks,
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
  contentLinks,
  contentRevisions,
  subscriptions,
  researchSources,
  claims,
  automationWorkflows,
  habits,
  calendarEvents,
} from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { logSecurityEvent } from '@/lib/security/audit';
import { SECURITY_EVENT_TYPES } from '@/lib/security/constants';
import { createBackupIntegrity } from '@/lib/backup/integrity';

export async function GET() {
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    await initializeDatabase();
    const db = getDb();

    const [
      items,
      allPages,
      allFolders,
      allCollections,
      allSettings,
      allInbox,
      allTasks,
      allCards,
      allSnippets,
      allNotes,
      allWallpapers,
      allVault,
      allCrm,
      allCreator,
      allGoals,
      allDecisions,
      allSubs,
      allResearch,
      allClaims,
      allWorkflows,
      allHabits,
      allCalendarEvents,
    ] = await Promise.all([
      db.select().from(contentItems).where(eq(contentItems.profileId, auth.profile.id)),
      db.select().from(pages).where(eq(pages.profileId, auth.profile.id)),
      db.select().from(folders).where(eq(folders.profileId, auth.profile.id)),
      db.select().from(collections).where(eq(collections.profileId, auth.profile.id)),
      db.select().from(settings).where(eq(settings.profileId, auth.profile.id)),
      db.select().from(inboxItems).where(eq(inboxItems.profileId, auth.profile.id)),
      db.select().from(kanbanTasks).where(eq(kanbanTasks.profileId, auth.profile.id)),
      db.select().from(learningCards).where(eq(learningCards.profileId, auth.profile.id)),
      db.select().from(codeSnippets).where(eq(codeSnippets.profileId, auth.profile.id)),
      db.select().from(scratchpads).where(eq(scratchpads.profileId, auth.profile.id)),
      db.select().from(customWallpapers).where(eq(customWallpapers.profileId, auth.profile.id)),
      db.select().from(vaultItems).where(eq(vaultItems.profileId, auth.profile.id)),
      db.select().from(crmContacts).where(eq(crmContacts.profileId, auth.profile.id)),
      db.select().from(contentPipelines).where(eq(contentPipelines.profileId, auth.profile.id)),
      db.select().from(projectGoals).where(eq(projectGoals.profileId, auth.profile.id)),
      db.select().from(decisionRecords).where(eq(decisionRecords.profileId, auth.profile.id)),
      db.select().from(subscriptions).where(eq(subscriptions.profileId, auth.profile.id)),
      db.select().from(researchSources).where(eq(researchSources.profileId, auth.profile.id)),
      db.select().from(claims).where(eq(claims.profileId, auth.profile.id)),
      db.select().from(automationWorkflows).where(eq(automationWorkflows.profileId, auth.profile.id)),
      db.select().from(habits).where(eq(habits.profileId, auth.profile.id)),
      db.select().from(calendarEvents).where(eq(calendarEvents.profileId, auth.profile.id)),
    ]);

    const pageIds = allPages.map((p) => p.id);
    const contentIds = items.map((item) => item.id);
    const allBlocks = pageIds.length > 0
      ? await db.select().from(contentBlocks).where(inArray(contentBlocks.pageId, pageIds))
      : [];
    const allContentLinks = contentIds.length > 0
      ? await db.select().from(contentLinks).where(inArray(contentLinks.sourceId, contentIds))
      : [];
    const revisionTargets = [...contentIds, ...pageIds];
    const allContentRevisions = revisionTargets.length > 0
      ? await db.select().from(contentRevisions).where(inArray(contentRevisions.targetId, revisionTargets))
      : [];

    const colIds = allCollections.map((c) => c.id);
    const allColItems = colIds.length > 0
      ? await db.select().from(collectionItems).where(inArray(collectionItems.collectionId, colIds))
      : [];

    const exportPayload = {
      version: '5.0.0',
      exportedAt: new Date().toISOString(),
      owner: {
        username: auth.profile.username,
        displayName: auth.profile.displayName,
      },
      data: {
        contentItems: items,
        pages: allPages,
        contentBlocks: allBlocks,
        contentLinks: allContentLinks,
        contentRevisions: allContentRevisions,
        folders: allFolders,
        collections: allCollections,
        collectionItems: allColItems,
        inboxItems: allInbox,
        kanbanTasks: allTasks,
        learningCards: allCards,
        codeSnippets: allSnippets,
        scratchpads: allNotes,
        customWallpapers: allWallpapers,
        vaultItems: allVault,
        crmContacts: allCrm,
        contentPipelines: allCreator,
        projectGoals: allGoals,
        decisionRecords: allDecisions,
        subscriptions: allSubs,
        researchSources: allResearch,
        claims: allClaims,
        automationWorkflows: allWorkflows,
        habits: allHabits,
        calendarEvents: allCalendarEvents,
        settings: allSettings.map((s) => {
          const val = (typeof s.valueJson === 'object' && s.valueJson !== null ? s.valueJson : {}) as Record<string, unknown>;
          return {
            key: s.key,
            valueJson: s.key === 'public_access' ? { ...val, passwordHash: undefined } : val,
          };
        }),
      },
    };
    const responsePayload = { ...exportPayload, integrity: createBackupIntegrity(exportPayload.data) };

    await logSecurityEvent(auth.profile.id, SECURITY_EVENT_TYPES.EXPORT_DOWNLOADED, {
      itemsCount: items.length,
      pagesCount: allPages.length,
      blocksCount: allBlocks.length,
      collectionsCount: allCollections.length,
      tasksCount: allTasks.length,
      modulesCount: 26,
    });

    return new NextResponse(JSON.stringify(responsePayload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="webos-backup-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (error) {
    console.error('Lỗi khi xuất dữ liệu:', error);
    return NextResponse.json({ error: 'Không thể xuất dữ liệu backup.' }, { status: 500 });
  }
}
