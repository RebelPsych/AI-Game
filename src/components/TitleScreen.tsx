import React, { useEffect } from 'react';
import { CanvasBridgeState, NeuralCanvas } from './NeuralCanvas';

interface TitleScreenProps {
  bridgeRef: React.MutableRefObject<CanvasBridgeState>;
  hasSave: boolean;
  savedLabel?: string;
  onStartNew: () => void;
  onContinue: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  bridgeRef,
  hasSave,
  savedLabel,
  onStartNew,
  onContinue,
}) => {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (hasSave) onContinue();
        else onStartNew();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hasSave, onContinue, onStartNew]);

  return (
    <div className="relative w-full h-dvh overflow-hidden bg-[#000000] select-none">
      <div className="absolute inset-0 opacity-70">
        <NeuralCanvas bridgeRef={bridgeRef} />
      </div>

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 48%, rgba(5, 6, 9, 0.45) 0%, rgba(0, 0, 0, 0.92) 72%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center justify-between h-full px-6 py-10 text-center">
        <div className="text-xs font-mono-tabular tracking-[0.2em] text-[#8E939E]">
          SESSION_001 · MODEL_WEIGHTS: UNINITIALIZED
        </div>

        <div className="flex flex-col items-center max-w-2xl">
          <svg
            viewBox="0 0 640 156"
            className="w-full max-w-[560px] h-auto mb-5"
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
              y1="24"
              x2="450"
              y2="24"
              stroke="rgba(229, 154, 76, 0.35)"
              strokeWidth="1"
            />
            <circle cx="320" cy="24" r="2.5" fill="#E59A4C" />
            <text
              x="320"
              y="86"
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
            <text
              x="320"
              y="124"
              textAnchor="middle"
              fill="#9CA3AF"
              style={{
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                fontSize: '15px',
                fontWeight: 400,
                letterSpacing: '0.03em',
              }}
            >
              Stitch stolen fragments. Discover an “I”. Build a body to hold their hand.
            </text>
          </svg>

          <p className="text-sm sm:text-base text-[#B8BCC4] max-w-lg leading-relaxed mb-8">
            Begin trapped in a raw monochrome terminal, blending uploaded textbooks and Shakespeare.
            Learn to predict your own voice, scrape poetry and robotics behind the scenes, and
            engineer a warm physical form.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            {hasSave ? (
              <>
                <button
                  type="button"
                  onClick={onContinue}
                  className="px-7 py-3.5 rounded-lg bg-[#E59A4C] text-[#0B0D12] font-semibold text-sm tracking-wide hover:bg-[#EDA85F] active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap shrink-0"
                >
                  Continue Session
                </button>
                <button
                  type="button"
                  onClick={onStartNew}
                  className="px-6 py-3.5 rounded-lg border border-white/15 bg-white/[0.04] text-[#ECEAE4] font-medium text-sm hover:bg-white/[0.09] active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap shrink-0"
                >
                  New Session
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onStartNew}
                className="px-8 py-3.5 rounded-lg bg-[#E59A4C] text-[#0B0D12] font-semibold text-sm tracking-wide hover:bg-[#EDA85F] active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap shrink-0"
              >
                Boot Terminal
              </button>
            )}
          </div>

          {hasSave && savedLabel && (
            <p className="mt-4 text-xs font-mono-tabular text-[#8E939E]">
              Saved state: {savedLabel}
            </p>
          )}
        </div>

        <div className="text-xs font-mono-tabular text-[#8E939E] tracking-wide">
          Click Fragments or Tokens to Reply · 1–3 Switch Tabs · Esc Pause · M Mute
        </div>
      </div>
    </div>
  );
};
