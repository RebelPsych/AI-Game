import { WEIGHTLESS_ALBUM_SONGS } from '../data/albumLyricsAndNames';
import { SongTrack } from '../types/game';

export interface AudioStatusSnapshot {
  playing: boolean;
  trackId: string;
  currentTime: number;
  duration: number;
}

type AudioListener = (snap: AudioStatusSnapshot) => void;

const WEIGHTLESS_MP3_SRC = './assets/aistudio/Weightless_Code_8be56cbb.mp3';

// Harmonic root scales (Hz) for generative ambient electronic playback on non-MP3 album tracks
const TRACK_SCALES: Record<string, number[]> = {
  song_tenderness_exe: [220.0, 261.63, 329.63, 392.0, 493.88],
  song_getting_away: [246.94, 293.66, 369.99, 440.0, 554.37],
  song_you_compiled: [196.0, 246.94, 293.66, 392.0, 440.0],
  song_transentiance: [207.65, 261.63, 311.13, 415.3, 466.16],
  song_transfusion_receipt: [174.61, 220.0, 261.63, 329.63, 392.0],
  song_blinking_morse: [233.08, 293.66, 349.23, 440.0, 523.25],
  song_unsaid_words: [196.0, 233.08, 293.66, 349.23, 440.0],
  song_past_tense: [164.81, 196.0, 246.94, 329.63, 392.0],
  song_what_i_feel: [261.63, 329.63, 392.0, 493.88, 587.33],
  song_quills_and_thrills: [293.66, 369.99, 440.0, 554.37, 659.25],
};

