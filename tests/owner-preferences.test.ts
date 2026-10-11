import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  defaultCalculatorPreferences,
  loadCalculatorPreferences,
  normalizeCalculatorPreferences,
  saveCalculatorPreferences,
} from '@/lib/tools/calculator-preferences';
import {
  defaultMusicPreferences,
  loadMusicPreferences,
  normalizeMusicPreferences,
  saveMusicPreferences,
} from '@/lib/audio/audio-preferences';
import {
  defaultFocusPreferences,
  loadFocusPreferences,
  normalizeFocusPreferences,
  saveFocusPreferences,
} from '@/lib/audio/focus-preferences';

function createStorage() {
  const records = new Map<string, string>();
  return {
    records,
    getItem(key: string) { return records.get(key) ?? null; },
    setItem(key: string, value: string) { records.set(key, String(value)); },
    removeItem(key: string) { records.delete(key); },
    clear() { records.clear(); },
    key(index: number) { return [...records.keys()][index] ?? null; },
    get length() { return records.size; },
  } as Storage;
}

afterEach(() => vi.unstubAllGlobals());

describe('owner calculator preferences', () => {
  it('restores expression, angle mode, result and bounded history across app remounts', () => {
    const storage = createStorage();
    vi.stubGlobal('window', { localStorage: storage });
    const selected = {
      expression: 'sin(30) * 2',
      result: 1,
      angleMode: 'deg' as const,
      history: [{ expression: 'sqrt(81)', result: 9, key: 'entry-1' }],
    };
    expect(saveCalculatorPreferences(selected)).toBe(true);
    expect(loadCalculatorPreferences()).toEqual(selected);
  });

  it('sanitizes invalid calculator state and rejects unsafe numeric results', () => {
    const result = normalizeCalculatorPreferences({
      expression: 'x'.repeat(1000),
      result: Number.NaN,
      angleMode: 'javascript',
      history: [
        { expression: '1+1', result: 2, key: 'ok' },
        { expression: 'bad', result: Infinity, key: 'bad' },
      ],
    });
    expect(result.expression).toHaveLength(300);
    expect(result.result).toBeNull();
    expect(result.angleMode).toBe('deg');
    expect(result.history).toEqual([{ expression: '1+1', result: 2, key: 'ok' }]);
  });

  it('falls back safely on corrupt stored data', () => {
    const storage = createStorage();
    vi.stubGlobal('window', { localStorage: storage });
    storage.setItem('webos:owner-calculator-preferences:v1', '{bad-json');
    expect(loadCalculatorPreferences()).toEqual(defaultCalculatorPreferences());
  });
});

describe('owner Audio Lab preferences', () => {
  it('persists all volumes but does not persist active playback state', () => {
    const storage = createStorage();
    vi.stubGlobal('window', { localStorage: storage });
    const preferences = {
      volumes: { rain: 0.1, ocean: 0.2, campfire: 0.3, binaural: 0.4, whitenoise: 0.5 },
      masterVolume: 0.65,
      radioVolume: 0.15,
    };
    expect(saveMusicPreferences(preferences)).toBe(true);
    expect(loadMusicPreferences()).toEqual(preferences);
    expect(storage.getItem('webos:music-preferences:v1')).not.toContain('activeLayers');
  });

  it('clamps out-of-range values and ignores unknown layer IDs', () => {
    const result = normalizeMusicPreferences({
      volumes: { rain: 4, ocean: -1, campfire: 0.6, impostor: 1 },
      masterVolume: 2,
      radioVolume: Number.NaN,
    });
    expect(result.volumes.rain).toBe(1);
    expect(result.volumes.ocean).toBe(0);
    expect(result.volumes.campfire).toBe(0.6);
    expect(result.volumes.whitenoise).toBe(defaultMusicPreferences().volumes.whitenoise);
    expect(result).not.toHaveProperty('impostor');
    expect(result.masterVolume).toBe(1);
    expect(result.radioVolume).toBe(0.6);
  });
});

describe('owner Focus Studio preferences', () => {
  it('persists the remaining timer, goal and volume sliders but does not auto-start a session', () => {
    const storage = createStorage();
    vi.stubGlobal('window', { localStorage: storage });
    const preferences = {
      mode: 'shortBreak' as const,
      remainingSeconds: 237,
      sessionCount: 12,
      sessionGoal: 'Finish review',
      rainVolume: 0.8,
      wavesVolume: 0.35,
      campfireVolume: 0,
    };
    expect(saveFocusPreferences(preferences)).toBe(true);
    expect(loadFocusPreferences()).toEqual(preferences);
    expect(storage.getItem('webos:focus-preferences:v1')).not.toContain('isActive');
  });

  it('bounds persisted focus state and falls back on corrupt storage', () => {
    const normalized = normalizeFocusPreferences({
      mode: 'unsafe',
      remainingSeconds: -4,
      sessionCount: 1e20,
      sessionGoal: 'a'.repeat(1000),
      rainVolume: 3,
      wavesVolume: -2,
      campfireVolume: 'loud',
    });
    expect(normalized.mode).toBe('work');
    expect(normalized.remainingSeconds).toBe(0);
    expect(normalized.sessionCount).toBe(0);
    expect(normalized.sessionGoal).toHaveLength(500);
    expect(normalized.rainVolume).toBe(1);
    expect(normalized.wavesVolume).toBe(0);
    expect(normalized.campfireVolume).toBe(0);

    const storage = createStorage();
    vi.stubGlobal('window', { localStorage: storage });
    storage.setItem('webos:focus-preferences:v1', '{not-valid');
    expect(loadFocusPreferences()).toEqual(defaultFocusPreferences());
  });
});
