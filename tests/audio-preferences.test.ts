import { describe, expect, it } from 'vitest';
import { defaultMusicPreferences, normalizeMusicPreferences } from '../src/lib/audio/audio-preferences';
import { DEFAULT_RADIO_STATION } from '../src/lib/audio/radio-player';

describe('Audio Lab preferences', () => {
  it('provides a working external HTTPS station by default', () => {
    expect(defaultMusicPreferences()).toMatchObject({
      radioSourceUrl: DEFAULT_RADIO_STATION.url,
      radioStationName: DEFAULT_RADIO_STATION.name,
    });
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
