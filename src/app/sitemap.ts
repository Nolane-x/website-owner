import type { MetadataRoute } from 'next';
import { and, eq, isNull } from 'drizzle-orm';
import { getDb, initializeDatabase } from '@/lib/db';
import { collections, contentItems, pages } from '@/lib/db/schema';

export const revalidate = 300;

const FALLBACK_SITE_ORIGIN = 'https://caominhquan.vercel.app';

function resolveSiteOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) {
    try {
      const url = new URL(configured);
      if (url.protocol === 'https:' && !url.username && !url.password) return url.origin;
    } catch {
      // Fall back to the canonical production origin when configuration is invalid.
    }
  }
  return FALLBACK_SITE_ORIGIN;
}

function contentPath(type: string): string | null {
  if (type === 'project') return '/projects';
  if (type === 'resource' || type === 'link') return null;
  // The public article detail route renders all other published content types.
  return '/articles';
}

export async function generatePublicSitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = resolveSiteOrigin();
  const now = new Date();
  const staticEntries: MetadataRoute.Sitemap = [
    { url: origin + '/', lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: origin + '/about', lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: origin + '/projects', lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: origin + '/articles', lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: origin + '/resources', lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: origin + '/collections', lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: origin + '/tools', lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
  ];

  const dynamicEntries: MetadataRoute.Sitemap = [];

  try {
    await initializeDatabase();
    const db = getDb();
    const [items, publicPages, publicCollections] = await Promise.all([
      db.select({
        slug: contentItems.slug,
        type: contentItems.type,
        updatedAt: contentItems.updatedAt,
        publishedAt: contentItems.publishedAt,
      }).from(contentItems).where(and(
        eq(contentItems.visibility, 'PUBLIC'),
        eq(contentItems.status, 'PUBLISHED'),
        isNull(contentItems.deletedAt),
      )),
      db.select({
        slug: pages.slug,
        updatedAt: pages.updatedAt,
      }).from(pages).where(and(
        eq(pages.visibility, 'PUBLIC'),
        eq(pages.status, 'PUBLISHED'),
        isNull(pages.deletedAt),
      )),
      db.select({
        slug: collections.slug,
        updatedAt: collections.updatedAt,
      }).from(collections).where(and(
        eq(collections.visibility, 'PUBLIC'),
        eq(collections.status, 'PUBLISHED'),
        isNull(collections.deletedAt),
      )),
    ]);

    for (const item of items) {
      const path = contentPath(item.type);
      if (!path) continue;
      dynamicEntries.push({
        url: origin + path + '/' + encodeURIComponent(item.slug),
        lastModified: item.updatedAt ?? item.publishedAt ?? now,
        changeFrequency: 'monthly',
        priority: 0.5,
      });
    }

    for (const page of publicPages) {
      dynamicEntries.push({
        url: origin + '/p/' + encodeURIComponent(page.slug),
        lastModified: page.updatedAt ?? now,
        changeFrequency: 'monthly',
        priority: 0.5,
      });
    }

    for (const collection of publicCollections) {
      dynamicEntries.push({
        url: origin + '/collections/' + encodeURIComponent(collection.slug),
        lastModified: collection.updatedAt ?? now,
        changeFrequency: 'monthly',
        priority: 0.5,
      });
    }
  } catch {
    // Keep the sitemap available with its public static routes when the database is unavailable.
    console.error('Không thể tạo các mục sitemap động từ nội dung công khai.');
  }

  const uniqueEntries = new Map<string, MetadataRoute.Sitemap[number]>();
  for (const entry of [...staticEntries, ...dynamicEntries]) uniqueEntries.set(entry.url, entry);
  return [...uniqueEntries.values()].sort((a, b) => a.url.localeCompare(b.url));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return generatePublicSitemap();
}
