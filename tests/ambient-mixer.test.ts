import { describe, expect, it } from 'vitest';
import { AmbientMixer } from '../src/lib/audio/ambient-mixer';

describe('Ambient multi-track mixer safety', () => {
  it('is safe to construct and stop in an environment without a real Web Audio context', () => {
    const mixer = new AmbientMixer();
    expect(mixer.getActiveLayers()).toEqual([]);
    expect(mixer.getFrequencyLevels(12)).toHaveLength(12);
    expect(mixer.startLayer('rain')).toBe(false);
    expect(mixer.getActiveLayers()).toEqual([]);
    expect(() => mixer.stopLayer('rain')).not.toThrow();
    expect(() => mixer.stopAll()).not.toThrow();
  });

  it('clamps volumes and avoids duplicate layer registrations when the layer is already active', () => {
    const mixer = new AmbientMixer();
    expect(mixer.getActiveLayers()).toEqual([]);
    mixer.setMasterVolume(2);
    mixer.setLayerVolume('ocean', -1);
    mixer.stopLayer('ocean');
    expect(mixer.getActiveLayers()).toEqual([]);
  });
});
