import { NextRequest, NextResponse } from 'next/server';
import { getDb, initializeDatabase } from '@/lib/db';
import { contentItems } from '@/lib/db/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { checkPublicAccessProtection } from '@/lib/auth/guard';
import { getPublicApiCacheHeaders } from '@/lib/security/public-api-cache';
import { checkPublicApiRateLimit } from '@/lib/security/public-api-guard';
import { toPublicContent } from '@/lib/api/public-serializer';
import {
  exceedsByteLimit,
  MAX_PUBLIC_CONTENT_BYTES,
  MAX_PUBLIC_METADATA_SUMMARY_BYTES,
  MAX_PUBLIC_METADATA_TOC_BYTES,
} from '@/lib/security/public-egress-limits';

export async function GET(
  req: NextRequest,
  segmentData: { params: Promise<{ slug: string }> }
) {
  try {
    const rateLimitResponse = checkPublicApiRateLimit(req, 'content-detail', 60);
    if (rateLimitResponse) return rateLimitResponse;
    const access = await checkPublicAccessProtection();
    if (access.requirePassword && !access.hasValidGuestSession) {
      return NextResponse.json({ error: 'Yêu cầu mật mã truy cập.' }, { status: 403 });
    }

    const { slug } = await segmentData.params;
    await initializeDatabase();
    const db = getDb();

    // PUB-01 & PUB-11: CHỈ QUERY NỘI DUNG PUBLIC, PUBLISHED VÀ KHÔNG BỊ XÓA (NOT DELETED)
    const items = await db
      .select({
        id: contentItems.id,
        title: contentItems.title,
        slug: contentItems.slug,
        type: contentItems.type,
        description: sql<string | null>`left(${contentItems.description}, 320)`,
        content: sql<string | null>`CASE WHEN OCTET_LENGTH(COALESCE(${contentItems.content}, '')) <= ${MAX_PUBLIC_CONTENT_BYTES} THEN ${contentItems.content} ELSE NULL END`,
        contentBytes: sql<number>`OCTET_LENGTH(COALESCE(${contentItems.content}, ''))`,
        category: contentItems.category,
        tags: contentItems.tags,
        sortOrder: contentItems.sortOrder,
        isFeatured: contentItems.isFeatured,
        publishedAt: contentItems.publishedAt,
        createdAt: contentItems.createdAt,
        metadata: sql<Record<string, unknown>>`jsonb_strip_nulls(jsonb_build_object(
          'readingTime', ${contentItems.metadata} -> 'readingTime',
          'author', ${contentItems.metadata} -> 'author',
          'license', ${contentItems.metadata} -> 'license',
          'canonicalUrl', ${contentItems.metadata} -> 'canonicalUrl',
          'summary', CASE WHEN OCTET_LENGTH(COALESCE((${contentItems.metadata} -> 'summary')::text, '')) <= ${MAX_PUBLIC_METADATA_SUMMARY_BYTES} THEN ${contentItems.metadata} -> 'summary' ELSE NULL END,
          'toc', CASE WHEN OCTET_LENGTH(COALESCE((${contentItems.metadata} -> 'toc')::text, '')) <= ${MAX_PUBLIC_METADATA_TOC_BYTES} THEN ${contentItems.metadata} -> 'toc' ELSE NULL END
        ))`,
      })
      .from(contentItems)
      .where(
        and(
          eq(contentItems.slug, slug),
          eq(contentItems.visibility, 'PUBLIC'),
          eq(contentItems.status, 'PUBLISHED'),
          isNull(contentItems.deletedAt)
        )
      )
      .limit(1);

    if (items.length === 0) {
      // 404 bảo mật: Không tiết lộ nếu slug đó có tồn tại ở dạng Private/Draft
      return NextResponse.json({ error: 'Nội dung không tồn tại hoặc chưa được xuất bản.' }, { status: 404 });
    }

    if (exceedsByteLimit(items[0].contentBytes, MAX_PUBLIC_CONTENT_BYTES)) {
      return NextResponse.json(
        {
          error: 'Nội dung công khai vượt giới hạn dung lượng. Hãy rút gọn nội dung hoặc chuyển hình ảnh lớn sang URL lưu trữ bên ngoài.',
          code: 'PUBLIC_CONTENT_TOO_LARGE',
        },
        {
          status: 413,
          headers: { 'Cache-Control': 'private, no-store, max-age=0' },
        },
      );
    }

    const publicItem = toPublicContent(items[0] as unknown as Record<string, unknown>);
    if (!publicItem) {
      return NextResponse.json({ error: 'Nội dung không tồn tại hoặc chưa được xuất bản.' }, { status: 404 });
    }

    return NextResponse.json({ item: publicItem }, { headers: getPublicApiCacheHeaders(access) });
  } catch (error) {
    console.error('Lỗi lấy bài viết công khai:', error);
    return NextResponse.json({ error: 'Không thể tải nội dung.' }, { status: 500 });
  }
}
