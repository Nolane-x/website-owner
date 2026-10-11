export type FocusMode = 'work' | 'shortBreak' | 'longBreak';

export interface FocusPreferences {
  mode: FocusMode;
  remainingSeconds: number;
  sessionCount: number;
  sessionGoal: string;
  rainVolume: number;
  wavesVolume: number;
  campfireVolume: number;
}

const STORAGE_KEY = 'webos:focus-preferences:v1';

export function defaultFocusPreferences(): FocusPreferences {
  return {
    mode: 'work',
    remainingSeconds: 25 * 60,
    sessionCount: 0,
    sessionGoal: 'Tập trung phát triển kiến trúc Web OS 5.0 hoàn hảo',
    rainVolume: 0.4,
    wavesVolume: 0,
    campfireVolume: 0,
  };
}

function normalizedVolume(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
}

export function normalizeFocusPreferences(value: unknown): FocusPreferences {
  const defaults = defaultFocusPreferences();
  if (!value || typeof value !== 'object' || Array.isArray(value)) return defaults;
  const raw = value as Record<string, unknown>;
  const mode: FocusMode = raw.mode === 'shortBreak' || raw.mode === 'longBreak' || raw.mode === 'work'
    ? raw.mode : defaults.mode;
  const remainingSeconds = typeof raw.remainingSeconds === 'number' && Number.isFinite(raw.remainingSeconds)
    ? Math.max(0, Math.min(99 * 60 * 60, Math.floor(raw.remainingSeconds)))
    : defaults.remainingSeconds;
  const sessionCount = typeof raw.sessionCount === 'number' && Number.isSafeInteger(raw.sessionCount)
    ? Math.max(0, Math.min(100_000, raw.sessionCount))
    : defaults.sessionCount;
  const sessionGoal = typeof raw.sessionGoal === 'string' ? raw.sessionGoal.slice(0, 500) : defaults.sessionGoal;
  return {
    mode,
    remainingSeconds,
    sessionCount,
    sessionGoal,
    rainVolume: normalizedVolume(raw.rainVolume, defaults.rainVolume),
    wavesVolume: normalizedVolume(raw.wavesVolume, defaults.wavesVolume),
    campfireVolume: normalizedVolume(raw.campfireVolume, defaults.campfireVolume),
  };
}

export function loadFocusPreferences(): FocusPreferences {
  if (typeof window === 'undefined') return defaultFocusPreferences();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw || raw.length > 8_192) return defaultFocusPreferences();
    return normalizeFocusPreferences(JSON.parse(raw));
  } catch {
    return defaultFocusPreferences();
  }
}

export function saveFocusPreferences(preferences: FocusPreferences): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeFocusPreferences(preferences)));
    return true;
  } catch {
    return false;
  }
}
