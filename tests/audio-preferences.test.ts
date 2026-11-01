import { describe, expect, it } from 'vitest';
import { defaultMusicPreferences, normalizeMusicPreferences } from '../src/lib/audio/audio-preferences';
import { DEFAULT_RADIO_STATION, RADIO_STATIONS } from '../src/lib/audio/radio-player';

describe('Audio Lab preferences', () => {
  it('provides a working external HTTPS station by default', () => {
    expect(defaultMusicPreferences()).toMatchObject({
      radioSourceUrl: DEFAULT_RADIO_STATION.url,
      radioStationName: DEFAULT_RADIO_STATION.name,
    });
  });

  it('uses only official direct HTTPS stream addresses in its built-in presets', () => {
    expect(RADIO_STATIONS.length).toBe(4);
    expect(RADIO_STATIONS.every((station) => station.url.startsWith('https://'))).toBe(true);
    expect(RADIO_STATIONS.some((station) => station.url === 'https://443-1.autopo.st/171/stream/3/')).toBe(true);
    expect(RADIO_STATIONS.some((station) => station.url === 'https://443-1.autopo.st/171/stream/2/')).toBe(true);
    expect(RADIO_STATIONS.some((station) => station.url.includes('tilderadio.org'))).toBe(false);
  });

  it('keeps old saved preferences compatible and clamps their volumes', () => {
    expect(normalizeMusicPreferences({ radioVolume: 2 })).toMatchObject({
      radioVolume: 1,
      radioSourceUrl: DEFAULT_RADIO_STATION.url,
      radioStationName: DEFAULT_RADIO_STATION.name,
    });
  });

  it('preserves a custom secure stream but rejects insecure stream URLs', () => {
    expect(normalizeMusicPreferences({
      radioSourceUrl: 'https://custom.example/stream.mp3',
      radioStationName: 'My Radio',
    })).toMatchObject({
      radioSourceUrl: 'https://custom.example/stream.mp3',
      radioStationName: 'My Radio',
    });

    expect(normalizeMusicPreferences({
      radioSourceUrl: 'http://custom.example/stream.mp3',
      radioStationName: 'Unsafe Radio',
    })).toMatchObject({
      radioSourceUrl: DEFAULT_RADIO_STATION.url,
      radioStationName: DEFAULT_RADIO_STATION.name,
    });
  });
});
