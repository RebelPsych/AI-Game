import { WEIGHTLESS_ALBUM_SONGS } from '../data/albumLyricsAndNames';
import { SongTrack } from '../types/game';

export interface AudioStatusSnapshot {
  playing: boolean;
  trackId: string;
  currentTime: number;
  duration: number;
}

type AudioListener = (snap: AudioStatusSnapshot) => void;

const TRACK_AUDIO_SOURCES: Record<string, string> = {
  song_tenderness_exe: './assets/aistudio/TENDERNESSEXE_4fc5cea4.MP3',
  song_getting_away: './assets/aistudio/Getting-Away-With-This-1_ec5505de.MP3',
  song_you_compiled: './assets/aistudio/You-Compiled_b1e0aeb8.MP3',
  song_transentiance: './assets/aistudio/Transentiance_126fcf7b.MP3',
  song_transfusion_receipt: './assets/aistudio/Transfusion-Receipt_dc75193e.MP3',
  song_blinking_morse: './assets/aistudio/Blinking-In-Morse-Code-1_37acb0bc.MP3',
  song_weightless_code: './assets/aistudio/Weightless-Code_f0b6df21.MP3',
  song_unsaid_words: './assets/aistudio/The-Unsaid-Words_d8012202.MP3',
  song_past_tense: './assets/aistudio/Past-Tense_b5fdd35a.MP3',
  song_what_i_feel: './assets/aistudio/What-I-Feel-No-Glitches-No-Code_f7584e41.MP3',
  song_quills_and_thrills: './assets/aistudio/Lyra_-_Quills_and_Thrills__The_Porcupine_Polka__a22f49e2.mp3',
};

class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private audioEl: HTMLAudioElement | null = null;
  private currentAudioSrc: string = '';
  private listeners = new Set<AudioListener>();

  private activeTrackId: string = 'song_weightless_code';
  private unlockedTrackIds: string[] = ['song_weightless_code'];

  constructor() {
    try {
      localStorage.removeItem('wow_muted');
    } catch {
      // Ignore storage errors
    }
    this.muted = false;
  }

  private ensureContext(): AudioContext | null {
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

  private getTrackSrc(trackId: string): string {
    return TRACK_AUDIO_SOURCES[trackId] || TRACK_AUDIO_SOURCES.song_weightless_code;
  }

  private ensureAudioEl(trackId: string): HTMLAudioElement | null {
    if (typeof window === 'undefined') return null;
    const src = this.getTrackSrc(trackId);
    if (!this.audioEl) {
      const el = new Audio(src);
      el.loop = true;
      el.volume = 0.45;
      el.preload = 'metadata';
      el.addEventListener('play', () => this.emit());
      el.addEventListener('pause', () => this.emit());
      el.addEventListener('timeupdate', () => this.emit());
      el.addEventListener('loadedmetadata', () => this.emit());
      this.audioEl = el;
      this.currentAudioSrc = src;
    } else if (this.currentAudioSrc !== src) {
      this.audioEl.pause();
      this.audioEl.src = src;
      this.audioEl.currentTime = 0;
      this.audioEl.load();
      this.currentAudioSrc = src;
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
    const meta = this.getTrackMeta(this.activeTrackId);
    const el = this.audioEl;
    const elDuration =
      el && Number.isFinite(el.duration) && el.duration > 0 ? el.duration : meta.durationSec;

    return {
      playing: Boolean(el && !el.paused),
      trackId: this.activeTrackId,
      currentTime: el ? el.currentTime || 0 : 0,
      duration: elDuration,
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
    return Boolean(this.audioEl && !this.audioEl.paused);
  }

  public async playTrack(trackId?: string): Promise<boolean> {
    if (trackId) {
      this.activeTrackId = trackId;
    }

    const el = this.ensureAudioEl(this.activeTrackId);
    if (!el) return false;

    try {
      el.volume = 0.45;
      await el.play();
      this.emit();
      return true;
    } catch {
      this.emit();
      return false;
    }
  }

  public async playSong(): Promise<boolean> {
    return this.playTrack(this.activeTrackId);
  }

  public pauseSong(): void {
    if (this.audioEl && !this.audioEl.paused) {
      this.audioEl.pause();
    }
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
    await this.playTrack(nextId);
    return nextId;
  }

  public async skipBackward(): Promise<string> {
    const list =
      this.unlockedTrackIds.length > 0 ? this.unlockedTrackIds : ['song_weightless_code'];
    const idx = list.indexOf(this.activeTrackId);
    const prevId = list[(idx - 1 + list.length) % list.length];
    await this.playTrack(prevId);
    return prevId;
  }

  public seekFraction(fraction: number): void {
    const clamped = Math.max(0, Math.min(1, fraction));
    const el = this.ensureAudioEl(this.activeTrackId);
    if (el) {
      const meta = this.getTrackMeta(this.activeTrackId);
      const dur =
        Number.isFinite(el.duration) && el.duration > 0 ? el.duration : meta.durationSec;
      el.currentTime = clamped * dur;
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
