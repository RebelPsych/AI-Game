import React from 'react';
import { Volume2, VolumeX, RotateCcw, Play } from 'lucide-react';

interface PauseModalProps {
  isOpen: boolean;
  isMuted: boolean;
  onResume: () => void;
  onToggleMute: () => void;
  onResetGame: () => void;
  onReturnToTitle: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  isOpen,
  isMuted,
  onResume,
  onToggleMute,
  onResetGame,
  onReturnToTitle,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-modal-title"
    >
      <div className="w-full max-w-md rounded-xl border border-white/12 bg-[#14171F] p-6 shadow-2xl">
        <h2 id="pause-modal-title" className="font-display text-2xl font-semibold text-[#ECEAE4] mb-1">
          Session Paused
        </h2>
        <p className="text-xs text-[#9A9892] mb-6">
          Your progress is saved automatically in local storage.
        </p>

        <div className="space-y-3 mb-6">
          <button
            type="button"
            onClick={onResume}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#E59A4C] text-[#0B0D12] font-semibold text-sm hover:bg-[#EDA85F] transition-colors cursor-pointer whitespace-nowrap"
          >
            <Play className="w-4 h-4" />
            Resume Session
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-white/10 bg-white/[0.03] text-sm font-medium text-[#ECEAE4] hover:bg-white/[0.07] transition-colors cursor-pointer"
          >
            <span>Audio Feedback</span>
            <span className="flex items-center gap-2 text-xs font-mono-tabular text-[#A1A7B3]">
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              {isMuted ? 'Muted' : 'Active'}
            </span>
          </button>

          <button
            type="button"
            onClick={onReturnToTitle}
            className="w-full flex items-center justify-center px-4 py-3 rounded-lg border border-white/10 bg-white/[0.03] text-sm font-medium text-[#C4C2BC] hover:bg-white/[0.07] transition-colors cursor-pointer"
          >
            Title Screen
          </button>
        </div>

        <div className="pt-4 border-t border-white/10 flex items-center justify-between">
          <span className="text-xs text-[#8E939E]">Erase progress &amp; begin anew</span>
          <button
            type="button"
            onClick={onResetGame}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-[#E15A64] hover:bg-[#E15A64]/10 transition-colors cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Story
          </button>
        </div>
      </div>
    </div>
  );
};
