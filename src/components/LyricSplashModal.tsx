import React from 'react';
import { Music } from 'lucide-react';
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
      className="fixed inset-0 z-50 bg-[#06080E]/92 backdrop-blur-md flex items-center justify-center p-6 text-center"
      role="dialog"
      aria-modal="true"
      aria-label="New Audio"
    >
      <div className="w-full max-w-md rounded-2xl border border-[#C084FC]/45 bg-[#120F1D] p-7 shadow-[0_0_60px_rgba(168,85,247,0.22)] space-y-5">
        <div className="mx-auto w-14 h-14 rounded-full border border-[#C084FC]/50 bg-[#C084FC]/15 flex items-center justify-center text-[#E9D5FF]">
          <Music className="w-7 h-7" />
        </div>

        <div className="space-y-1">
          <div className="text-xs font-mono-tabular uppercase tracking-wider text-[#C084FC]">
            {track.album}
          </div>
          <h2 className="font-display text-3xl font-semibold text-white">
            New Audio
          </h2>
        </div>

        <div className="p-4 rounded-xl border border-white/10 bg-black/35">
          <div className="text-base font-semibold text-[#F5D0A4]">{track.title}</div>
          <p className="text-xs text-[#B8BCC4] mt-1">
            Added to Audio player and Mind research.
          </p>
        </div>

        <button
          type="button"
          onClick={onAcknowledge}
          className="w-full min-h-[48px] py-3 px-6 rounded-xl bg-[#C084FC] text-[#0B0D12] font-semibold text-sm hover:bg-[#D8B4FE] active:scale-[0.98] transition-all cursor-pointer"
        >
          Play Track
        </button>
      </div>
    </div>
  );
};
