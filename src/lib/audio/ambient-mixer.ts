import type { AmbientSoundType } from './ambient-synth';

interface ActiveLayer {
  gain: GainNode;
  nodes: Array<AudioNode & { stop?: () => void }>;
}

/** Independent, simultaneous procedural sound layers for the desktop Audio Lab. */
export class AmbientMixer {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private masterVolume = 0.5;
  private layers = new Map<AmbientSoundType, ActiveLayer>();

  private init(): boolean {
    if (typeof window === 'undefined') return false;
    if (!this.context) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return false;
      this.context = new Ctor();
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = this.masterVolume;
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.82;
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.context.destination);
    }
    if (this.context.state === 'suspended') void this.context.resume().catch(() => undefined);
    return Boolean(this.context && this.masterGain);
  }

  private createNoise(seconds: number, white = false): AudioBuffer | null {
    if (!this.context) return null;
    const length = Math.floor(this.context.sampleRate * seconds);
    const buffer = this.context.createBuffer(2, length, this.context.sampleRate);
    for (let channel = 0; channel < 2; channel += 1) {
      const samples = buffer.getChannelData(channel);
      let last = 0;
      for (let i = 0; i < length; i += 1) {
        const sample = Math.random() * 2 - 1;
        if (white) samples[i] = sample * 0.5;
        else {
          last = (last + 0.035 * sample) / 1.035;
          samples[i] = last * 3;
        }
      }
    }
    return buffer;
  }

  startLayer(type: AmbientSoundType, volume = 0.45): boolean {
    if (!this.init() || !this.context || !this.masterGain) return false;
    const safeVolume = Math.max(0, Math.min(1, volume));
    if (this.layers.has(type)) {
      this.setLayerVolume(type, safeVolume);
      return true;
    }

    const ctx = this.context;
    const trackGain = ctx.createGain();
    trackGain.gain.setValueAtTime(safeVolume, ctx.currentTime);
    trackGain.connect(this.masterGain);
    const nodes: Array<AudioNode & { stop?: () => void }> = [trackGain];

    try {
      if (type === 'binaural') {
        const left = ctx.createOscillator();
        const right = ctx.createOscillator();
        const merger = ctx.createChannelMerger(2);
        left.type = 'sine';
        right.type = 'sine';
        left.frequency.setValueAtTime(216, ctx.currentTime);
        right.frequency.setValueAtTime(230, ctx.currentTime);
        left.connect(merger, 0, 0);
        right.connect(merger, 0, 1);
        merger.connect(trackGain);
        left.start();
        right.start();
        nodes.push(left, right, merger);
      } else {
        const noise = ctx.createBufferSource();
        const buffer = this.createNoise(type === 'ocean' ? 7 : 5, type === 'whitenoise');
        if (!buffer) {
          trackGain.disconnect();
          return false;
        }
        noise.buffer = buffer;
        noise.loop = true;
        const filter = ctx.createBiquadFilter();
        filter.type = type === 'rain' ? 'bandpass' : type === 'ocean' ? 'lowpass' : type === 'campfire' ? 'lowpass' : 'highpass';
        filter.frequency.setValueAtTime(
          type === 'rain' ? 850 : type === 'ocean' ? 430 : type === 'campfire' ? 620 : 900,
          ctx.currentTime,
        );
        noise.connect(filter);
        if (type === 'ocean') {
          const swell = ctx.createGain();
          swell.gain.setValueAtTime(0.55, ctx.currentTime);
          const lfo = ctx.createOscillator();
          const lfoGain = ctx.createGain();
          lfo.frequency.setValueAtTime(0.13, ctx.currentTime);
          lfoGain.gain.setValueAtTime(0.25, ctx.currentTime);
          lfo.connect(lfoGain);
          lfoGain.connect(swell.gain);
          filter.connect(swell);
          swell.connect(trackGain);
          lfo.start();
          nodes.push(noise, filter, swell, lfo, lfoGain);
        } else {
          filter.connect(trackGain);
          nodes.push(noise, filter);
        }
        noise.start();
      }
      this.layers.set(type, { gain: trackGain, nodes });
      return true;
    } catch {
      for (const node of nodes) {
        try { node.disconnect(); } catch { /* Already disconnected */ }
      }
      return false;
    }
  }

  stopLayer(type: AmbientSoundType): void {
    const layer = this.layers.get(type);
    if (!layer) return;
    this.layers.delete(type);
    for (const node of layer.nodes) {
      try {
        if (typeof node.stop === 'function') node.stop();
      } catch { /* An oscillator may already have stopped */ }
      try { node.disconnect(); } catch { /* Already disconnected */ }
    }
  }

  setLayerVolume(type: AmbientSoundType, volume: number): void {
    const layer = this.layers.get(type);
    if (!layer || !this.context) return;
    layer.gain.gain.setTargetAtTime(Math.max(0, Math.min(1, volume)), this.context.currentTime, 0.04);
  }

  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain && this.context) {
      this.masterGain.gain.setTargetAtTime(this.masterVolume, this.context.currentTime, 0.04);
    }
  }

  getActiveLayers(): AmbientSoundType[] {
    return Array.from(this.layers.keys());
  }

  getFrequencyLevels(bands = 12): number[] {
    if (!this.analyser || !this.layers.size) return Array.from({ length: bands }, () => 0);
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    const safeBands = Math.max(1, Math.min(64, Math.floor(bands)));
    const result: number[] = [];
    for (let band = 0; band < safeBands; band += 1) {
      const start = Math.floor((band / safeBands) * data.length);
      const end = Math.max(start + 1, Math.floor(((band + 1) / safeBands) * data.length));
      let total = 0;
      for (let i = start; i < end; i += 1) total += data[i];
      const average = total / (end - start);
      result.push(Math.max(3, Math.round((average / 255) * 100)));
    }
    return result;
  }

  stopAll(): void {
    for (const type of this.layers.keys()) this.stopLayer(type);
  }

  isSupported(): boolean {
    return typeof window !== 'undefined' && Boolean(window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
  }
}

export const ambientMixer = new AmbientMixer();
