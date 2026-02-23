/**
 * Defender sound system — procedural Web Audio API synthesis.
 * Recreates the arcade's distinctive PWM-based sounds.
 */
export class SoundManager {
  private ctx: AudioContext | null = null;
  private muted = false;
  private masterGain: GainNode | null = null;

  // Looping sounds
  private thrustNode: AudioBufferSourceNode | null = null;
  private thrustGain: GainNode | null = null;

  ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private getMaster(): GainNode {
    this.ensureContext();
    return this.masterGain!;
  }

  toggleMute(): void {
    this.muted = !this.muted;
    if (this.muted) this.stopAllLoops();
  }

  isMuted(): boolean {
    return this.muted;
  }

  // ── Laser shot ────────────────────────────────────────────────

  playLaser(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    const master = this.getMaster();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(2000, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(gain).connect(master);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.08);
  }

  // ── Explosion ─────────────────────────────────────────────────

  playExplosion(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    const master = this.getMaster();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain).connect(master);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);

    // Noise
    const bufSize = Math.floor(ctx.sampleRate * 0.3);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.06, ctx.currentTime);
    nGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    noise.connect(nGain).connect(master);
    noise.start(ctx.currentTime);
    noise.stop(ctx.currentTime + 0.3);
  }

  // ── Smart bomb ────────────────────────────────────────────────

  playSmartBomb(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    const master = this.getMaster();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.6);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.connect(gain).connect(master);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.6);

    // White noise burst
    const bufSize = Math.floor(ctx.sampleRate * 0.5);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.08, ctx.currentTime);
    nGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    noise.connect(nGain).connect(master);
    noise.start(ctx.currentTime);
    noise.stop(ctx.currentTime + 0.5);
  }

  // ── Humanoid catch ────────────────────────────────────────────

  playHumanoidCatch(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    const master = this.getMaster();

    const notes = [440, 660, 880];
    for (let i = 0; i < notes.length; i++) {
      const t = ctx.currentTime + i * 0.06;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = notes[i];
      gain.gain.setValueAtTime(0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      osc.connect(gain).connect(master);
      osc.start(t);
      osc.stop(t + 0.08);
    }
  }

  // ── Player death ──────────────────────────────────────────────

  playDeath(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    const master = this.getMaster();

    for (const detune of [-10, 0, 10]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(500, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 1.0);
      osc.detune.value = detune;
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0);
      osc.connect(gain).connect(master);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 1.0);
    }
  }

  // ── Extra life ────────────────────────────────────────────────

  playExtraLife(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    const master = this.getMaster();

    const notes = [330, 440, 550, 660, 880];
    for (let i = 0; i < notes.length; i++) {
      const t = ctx.currentTime + i * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = notes[i];
      gain.gain.setValueAtTime(0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      osc.connect(gain).connect(master);
      osc.start(t);
      osc.stop(t + 0.1);
    }
  }

  // ── Hyperspace ────────────────────────────────────────────────

  playHyperspace(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    const master = this.getMaster();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain).connect(master);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  }

  // ── Thrust ────────────────────────────────────────────────────

  startThrust(): void {
    if (this.muted || this.thrustNode) return;
    const ctx = this.ensureContext();
    const master = this.getMaster();

    const bufSize = Math.floor(ctx.sampleRate * 0.5);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    this.thrustNode = ctx.createBufferSource();
    this.thrustNode.buffer = buf;
    this.thrustNode.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    this.thrustGain = ctx.createGain();
    this.thrustGain.gain.value = 0.04;

    this.thrustNode.connect(filter).connect(this.thrustGain).connect(master);
    this.thrustNode.start();
  }

  stopThrust(): void {
    if (this.thrustNode) {
      this.thrustNode.stop();
      this.thrustNode.disconnect();
      this.thrustNode = null;
      this.thrustGain = null;
    }
  }

  stopAllLoops(): void {
    this.stopThrust();
  }
}
