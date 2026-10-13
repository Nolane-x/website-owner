import { NextRequest, NextResponse } from 'next/server';
import { getDb, initializeDatabase } from '@/lib/db';
import { pages, contentBlocks } from '@/lib/db/schema';
import { eq, and, asc, isNull, sql } from 'drizzle-orm';
import { checkPublicAccessProtection } from '@/lib/auth/guard';
import { getPublicApiCacheHeaders } from '@/lib/security/public-api-cache';
import { checkPublicApiRateLimit } from '@/lib/security/public-api-guard';
import { toPublicPage, toPublicBlock } from '@/lib/api/public-serializer';
import { exceedsByteLimit, MAX_PUBLIC_PAGE_BLOCK_BYTES } from '@/lib/security/public-egress-limits';

export async function GET(
  req: NextRequest,
  segmentData: { params: Promise<{ slug: string }> }
) {
  try {
    const rateLimitResponse = checkPublicApiRateLimit(req, 'page-detail', 60);
    if (rateLimitResponse) return rateLimitResponse;
    const access = await checkPublicAccessProtection();
    if (access.requirePassword && !access.hasValidGuestSession) {
      return NextResponse.json({ error: 'Yêu cầu mật mã truy cập.' }, { status: 403 });
    }

    const { slug } = await segmentData.params;
    await initializeDatabase();
    const db = getDb();

    // CHỈ QUERY TRANG CÔNG KHAI, ĐÃ XUẤT BẢN VÀ CHƯA BỊ XÓA (SOFT DELETE)
    const pageResult = await db
      .select({
        id: pages.id,
        title: pages.title,
        slug: pages.slug,
        description: sql<string | null>`left(${pages.description}, 320)`,
        isFeatured: pages.isFeatured,
        publishedAt: pages.publishedAt,
      })
      .from(pages)
      .where(
        and(
          eq(pages.slug, slug),
          eq(pages.visibility, 'PUBLIC'),
          eq(pages.status, 'PUBLISHED'),
          isNull(pages.deletedAt)
        )
      )
      .limit(1);

    if (pageResult.length === 0) {
      return NextResponse.json({ error: 'Trang không tồn tại hoặc chưa được xuất bản.' }, { status: 404 });
    }

    const pageRaw = pageResult[0];

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
      .where(eq(contentBlocks.pageId, pageRaw.id))
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
    const publicPage = toPublicPage(pageRaw as unknown as Record<string, unknown>);

    return NextResponse.json({
      page: publicPage,
      blocks: publicBlocks,
    }, { headers: getPublicApiCacheHeaders(access) });
  } catch (error) {
    console.error('Lỗi API public page:', error);
    return NextResponse.json({ error: 'Không thể tải trang.' }, { status: 500 });
  }
}
