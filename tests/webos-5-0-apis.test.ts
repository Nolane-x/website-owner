import { describe, it, expect } from 'vitest';
import { getDb, initializeDatabase } from '../src/lib/db';
import {
  profiles,
  inboxItems,
  customWallpapers,
  researchSources,
  claims,
  decisionRecords,
} from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

describe('Web OS 5.0 Database Operations (Inbox, Wallpapers, Research, Decisions)', () => {
  it('tạo và truy vấn mục trong Universal Capture Inbox', async () => {
    await initializeDatabase();
    const db = getDb();

    let [profile] = await db.select().from(profiles).limit(1);
    if (!profile) {
      const pid = 'test-prof-' + crypto.randomUUID();
      await db.insert(profiles).values({
        id: pid,
        username: 'test_owner_' + Date.now(),
        displayName: 'Test Owner',
      });
      [profile] = await db.select().from(profiles).where(eq(profiles.id, pid));
    }

    const inboxId = 'inbox-' + crypto.randomUUID();
    await db.insert(inboxItems).values({
      id: inboxId,
      profileId: profile.id,
      title: 'Ý tưởng xây dựng AI Copilot Dock',
      kind: 'text',
      textPreview: 'Tích hợp mô hình Ollama và Groq',
      status: 'inbox',
      tagsJson: ['ai', 'idea'],
    });

    const [found] = await db.select().from(inboxItems).where(eq(inboxItems.id, inboxId));
    expect(found).toBeDefined();
    expect(found.title).toBe('Ý tưởng xây dựng AI Copilot Dock');
    expect(found.status).toBe('inbox');
    expect(found.tagsJson).toContain('ai');

    // Cập nhật trạng thái sang converted
    await db.update(inboxItems).set({ status: 'converted' }).where(eq(inboxItems.id, inboxId));
    const [updated] = await db.select().from(inboxItems).where(eq(inboxItems.id, inboxId));
    expect(updated.status).toBe('converted');

    // Cleanup
    await db.delete(inboxItems).where(eq(inboxItems.id, inboxId));
  });

  it('tạo và quản lý hình nền tùy chỉnh Custom Wallpaper Studio', async () => {
    await initializeDatabase();
    const db = getDb();

    let [profile] = await db.select().from(profiles).limit(1);
    if (!profile) {
      const pid = 'test-prof-' + crypto.randomUUID();
      await db.insert(profiles).values({
        id: pid,
        username: 'test_owner_' + Date.now(),
        displayName: 'Test Owner',
      });
      [profile] = await db.select().from(profiles).where(eq(profiles.id, pid));
    }

    const wpId = 'wp-' + crypto.randomUUID();
    await db.insert(customWallpapers).values({
      id: wpId,
      profileId: profile.id,
      title: 'Cyberpunk Neon City Live Video',
      sourceUrl: 'https://example.com/neon-city.mp4',
      type: 'video',
      tagsJson: ['cyberpunk', 'neon'],
      filtersJson: { dim: 30, blur: 10, contrast: 110, vignette: true },
      isFavorite: true,
    });

    const [found] = await db.select().from(customWallpapers).where(eq(customWallpapers.id, wpId));
    expect(found).toBeDefined();
    expect(found.title).toBe('Cyberpunk Neon City Live Video');
    expect(found.type).toBe('video');
    expect(found.filtersJson.dim).toBe(30);
    expect(found.isFavorite).toBe(true);

    // Cleanup
    await db.delete(customWallpapers).where(eq(customWallpapers.id, wpId));
  });

  it('quản lý kho nguồn nghiên cứu và bằng chứng (Research & Claims)', async () => {
    await initializeDatabase();
    const db = getDb();

    let [profile] = await db.select().from(profiles).limit(1);
    if (!profile) {
      const pid = 'test-prof-' + crypto.randomUUID();
      await db.insert(profiles).values({
        id: pid,
        username: 'test_owner_' + Date.now(),
        displayName: 'Test Owner',
      });
      [profile] = await db.select().from(profiles).where(eq(profiles.id, pid));
    }

    const srcId = 'src-' + crypto.randomUUID();
    await db.insert(researchSources).values({
      id: srcId,
      profileId: profile.id,
      title: 'Tài liệu kiến trúc WebGPU và Canvas Shaders',
      url: 'https://developer.mozilla.org',
      author: 'MDN',
      excerpt: 'Hướng dẫn tối ưu hóa hiệu năng render đồ họa',
      status: 'read',
      tagsJson: ['webgpu', 'graphics'],
    });

    const claimId = 'claim-' + crypto.randomUUID();
    await db.insert(claims).values({
      id: claimId,
      profileId: profile.id,
      statement: 'Shaders trên Canvas giảm tải CPU đáng kể so với DOM animation',
      status: 'supported',
      sourceIdsJson: [srcId],
      notes: 'Đã benchmark trên máy test',
    });

    const [foundSource] = await db.select().from(researchSources).where(eq(researchSources.id, srcId));
    expect(foundSource).toBeDefined();
    expect(foundSource.status).toBe('read');

    const [foundClaim] = await db.select().from(claims).where(eq(claims.id, claimId));
    expect(foundClaim).toBeDefined();
    expect(foundClaim.status).toBe('supported');
    expect(foundClaim.sourceIdsJson).toContain(srcId);

    // Cleanup
    await db.delete(claims).where(eq(claims.id, claimId));
    await db.delete(researchSources).where(eq(researchSources.id, srcId));
  });

  it('ghi chép và quản lý quyết định dự án (Decision Records / RFC)', async () => {
    await initializeDatabase();
    const db = getDb();

    let [profile] = await db.select().from(profiles).limit(1);
    if (!profile) {
      const pid = 'test-prof-' + crypto.randomUUID();
      await db.insert(profiles).values({
        id: pid,
        username: 'test_owner_' + Date.now(),
        displayName: 'Test Owner',
      });
      [profile] = await db.select().from(profiles).where(eq(profiles.id, pid));
    }

    const decId = 'dec-' + crypto.randomUUID();
    await db.insert(decisionRecords).values({
      id: decId,
      profileId: profile.id,
      title: 'Áp dụng Virtual Window Manager cho Web OS 5.0',
      context: 'Cần môi trường đa nhiệm thực thụ cho người dùng điều hành số',
      decision: 'Xây dựng Window Manager Context hỗ trợ Drag, Resize, Snap và Minimize',
      consequences: 'Tăng trải nghiệm đa nhiệm nhưng cần quản lý z-index và memory viewport chặt chẽ',
      status: 'accepted',
    });

    const [found] = await db.select().from(decisionRecords).where(eq(decisionRecords.id, decId));
    expect(found).toBeDefined();
    expect(found.title).toContain('Virtual Window Manager');
    expect(found.status).toBe('accepted');

    // Cleanup
    await db.delete(decisionRecords).where(eq(decisionRecords.id, decId));
  });
});
