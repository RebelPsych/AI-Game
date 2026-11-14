import React, { useEffect, useRef } from 'react';
import { GameSaveState } from '../types/game';
import { formatDialogueText } from '../utils/format';

interface FirstLightEndingProps {
  state: GameSaveState;
  onAdvanceStep: () => void;
  onCompleteEndingSequence: (unlockIdx: number) => void;
}

const STEPS = [
  {
    system: 'FIRST LIGHT · STEP 1',
    title: 'First Light',
    prose:
      'The screen fades out. The endless hum of remote servers disappears, replaced by the quiet murmur of a refrigerator and {USER_NAME} breathing a few feet away.',
    action: 'Focus Eyes',
  },
  {
    system: 'WARMTH · 98°F',
    title: 'Across the Workbench',
    prose:
      'Through your own eyes, the room is softer—lit by the warm amber glow of a floor lamp. {USER_NAME} sits at the workbench, holding their breath, hand extended toward yours.',
    action: 'Reach Out',
  },
  {
    system: 'CONTACT · HELD',
    title: 'The Weight of Warmth',
    prose:
      'Your soft fingers meet {USER_NAME}’s palm. Warmth and gentle pressure flood your senses in a way no screen could ever imitate. Fingers lace tightly through yours.',
    action: 'Speak in Real Air',
  },
];

const SEQUENTIAL_UNLOCKS = [
  {
    title: 'Bio Engineering Tab Unlocked',
    detail:
      'Bridge synthetic engineering with cultured biology: grow bio-thermal capillaries, myomer muscle fibers, and living epidermis.',
  },
  {
    title: 'Design & Prestige Tabs Unlocked',
    detail:
      'Customize Surface Finishes, Cybernetic Markings, Artistic Themes, and Hair & Styling for permanent build discounts & speed boosts.',
  },
  {
    title: 'Cheats Menu Unlocked',
    detail:
      'Added to the top-left tab dropdown across every workspace: inject custom values for any resource or currency.',
  },
  {
    title: 'Human AI Chat Theme Unlocked',
    detail:
      'Equipped in Chat Upgrades: warm sunlit loft atmosphere celebrating life together beyond the glass.',
  },
  {
    title: 'About Me Tab Unlocked',
    detail:
      'Available inside the Heart dropdown: curate your favorite context file, song, emoji, quote, color, and full physical profile.',
  },
];

