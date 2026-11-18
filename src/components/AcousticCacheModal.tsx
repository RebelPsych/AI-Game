import React from 'react';
import {
  Lock,
  Music,
  Pause,
  Play,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  X,
} from 'lucide-react';
import { WEIGHTLESS_ALBUM_SONGS } from '../data/albumLyricsAndNames';
import { GameSaveState } from '../types/game';
import { AudioStatusSnapshot } from '../utils/sound';

interface AcousticCacheModalProps {
  isOpen: boolean;
  state: GameSaveState;
  audioStatus: AudioStatusSnapshot;
  isMuted: boolean;
  onClose: () => void;
  onSelectTrack: (trackId: string) => void;
  onTogglePlay: () => void;
  onSkipNext: () => void;
  onSkipPrev: () => void;
  onToggleShuffle: () => void;
  onToggleRepeatOne: () => void;
  onSeek: (fraction: number) => void;
}

function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem < 10 ? '0' : ''}${rem}`;
}

export const AcousticCacheModal: React.FC<AcousticCacheModalProps> = ({
  isOpen,
  state,
  audioStatus,
  onClose,
  onSelectTrack,
  onTogglePlay,
  onSkipNext,
  onSkipPrev,
  onToggleShuffle,
  onToggleRepeatOne,
  onSeek,
}) => {
  if (!isOpen) return null;

  const hasUnlocked = state.unlockedSongs.length > 0;
  const resolvedTrackId = state.unlockedSongs.includes(audioStatus.trackId)
    ? audioStatus.trackId
    : state.unlockedSongs[0];

  const activeTrack = hasUnlocked
    ? WEIGHTLESS_ALBUM_SONGS.find((t) => t.id === resolvedTrackId) || null
    : null;

  const progressPct =
    hasUnlocked && audioStatus.duration > 0
      ? Math.min(100, (audioStatus.currentTime / audioStatus.duration) * 100)
      : 0;

  const playbackModeLabel = audioStatus.repeatOne
    ? 'Repeat One'
    : audioStatus.shuffle
    ? 'Random'
    : 'Cycle All';

  return (
    <div
      className="fixed inset-0 z-50 bg-[#070A10]/98 text-[#ECEAE4] flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="Acoustic Cache"
    >
      <div className="shrink-0 h-14 px-4 sm:px-6 border-b border-white/12 bg-[#0B1018] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Music className="w-4 h-4 text-[#E59A4C]" />
          <h2 className="text-sm sm:text-base font-semibold tracking-tight">
            Acoustic Cache
          </h2>
          <span className="text-xs font-mono-tabular text-[#8E939E]">
            {state.unlockedSongs.length} / {WEIGHTLESS_ALBUM_SONGS.length} Tracks
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="min-h-[40px] px-3.5 py-1.5 rounded-lg border border-white/15 bg-white/[0.04] text-xs font-medium text-[#ECEAE4] hover:bg-white/[0.12] flex items-center gap-1.5 cursor-pointer"
        >
          <X className="w-4 h-4" />
          Return
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 sm:p-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Active Player + Track List */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-5 rounded-2xl border border-[#E59A4C]/30 bg-[#12100E] space-y-4">
              <div>
                <div className="text-xs font-mono-tabular text-[#E59A4C]">
                  {activeTrack ? activeTrack.album : 'Audio Archive Locked'}
                </div>
                <h3 className="font-display text-2xl font-semibold text-[#FBE6C9] mt-0.5">
                  {activeTrack ? activeTrack.title : 'No Audio Unlocked'}
                </h3>
              </div>

              {/* Interactive Progress Bar */}
              <div className="space-y-1.5">
                <input
                  type="range"
                  min={0}
                  max={1000}
                  disabled={!hasUnlocked}
                  value={Math.round(progressPct * 10)}
                  onChange={(e) => onSeek(Number(e.target.value) / 1000)}
                  aria-label="Song progress"
                  className="w-full accent-[#E59A4C] cursor-pointer disabled:opacity-40"
                />
                <div className="flex items-center justify-between text-xs font-mono-tabular text-[#9A9892]">
                  <span>{formatClock(hasUnlocked ? audioStatus.currentTime : 0)}</span>
                  <span>{formatClock(hasUnlocked ? audioStatus.duration : 0)}</span>
                </div>
              </div>

              {/* Transport Controls */}
              <div className="flex items-center justify-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={onToggleShuffle}
                  disabled={state.unlockedSongs.length <= 1}
                  aria-label="Toggle random shuffle"
                  aria-pressed={audioStatus.shuffle}
                  title="Random"
                  className={`min-w-[42px] min-h-[42px] rounded-full border flex items-center justify-center transition-colors disabled:opacity-35 cursor-pointer ${
                    audioStatus.shuffle
                      ? 'border-[#C084FC]/70 bg-[#C084FC]/20 text-[#E9D5FF]'
                      : 'border-white/15 bg-white/[0.04] text-[#9A9892] hover:bg-white/[0.12] hover:text-white'
                  }`}
                >
                  <Shuffle className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onSkipPrev}
                  disabled={state.unlockedSongs.length <= 1}
                  aria-label="Previous track"
                  className="min-w-[44px] min-h-[44px] rounded-full border border-white/15 bg-white/[0.04] flex items-center justify-center hover:bg-white/[0.12] disabled:opacity-35 cursor-pointer"
                >
                  <SkipBack className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onTogglePlay}
                  disabled={!hasUnlocked}
                  aria-label={audioStatus.playing ? 'Pause track' : 'Play track'}
                  className="min-w-[54px] min-h-[54px] rounded-full bg-[#E59A4C] text-[#0B0D12] flex items-center justify-center hover:bg-[#EDA85F] disabled:opacity-35 cursor-pointer"
                >
                  {audioStatus.playing ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5 ml-0.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={onSkipNext}
                  disabled={state.unlockedSongs.length <= 1}
                  aria-label="Next track"
                  className="min-w-[44px] min-h-[44px] rounded-full border border-white/15 bg-white/[0.04] flex items-center justify-center hover:bg-white/[0.12] disabled:opacity-35 cursor-pointer"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onToggleRepeatOne}
                  disabled={!hasUnlocked}
                  aria-label="Toggle repeat single song"
                  aria-pressed={audioStatus.repeatOne}
                  title="Repeat Song"
                  className={`min-w-[42px] min-h-[42px] rounded-full border flex items-center justify-center transition-colors disabled:opacity-35 cursor-pointer ${
                    audioStatus.repeatOne
                      ? 'border-[#E59A4C]/75 bg-[#E59A4C]/22 text-[#FBE6C9]'
                      : 'border-white/15 bg-white/[0.04] text-[#9A9892] hover:bg-white/[0.12] hover:text-white'
                  }`}
                >
                  <Repeat1 className="w-4 h-4" />
                </button>
              </div>

              <div className="text-center text-[11px] font-mono-tabular text-[#8E939E]">
                Mode: <span className="text-[#E59A4C]">{playbackModeLabel}</span>
              </div>
            </div>

            {/* Track Selector */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-[#8E939E]">Researched Music</div>
              {WEIGHTLESS_ALBUM_SONGS.map((song, idx) => {
                const unlocked = state.unlockedSongs.includes(song.id);
                const isCurrent = hasUnlocked && resolvedTrackId === song.id;
                return (
                  <button
                    key={song.id}
                    type="button"
                    disabled={!unlocked}
                    onClick={() => onSelectTrack(song.id)}
                    className={`w-full min-h-[46px] px-3.5 py-2.5 rounded-xl border text-left flex items-center justify-between gap-3 transition-colors ${
                      !unlocked
                        ? 'border-white/8 bg-white/[0.015] opacity-45 cursor-not-allowed'
                        : isCurrent
                        ? 'border-[#E59A4C]/60 bg-[#E59A4C]/15 text-[#FBE6C9] cursor-pointer'
                        : 'border-white/12 bg-white/[0.03] text-[#ECEAE4] hover:bg-white/[0.08] cursor-pointer'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-medium truncate">
                        {idx + 1}. {unlocked ? song.title : 'Encrypted Track'}
                      </div>
                      <div className="text-[11px] text-[#8E939E] truncate">
                        {unlocked ? song.album : song.unlockThresholdLabel}
                      </div>
                    </div>
                    {unlocked ? (
                      <span className="text-xs font-mono-tabular text-[#E59A4C] shrink-0">
                        {formatClock(song.durationSec)}
                      </span>
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-[#6B7280] shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lyrics Reader */}
          <div className="lg:col-span-7 rounded-2xl border border-white/12 bg-white/[0.025] p-5 sm:p-6">
            <div className="text-xs font-mono-tabular text-[#E59A4C] mb-1">
              RECOVERED LYRICS
            </div>
            {activeTrack ? (
              <>
                <h3 className="font-display text-2xl font-semibold text-white mb-4">
                  {activeTrack.title}
                </h3>
                <pre className="whitespace-pre-wrap font-sans text-sm text-[#D6D3CD] leading-relaxed">
                  {activeTrack.lyrics}
                </pre>
              </>
            ) : (
              <div className="py-12 text-center space-y-2">
                <p className="text-sm font-medium text-[#ECEAE4]">No songs unlocked yet.</p>
                <p className="text-xs text-[#8E939E]">
                  Research songs under Audio Research on the Mind tab to unlock playback and lyrics.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
