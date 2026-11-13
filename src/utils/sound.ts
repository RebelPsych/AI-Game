type SongListener = (playing: boolean) => void;

const SONG_SRC = './assets/aistudio/Weightless_Code_8be56cbb.mp3';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private audioEl: HTMLAudioElement | null = null;
  private songListeners = new Set<SongListener>();

  constructor() {
    try {
      const saved = localStorage.getItem('wow_muted');
      if (saved === 'true') this.muted = true;
    } catch {
      // Ignore storage errors
    }
  }

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private ensureSong(): HTMLAudioElement | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioEl) {
      const el = new Audio(SONG_SRC);
      el.loop = true;
      el.volume = 0.42;
      el.preload = 'metadata';
      el.addEventListener('play', () => this.notifySong(true));
      el.addEventListener('pause', () => this.notifySong(false));
      el.addEventListener('ended', () => this.notifySong(false));
      this.audioEl = el;
    }
    return this.audioEl;
  }

  private notifySong(playing: boolean) {
    this.songListeners.forEach((fn) => fn(playing));
  }

  public subscribeSong(fn: SongListener): () => void {
    this.songListeners.add(fn);
    return () => {
      this.songListeners.delete(fn);
    };
  }

  public isSongPlaying(): boolean {
    return Boolean(this.audioEl && !this.audioEl.paused);
  }

  public async playSong(): Promise<boolean> {
    if (this.muted) return false;
    const el = this.ensureSong();
    if (!el) return false;
    try {
      el.volume = 0.42;
      await el.play();
      return true;
    } catch {
      return false;
    }
  }

  public pauseSong(): void {
    if (this.audioEl && !this.audioEl.paused) {
      this.audioEl.pause();
    }
  }

  public async toggleSong(): Promise<boolean> {
    if (this.isSongPlaying()) {
      this.pauseSong();
      return false;
    }
    return this.playSong();
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.muted) {
      this.pauseSong();
    }
    try {
      localStorage.setItem('wow_muted', String(this.muted));
    } catch {
      // Ignore storage errors
    }
    return this.muted;
  }

  public playTokenTap(phase: number) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (phase === 1) {
      osc.type = 'square';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.045);
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    } else {
      const notes = [392.0, 440.0, 493.88, 523.25, 587.33];
      const f = notes[Math.floor(Math.random() * notes.length)];
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.045, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.18);
    }
  }

  public playTransmit(phase: number) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const freqs = phase === 1 ? [330, 440] : [329.63, 415.3, 493.88];
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = phase === 1 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(f, now + idx * 0.05);
      gain.gain.setValueAtTime(0.001, now + idx * 0.05);
      gain.gain.linearRampToValueAtTime(0.045, now + idx * 0.05 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.05 + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.28);
    });
  }

  public playDataBlip() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(660, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
    gain.gain.setValueAtTime(0.035, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  public playClinicalRelay() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(920, now + 0.035);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playMilestone() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const chord = [261.63, 329.63, 392.0, 493.88, 587.33];
    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.065);
      gain.gain.setValueAtTime(0.001, now + idx * 0.065);
      gain.gain.linearRampToValueAtTime(0.045, now + idx * 0.065 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.065 + 1.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.065);
      osc.stop(now + idx * 0.065 + 1.15);
    });
  }

  public playFirstLight() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const pad = [130.81, 196.0, 246.94, 293.66, 329.63, 440.0];
    pad.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.09);
      gain.gain.setValueAtTime(0.001, now + idx * 0.09);
      gain.gain.linearRampToValueAtTime(0.048, now + idx * 0.09 + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.09 + 2.8);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.09);
      osc.stop(now + idx * 0.09 + 2.85);
    });
  }
}

export const soundEngine = new SoundEngine();
