import { NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guard';
import { getDb, initializeDatabase } from '@/lib/db';
import { contentItems, pages, contentBlocks, collections, collectionItems, settings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { logSecurityEvent } from '@/lib/security/audit';
import { SECURITY_EVENT_TYPES } from '@/lib/security/constants';

export async function GET() {
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    await initializeDatabase();
    const db = getDb();

    const items = await db.select().from(contentItems).where(eq(contentItems.profileId, auth.profile.id));
    const allPages = await db.select().from(pages).where(eq(pages.profileId, auth.profile.id));
    const allBlocks = await db.select().from(contentBlocks);
    const allCollections = await db.select().from(collections).where(eq(collections.profileId, auth.profile.id));
    const allColItems = await db.select().from(collectionItems);
    const allSettings = await db.select().from(settings).where(eq(settings.profileId, auth.profile.id));

    const exportPayload = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      owner: {
        username: auth.profile.username,
        displayName: auth.profile.displayName,
      },
      data: {
        contentItems: items,
        pages: allPages,
        contentBlocks: allBlocks,
        collections: allCollections,
        collectionItems: allColItems,
        settings: allSettings.map((s: any) => ({
          key: s.key,
          valueJson: s.key === 'public_access' ? { ...(s.valueJson as any), passwordHash: undefined } : s.valueJson,
        })),
      },
    };

    await logSecurityEvent(auth.profile.id, SECURITY_EVENT_TYPES.EXPORT_DOWNLOADED, {
      itemsCount: items.length,
      pagesCount: allPages.length,
    });

    return new NextResponse(JSON.stringify(exportPayload, null, 2), {
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
