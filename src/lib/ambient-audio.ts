type AmbientSound = "rain" | "ocean" | "forest" | "white-noise" | "off";

const FADE_DURATION = 1; // seconds
const MASTER_VOLUME = 0.15;
const NOISE_BUFFER_SECONDS = 4;

class AmbientAudio {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sources: AudioBufferSourceNode[] = [];
  private oscillators: OscillatorNode[] = [];
  private allNodes: AudioNode[] = [];
  private current: AmbientSound = "off";
  private noiseBuffer: AudioBuffer | null = null;
  private birdTimeouts: ReturnType<typeof setTimeout>[] = [];

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer && this.noiseBuffer.sampleRate === ctx.sampleRate) {
      return this.noiseBuffer;
    }
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * NOISE_BUFFER_SECONDS;
    const buffer = ctx.createBuffer(2, length, sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  private createNoiseSource(ctx: AudioContext): AudioBufferSourceNode {
    const source = ctx.createBufferSource();
    source.buffer = this.getNoiseBuffer(ctx);
    source.loop = true;
    this.sources.push(source);
    return source;
  }

  private createMasterGain(ctx: AudioContext): GainNode {
    const master = ctx.createGain();
    // Start at 0 for fade-in
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(MASTER_VOLUME, ctx.currentTime + FADE_DURATION);
    master.connect(ctx.destination);
    this.masterGain = master;
    this.allNodes.push(master);
    return master;
  }

  private trackOscillator(osc: OscillatorNode): void {
    this.oscillators.push(osc);
    this.allNodes.push(osc);
  }

  private trackNode(node: AudioNode): void {
    this.allNodes.push(node);
  }

  // ─── Rain ────────────────────────────────────────────────────────
  // White noise through a bandpass filter (800-2000Hz range) with
  // subtle volume modulation to simulate rain intensity variation.

  private startRain(): void {
    const ctx = this.ensureContext();
    const master = this.createMasterGain(ctx);
    const source = this.createNoiseSource(ctx);

    // Bandpass filter: center at 1400Hz, wide Q to cover 800-2000Hz
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.value = 1400;
    bandpass.Q.value = 0.7;
    this.trackNode(bandpass);

    // A second higher bandpass layer for "detail" / crispness
    const source2 = this.createNoiseSource(ctx);
    const highBand = ctx.createBiquadFilter();
    highBand.type = "bandpass";
    highBand.frequency.value = 4000;
    highBand.Q.value = 0.5;
    this.trackNode(highBand);

    const highGain = ctx.createGain();
    highGain.gain.value = 0.3; // quieter high layer
    this.trackNode(highGain);

    // Subtle volume modulation LFO (~0.3Hz) for natural rain variation
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.3;
    this.trackOscillator(lfo);

    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.3; // modulate +/- 30% of signal
    this.trackNode(lfoGain);

    // Mix node before master
    const mix = ctx.createGain();
    mix.gain.value = 1.0;
    this.trackNode(mix);

    // Modulation: LFO -> lfoGain -> mix.gain
    lfo.connect(lfoGain);
    lfoGain.connect(mix.gain);

    // Signal chain: source -> bandpass -> mix -> master
    source.connect(bandpass);
    bandpass.connect(mix);
    mix.connect(master);

    // High detail layer
    source2.connect(highBand);
    highBand.connect(highGain);
    highGain.connect(mix);

    source.start();
    source2.start();
    lfo.start();
  }

  // ─── Ocean ───────────────────────────────────────────────────────
  // Lower frequency noise (200-600Hz) with a slow LFO (0.08Hz)
  // modulating volume to simulate waves coming and going.

  private startOcean(): void {
    const ctx = this.ensureContext();
    const master = this.createMasterGain(ctx);

    // Primary wave layer: low rumble
    const source1 = this.createNoiseSource(ctx);
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 400;
    lowpass.Q.value = 1.0;
    this.trackNode(lowpass);

    // Slow LFO at 0.08Hz (~12.5 second wave cycle)
    const waveLfo = ctx.createOscillator();
    waveLfo.type = "sine";
    waveLfo.frequency.value = 0.08;
    this.trackOscillator(waveLfo);

    const waveLfoDepth = ctx.createGain();
    waveLfoDepth.gain.value = 0.5; // deep modulation for wave effect
    this.trackNode(waveLfoDepth);

    const waveGain = ctx.createGain();
    waveGain.gain.value = 0.7;
    this.trackNode(waveGain);

    waveLfo.connect(waveLfoDepth);
    waveLfoDepth.connect(waveGain.gain);

    source1.connect(lowpass);
    lowpass.connect(waveGain);
    waveGain.connect(master);

    // Secondary wash layer: mid frequencies for the "hiss" of waves
    const source2 = this.createNoiseSource(ctx);
    const midBand = ctx.createBiquadFilter();
    midBand.type = "bandpass";
    midBand.frequency.value = 1200;
    midBand.Q.value = 0.5;
    this.trackNode(midBand);

    // Slightly faster LFO offset for the wash (0.09Hz, slightly out of phase)
    const washLfo = ctx.createOscillator();
    washLfo.type = "sine";
    washLfo.frequency.value = 0.09;
    this.trackOscillator(washLfo);

    const washLfoDepth = ctx.createGain();
    washLfoDepth.gain.value = 0.15;
    this.trackNode(washLfoDepth);

    const washGain = ctx.createGain();
    washGain.gain.value = 0.2;
    this.trackNode(washGain);

    washLfo.connect(washLfoDepth);
    washLfoDepth.connect(washGain.gain);

    source2.connect(midBand);
    midBand.connect(washGain);
    washGain.connect(master);

    source1.start();
    source2.start();
    waveLfo.start();
    washLfo.start();
  }

  // ─── Forest ──────────────────────────────────────────────────────
  // Filtered noise base (wind through trees) with intermittent
  // higher-frequency sine bursts simulating bird calls.

  private startForest(): void {
    const ctx = this.ensureContext();
    const master = this.createMasterGain(ctx);

    // Wind base: gentle broadband noise filtered to mid range
    const source = this.createNoiseSource(ctx);
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = "bandpass";
    windFilter.frequency.value = 600;
    windFilter.Q.value = 0.3;
    this.trackNode(windFilter);

    // Slow wind variation
    const windLfo = ctx.createOscillator();
    windLfo.type = "sine";
    windLfo.frequency.value = 0.15;
    this.trackOscillator(windLfo);

    const windLfoDepth = ctx.createGain();
    windLfoDepth.gain.value = 0.25;
    this.trackNode(windLfoDepth);

    const windGain = ctx.createGain();
    windGain.gain.value = 0.6;
    this.trackNode(windGain);

    windLfo.connect(windLfoDepth);
    windLfoDepth.connect(windGain.gain);

    source.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(master);

    // Gentle high rustle layer (leaves)
    const source2 = this.createNoiseSource(ctx);
    const rustleFilter = ctx.createBiquadFilter();
    rustleFilter.type = "highpass";
    rustleFilter.frequency.value = 3000;
    rustleFilter.Q.value = 0.5;
    this.trackNode(rustleFilter);

    const rustleGain = ctx.createGain();
    rustleGain.gain.value = 0.08;
    this.trackNode(rustleGain);

    source2.connect(rustleFilter);
    rustleFilter.connect(rustleGain);
    rustleGain.connect(master);

    source.start();
    source2.start();
    windLfo.start();

    // Intermittent bird calls using short sine tone chirps
    this.scheduleBirdCalls(ctx, master);
  }

  private scheduleBirdCalls(ctx: AudioContext, destination: AudioNode): void {
    const scheduleBird = () => {
      if (this.current !== "forest") return;

      // Random delay 2-6 seconds
      const delay = 2000 + Math.random() * 4000;
      const timeout = setTimeout(() => {
        if (this.current !== "forest") return;
        this.playBirdChirp(ctx, destination);
        scheduleBird();
      }, delay);
      this.birdTimeouts.push(timeout);
    };

    // Start first bird after a short delay
    const initial = setTimeout(() => {
      if (this.current !== "forest") return;
      scheduleBird();
    }, 1500);
    this.birdTimeouts.push(initial);
  }

  private playBirdChirp(ctx: AudioContext, destination: AudioNode): void {
    if (ctx.state !== "running") return;

    const now = ctx.currentTime;
    // Pick a random bird call pattern
    const patterns = [
      // Short high chirp
      { freqs: [2400, 2800, 2400], durations: [0.06, 0.06, 0.06], gap: 0.03 },
      // Descending whistle
      { freqs: [3200, 2600], durations: [0.12, 0.1], gap: 0.02 },
      // Quick double chirp
      { freqs: [2000, 2000], durations: [0.05, 0.05], gap: 0.1 },
      // Rising trill
      { freqs: [1800, 2200, 2600, 2200], durations: [0.04, 0.04, 0.04, 0.06], gap: 0.02 },
    ];

    const pattern = patterns[Math.floor(Math.random() * patterns.length)];
    const pan = (Math.random() - 0.5) * 1.6; // stereo position

    let offset = 0;
    for (let i = 0; i < pattern.freqs.length; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const panner = ctx.createStereoPanner();

      osc.type = "sine";
      osc.frequency.setValueAtTime(pattern.freqs[i], now + offset);

      // If there's a next freq, glide to it
      if (i < pattern.freqs.length - 1) {
        osc.frequency.linearRampToValueAtTime(
          pattern.freqs[i + 1],
          now + offset + pattern.durations[i]
        );
      }

      // Envelope: quick attack, quick release
      const dur = pattern.durations[i];
      gain.gain.setValueAtTime(0, now + offset);
      gain.gain.linearRampToValueAtTime(0.06, now + offset + 0.01);
      gain.gain.setValueAtTime(0.06, now + offset + dur - 0.01);
      gain.gain.linearRampToValueAtTime(0, now + offset + dur);

      panner.pan.value = pan;

      osc.connect(gain);
      gain.connect(panner);
      panner.connect(destination);

      osc.start(now + offset);
      osc.stop(now + offset + dur + 0.01);

      offset += dur + pattern.gap;
    }
  }

  // ─── White noise ─────────────────────────────────────────────────

  private startWhiteNoise(): void {
    const ctx = this.ensureContext();
    const master = this.createMasterGain(ctx);
    const source = this.createNoiseSource(ctx);

    // Gentle highpass to remove sub-bass rumble
    const highpass = ctx.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 200;
    highpass.Q.value = 0.5;
    this.trackNode(highpass);

    source.connect(highpass);
    highpass.connect(master);

    source.start();
  }

  // ─── Public API ──────────────────────────────────────────────────

  start(sound: AmbientSound): void {
    this.stop();

    if (sound === "off") {
      return;
    }

    switch (sound) {
      case "rain":
        this.startRain();
        break;
      case "ocean":
        this.startOcean();
        break;
      case "forest":
        this.startForest();
        break;
      case "white-noise":
        this.startWhiteNoise();
        break;
    }

    this.current = sound;
  }

  stop(): void {
    // Clear bird call timeouts
    for (const t of this.birdTimeouts) {
      clearTimeout(t);
    }
    this.birdTimeouts = [];

    // Fade out if we have a master gain and context
    if (this.masterGain && this.ctx && this.ctx.state === "running") {
      const ctx = this.ctx;
      const master = this.masterGain;
      const currentGain = master.gain.value;

      // Cancel any scheduled ramps and fade out
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(currentGain, ctx.currentTime);
      master.gain.linearRampToValueAtTime(0, ctx.currentTime + FADE_DURATION);

      // Schedule cleanup after fade completes
      const sources = [...this.sources];
      const oscillators = [...this.oscillators];
      const allNodes = [...this.allNodes];

      setTimeout(() => {
        for (const s of sources) {
          try { s.stop(); } catch { /* already stopped */ }
        }
        for (const o of oscillators) {
          try { o.stop(); } catch { /* already stopped */ }
        }
        for (const n of allNodes) {
          try { n.disconnect(); } catch { /* already disconnected */ }
        }
      }, FADE_DURATION * 1000 + 50);
    } else {
      // No context or suspended — hard stop
      for (const s of this.sources) {
        try { s.stop(); } catch { /* */ }
      }
      for (const o of this.oscillators) {
        try { o.stop(); } catch { /* */ }
      }
      for (const n of this.allNodes) {
        try { n.disconnect(); } catch { /* */ }
      }
    }

    this.sources = [];
    this.oscillators = [];
    this.allNodes = [];
    this.masterGain = null;
    this.current = "off";
  }

  isPlaying(): boolean {
    return this.current !== "off";
  }

  getCurrent(): AmbientSound {
    return this.current;
  }
}

export type { AmbientSound };
export const ambientAudio = new AmbientAudio();
