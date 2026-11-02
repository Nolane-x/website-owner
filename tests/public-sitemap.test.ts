import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { getDb, initializeDatabase } from '@/lib/db';
import { collections, contentItems, pages, profiles } from '@/lib/db/schema';
import { generatePublicSitemap } from '@/app/sitemap';

describe('public sitemap privacy boundary', () => {
  const suffix = randomUUID();
  const previousSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const origin = 'https://sitemap-test.example';
  const profileId = 'sitemap-test-' + suffix;
  const createdAt = new Date('2026-11-02T00:00:00.000Z');

  const publicArticleSlug = 'public-article-' + suffix;
  const privateArticleSlug = 'private-article-' + suffix;
  const draftArticleSlug = 'draft-article-' + suffix;
  const unlistedArticleSlug = 'unlisted-article-' + suffix;
  const deletedArticleSlug = 'deleted-article-' + suffix;
  const publicProjectSlug = 'public-project-' + suffix;
  const publicResourceSlug = 'public-resource-' + suffix;
  const publicPageSlug = 'public-page-' + suffix;
  const privatePageSlug = 'private-page-' + suffix;
  const publicCollectionSlug = 'public-collection-' + suffix;
  const privateCollectionSlug = 'private-collection-' + suffix;
  let initialized = false;

  beforeAll(async () => {
    process.env.NEXT_PUBLIC_SITE_URL = origin;
    await initializeDatabase();
    initialized = true;

    const db = getDb();
    await db.insert(profiles).values({
      id: profileId,
      username: 'sitemap_' + suffix.slice(0, 8),
      displayName: 'Public Sitemap Test',
      createdAt,
      updatedAt: createdAt,
    });

    await db.insert(contentItems).values([
      {
        id: 'content-' + randomUUID(), profileId, title: 'Public article', slug: publicArticleSlug,
        type: 'article', visibility: 'PUBLIC', status: 'PUBLISHED', publishedAt: createdAt,
        createdAt, updatedAt: createdAt,
      },
      {
        id: 'content-' + randomUUID(), profileId, title: 'Private article', slug: privateArticleSlug,
        type: 'article', visibility: 'PRIVATE', status: 'PUBLISHED', publishedAt: createdAt,
        createdAt, updatedAt: createdAt,
      },
      {
        id: 'content-' + randomUUID(), profileId, title: 'Draft article', slug: draftArticleSlug,
        type: 'article', visibility: 'PUBLIC', status: 'DRAFT', createdAt, updatedAt: createdAt,
      },
      {
        id: 'content-' + randomUUID(), profileId, title: 'Unlisted article', slug: unlistedArticleSlug,
        type: 'article', visibility: 'UNLISTED', status: 'PUBLISHED', publishedAt: createdAt,
        createdAt, updatedAt: createdAt,
      },
      {
        id: 'content-' + randomUUID(), profileId, title: 'Deleted article', slug: deletedArticleSlug,
        type: 'article', visibility: 'PUBLIC', status: 'PUBLISHED', publishedAt: createdAt,
        createdAt, updatedAt: createdAt, deletedAt: createdAt,
      },
      {
        id: 'content-' + randomUUID(), profileId, title: 'Public project', slug: publicProjectSlug,
        type: 'project', visibility: 'PUBLIC', status: 'PUBLISHED', publishedAt: createdAt,
        createdAt, updatedAt: createdAt,
      },
      {
        id: 'content-' + randomUUID(), profileId, title: 'Public resource', slug: publicResourceSlug,
        type: 'resource', visibility: 'PUBLIC', status: 'PUBLISHED', publishedAt: createdAt,
        createdAt, updatedAt: createdAt,
      },
    ]);

    await db.insert(pages).values([
      {
        id: 'page-' + randomUUID(), profileId, title: 'Public page', slug: publicPageSlug,
        visibility: 'PUBLIC', status: 'PUBLISHED', publishedAt: createdAt, createdAt, updatedAt: createdAt,
      },
      {
        id: 'page-' + randomUUID(), profileId, title: 'Private page', slug: privatePageSlug,
        visibility: 'PRIVATE', status: 'PUBLISHED', publishedAt: createdAt, createdAt, updatedAt: createdAt,
      },
    ]);

    await db.insert(collections).values([
      {
        id: 'collection-' + randomUUID(), profileId, name: 'Public collection', slug: publicCollectionSlug,
        visibility: 'PUBLIC', status: 'PUBLISHED', createdAt, updatedAt: createdAt,
      },
      {
        id: 'collection-' + randomUUID(), profileId, name: 'Private collection', slug: privateCollectionSlug,
        visibility: 'PRIVATE', status: 'PUBLISHED', createdAt, updatedAt: createdAt,
      },
    ]);
  });

  afterAll(async () => {
    if (initialized) await getDb().delete(profiles).where(eq(profiles.id, profileId));
    if (previousSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = previousSiteUrl;
  });

  it('includes only public published content, pages and collections', async () => {
    const entries = await generatePublicSitemap();
    const urls = new Set(entries.map((entry) => entry.url));

    expect(urls).toContain(origin + '/');
    expect(urls).toContain(origin + '/tools');
    expect(urls).toContain(origin + '/articles/' + publicArticleSlug);
    expect(urls).toContain(origin + '/projects/' + publicProjectSlug);
    expect(urls).toContain(origin + '/p/' + publicPageSlug);
    expect(urls).toContain(origin + '/collections/' + publicCollectionSlug);

    expect(urls).not.toContain(origin + '/articles/' + privateArticleSlug);
    expect(urls).not.toContain(origin + '/articles/' + draftArticleSlug);
    expect(urls).not.toContain(origin + '/articles/' + unlistedArticleSlug);
    expect(urls).not.toContain(origin + '/articles/' + deletedArticleSlug);
    expect(urls).not.toContain(origin + '/projects/' + publicResourceSlug);
    expect(urls).not.toContain(origin + '/articles/' + publicResourceSlug);
    expect(urls).not.toContain(origin + '/p/' + privatePageSlug);
    expect(urls).not.toContain(origin + '/collections/' + privateCollectionSlug);
    expect(urls).not.toContain(origin + '/admin/login');
    expect(urls).not.toContain(origin + '/share/' + suffix);
  });
});
