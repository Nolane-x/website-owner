import { getDb, initializeDatabase } from '@/lib/db';
import { contentItems, contentLinks } from '@/lib/db/schema';
import { eq, and, or, inArray } from 'drizzle-orm';
import crypto from 'crypto';

/**
 * Trích xuất danh sách tiêu đề được trích dẫn theo cú pháp [[Tên Tài Liệu]]
 */
export function parseWikiLinks(markdown: string): string[] {
  if (!markdown || typeof markdown !== 'string') return [];

  const regex = /\[\[(.*?)\]\]/g;
  const links: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(markdown)) !== null) {
    const raw = match[1]?.trim();
    if (raw && !links.includes(raw)) {
      links.push(raw);
    }
  }

  return links;
}

/**
 * Đồng bộ hóa các liên kết 2 chiều vào bảng content_links
 */
export async function syncContentLinks(
  profileId: string,
  sourceId: string,
  content: string
): Promise<void> {
  const linkTitles = parseWikiLinks(content);
  await initializeDatabase();
  const db = getDb();

  // Xóa các liên kết cũ xuất phát từ sourceId
  await db.delete(contentLinks).where(eq(contentLinks.sourceId, sourceId));

  if (linkTitles.length === 0) return;

  // Tìm các mục đích có tiêu đề hoặc slug trùng khớp
  const targets = await db
    .select({
      id: contentItems.id,
      title: contentItems.title,
      slug: contentItems.slug,
    })
    .from(contentItems)
    .where(
      and(
        eq(contentItems.profileId, profileId),
        or(
          inArray(contentItems.title, linkTitles),
          inArray(contentItems.slug, linkTitles)
        )
      )
    );

  const newLinks = targets
    .filter((t) => t.id !== sourceId) // Không tự liên kết chính mình
    .map((target) => ({
      id: 'clink-' + crypto.randomUUID(),
      sourceId,
      targetId: target.id,
      linkText: target.title,
    }));

  if (newLinks.length > 0) {
    await db.insert(contentLinks).values(newLinks);
  }
}
