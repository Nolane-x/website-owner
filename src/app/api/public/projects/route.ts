import { NextResponse } from 'next/server';
import { getDb, initializeDatabase } from '@/lib/db';
import { contentItems } from '@/lib/db/schema';
import { eq, and, desc, isNull, sql } from 'drizzle-orm';
import { checkPublicAccessProtection } from '@/lib/auth/guard';
import { getPublicApiCacheHeaders } from '@/lib/security/public-api-cache';
import { checkPublicApiRateLimit } from '@/lib/security/public-api-guard';
import { toPublicProjectSummary } from '@/lib/api/public-serializer';
import { MAX_PUBLIC_TAGS_BYTES, MAX_PUBLIC_RESOURCE_METADATA_BYTES, MAX_PUBLIC_TECH_STACK_BYTES, MAX_PUBLIC_STATUS_BYTES, MAX_PUBLIC_YEAR_BYTES } from '@/lib/security/public-egress-limits';

function boundedLimit(raw: string | null, fallback = 50): number {
  if (raw === null || raw.trim() === '') return fallback;
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed)) return fallback;
  return Math.min(100, Math.max(1, parsed));
}

export async function GET(req: Request) {
  try {
    const rateLimitResponse = checkPublicApiRateLimit(req, 'projects', 40);
    if (rateLimitResponse) return rateLimitResponse;
    const access = await checkPublicAccessProtection();
    if (access.requirePassword && !access.hasValidGuestSession) {
      return NextResponse.json({ error: 'Yêu cầu mật mã truy cập.' }, { status: 403 });
    }

    await initializeDatabase();
    const db = getDb();
    const limit = boundedLimit(new URL(req.url).searchParams.get('limit'));

    // List pages only need card fields. Avoid pulling full article bodies, embedded
    // base64 covers, private tokens, and unrelated metadata from PostgreSQL.
    const rawProjects = await db
      .select({
        id: contentItems.id,
        title: contentItems.title,
        slug: contentItems.slug,
        description: sql<string | null>`left(${contentItems.description}, 320)`,

        category: contentItems.category,
        tags: sql<string[]>`CASE WHEN OCTET_LENGTH(${contentItems.tags}::text) <= ${MAX_PUBLIC_TAGS_BYTES} THEN ${contentItems.tags} ELSE '[]'::jsonb END`,
        sortOrder: contentItems.sortOrder,
        isFeatured: contentItems.isFeatured,
        publishedAt: contentItems.publishedAt,
        metadata: sql<Record<string, unknown>>`jsonb_strip_nulls(jsonb_build_object(
          'repoUrl', CASE WHEN OCTET_LENGTH(COALESCE((${contentItems.metadata} -> 'repoUrl')::text, '')) <= ${MAX_PUBLIC_RESOURCE_METADATA_BYTES} THEN ${contentItems.metadata} -> 'repoUrl' ELSE NULL END,
          'demoUrl', CASE WHEN OCTET_LENGTH(COALESCE((${contentItems.metadata} -> 'demoUrl')::text, '')) <= ${MAX_PUBLIC_RESOURCE_METADATA_BYTES} THEN ${contentItems.metadata} -> 'demoUrl' ELSE NULL END,
          'techStack', CASE WHEN OCTET_LENGTH(COALESCE((${contentItems.metadata} -> 'techStack')::text, '')) <= ${MAX_PUBLIC_TECH_STACK_BYTES} THEN ${contentItems.metadata} -> 'techStack' ELSE NULL END,
          'status', CASE WHEN OCTET_LENGTH(COALESCE((${contentItems.metadata} -> 'status')::text, '')) <= ${MAX_PUBLIC_STATUS_BYTES} THEN ${contentItems.metadata} -> 'status' ELSE NULL END,
          'year', CASE WHEN OCTET_LENGTH(COALESCE((${contentItems.metadata} -> 'year')::text, '')) <= ${MAX_PUBLIC_YEAR_BYTES} THEN ${contentItems.metadata} -> 'year' ELSE NULL END
        ))`,
      })
      .from(contentItems)
      .where(and(
        eq(contentItems.type, 'project'),
        eq(contentItems.visibility, 'PUBLIC'),
        eq(contentItems.status, 'PUBLISHED'),
        isNull(contentItems.deletedAt),
      ))
      .orderBy(desc(contentItems.isPinned), desc(contentItems.publishedAt))
      .limit(limit);

    const projects = rawProjects.map((item) =>
      toPublicProjectSummary(item as unknown as Record<string, unknown>),
    ).filter((item): item is NonNullable<typeof item> => item !== null);

    return NextResponse.json({ projects }, { headers: getPublicApiCacheHeaders(access) });
  } catch (error) {
    console.error('Lỗi API public projects:', error);
    return NextResponse.json({ error: 'Không thể tải danh sách dự án.' }, { status: 500 });
  }
}
