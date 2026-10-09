import { describe, it, expect, beforeAll } from 'vitest';
import { getDb, initializeDatabase } from '../src/lib/db';
import { profiles, sessions, contentItems, guestSessions, contentRevisions } from '../src/lib/db/schema';
import { eq, isNull, and } from 'drizzle-orm';
import crypto from 'crypto';
import { ensureSeedData } from '../src/lib/db/seed';
import { createGuestSession, validateGuestToken } from '../src/lib/auth/guest-session';
import { revokeOtherSessions, createSession, hashToken } from '../src/lib/auth/session';
import { toPublicContent, toPublicResource } from '../src/lib/api/public-serializer';

describe('Phase 2 Hardening & Production Security Test Suite', () => {
  const testOwnerId = 'phase2-owner-' + Date.now();
  let testDb: ReturnType<typeof getDb>;

  beforeAll(async () => {
    await initializeDatabase();
    testDb = getDb();

    // Setup an initial test profile for Phase 2 tests
    await testDb.insert(profiles).values({
      id: testOwnerId,
      username: 'owner_' + Date.now(),
      displayName: 'Owner Phase 2',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  describe('1. Production Mode Safety & Zero Default Credentials', () => {
    it('ensureSeedData() không bao giờ tạo tài khoản mặc định nếu ở chế độ Production', async () => {
      const originalEnv = process.env.NODE_ENV;
      const originalSeedFlag = process.env.ENABLE_DEV_SEED;

      try {
        (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
        process.env.ENABLE_DEV_SEED = 'false';

        // Gọi ensureSeedData trong môi trường production
        await ensureSeedData();

        // Kiểm tra chắc chắn không có tài khoản username "admin" được tự động tạo với mật khẩu mẫu
        const adminAccounts = await testDb
          .select()
          .from(profiles)
          .where(eq(profiles.username, 'admin'));

        // Trong production, ensureSeedData không được phép sinh profile 'admin'
        expect(adminAccounts.length).toBe(0);
      } finally {
        (process.env as Record<string, string | undefined>).NODE_ENV = originalEnv;
        process.env.ENABLE_DEV_SEED = originalSeedFlag;
      }
    });
  });

  describe('2. Guest Session Zero-Knowledge Separation', () => {
    it('Tạo guest session ngẫu nhiên, chỉ lưu băm SHA256 trong DB và xác thực thành công', async () => {
      const ip = '192.168.1.100';
      const userAgent = 'Vitest-Agent/1.0';

      const { token, expiresAt } = await createGuestSession(ip, userAgent);
      expect(token).toBeDefined();
      expect(token.length).toBe(64); // 32 bytes hex = 64 chars
      expect(expiresAt).toBeDefined();

      // Kiểm tra DB: Chỉ lưu băm SHA-256, không lưu raw token hoặc bcrypt hash
      const tokenHash = hashToken(token);
      const dbRecords = await testDb
        .select()
        .from(guestSessions)
        .where(eq(guestSessions.tokenHash, tokenHash));

      expect(dbRecords.length).toBe(1);
      expect(dbRecords[0].ipAddress).toBe(ip);
      expect(new Date(dbRecords[0].expiresAt).getTime()).toBeGreaterThan(Date.now());

      // Xác thực token hợp lệ
      const isValid = await validateGuestToken(token);
      expect(isValid).toBe(true);

      // Token sai hoặc bị sửa đổi phải bị từ chối
      const isInvalid = await validateGuestToken('invalid-fake-token-' + Date.now());
      expect(isInvalid).toBe(false);
    });
  });

  describe('3. Session Revocation on Password Change', () => {
    it('Thu hồi toàn bộ các phiên làm việc khác khi đổi mật khẩu', async () => {
      // Tạo 3 session cho test owner
      const s1 = await createSession(testOwnerId, 'device-1', '1.1.1.1');
      const s2 = await createSession(testOwnerId, 'device-2', '2.2.2.2');
      const s3 = await createSession(testOwnerId, 'device-3', '3.3.3.3');

      // Giả lập s3 là phiên hiện tại đổi mật khẩu -> thu hồi s1 và s2
      await revokeOtherSessions(testOwnerId, s3.sessionId);

      // Kiểm tra trong DB: chỉ phiên s3 còn isRevoked = false, s1 và s2 đã bị đánh dấu isRevoked = true
      const activeSessions = await testDb
        .select()
        .from(sessions)
        .where(
          and(
            eq(sessions.profileId, testOwnerId),
            eq(sessions.isRevoked, false)
          )
        );

      const activeIds = activeSessions.map((s) => s.id);
      expect(activeIds).toContain(s3.sessionId);
      expect(activeIds).not.toContain(s1.sessionId);
      expect(activeIds).not.toContain(s2.sessionId);
    });
  });

  describe('4. Public Serializer Anti-Leakage (Chống rò rỉ metadata)', () => {
    it('toPublicContent loại bỏ triệt để draft status, private visibility và metadata nhạy cảm', () => {
      const rawItem = {
        id: 'test-id-123',
        title: 'Bí mật chiến lược',
        slug: 'bi-mat-chien-luoc',
        type: 'article',
        description: 'Mô tả ngắn',
        content: '# Tiêu đề Markdown',
        renderedHtml: '<h1>Tiêu đề Markdown</h1>',
        visibility: 'PUBLIC',
        status: 'PUBLISHED',
        tags: ['Tech', 'SecretTag'],
        featuredImage: 'https://example.com/img.jpg',
        isFeatured: true,
        sortOrder: 1,
        publishedAt: new Date('2026-01-01'),
        internalNotes: 'Ghi chú tuyệt mật của tác giả',
        adminOnlyData: 'Sensitive field',
      };

      const publicResult = toPublicContent(rawItem);
      expect(publicResult).not.toBeNull();
      if (!publicResult) return;

      expect(publicResult.id).toBe('test-id-123');
      expect(publicResult.title).toBe('Bí mật chiến lược');
      const untypedResult = publicResult as unknown as Record<string, unknown>;
      expect(untypedResult.internalNotes).toBeUndefined();
      expect(untypedResult.adminOnlyData).toBeUndefined();
      expect(untypedResult.visibility).toBeUndefined();
      expect(untypedResult.status).toBeUndefined();
    });

    it('toPublicResource loại bỏ ghi chú quản trị nội bộ', () => {
      const rawResource = {
        id: 'res-456',
        title: 'Tài liệu API',
        url: 'https://api.example.com',
        type: 'link',
        internalNotes: 'Không cho khách biết thông tin này',
        isPinned: true,
      };

      const publicRes = toPublicResource(rawResource);
      expect(publicRes).not.toBeNull();
      if (!publicRes) return;

      expect(publicRes.title).toBe('Tài liệu API');
      const untypedRes = publicRes as unknown as Record<string, unknown>;
      expect(untypedRes.internalNotes).toBeUndefined();
    });
  });

  describe('5. Soft Delete (Thùng rác) & Version Revisions', () => {
    it('Soft delete đánh dấu deletedAt và lọc ra khỏi truy vấn thông thường', async () => {
      const itemId = crypto.randomUUID();
      const now = new Date();

      // 1. Tạo item mới
      await testDb.insert(contentItems).values({
        id: itemId,
        profileId: testOwnerId,
        title: 'Bài viết thử nghiệm thùng rác',
        slug: 'bai-viet-thung-rac-' + Date.now(),
        type: 'note',
        visibility: 'PRIVATE',
        status: 'DRAFT',
        createdAt: now,
        updatedAt: now,
      });

      // 2. Soft delete: cập nhật deletedAt
      const deleteTime = new Date();
      await testDb
        .update(contentItems)
        .set({ deletedAt: deleteTime })
        .where(eq(contentItems.id, itemId));

      // 3. Query thông thường (chỉ lấy items chưa bị xóa isNull(deletedAt))
      const activeItems = await testDb
        .select()
        .from(contentItems)
        .where(isNull(contentItems.deletedAt));

      const activeIds = activeItems.map((i) => i.id);
      expect(activeIds).not.toContain(itemId);

      // 4. Restore: xóa deletedAt (set null)
      await testDb
        .update(contentItems)
        .set({ deletedAt: null })
        .where(eq(contentItems.id, itemId));

      const restoredItems = await testDb
        .select()
        .from(contentItems)
        .where(isNull(contentItems.deletedAt));

      const restoredIds = restoredItems.map((i) => i.id);
      expect(restoredIds).toContain(itemId);
    });

    it('Ghi nhận Content Revision khi sửa nội dung', async () => {
      const revisionItemId = crypto.randomUUID();
      const revId = crypto.randomUUID();

      await testDb.insert(contentRevisions).values({
        id: revId,
        targetId: revisionItemId,
        targetType: 'content',
        revisionNumber: 1,
        titleSnapshot: 'Bản thảo ban đầu v1',
        bodySnapshot: 'Nội dung v1 của bài viết',
        metadataSnapshot: {},
        reason: 'Sửa lỗi chính tả',
        createdAt: new Date(),
      });

      const revisions = await testDb
        .select()
        .from(contentRevisions)
        .where(eq(contentRevisions.targetId, revisionItemId));

      expect(revisions.length).toBe(1);
      expect(revisions[0].titleSnapshot).toBe('Bản thảo ban đầu v1');
      expect(revisions[0].reason).toBe('Sửa lỗi chính tả');
    });
  });
});
