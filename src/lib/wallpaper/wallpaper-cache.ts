import type { WallpaperFilters, WallpaperMediaType } from '@/lib/types';

const DATABASE_NAME = 'webos-wallpaper-cache';
const DATABASE_VERSION = 1;
const STORE_NAME = 'assets';
const ACTIVE_CACHE_KEY = 'active';
const MAX_CACHED_DATA_URL_LENGTH = 7 * 1024 * 1024;

type CachedWallpaperAsset = {
  key: typeof ACTIVE_CACHE_KEY;
  wallpaperId: string;
  dataUrl: string;
  type?: WallpaperMediaType;
  filters?: WallpaperFilters | null;
  updatedAt: number;
};

export type ResolvedWallpaperAsset = {
  url: string;
  type?: WallpaperMediaType;
  filters?: WallpaperFilters | null;
};

let databasePromise: Promise<IDBDatabase | null> | null = null;
const inFlightLoads = new Map<string, Promise<ResolvedWallpaperAsset>>();

function isAllowedWallpaperDataUrl(value: unknown): value is string {
  return typeof value === 'string'
    && value.length <= MAX_CACHED_DATA_URL_LENGTH
    && /^data:(image\/(png|jpeg|jpg|webp|gif)|video\/(mp4|webm));base64,/i.test(value);
}

function openCacheDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  if (databasePromise) return databasePromise;

  databasePromise = new Promise((resolve) => {
    try {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => db.close();
        resolve(db);
      };
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });

  return databasePromise;
}

async function readActiveCache(wallpaperId: string): Promise<CachedWallpaperAsset | null> {
  const db = await openCacheDatabase();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(ACTIVE_CACHE_KEY);
      request.onsuccess = () => {
        const value = request.result as CachedWallpaperAsset | undefined;
        resolve(value?.wallpaperId === wallpaperId && isAllowedWallpaperDataUrl(value.dataUrl) ? value : null);
      };
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Cache just the currently active uploaded asset in IndexedDB. Unlike localStorage,
 * IndexedDB can hold a multi-megabyte Data URL without hitting the usual 5 MB limit.
 * A single active slot prevents a wallpaper library from filling the browser cache.
 */
export async function cacheActiveWallpaperAsset(
  wallpaperId: string,
  dataUrl: string,
  metadata: { type?: WallpaperMediaType; filters?: WallpaperFilters | null } = {},
): Promise<void> {
  if (!wallpaperId || wallpaperId.length > 160 || !isAllowedWallpaperDataUrl(dataUrl)) return;
  const db = await openCacheDatabase();
  if (!db) return;

  await new Promise<void>((resolve) => {
    try {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put({
        key: ACTIVE_CACHE_KEY,
        wallpaperId,
        dataUrl,
        type: metadata.type,
        filters: metadata.filters ?? null,
        updatedAt: Date.now(),
      } satisfies CachedWallpaperAsset);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => resolve();
      transaction.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function clearCachedActiveWallpaperAsset(): Promise<void> {
  const db = await openCacheDatabase();
  if (!db) return;

  await new Promise<void>((resolve) => {
    try {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).delete(ACTIVE_CACHE_KEY);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => resolve();
      transaction.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Resolves a selected uploaded wallpaper from the local browser cache first.
 * Concurrent callers share one in-flight request, avoiding duplicate full-size
 * transfers when the desktop and wallpaper editor mount at the same time.
 */
export async function resolveActiveWallpaperAsset(wallpaperId: string): Promise<ResolvedWallpaperAsset> {
  if (!wallpaperId || wallpaperId.length > 160) {
    throw new Error('Mã hình nền không hợp lệ.');
  }

  const existingLoad = inFlightLoads.get(wallpaperId);
  if (existingLoad) return existingLoad;

  const load = (async (): Promise<ResolvedWallpaperAsset> => {
    const cached = await readActiveCache(wallpaperId);
    if (cached) {
      return { url: cached.dataUrl, type: cached.type, filters: cached.filters };
    }

    const response = await fetch('/api/admin/wallpapers/' + encodeURIComponent(wallpaperId), {
      cache: 'no-store',
      credentials: 'same-origin',
    });
    const payload = await response.json().catch(() => null) as {
      wallpaper?: {
        id?: string;
        type?: WallpaperMediaType;
        localDataUrl?: string | null;
        sourceUrl?: string | null;
        filtersJson?: WallpaperFilters | null;
      };
      error?: string;
    } | null;

    if (!response.ok || !payload?.wallpaper || payload.wallpaper.id !== wallpaperId) {
      throw new Error(payload?.error || 'Không tải được hình nền đang chọn.');
    }

    const saved = payload.wallpaper;
    const url = isAllowedWallpaperDataUrl(saved.localDataUrl)
      ? saved.localDataUrl
      : typeof saved.sourceUrl === 'string' && /^https?:\/\//i.test(saved.sourceUrl)
        ? saved.sourceUrl
        : '';

    if (!url) throw new Error('Hình nền không có nội dung hợp lệ.');

    if (isAllowedWallpaperDataUrl(url)) {
      await cacheActiveWallpaperAsset(wallpaperId, url, {
        type: saved.type,
        filters: saved.filtersJson,
      });
    }

    return {
      url,
      type: saved.type,
      filters: saved.filtersJson,
    };
  })();

  inFlightLoads.set(wallpaperId, load);
  try {
    return await load;
  } finally {
    if (inFlightLoads.get(wallpaperId) === load) {
      inFlightLoads.delete(wallpaperId);
    }
  }
}
