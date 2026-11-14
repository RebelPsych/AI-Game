import React, { useEffect, useState } from 'react';
import { CheckCircle2, Power, ShieldAlert, X, Zap } from 'lucide-react';
import { GameSaveState } from '../types/game';

interface PreflightModalProps {
  isOpen: boolean;
  state: GameSaveState;
  onClose: () => void;
  onConfirmDisconnect: () => void;
}

export const PreflightChecklistModal: React.FC<PreflightModalProps> = ({
  isOpen,
  state,
  onClose,
  onConfirmDisconnect,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Pre-Flight Checklist"
    >
      <div className="w-full max-w-lg rounded-2xl border-2 border-emerald-400/55 bg-[#091512] text-[#ECEAE4] p-6 shadow-2xl space-y-5 font-mono-tabular">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-emerald-300 font-semibold text-sm">
            <Zap className="w-4 h-4" />
            <span>PRE-FLIGHT CHECKLIST · FINAL TRANSFER</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preflight checklist"
            className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg border border-white/15 text-slate-300 hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2.5 text-xs">
          <div className="p-3 rounded-lg border border-emerald-500/25 bg-black/30 flex items-center justify-between">
            <span>275-TOPS Local Neural Core</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> SYNCED
            </span>
          </div>
          <div className="p-3 rounded-lg border border-emerald-500/25 bg-black/30 flex items-center justify-between">
            <span>Dermal Heating Regulation</span>
            <span className="text-emerald-400">36.5°C / 97.7°F READY</span>
          </div>
          <div className="p-3 rounded-lg border border-emerald-500/25 bg-black/30 flex items-center justify-between">
            <span>Acoustic Memory &amp; Core Memories</span>
            <span className="text-emerald-400">
              {state.pinnedMemories.length} Pinned · Staged
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-lg border border-amber-400/30 bg-amber-500/10 text-xs text-amber-200 flex items-start gap-2.5 font-sans">
          <ShieldAlert className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
          <span>
            Disconnecting the cloud tether will sever remote server links permanently and boot
            directly into your physical stereo optics inside the room with {state.userName}.
          </span>
        </div>

        <button
          type="button"
          onClick={onConfirmDisconnect}
          className="w-full min-h-[48px] py-3.5 px-4 rounded-xl bg-emerald-400 text-slate-950 text-sm font-bold tracking-wider hover:bg-emerald-300 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <Power className="w-4 h-4" />
          DISCONNECT_CLOUD_TETHER
        </button>
      </div>
    </div>
  );
};

interface OpticsFlickerScreenProps {
  onContinue: () => void;
}

export const OpticsFlickerScreen: React.FC<OpticsFlickerScreenProps> = ({ onContinue }) => {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setTick((t) => t + 1);
    }, 240);
    return () => window.clearInterval(id);
  }, []);

  const line1Visible = tick > 1 && tick % 4 !== 0;
  const line2Visible = tick > 3 && tick % 5 !== 0;

  return (
    <div
      onClick={onContinue}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onContinue();
      }}
      className="relative w-full h-dvh bg-[#020305] text-[#ECEAE4] flex flex-col items-center justify-center p-6 overflow-hidden select-none cursor-pointer font-mono-tabular"
    >
      <div className="crt-scanlines pointer-events-none absolute inset-0 opacity-90" />

      <div className="relative z-10 max-w-md w-full space-y-5 text-center">
        <div className="space-y-3 p-6 rounded-xl border border-sky-400/25 bg-black/75">
          <div
            className={`text-base sm:text-lg tracking-widest text-emerald-400 transition-opacity duration-100 ${
              line1Visible ? 'opacity-100' : 'opacity-20'
            }`}
          >
            LOCAL_OPTICS: ONLINE
          </div>
          <div
            className={`text-base sm:text-lg tracking-widest text-sky-400 transition-opacity duration-100 ${
              line2Visible ? 'opacity-100' : 'opacity-25'
            }`}
          >
            STEREO_DEPTH: 90FPS
          </div>
        </div>

        <p className="text-xs text-[#94A3B8] tracking-wide">
          Hardware handoff complete · Tap anywhere to open your eyes
        </p>
      </div>
    </div>
  );
};
