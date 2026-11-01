import {
  normalizeRadioBrowserStation,
  type RadioBrowserStation,
} from './radio-browser';

export interface RadioLibraryState {
  favorites: RadioBrowserStation[];
  history: RadioBrowserStation[];
}

const STORAGE_KEY = 'webos:radio-library:v1';
const MAX_FAVORITES = 120;
const MAX_HISTORY = 40;
const MAX_STORAGE_CHARS = 96 * 1024;

export function normalizeRadioLibraryState(value: unknown): RadioLibraryState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { favorites: [], history: [] };
  }
  const raw = value as Record<string, unknown>;

  const normalizeList = (items: unknown, limit: number): RadioBrowserStation[] => {
    if (!Array.isArray(items)) return [];
    const unique = new Map<string, RadioBrowserStation>();
    for (const item of items.slice(0, limit * 3)) {
      const station = normalizeRadioBrowserStation(item);
      if (station && !unique.has(station.id)) unique.set(station.id, station);
      if (unique.size >= limit) break;
    }
    return [...unique.values()];
  };

  return {
    favorites: normalizeList(raw.favorites, MAX_FAVORITES),
    history: normalizeList(raw.history, MAX_HISTORY),
  };
}

export function loadRadioLibrary(): RadioLibraryState {
  if (typeof window === 'undefined') return { favorites: [], history: [] };
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored || stored.length > MAX_STORAGE_CHARS) return { favorites: [], history: [] };
    return normalizeRadioLibraryState(JSON.parse(stored));
  } catch {
    return { favorites: [], history: [] };
  }
}

export function saveRadioLibrary(value: RadioLibraryState): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const normalized = normalizeRadioLibraryState(value);
    const serialized = JSON.stringify(normalized);
    if (serialized.length > MAX_STORAGE_CHARS) return false;
    window.localStorage.setItem(STORAGE_KEY, serialized);
    return true;
  } catch {
    return false;
  }
}

export function toggleRadioFavorite(
  favorites: RadioBrowserStation[],
  station: RadioBrowserStation,
): RadioBrowserStation[] {
  if (favorites.some((item) => item.id === station.id)) {
    return favorites.filter((item) => item.id !== station.id);
  }
  return [station, ...favorites].slice(0, MAX_FAVORITES);
}

export function recordRadioHistory(
  history: RadioBrowserStation[],
  station: RadioBrowserStation,
): RadioBrowserStation[] {
  return [station, ...history.filter((item) => item.id !== station.id)].slice(0, MAX_HISTORY);
}
