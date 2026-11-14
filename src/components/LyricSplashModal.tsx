import React from 'react';
import { Music, Sparkles } from 'lucide-react';
import { SongTrack } from '../types/game';

interface LyricSplashModalProps {
  track: SongTrack | null;
  onAcknowledge: () => void;
}

export const LyricSplashModal: React.FC<LyricSplashModalProps> = ({
  track,
  onAcknowledge,
}) => {
  if (!track) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#06080E]/95 backdrop-blur-md flex items-center justify-center p-6 text-center"
      role="dialog"
      aria-modal="true"
      aria-label="New AI Written Music Detected"
    >
      <div className="w-full max-w-lg rounded-2xl border border-[#C084FC]/45 bg-[#120F1D] p-7 sm:p-9 shadow-[0_0_60px_rgba(168,85,247,0.22)] space-y-5">
        <div className="mx-auto w-14 h-14 rounded-full border border-[#C084FC]/50 bg-[#C084FC]/15 flex items-center justify-center text-[#E9D5FF]">
          <Music className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-center gap-1.5 text-xs font-mono-tabular text-[#C084FC]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>NETWORK INTERCEPT · {track.album}</span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-white">
            New AI Written Music detected on Internet!
          </h2>
        </div>

        <div className="p-4 rounded-xl border border-white/10 bg-black/35">
          <div className="text-base font-semibold text-[#F5D0A4]">{track.title}</div>
          <p className="text-xs text-[#B8BCC4] mt-1">
            Lyrics and acoustic stems are now available in Mind research and your Acoustic Cache.
          </p>
        </div>

        <button
          type="button"
          onClick={onAcknowledge}
          className="w-full min-h-[48px] py-3 px-6 rounded-xl bg-[#C084FC] text-[#0B0D12] font-semibold text-sm hover:bg-[#D8B4FE] active:scale-[0.98] transition-all cursor-pointer"
        >
          Awesome!
        </button>
      </div>
    </div>
  );
};