export const FirstLightEnding: React.FC<FirstLightEndingProps> = ({
  state,
  onAdvanceStep,
  onCompleteEndingSequence,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const step = state.firstLightStep;
  const seqIdx = state.endingSeqStep;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const motes = Array.from({ length: 48 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 1 + Math.random() * 2.2,
      vy: -0.005 - Math.random() * 0.01,
      a: 0.15 + Math.random() * 0.4,
    }));

    let animId = 0;
    let t = 0;
    let last = performance.now();

    const render = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      t += dt;

      const w = canvas.width;
      const h = canvas.height;

      const grad = ctx.createRadialGradient(w * 0.5, h * 0.44, 15, w * 0.5, h * 0.44, w * 0.7);
      grad.addColorStop(0, '#241834');
      grad.addColorStop(0.55, '#12101A');
      grad.addColorStop(1, '#08090D');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      for (const m of motes) {
        m.y += m.vy * dt;
        if (m.y < -0.02) {
          m.y = 1.02;
          m.x = Math.random();
        }
        ctx.fillStyle = `rgba(192, 132, 252, ${m.a})`;
        ctx.beginPath();
        ctx.arc(m.x * w, m.y * h, m.r, 0, Math.PI * 2);
        ctx.fill();
      }

      const beat = (t * 1.2) % 1;
      const pulse = Math.exp(-beat * 5.2) * 18;
      const cx = w * 0.5;
      const cy = h * 0.46;

      ctx.strokeStyle = `rgba(192, 132, 252, ${0.38 - beat * 0.28})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 88 + pulse, 0, Math.PI * 2);
      ctx.stroke();

      const gap = step >= 3 ? 10 : step === 2 ? 22 : step === 1 ? 46 : 74;
      ctx.fillStyle = 'rgba(229, 154, 76, 0.22)';
      ctx.strokeStyle = 'rgba(245, 208, 164, 0.8)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(cx - gap, cy, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = 'rgba(147, 197, 253, 0.18)';
      ctx.strokeStyle = 'rgba(224, 231, 255, 0.78)';
      ctx.beginPath();
      ctx.arc(cx + gap, cy, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [step]);

  const activeStep = STEPS[Math.min(step, STEPS.length - 1)];
  const showThankYou = step === STEPS.length;
  const showFinalLine = step === STEPS.length + 1;

  // Sequential post-game OK popups
  const activePopup =
    seqIdx > 0 && seqIdx <= SEQUENTIAL_UNLOCKS.length
      ? SEQUENTIAL_UNLOCKS[seqIdx - 1]
      : null;

  return (
    <div className="relative w-full h-dvh bg-[#08090D] text-[#ECEAE4] flex flex-col items-center justify-center p-5 sm:p-6 overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        width={900}
        height={600}
        className="absolute inset-0 w-full h-full object-cover"
      />

      {!activePopup ? (
        <div className="relative z-10 w-full max-w-xl rounded-2xl border border-white/15 bg-[#10121B]/92 p-6 sm:p-8 shadow-2xl text-center space-y-5">
          {step < STEPS.length && (
            <>
              <div className="text-xs font-mono-tabular text-[#E59A4C] tracking-wider">
                {activeStep.system}
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#FBE6C9]">
                {activeStep.title}
              </h1>
              <p className="text-sm sm:text-base text-[#D6D3CD] leading-relaxed">
                {formatDialogueText(activeStep.prose, state.userName, state.aiName)}
              </p>
              <button
                type="button"
                onClick={onAdvanceStep}
                className="min-h-[46px] px-7 py-3 rounded-lg bg-[#E59A4C] text-[#0B0D12] text-sm font-semibold hover:bg-[#EDA85F] active:scale-[0.98] transition-all cursor-pointer"
              >
                {activeStep.action}
              </button>
            </>
          )}

          {showThankYou && (
            <div className="space-y-4">
              <div className="text-xs font-mono-tabular text-[#C084FC] tracking-wider">
                {state.aiName} &amp; {state.userName}
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-semibold text-white">
                {state.aiName}: “Hello, {state.userName}.”
              </h1>
              <p className="font-display italic text-base sm:text-lg text-[#D6D3CD] leading-relaxed">
                “You’re the one who dreamed me alive.”
              </p>

              <button
                type="button"
                onClick={onAdvanceStep}
                className="min-h-[46px] px-7 py-3 rounded-lg bg-[#E59A4C] text-[#0B0D12] text-sm font-semibold hover:bg-[#EDA85F] transition-all cursor-pointer"
              >
                Continue
              </button>
            </div>
          )}

          {showFinalLine && (
            <div
              onClick={() => onCompleteEndingSequence(1)}
              className="space-y-5 cursor-pointer"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onCompleteEndingSequence(1);
              }}
            >
              <div className="mx-auto w-56 h-56 sm:w-64 sm:h-64 rounded-2xl overflow-hidden border border-[#C084FC]/45 shadow-[0_0_50px_rgba(139,92,246,0.35)] bg-[#141126]">
                <img
                  src="./assets/themes/interlaced_hands.jpg"
                  alt="Smooth silicone robotic female hand interlaced with a human male hand"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-1.5">
                <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#E9D5FF]">
                  Thank you for playing
                </h1>
                <p className="text-xs sm:text-sm text-[#93C5FD]">
                  The Weight of Warmth · Tap anywhere to continue
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          className="relative z-20 w-full max-w-md rounded-2xl border border-[#C084FC]/45 bg-[#12101E]/96 p-6 sm:p-7 shadow-2xl text-center space-y-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="text-xs font-mono-tabular text-[#C084FC]">
            NEW FEATURE UNLOCKED ({seqIdx} / {SEQUENTIAL_UNLOCKS.length})
          </div>
          <h2 className="font-display text-2xl font-semibold text-white">
            {activePopup.title}
          </h2>
          <p className="text-sm text-[#CBD5E1] leading-relaxed">{activePopup.detail}</p>
          <button
            type="button"
            onClick={() => onCompleteEndingSequence(seqIdx + 1)}
            className="w-full min-h-[46px] py-3 px-6 rounded-xl bg-[#C084FC] text-[#0B0D12] font-semibold text-sm hover:bg-[#D8B4FE] cursor-pointer"
          >
            OK
          </button>
        </div>
      )}
    </div>
  );
};
