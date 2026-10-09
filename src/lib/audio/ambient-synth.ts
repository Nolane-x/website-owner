// Procedural Web Audio Ambient Soundscapes Synthesizer

export type AmbientSoundType = 'rain' | 'ocean' | 'campfire' | 'binaural' | 'whitenoise';

export class AmbientSynthesizer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private currentType: AmbientSoundType | null = null;
  private activeNodes: { stop?: () => void; disconnect: () => void }[] = [];
  private lfoInterval: number | null = null;

  constructor() {
    // Lazy initialized on first user interaction
  }

  private initContext(): boolean {
    if (typeof window === 'undefined') return false;
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtxClass) return false;
      this.ctx = new AudioCtxClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.5, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return true;
  }

  private createNoiseBuffer(durationSeconds = 5): AudioBuffer | null {
    if (!this.ctx) return null;
    const bufferSize = this.ctx.sampleRate * durationSeconds;
    const buffer = this.ctx.createBuffer(2, bufferSize, this.ctx.sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const channelData = buffer.getChannelData(channel);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        // Pink / Brown noise filter
        const white = Math.random() * 2 - 1;
        channelData[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = channelData[i];
        channelData[i] *= 3.5; // Gain compensation
      }
    }
    return buffer;
  }

  public start(type: AmbientSoundType, volume = 0.5): void {
    this.stop();
    if (!this.initContext() || !this.ctx || !this.masterGain) return;

    this.currentType = type;
    this.setVolume(volume);

    switch (type) {
      case 'rain': {
        const noise = this.ctx.createBufferSource();
        const buffer = this.createNoiseBuffer(5);
        if (!buffer) return;
        noise.buffer = buffer;
        noise.loop = true;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1100, this.ctx.currentTime);

        const highpass = this.ctx.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.setValueAtTime(280, this.ctx.currentTime);

        noise.connect(highpass);
        highpass.connect(filter);
        filter.connect(this.masterGain);

        noise.start();
        this.activeNodes.push(noise, filter, highpass);
        break;
      }

      case 'ocean': {
        const noise = this.ctx.createBufferSource();
        const buffer = this.createNoiseBuffer(6);
        if (!buffer) return;
        noise.buffer = buffer;
        noise.loop = true;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, this.ctx.currentTime);

        const swellGain = this.ctx.createGain();
        swellGain.gain.setValueAtTime(0.2, this.ctx.currentTime);

        noise.connect(filter);
        filter.connect(swellGain);
        swellGain.connect(this.masterGain);

        noise.start();
        this.activeNodes.push(noise, filter, swellGain);

        // Chu kỳ sóng vỗ tự nhiên 8 giây
        let waveCycle = 0;
        const interval = window.setInterval(() => {
          if (!this.ctx || this.currentType !== 'ocean') return;
          waveCycle += 0.15;
          const targetVol = 0.15 + 0.55 * Math.sin(waveCycle) ** 2;
          swellGain.gain.setTargetAtTime(targetVol, this.ctx.currentTime, 0.5);
        }, 300);
        this.lfoInterval = interval;
        break;
      }

      case 'binaural': {
        // Tần số sóng Alpha (Alpha waves: 14Hz chênh lệch cho sự tập trung sâu)
        const leftOsc = this.ctx.createOscillator();
        const rightOsc = this.ctx.createOscillator();
        const merger = this.ctx.createChannelMerger(2);

        leftOsc.type = 'sine';
        leftOsc.frequency.setValueAtTime(216, this.ctx.currentTime);

        rightOsc.type = 'sine';
        rightOsc.frequency.setValueAtTime(230, this.ctx.currentTime); // 230 - 216 = 14Hz

        leftOsc.connect(merger, 0, 0);
        rightOsc.connect(merger, 0, 1);
        merger.connect(this.masterGain);

        leftOsc.start();
        rightOsc.start();
        this.activeNodes.push(leftOsc, rightOsc, merger);
        break;
      }

      case 'campfire':
      case 'whitenoise': {
        const noise = this.ctx.createBufferSource();
        const buffer = this.createNoiseBuffer(4);
        if (!buffer) return;
        noise.buffer = buffer;
        noise.loop = true;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(type === 'campfire' ? 650 : 2500, this.ctx.currentTime);

        noise.connect(filter);
        filter.connect(this.masterGain);

        noise.start();
        this.activeNodes.push(noise, filter);
        break;
      }
    }
  }

  public setVolume(volume: number): void {
    if (!this.masterGain || !this.ctx) return;
    const safeVol = Math.max(0, Math.min(1, volume));
    this.masterGain.gain.setTargetAtTime(safeVol, this.ctx.currentTime, 0.05);
  }

  public stop(): void {
    if (this.lfoInterval !== null) {
      clearInterval(this.lfoInterval);
      this.lfoInterval = null;
    }
    for (const node of this.activeNodes) {
      try {
        if (node.stop) node.stop();
        node.disconnect();
      } catch {
        // Ignore disconnect errors
      }
    }
    this.activeNodes = [];
    this.currentType = null;
  }

  public isPlaying(): boolean {
    return this.currentType !== null;
  }

  public getCurrentType(): AmbientSoundType | null {
    return this.currentType;
  }
}

export const ambientSynth = new AmbientSynthesizer();
