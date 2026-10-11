import type { AmbientSoundType } from './ambient-synth';

export interface MusicPreferences {
  volumes: Record<AmbientSoundType, number>;
  masterVolume: number;
  radioVolume: number;
}

export const DEFAULT_AMBIENT_VOLUMES: Record<AmbientSoundType, number> = {
  rain: 0.42,
  ocean: 0.4,
  campfire: 0.35,
  binaural: 0.15,
  whitenoise: 0.2,
};

const STORAGE_KEY = 'webos:music-preferences:v1';
const TYPES: AmbientSoundType[] = ['rain', 'ocean', 'campfire', 'binaural', 'whitenoise'];

function safeVolume(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(1, value))
    : fallback;
}

export function defaultMusicPreferences(): MusicPreferences {
  return {
    volumes: { ...DEFAULT_AMBIENT_VOLUMES },
    masterVolume: 0.5,
    radioVolume: 0.6,
  };
}

export function normalizeMusicPreferences(value: unknown): MusicPreferences {
  const defaults = defaultMusicPreferences();
  if (!value || typeof value !== 'object' || Array.isArray(value)) return defaults;
  const raw = value as Record<string, unknown>;
  const rawVolumes = raw.volumes && typeof raw.volumes === 'object' && !Array.isArray(raw.volumes)
    ? raw.volumes as Record<string, unknown>
    : {};
  const volumes = { ...defaults.volumes };
  for (const type of TYPES) volumes[type] = safeVolume(rawVolumes[type], defaults.volumes[type]);
  return {
    volumes,
    masterVolume: safeVolume(raw.masterVolume, defaults.masterVolume),
    radioVolume: safeVolume(raw.radioVolume, defaults.radioVolume),
  };
}

export function loadMusicPreferences(): MusicPreferences {
  if (typeof window === 'undefined') return defaultMusicPreferences();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw || raw.length > 8_192) return defaultMusicPreferences();
    return normalizeMusicPreferences(JSON.parse(raw));
  } catch {
    return defaultMusicPreferences();
  }
}

export function saveMusicPreferences(preferences: MusicPreferences): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeMusicPreferences(preferences)));
    return true;
  } catch {
    return false;
  }
}
