export class SoundManager {
  private ctx: AudioContext | null = null;
  private muted = false;

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  toggleMute(): void {
    this.muted = !this.muted;
  }

  isMuted(): boolean {
    return this.muted;
  }
}
