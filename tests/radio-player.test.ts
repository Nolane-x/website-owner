import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

class MockAudio extends EventTarget {
  static instances: MockAudio[] = [];
  src = '';
  volume = 1;
  paused = true;
  preload = 'auto';
  error: { code: number } | null = null;
  play = vi.fn(async () => {
    this.paused = false;
    this.dispatchEvent(new Event('playing'));
  });
  pause = vi.fn(() => {
    if (!this.paused) {
      this.paused = true;
      this.dispatchEvent(new Event('pause'));
    }
  });
  load = vi.fn();

  constructor() {
    super();
    MockAudio.instances.push(this);
  }
}

describe('page-lifetime external radio player', () => {
  let player: typeof import('../src/lib/audio/radio-player');

  beforeAll(async () => {
    vi.stubGlobal('Audio', MockAudio);
    player = await import('../src/lib/audio/radio-player');
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it('accepts secure direct stream URLs and rejects mixed-content or page URLs', () => {
    expect(player.normalizeRadioStreamUrl('https://radio.example/live.mp3')).toBe('https://radio.example/live.mp3');
    expect(() => player.normalizeRadioStreamUrl('http://radio.example/live.mp3')).toThrow(/HTTPS/);
    expect(() => player.normalizeRadioStreamUrl('not a url')).toThrow(/URL/);
    expect(() => player.normalizeRadioStreamUrl('https://user:pass@radio.example/live.mp3')).toThrow(/không hợp lệ/i);
  });

  it('keeps playback alive when a window unsubscribes from the player state', async () => {
    const updates = vi.fn();
    const unsubscribe = player.subscribeRadioPlayer(updates);

    await player.playRadioStream('https://radio.example/live.mp3', 'Test Radio');

    expect(MockAudio.instances).toHaveLength(1);
    expect(MockAudio.instances[0].play).toHaveBeenCalledTimes(1);
    expect(player.getRadioPlayerSnapshot()).toMatchObject({
      sourceUrl: 'https://radio.example/live.mp3',
      stationName: 'Test Radio',
      status: 'playing',
    });
    expect(updates).toHaveBeenCalled();

    unsubscribe();
    expect(MockAudio.instances[0].paused).toBe(false);
    expect(MockAudio.instances[0].pause).not.toHaveBeenCalled();
    expect(player.getRadioPlayerSnapshot().status).toBe('playing');
  });

  it('pauses without discarding the selected source and clamps volume', () => {
    player.setRadioPlayerVolume(4);
    expect(player.getRadioPlayerSnapshot().volume).toBe(1);
    player.pauseRadioStream();
    expect(player.getRadioPlayerSnapshot()).toMatchObject({
      sourceUrl: 'https://radio.example/live.mp3',
      status: 'paused',
    });
    expect(MockAudio.instances[0].paused).toBe(true);
  });
});
