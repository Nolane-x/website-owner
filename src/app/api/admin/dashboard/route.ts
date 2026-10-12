import { NextResponse } from 'next/server';
import { and, desc, eq, isNull, or, sql } from 'drizzle-orm';
import { requireOwner } from '@/lib/auth/guard';
import { getDb, initializeDatabase } from '@/lib/db';
import { contentItems, pages } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = { 'Cache-Control': 'private, no-store, max-age=0' };

const DASHBOARD_STATS_DEFAULT = {
  total: 0,
  published: 0,
  drafts: 0,
  projects: 0,
  resources: 0,
  pages: 0,
};

export async function GET() {
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    await initializeDatabase();
    const db = getDb();
    const profileId = auth.profile.id;
    const activeContent = and(
      eq(contentItems.profileId, profileId),
      isNull(contentItems.deletedAt),
    );

    // Aggregate counts in PostgreSQL instead of downloading all content records.
    const statsQuery = db.select({
      total: sql<number>`count(*)::int`,
      published: sql<number>`count(*) FILTER (WHERE ${contentItems.status} = 'PUBLISHED')::int`,
      drafts: sql<number>`count(*) FILTER (WHERE ${contentItems.status} = 'DRAFT')::int`,
      projects: sql<number>`count(*) FILTER (WHERE ${contentItems.type} = 'project')::int`,
      resources: sql<number>`count(*) FILTER (WHERE ${contentItems.type} IN ('resource', 'link'))::int`,
      pages: sql<number>`(
        SELECT count(*)::int
        FROM ${pages}
        WHERE ${pages.profileId} = ${profileId}
          AND ${pages.deletedAt} IS NULL
      )`,
    }).from(contentItems).where(activeContent);

    const recentItemsQuery = db.select({
      id: contentItems.id,
      title: contentItems.title,
      type: contentItems.type,
      visibility: contentItems.visibility,
      status: contentItems.status,
      description: sql<string | null>`left(${contentItems.description}, 320)`,
      createdAt: contentItems.createdAt,
      isPinned: contentItems.isPinned,
      isFeatured: contentItems.isFeatured,
    }).from(contentItems)
      .where(activeContent)
      .orderBy(desc(contentItems.isPinned), desc(contentItems.createdAt))
      .limit(5);

    const pinnedProjectsQuery = db.select({
      id: contentItems.id,
      title: contentItems.title,
      visibility: contentItems.visibility,
      description: sql<string | null>`left(${contentItems.description}, 320)`,
      isPinned: contentItems.isPinned,
      isFeatured: contentItems.isFeatured,
    }).from(contentItems)
      .where(and(
        eq(contentItems.profileId, profileId),
        isNull(contentItems.deletedAt),
        eq(contentItems.type, 'project'),
        or(eq(contentItems.isPinned, true), eq(contentItems.isFeatured, true)),
      ))
      .orderBy(desc(contentItems.isPinned), desc(contentItems.createdAt))
      .limit(4);

    const recentResourcesQuery = db.select({
      id: contentItems.id,
      title: contentItems.title,
      type: contentItems.type,
      metadata: sql<Record<string, unknown>>`jsonb_strip_nulls(jsonb_build_object(
        'provider', CASE
          WHEN jsonb_typeof(${contentItems.metadata} -> 'provider') = 'string'
          THEN to_jsonb(left(${contentItems.metadata} ->> 'provider', 80))
          ELSE NULL
        END,
        'url', CASE
          WHEN length(${contentItems.metadata} ->> 'url') <= 2048
            AND (${contentItems.metadata} ->> 'url') ~* '^https?://'
          THEN to_jsonb(${contentItems.metadata} ->> 'url')
          ELSE NULL
        END
      ))`,
    }).from(contentItems)
      .where(and(
        eq(contentItems.profileId, profileId),
        isNull(contentItems.deletedAt),
        or(eq(contentItems.type, 'resource'), eq(contentItems.type, 'link')),
      ))
      .orderBy(desc(contentItems.createdAt))
      .limit(4);

    const [statsRows, recentItems, pinnedProjects, recentResources] = await Promise.all([
      statsQuery,
      recentItemsQuery,
      pinnedProjectsQuery,
      recentResourcesQuery,
    ]);

    return NextResponse.json({
      profile: { id: auth.profile.id, displayName: auth.profile.displayName },
      stats: statsRows[0] ?? DASHBOARD_STATS_DEFAULT,
      recentItems,
      pinnedProjects,
      recentResources,
    }, { headers: NO_STORE_HEADERS });
  } catch {
    console.error('Owner dashboard data query temporarily unavailable');
    return NextResponse.json(
      { error: 'Không thể tải bảng điều khiển lúc này.', code: 'DASHBOARD_UNAVAILABLE' },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }
}
