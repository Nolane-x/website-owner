import { sql } from 'drizzle-orm';
import { customWallpapers } from '@/lib/db/schema';

/** Lightweight library row. The large Data URL column is deliberately not selected. */
export const wallpaperMetadataSelection = {
  id: customWallpapers.id,
  profileId: customWallpapers.profileId,
  title: customWallpapers.title,
  sourceUrl: customWallpapers.sourceUrl,
  type: customWallpapers.type,
  tagsJson: customWallpapers.tagsJson,
  filtersJson: customWallpapers.filtersJson,
  isFavorite: customWallpapers.isFavorite,
  createdAt: customWallpapers.createdAt,
  hasLocalDataUrl: sql<boolean>`${customWallpapers.localDataUrl} IS NOT NULL`,
};
