import { NextRequest, NextResponse } from 'next/server';
import { getDb, initializeDatabase } from '@/lib/db';
import { contentItems, pages, contentBlocks, collections, collectionItems } from '@/lib/db/schema';
import { eq, and, isNull, asc, sql } from 'drizzle-orm';
import { checkPublicAccessProtection } from '@/lib/auth/guard';
import { checkPublicApiRateLimit } from '@/lib/security/public-api-guard';
import { toPublicContent, toPublicPage, toPublicBlock, toPublicCollection } from '@/lib/api/public-serializer';
import {
  exceedsByteLimit,
  MAX_PUBLIC_CONTENT_BYTES,
  MAX_PUBLIC_PAGE_BLOCK_BYTES,
  MAX_PUBLIC_METADATA_SUMMARY_BYTES,
  MAX_PUBLIC_METADATA_TOC_BYTES,
} from '@/lib/security/public-egress-limits';

export async function GET(
  req: NextRequest,
  segmentData: { params: Promise<{ shareToken: string }> }
) {
  try {
    const rateLimitResponse = checkPublicApiRateLimit(req, 'unlisted-share', 30);
    if (rateLimitResponse) return rateLimitResponse;
    // F2-10: Áp dụng mật khẩu bảo vệ khách đồng nhất trên toàn bộ website
    const access = await checkPublicAccessProtection();
    if (access.requirePassword && !access.hasValidGuestSession) {
      return NextResponse.json({ error: 'Yêu cầu mật mã truy cập.' }, { status: 403 });
    }

    const { shareToken } = await segmentData.params;
    if (!shareToken || shareToken.length < 8) {
      return NextResponse.json({ error: 'Liên kết không hợp lệ.' }, { status: 404 });
    }

    await initializeDatabase();
    const db = getDb();

    // 1. Thử tìm trong contentItems với visibility='UNLISTED', status='PUBLISHED' và chưa bị xóa
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
          eq(contentItems.shareToken, shareToken),
          eq(contentItems.visibility, 'UNLISTED'),
          eq(contentItems.status, 'PUBLISHED'),
          isNull(contentItems.deletedAt)
        )
      )
      .limit(1);

    if (items.length > 0) {
      if (exceedsByteLimit(items[0].contentBytes, MAX_PUBLIC_CONTENT_BYTES)) {
        return NextResponse.json(
          {
            error: 'Nội dung chia sẻ vượt giới hạn dung lượng. Hãy rút gọn nội dung hoặc chuyển hình ảnh lớn sang URL lưu trữ bên ngoài.',
            code: 'PUBLIC_CONTENT_TOO_LARGE',
          },
          {
            status: 413,
            headers: { 'Cache-Control': 'private, no-store, max-age=0' },
          },
        );
      }
      const publicItem = toPublicContent(items[0] as unknown as Record<string, unknown>);
      return NextResponse.json({ item: publicItem, itemType: 'content' }, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
    }

    // 2. Thử tìm trong pages với visibility='UNLISTED', status='PUBLISHED' và chưa bị xóa
    const pageItems = await db
      .select({
        id: pages.id,
        profileId: pages.profileId,
        title: pages.title,
        slug: pages.slug,
        description: sql<string | null>`left(${pages.description}, 320)`,
        isFeatured: pages.isFeatured,
        publishedAt: pages.publishedAt,
      })
      .from(pages)
      .where(
        and(
          eq(pages.shareToken, shareToken),
          eq(pages.visibility, 'UNLISTED'),
          eq(pages.status, 'PUBLISHED'),
          isNull(pages.deletedAt)
        )
      )
      .limit(1);

    if (pageItems.length > 0) {
      const rawPage = pageItems[0];
      const perBlockBytes = sql<number>`OCTET_LENGTH(${contentBlocks.contentJson}::text) + OCTET_LENGTH(${contentBlocks.settingsJson}::text)`;
      const cumulativeBlockBytes = sql<number>`SUM(${perBlockBytes}) OVER (ORDER BY ${contentBlocks.sortOrder}, ${contentBlocks.id} ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)`;
      const totalBlockBytes = sql<number>`SUM(${perBlockBytes}) OVER ()`;
      const rawBlocks = await db
        .select({
          id: contentBlocks.id,
          blockType: contentBlocks.blockType,
          sortOrder: contentBlocks.sortOrder,
          totalBlockBytes,
          contentJson: sql<Record<string, unknown>>`CASE WHEN ${cumulativeBlockBytes} <= ${MAX_PUBLIC_PAGE_BLOCK_BYTES} THEN ${contentBlocks.contentJson} ELSE '{}'::jsonb END`,
          settingsJson: sql<Record<string, unknown>>`CASE WHEN ${cumulativeBlockBytes} <= ${MAX_PUBLIC_PAGE_BLOCK_BYTES} THEN ${contentBlocks.settingsJson} ELSE '{}'::jsonb END`,
        })
        .from(contentBlocks)
        .where(eq(contentBlocks.pageId, rawPage.id))
        .orderBy(asc(contentBlocks.sortOrder), asc(contentBlocks.id))
        .limit(200);

      if (rawBlocks.length > 0 && exceedsByteLimit(rawBlocks[0].totalBlockBytes, MAX_PUBLIC_PAGE_BLOCK_BYTES)) {
        return NextResponse.json(
          {
            error: 'Trang công khai vượt giới hạn dung lượng. Hãy rút gọn khối nội dung hoặc chuyển hình ảnh lớn sang URL lưu trữ bên ngoài.',
            code: 'PUBLIC_PAGE_TOO_LARGE',
          },
          {
            status: 413,
            headers: { 'Cache-Control': 'private, no-store, max-age=0' },
          },
        );
      }

      const publicBlocks = rawBlocks.map((b) => toPublicBlock(b as unknown as Record<string, unknown>)).filter(Boolean);
      const publicPage = toPublicPage(rawPage as unknown as Record<string, unknown>);

      return NextResponse.json({
        item: publicPage,
        blocks: publicBlocks,
        itemType: 'page',
      }, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
    }

    // 3. Thử tìm trong collections với visibility='UNLISTED', status='PUBLISHED' và chưa bị xóa (F2-12)
    const colItems = await db
      .select({
        id: collections.id,
        profileId: collections.profileId,
        name: collections.name,
        slug: collections.slug,
        description: sql<string | null>`left(${collections.description}, 320)`,
        isFeatured: collections.isFeatured,
      })
      .from(collections)
      .where(
        and(
          eq(collections.shareToken, shareToken),
          eq(collections.visibility, 'UNLISTED'),
          eq(collections.status, 'PUBLISHED'),
          isNull(collections.deletedAt)
        )
      )
      .limit(1);

    if (colItems.length > 0) {
      const colRaw = colItems[0];
      const rawItems = await db
        .select({
          id: contentItems.id,
          title: contentItems.title,
          slug: contentItems.slug,
          type: contentItems.type,
          description: sql<string | null>`left(${contentItems.description}, 240)`,
          tags: contentItems.tags,
          category: contentItems.category,
          sortOrder: contentItems.sortOrder,
          isFeatured: contentItems.isFeatured,
          publishedAt: contentItems.publishedAt,
          createdAt: contentItems.createdAt,
        })
        .from(collectionItems)
        .innerJoin(
          contentItems,
          and(
            eq(collectionItems.contentItemId, contentItems.id),
            eq(contentItems.profileId, colRaw.profileId),
            eq(contentItems.visibility, 'PUBLIC'),
            eq(contentItems.status, 'PUBLISHED'),
            isNull(contentItems.deletedAt)
          )
        )
        .where(eq(collectionItems.collectionId, colRaw.id))
        .orderBy(asc(collectionItems.sortOrder))
        .limit(100);

      const publicCol = toPublicCollection(
        colRaw as unknown as Record<string, unknown>,
        rawItems as unknown as Array<Record<string, unknown>>
      );

      // The collection DTO already embeds its items; do not send the same list a second time.
      return NextResponse.json({
        item: publicCol,
        itemType: 'collection',
      }, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
    }

    return NextResponse.json({ error: 'Nội dung chia sẻ không tồn tại hoặc đã bị thu hồi.' }, { status: 404 });
  } catch (error) {
    console.error('Lỗi lấy nội dung unlisted:', error);
    return NextResponse.json({ error: 'Không thể tải nội dung chia sẻ.' }, { status: 500 });
  }
}
