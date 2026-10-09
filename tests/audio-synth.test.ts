import { describe, it, expect } from 'vitest';
import { isSfxMuted, setSfxMuted } from '../src/lib/audio/sound-fx';
import { ambientSynth } from '../src/lib/audio/ambient-synth';

describe('Web Audio Procedural Sound Engine', () => {
  it('quản lý trạng thái bật/tắt âm thanh giao diện an toàn khi SSR', () => {
    // In node/SSR environment, window is undefined
    expect(isSfxMuted()).toBe(true);
    setSfxMuted(true);
    setSfxMuted(false);
  });

  it('khởi tạo bộ tổng hợp âm thanh tập trung (Ambient Synthesizer) an toàn', () => {
    expect(ambientSynth.isPlaying()).toBe(false);
    expect(ambientSynth.getCurrentType()).toBeNull();
    ambientSynth.stop();
    ambientSynth.setVolume(0.8);
  });
});