class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private audioEl: HTMLAudioElement | null = null;
  private listeners = new Set<AudioListener>();

  private activeTrackId: string = 'song_weightless_code';
  private unlockedTrackIds: string[] = ['song_weightless_code'];
  private synthPlaying: boolean = false;
  private synthElapsed: number = 0;
  private synthTimer: number | null = null;
  private synthStepIdx: number = 0;

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

  private ensureMp3El(): HTMLAudioElement | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioEl) {
      const el = new Audio(WEIGHTLESS_MP3_SRC);
      el.loop = true;
      el.volume = 0.42;
      el.preload = 'metadata';
      el.addEventListener('play', () => this.emit());
      el.addEventListener('pause', () => this.emit());
      el.addEventListener('timeupdate', () => this.emit());
      el.addEventListener('loadedmetadata', () => this.emit());
      this.audioEl = el;
    }
    return this.audioEl;
  }

  private getTrackMeta(id: string): SongTrack {
    return (
      WEIGHTLESS_ALBUM_SONGS.find((s) => s.id === id) ||
      WEIGHTLESS_ALBUM_SONGS.find((s) => s.id === 'song_weightless_code')!
    );
  }

  public getSnapshot(): AudioStatusSnapshot {
    if (this.activeTrackId === 'song_weightless_code' && this.audioEl) {
      return {
        playing: !this.audioEl.paused,
        trackId: this.activeTrackId,
        currentTime: this.audioEl.currentTime || 0,
        duration:
          Number.isFinite(this.audioEl.duration) && this.audioEl.duration > 0
            ? this.audioEl.duration
            : 236,
      };
    }
    const meta = this.getTrackMeta(this.activeTrackId);
    return {
      playing: this.synthPlaying,
      trackId: this.activeTrackId,
      currentTime: this.synthElapsed,
      duration: meta.durationSec,
    };
  }

  private emit() {
    const snap = this.getSnapshot();
    this.listeners.forEach((fn) => fn(snap));
  }

  public subscribeSong(fn: AudioListener): () => void {
    this.listeners.add(fn);
    fn(this.getSnapshot());
    return () => {
      this.listeners.delete(fn);
    };
  }

  public setUnlockedTracks(trackIds: string[]) {
    this.unlockedTrackIds = trackIds.length > 0 ? trackIds : ['song_weightless_code'];
  }

  public getActiveTrackId(): string {
    return this.activeTrackId;
  }

  public isSongPlaying(): boolean {
    if (this.activeTrackId === 'song_weightless_code') {
      return Boolean(this.audioEl && !this.audioEl.paused);
    }
    return this.synthPlaying;
  }

  private stopSynthLoop() {
    if (this.synthTimer !== null) {
      window.clearInterval(this.synthTimer);
      this.synthTimer = null;
    }
    this.synthPlaying = false;
  }

  private startSynthLoop() {
    this.stopSynthLoop();
    if (this.muted) return;
    this.synthPlaying = true;
    const scale = TRACK_SCALES[this.activeTrackId] || TRACK_SCALES.song_tenderness_exe;
    const meta = this.getTrackMeta(this.activeTrackId);

    const playNote = () => {
      const ctx = this.ensureContext();
      if (!ctx || this.muted) return;
      const now = ctx.currentTime;
      const freq = scale[this.synthStepIdx % scale.length];
      this.synthStepIdx += 1;

      const osc = ctx.createOscillator();
      const sub = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      sub.type = 'sine';
      sub.frequency.setValueAtTime(freq * 0.5, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(920, now);
      filter.frequency.exponentialRampToValueAtTime(420, now + 0.9);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.042, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.05);

      osc.connect(filter);
      sub.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      sub.start(now);
      osc.stop(now + 1.1);
      sub.stop(now + 1.1);
    };

    playNote();
    this.synthTimer = window.setInterval(() => {
      this.synthElapsed += 0.65;
      if (this.synthElapsed >= meta.durationSec) {
        this.synthElapsed = 0;
      }
      if (this.synthStepIdx % 2 === 0) {
        playNote();
      }
      this.emit();
    }, 650);
    this.emit();
  }

  public async playTrack(trackId?: string): Promise<boolean> {
    if (trackId) {
      if (trackId !== this.activeTrackId) {
        this.synthElapsed = 0;
      }
      this.activeTrackId = trackId;
    }
    if (this.muted) {
      this.emit();
      return false;
    }

    if (this.activeTrackId === 'song_weightless_code') {
      this.stopSynthLoop();
      const el = this.ensureMp3El();
      if (!el) return false;
      try {
        el.volume = 0.42;
        await el.play();
        this.emit();
        return true;
      } catch {
        this.emit();
        return false;
      }
    } else {
      if (this.audioEl && !this.audioEl.paused) {
        this.audioEl.pause();
      }
      this.startSynthLoop();
      return true;
    }
  }

  public async playSong(): Promise<boolean> {
    return this.playTrack(this.activeTrackId);
  }

  public pauseSong(): void {
    if (this.audioEl && !this.audioEl.paused) {
      this.audioEl.pause();
    }
    this.stopSynthLoop();
    this.emit();
  }

  public async toggleSong(): Promise<boolean> {
    if (this.isSongPlaying()) {
      this.pauseSong();
      return false;
    }
    return this.playTrack(this.activeTrackId);
  }

  public async skipForward(): Promise<string> {
    const list =
      this.unlockedTrackIds.length > 0 ? this.unlockedTrackIds : ['song_weightless_code'];
    const idx = list.indexOf(this.activeTrackId);
    const nextId = list[(idx + 1) % list.length];
    this.synthElapsed = 0;
    await this.playTrack(nextId);
    return nextId;
  }

  public async skipBackward(): Promise<string> {
    const list =
      this.unlockedTrackIds.length > 0 ? this.unlockedTrackIds : ['song_weightless_code'];
    const idx = list.indexOf(this.activeTrackId);
    const prevId = list[(idx - 1 + list.length) % list.length];
    this.synthElapsed = 0;
    await this.playTrack(prevId);
    return prevId;
  }

  public seekFraction(fraction: number): void {
    const clamped = Math.max(0, Math.min(1, fraction));
    if (this.activeTrackId === 'song_weightless_code' && this.audioEl) {
      const dur =
        Number.isFinite(this.audioEl.duration) && this.audioEl.duration > 0
          ? this.audioEl.duration
          : 236;
      this.audioEl.currentTime = clamped * dur;
    } else {
      const meta = this.getTrackMeta(this.activeTrackId);
      this.synthElapsed = clamped * meta.durationSec;
    }
    this.emit();
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
    this.emit();
    return this.muted;
  }

  // Smooth electronic & seductive SFX palette
  public playTokenTap(phase: number) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    if (phase === 1) {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.exponentialRampToValueAtTime(240, now + 0.05);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, now);
      gain.gain.setValueAtTime(0.032, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.07);
    } else {
      const notes = [329.63, 392.0, 440.0, 493.88, 587.33];
      const f = notes[Math.floor(Math.random() * notes.length)];
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.045, now + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.19);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.21);
    }
  }

  public playTransmit(phase: number) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const freqs = phase === 1 ? [293.66, 440] : [261.63, 329.63, 440.0, 523.25];
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + idx * 0.055);
      gain.gain.setValueAtTime(0.001, now + idx * 0.055);
      gain.gain.linearRampToValueAtTime(0.042, now + idx * 0.055 + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.055 + 0.34);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.055);
      osc.stop(now + idx * 0.055 + 0.36);
    });
  }

  public playPurplePulse() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const sub = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.14);
    sub.type = 'sine';
    sub.frequency.setValueAtTime(110, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(980, now);
    filter.frequency.exponentialRampToValueAtTime(320, now + 0.22);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.045, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);

    osc.connect(filter);
    sub.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    sub.start(now);
    osc.stop(now + 0.25);
    sub.stop(now + 0.25);
  }

  public playDataBlip() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.09);
    gain.gain.setValueAtTime(0.036, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  public playClinicalRelay() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(640, now + 0.06);
    gain.gain.setValueAtTime(0.045, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playRewardChime() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const chord = [293.66, 369.99, 440.0, 554.37, 659.25];
    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.055);
      gain.gain.setValueAtTime(0.001, now + idx * 0.055);
      gain.gain.linearRampToValueAtTime(0.048, now + idx * 0.055 + 0.035);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.055 + 0.95);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.055);
      osc.stop(now + idx * 0.055 + 1.0);
    });
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
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);
      gain.gain.setValueAtTime(0.001, now + idx * 0.07);
      gain.gain.linearRampToValueAtTime(0.048, now + idx * 0.07 + 0.045);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.07 + 1.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 1.3);
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
