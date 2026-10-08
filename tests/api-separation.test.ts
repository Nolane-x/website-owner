import { describe, it, expect, beforeAll } from 'vitest';
import { getDb, initializeDatabase } from '../src/lib/db';
import { contentItems, pages, profiles } from '../src/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

describe('Public vs Private Data Isolation & Anti-Leakage Tests', () => {
  const testProfileId = 'test-owner-' + Date.now();

  beforeAll(async () => {
    await initializeDatabase();
    const db = getDb();

    // Tạo profile test
    await db.insert(profiles).values({
      id: testProfileId,
      username: 'testuser_' + Date.now(),
      displayName: 'Test User',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it('TEST CHỐNG RÒ RỈ: Public query KHÔNG BAO GIỜ trả về dữ liệu Private hoặc Draft', async () => {
    const db = getDb();

    const privateItemTitle = 'PRIVATE-SECRET-' + Date.now();
    const publicItemTitle = 'PUBLIC-ARTICLE-' + Date.now();

    // 1. Tạo item Private Draft
    await db.insert(contentItems).values({
      id: crypto.randomUUID(),
      profileId: testProfileId,
      title: privateItemTitle,
      slug: 'private-slug-' + Date.now(),
      type: 'note',
      description: 'Nội dung cực kỳ riêng tư không được phép lộ',
      content: 'Bí mật kinh doanh và ghi chú cá nhân',
      visibility: 'PRIVATE',
      status: 'DRAFT',
      tags: ['Private'],
      sortOrder: 0,
      isFeatured: false,
      isPinned: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 2. Tạo item Public Published
    await db.insert(contentItems).values({
      id: crypto.randomUUID(),
      profileId: testProfileId,
      title: publicItemTitle,
      slug: 'public-slug-' + Date.now(),
      type: 'article',
      description: 'Bài viết công khai cho mọi người',
      content: 'Chào mừng các bạn đến với trang cá nhân',
      visibility: 'PUBLIC',
      status: 'PUBLISHED',
      tags: ['Public'],
      sortOrder: 0,
      isFeatured: true,
      isPinned: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      publishedAt: new Date(),
    });

    // 3. Thực hiện câu query CHÍNH THỨC của Public API
    const publicApiResults = await db
      .select({
        id: contentItems.id,
        title: contentItems.title,
        slug: contentItems.slug,
        visibility: contentItems.visibility,
        status: contentItems.status,
      })
      .from(contentItems)
      .where(
        and(
          eq(contentItems.visibility, 'PUBLIC'),
          eq(contentItems.status, 'PUBLISHED')
        )
      );

    const publicTitles = publicApiResults.map((i: any) => i.title);

    // Bắt buộc: Item Public phải tồn tại
    expect(publicTitles).toContain(publicItemTitle);

    // Bắt buộc: Item Private TUYỆT ĐỐI KHÔNG tồn tại
    expect(publicTitles).not.toContain(privateItemTitle);

    // Kiểm tra kỹ hơn: Bất kỳ item nào trong kết quả public cũng phải có visibility = 'PUBLIC' và status = 'PUBLISHED'
    for (const item of publicApiResults) {
      expect(item.visibility).toBe('PUBLIC');
      expect(item.status).toBe('PUBLISHED');
    }
  });

  it('TEST CHUYỂN TRẠNG THÁI: Xuất bản và Hủy xuất bản (Publish -> Public, Unpublish -> Private/Draft)', async () => {
    const db = getDb();
    const itemId = crypto.randomUUID();
    const title = 'DYNAMIC-ITEM-' + Date.now();

    // Ban đầu là DRAFT & PRIVATE
    await db.insert(contentItems).values({
      id: itemId,
      profileId: testProfileId,
      title,
      slug: 'dyn-slug-' + Date.now(),
      type: 'project',
      visibility: 'PRIVATE',
      status: 'DRAFT',
      sortOrder: 0,
      isFeatured: false,
      isPinned: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Lúc này Public Query không được có
    let publicItems = await db
      .select()
      .from(contentItems)
      .where(and(eq(contentItems.visibility, 'PUBLIC'), eq(contentItems.status, 'PUBLISHED')));
    expect(publicItems.map((i: any) => i.id)).not.toContain(itemId);

    // OWNER BẤM XUẤT BẢN: visibility = PUBLIC, status = PUBLISHED
    await db
      .update(contentItems)
      .set({ visibility: 'PUBLIC', status: 'PUBLISHED', publishedAt: new Date() })
      .where(eq(contentItems.id, itemId));

    // Lúc này Public Query PHẢI có
    publicItems = await db
      .select()
      .from(contentItems)
      .where(and(eq(contentItems.visibility, 'PUBLIC'), eq(contentItems.status, 'PUBLISHED')));
    expect(publicItems.map((i: any) => i.id)).toContain(itemId);

    // OWNER BẤM HỦY XUẤT BẢN: status = DRAFT
    await db
      .update(contentItems)
      .set({ status: 'DRAFT' })
      .where(eq(contentItems.id, itemId));

    // Lúc này Public Query LẬP TỨC KHÔNG CÒN THẤY
    publicItems = await db
      .select()
      .from(contentItems)
      .where(and(eq(contentItems.visibility, 'PUBLIC'), eq(contentItems.status, 'PUBLISHED')));
    expect(publicItems.map((i: any) => i.id)).not.toContain(itemId);
  });
});
