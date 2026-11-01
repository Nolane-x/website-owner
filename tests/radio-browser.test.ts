import { describe, expect, it } from 'vitest';
import {
  buildRadioBrowserSearchParams,
  normalizePublicHttpsUrl,
  normalizeRadioBrowserFacets,
  normalizeRadioBrowserStation,
} from '@/lib/audio/radio-browser';
import {
  normalizeRadioLibraryState,
  recordRadioHistory,
  toggleRadioFavorite,
} from '@/lib/audio/radio-library';

const UUID = '960e57c5-0601-11e8-ae97-52543be04c81';
const station = {
  stationuuid: UUID,
  name: 'Jazz FM',
  url: 'http://radio.example/live',
  url_resolved: 'https://stream.example/live.mp3',
  homepage: 'https://radio.example/',
  country: 'United Kingdom',
  countrycode: 'GB',
  language: 'english',
  tags: 'jazz,smooth jazz,relax',
  codec: 'MP3',
  bitrate: 128,
  votes: 25,
  clickcount: 100,
  clicktrend: 10,
  hls: 0,
  lastcheckok: 1,
};

describe('Radio Browser catalogue normalization', () => {
  it('builds a bounded search that always excludes HTTP and broken stations', () => {
    const params = buildRadioBrowserSearchParams({
      query: '  jazz ',
      country: 'Vietnam',
      language: 'vietnamese',
      tag: 'jazz',
      codec: 'MP3',
      minBitrate: 128,
      sort: 'bitrate',
      offset: 120,
      limit: 999,
    });
    expect(params.get('name')).toBe('jazz');
    expect(params.get('country')).toBe('Vietnam');
    expect(params.get('language')).toBe('vietnamese');
    expect(params.get('tag')).toBe('jazz');
    expect(params.get('codec')).toBe('MP3');
    expect(params.get('bitrateMin')).toBe('128');
    expect(params.get('is_https')).toBe('true');
    expect(params.get('hidebroken')).toBe('true');
    expect(params.get('order')).toBe('bitrate');
    expect(params.get('limit')).toBe('60');
    expect(params.get('offset')).toBe('120');
  });

  it('clamps offsets, bitrate and removes control characters from filters', () => {
    const params = buildRadioBrowserSearchParams({
      query: 'pop\u0000\nrock',
      minBitrate: 10_000,
      offset: 1_000_000,
      limit: -10,
    });
    expect(params.get('name')).toBe('poprock');
    expect(params.get('bitrateMin')).toBe('512');
    expect(params.get('offset')).toBe('100000');
    expect(params.get('limit')).toBe('1');
  });

  it('accepts direct public HTTPS streams and rejects private or mixed-content URLs', () => {
    expect(normalizePublicHttpsUrl('https://radio.example/live')).toBe('https://radio.example/live');
    expect(normalizePublicHttpsUrl('http://radio.example/live')).toBeNull();
    expect(normalizePublicHttpsUrl('https://127.0.0.1/live')).toBeNull();
    expect(normalizePublicHttpsUrl('https://192.168.1.10/live')).toBeNull();
    expect(normalizePublicHttpsUrl('https://stream.local/live')).toBeNull();
    expect(normalizePublicHttpsUrl('https://user:pass@radio.example/live')).toBeNull();
  });

  it('prefers a resolved public HTTPS stream and rejects HLS, broken and HTTP-only stations', () => {
    expect(normalizeRadioBrowserStation(station)).toMatchObject({
      id: UUID,
      name: 'Jazz FM',
      streamUrl: 'https://stream.example/live.mp3',
      codec: 'MP3',
      bitrate: 128,
    });
    expect(normalizeRadioBrowserStation({ ...station, hls: 1 })).toBeNull();
    expect(normalizeRadioBrowserStation({ ...station, lastcheckok: 0 })).toBeNull();
    expect(normalizeRadioBrowserStation({ ...station, url: 'http://radio.example/live', url_resolved: 'http://stream.example/live' })).toBeNull();
  });

  it('normalizes and sorts facets without duplicates', () => {
    expect(normalizeRadioBrowserFacets([
      { name: 'Jazz', stationcount: '12' },
      { name: 'Pop', stationcount: '20' },
      { name: 'jazz', stationcount: '3' },
      { name: '<tag>', stationcount: -1 },
    ])).toEqual([
      { name: 'Pop', stationCount: 20 },
      { name: 'Jazz', stationCount: 12 },
      { name: '<tag>', stationCount: 0 },
    ]);
  });
});

describe('local radio library', () => {
  it('normalizes favourites and listening history from local storage data', () => {
    const result = normalizeRadioLibraryState({
      favorites: [station, { ...station, stationuuid: 'bad' }],
      history: [station, { ...station, hls: 1 }],
    });
    expect(result.favorites.map((item) => item.id)).toEqual([UUID]);
    expect(result.history.map((item) => item.id)).toEqual([UUID]);
  });

  it('toggles favourites and puts the most recently played station first', () => {
    const normalized = normalizeRadioBrowserStation(station)!;
    expect(toggleRadioFavorite([], normalized)).toEqual([normalized]);
    expect(toggleRadioFavorite([normalized], normalized)).toEqual([]);
    expect(recordRadioHistory([normalized], { ...normalized, name: 'Renamed' })).toEqual([{ ...normalized, name: 'Renamed' }]);
  });
});
