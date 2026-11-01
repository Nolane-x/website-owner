import type { AmbientSoundType } from './ambient-synth';
import { DEFAULT_RADIO_STATION, normalizeRadioStreamUrl } from './radio-player';

export interface MusicPreferences {
  volumes: Record<AmbientSoundType, number>;
  masterVolume: number;
  radioVolume: number;
  radioSourceUrl: string;
  radioStationName: string;
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

function safeRadioSource(value: unknown): string {
  if (typeof value !== 'string') return DEFAULT_RADIO_STATION.url;
  try {
    return normalizeRadioStreamUrl(value);
  } catch {
    return DEFAULT_RADIO_STATION.url;
  }
}

export function defaultMusicPreferences(): MusicPreferences {
  return {
    volumes: { ...DEFAULT_AMBIENT_VOLUMES },
    masterVolume: 0.5,
    radioVolume: 0.6,
    radioSourceUrl: DEFAULT_RADIO_STATION.url,
    radioStationName: DEFAULT_RADIO_STATION.name,
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

  const rawRadioSourceUrl = typeof raw.radioSourceUrl === 'string' ? raw.radioSourceUrl : null;
  const radioSourceUrl = safeRadioSource(rawRadioSourceUrl);
  const radioSourceIsValid = rawRadioSourceUrl === null || (() => {
    try {
      normalizeRadioStreamUrl(rawRadioSourceUrl);
      return true;
    } catch {
      return false;
    }
  })();
  const radioStationName = !radioSourceIsValid
    ? DEFAULT_RADIO_STATION.name
    : typeof raw.radioStationName === 'string' && raw.radioStationName.trim()
      ? raw.radioStationName.trim().slice(0, 80)
      : (radioSourceUrl === DEFAULT_RADIO_STATION.url ? DEFAULT_RADIO_STATION.name : 'Luồng tùy chỉnh');

  return {
    volumes,
    masterVolume: safeVolume(raw.masterVolume, defaults.masterVolume),
    radioVolume: safeVolume(raw.radioVolume, defaults.radioVolume),
    radioSourceUrl,
    radioStationName,
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
