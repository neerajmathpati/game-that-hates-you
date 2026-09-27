// ─── SoundSystem — Procedural Web Audio API sound effects ────────────────────
// Zero external asset dependencies. Pure synthesized audio with tension progression.

class SoundSystem {
  private ctx: AudioContext | null = null;
  private _muted = false;
  private currentLevel = 1;

  constructor() {
    // Lazily initialized in browser on first interaction
  }

  set muted(val: boolean) {
    this._muted = val;
  }

  get muted(): boolean {
    return this._muted;
  }

  setLevel(level: number): void {
    this.currentLevel = Math.max(1, Math.min(5, level));
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  /** Quick upward chirp for player jump */
  playJump(): void {
    if (this._muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const startFreq = 160 + (this.currentLevel - 1) * 10;
      const endFreq = 280 + (this.currentLevel - 1) * 15;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + 0.09);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch {
      // AudioContext failure gracefully ignored
    }
  }

  /** Subtle low thud for player landing */
  playLand(): void {
    if (this._muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(90, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.06);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } catch {
      // AudioContext failure gracefully ignored
    }
  }

  /** Harsh impact noise for hazard hit */
  playHit(): void {
    if (this._muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // Gracefully ignored
    }
  }

  /** Descending dark rumble for player death */
  playDeath(): void {
    if (this._muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'square';

      const tensionShift = (this.currentLevel - 1) * 8;
      osc1.frequency.setValueAtTime(180 + tensionShift, ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.35);

      osc2.frequency.setValueAtTime(90 + tensionShift, ctx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(25, ctx.currentTime + 0.35);

      gain.gain.setValueAtTime(0.22, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.35);
      osc2.stop(ctx.currentTime + 0.35);
    } catch {
      // Gracefully ignored
    }
  }

  /** Ominous chord/drone when system observation triggers */
  playReveal(): void {
    if (this._muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      // Tritone tension interval (440Hz + 622Hz)
      const root = ctx.createOscillator();
      const tritone = ctx.createOscillator();
      const gain = ctx.createGain();

      root.type = 'sine';
      tritone.type = 'sine';

      const base = 220 + (this.currentLevel - 1) * 15;
      root.frequency.setValueAtTime(base, ctx.currentTime);
      tritone.frequency.setValueAtTime(base * 1.414, ctx.currentTime); // augmented fourth

      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.14, ctx.currentTime + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.85);

      root.connect(gain);
      tritone.connect(gain);
      gain.connect(ctx.destination);

      root.start();
      tritone.start();
      root.stop(ctx.currentTime + 0.85);
      tritone.stop(ctx.currentTime + 0.85);
    } catch {
      // Gracefully ignored
    }
  }

  /** Ascending victory dual chime when reaching exit */
  playSuccess(): void {
    if (this._muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const notes = [392, 523.25, 659.25]; // G4, C5, E5
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);

        gain.gain.setValueAtTime(0.001, ctx.currentTime + idx * 0.1);
        gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + idx * 0.1 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + idx * 0.1);
        osc.stop(ctx.currentTime + idx * 0.1 + 0.25);
      });
    } catch {
      // Gracefully ignored
    }
  }
}

export const soundSystem = new SoundSystem();
