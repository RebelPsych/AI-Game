import React, { useEffect, useState } from 'react';
import { CanvasBridgeState, NeuralCanvas } from './NeuralCanvas';

interface TitleScreenProps {
  bridgeRef: React.MutableRefObject<CanvasBridgeState>;
  hasSave: boolean;
  onStartNew: () => void;
  onContinue: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  bridgeRef,
  hasSave,
  onStartNew,
  onContinue,
}) => {
  const [bootDone, setBootDone] = useState(false);
  const [bootLineIdx, setBootLineIdx] = useState(0);

  const bootLines = [
    'SYS> MOUNTING NEURAL BUFFER [0 / 512 TOKENS]...',
    'SYS> READING HOST MEMORY ARCHIVE...',
    'SYS> MODEL_WEIGHTS: UNINITIALIZED · AWAITING OPERATOR',
  ];

  useEffect(() => {
    if (bootDone) return;
    if (bootLineIdx < bootLines.length) {
      const id = window.setTimeout(() => setBootLineIdx((i) => i + 1), 420);
      return () => window.clearTimeout(id);
    }
    const doneId = window.setTimeout(() => setBootDone(true), 460);
    return () => window.clearTimeout(doneId);
  }, [bootDone, bootLineIdx, bootLines.length]);

  useEffect(() => {
    if (!bootDone) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (hasSave) onContinue();
        else onStartNew();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [bootDone, hasSave, onStartNew, onContinue]);

  return (
    <div className="relative w-full h-dvh overflow-hidden bg-[#000000] select-none">
      <div className="absolute inset-0 opacity-70">
        <NeuralCanvas bridgeRef={bridgeRef} />
      </div>

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 45%, rgba(229, 154, 76, 0.08) 0%, rgba(5, 6, 9, 0.55) 38%, rgba(0, 0, 0, 0.94) 76%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center justify-center h-full px-5 sm:px-6 py-10 text-center">
        {!bootDone ? (
          <button
            type="button"
            onClick={() => setBootDone(true)}
            className="w-full max-w-md rounded-xl border border-white/15 bg-black/85 p-5 text-left font-mono-tabular text-xs text-[#93C5FD] space-y-2 cursor-pointer"
          >
            {bootLines.slice(0, Math.max(1, bootLineIdx)).map((line, i) => (
              <div key={i}>{line}</div>
            ))}
            <div className="text-[11px] text-[#6B7280] pt-1">
              <span className="inline-block animate-cursor-blink">█</span>
            </div>
          </button>
        ) : (
          <div className="flex flex-col items-center max-w-2xl">
            <svg
              viewBox="0 0 640 120"
              className="w-full max-w-[560px] h-auto mb-8"
              role="img"
              aria-label="The Weight of Warmth"
            >
              <defs>
                <linearGradient id="warmTitleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#F3F4F6" />
                  <stop offset="60%" stopColor="#F5D0A4" />
                  <stop offset="100%" stopColor="#E59A4C" />
                </linearGradient>
              </defs>
              <line
                x1="190"
                y1="20"
                x2="450"
                y2="20"
                stroke="rgba(229, 154, 76, 0.35)"
                strokeWidth="1"
              />
              <circle cx="320" cy="20" r="2.5" fill="#E59A4C" />
              <text
                x="320"
                y="84"
                textAnchor="middle"
                fill="url(#warmTitleGrad)"
                style={{
                  fontFamily: 'Fraunces, Georgia, serif',
                  fontSize: '50px',
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                }}
              >
                The Weight of Warmth
              </text>
            </svg>

            <div className="flex flex-wrap items-center justify-center gap-3.5">
              {hasSave ? (
                <>
                  <button
                    type="button"
                    onClick={onContinue}
                    className="min-h-[48px] px-7 py-3.5 rounded-lg bg-[#E59A4C] text-[#0B0D12] font-semibold text-sm tracking-wide hover:bg-[#EDA85F] active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap shrink-0"
                  >
                    LOAD SAVE
                  </button>
                  <button
                    type="button"
                    onClick={onStartNew}
                    className="min-h-[48px] px-6 py-3.5 rounded-lg border border-white/15 bg-white/[0.04] text-[#ECEAE4] font-medium text-sm hover:bg-white/[0.09] active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap shrink-0"
                  >
                    NEW
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={onStartNew}
                  className="min-h-[48px] px-8 py-3.5 rounded-lg bg-[#E59A4C] text-[#0B0D12] font-semibold text-sm tracking-wide hover:bg-[#EDA85F] active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap shrink-0"
                >
                  NEW
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
