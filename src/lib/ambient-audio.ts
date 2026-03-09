type AmbientSound = "rain" | "ocean" | "white-noise" | "off";

class AmbientAudio {
  private ctx: AudioContext | null = null;
  private nodes: AudioNode[] = [];
  private current: AmbientSound = "off";

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private createNoiseBuffer(ctx: AudioContext): AudioBuffer {
    // 4 seconds of noise at the context sample rate, long enough to loop seamlessly
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * 4;
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private createNoiseSource(ctx: AudioContext): AudioBufferSourceNode {
    const source = ctx.createBufferSource();
    source.buffer = this.createNoiseBuffer(ctx);
    source.loop = true;
    return source;
  }

  private startRain(): void {
    const ctx = this.ensureContext();

    const source = this.createNoiseSource(ctx);

    // Bandpass filter to shape rain-like frequencies
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.value = 1200;
    bandpass.Q.value = 0.5;

    // Subtle LFO on gain for natural volume modulation
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.06;

    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.3;

    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 0.015;

    lfo.connect(lfoDepth);
    lfoDepth.connect(lfoGain.gain);

    // Master gain
    const master = ctx.createGain();
    master.gain.value = 0.05;

    source.connect(bandpass);
    bandpass.connect(lfoGain);
    lfoGain.connect(master);
    master.connect(ctx.destination);

    source.start();
    lfo.start();

    this.nodes = [source, bandpass, lfoGain, lfo, lfoDepth, master];
  }

  private startOcean(): void {
    const ctx = this.ensureContext();

    const source = this.createNoiseSource(ctx);

    // Lowpass filter for deep ocean rumble
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 400;
    lowpass.Q.value = 1;

    // Slow LFO (0.1Hz) to simulate wave cycling
    const waveGain = ctx.createGain();
    waveGain.gain.value = 0.05; // midpoint between 0.02 and 0.08

    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.1;

    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 0.03; // oscillates +/- 0.03 around 0.05

    lfo.connect(lfoDepth);
    lfoDepth.connect(waveGain.gain);

    // Master gain
    const master = ctx.createGain();
    master.gain.value = 0.05;

    source.connect(lowpass);
    lowpass.connect(waveGain);
    waveGain.connect(master);
    master.connect(ctx.destination);

    source.start();
    lfo.start();

    this.nodes = [source, lowpass, waveGain, lfo, lfoDepth, master];
  }

  private startWhiteNoise(): void {
    const ctx = this.ensureContext();

    const source = this.createNoiseSource(ctx);

    // Gentle highpass to remove sub-bass rumble
    const highpass = ctx.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 200;
    highpass.Q.value = 0.5;

    // Low volume gain
    const gain = ctx.createGain();
    gain.gain.value = 0.03;

    // Master gain
    const master = ctx.createGain();
    master.gain.value = 0.05;

    source.connect(highpass);
    highpass.connect(gain);
    gain.connect(master);
    master.connect(ctx.destination);

    source.start();

    this.nodes = [source, highpass, gain, master];
  }

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
      case "white-noise":
        this.startWhiteNoise();
        break;
    }

    this.current = sound;
  }

  stop(): void {
    for (const node of this.nodes) {
      try {
        if (node instanceof AudioBufferSourceNode) {
          node.stop();
        }
        if (node instanceof OscillatorNode) {
          node.stop();
        }
        node.disconnect();
      } catch {
        // Node may already be stopped or disconnected
      }
    }
    this.nodes = [];
    this.current = "off";
  }

  getCurrent(): AmbientSound {
    return this.current;
  }
}

export type { AmbientSound };
export const ambientAudio = new AmbientAudio();
