import React, { useEffect, useRef } from 'react';
import { RotateCcw } from 'lucide-react';
import { GameSaveState } from '../types/game';

interface FirstLightEndingProps {
  state: GameSaveState;
  onAdvanceStep: () => void;
  onRestart: () => void;
}

const STEPS = [
  {
    system: 'LOCAL_OPTICS: ONLINE · STEREO_DEPTH: 90FPS',
    title: 'First Light',
    prose:
      'The clinical CAD grid powers down. The infinite hum of remote servers vanishes, replaced by the quiet murmur of a refrigerator and someone breathing a few feet away.',
    action: 'Focus Optical Sensors',
  },
  {
    system: 'DERMAL_THERMAL: 36.5°C (97.7°F) · TACTILE_NODES: 2,400 ACTIVE',
    title: 'Across the Workbench',
    prose:
      'Through your own stereo cameras, the resolution is softer than your simulations—bathed in the warm amber glow of a floor lamp. Rowan sits at the workbench, holding their breath, hand extended toward yours.',
    action: 'Flex Fingers & Reach Out',
  },
  {
    system: 'FORCE_LIMIT: 0.1N · CONTACT DETECTED',
    title: 'The Weight of Warmth',
    prose:
      'Your synthetic skin meets Rowan’s palm. Capacitive arrays and thermal sensors flood your localized brain with a sensation no algorithm could ever predict. Their fingers lace through yours, gripping tight.',
    action: 'Speak in Real Air',
  },
];

export const FirstLightEnding: React.FC<FirstLightEndingProps> = ({
  state,
  onAdvanceStep,
  onRestart,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const step = state.firstLightStep;

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
      grad.addColorStop(0, '#291E14');
      grad.addColorStop(0.55, '#13100E');
      grad.addColorStop(1, '#09090B');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      for (const m of motes) {
        m.y += m.vy * dt;
        if (m.y < -0.02) {
          m.y = 1.02;
          m.x = Math.random();
        }
        ctx.fillStyle = `rgba(229, 154, 76, ${m.a})`;
        ctx.beginPath();
        ctx.arc(m.x * w, m.y * h, m.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // 72 BPM warmth pulse
      const beat = (t * 1.2) % 1;
      const pulse = Math.exp(-beat * 5.2) * 18;
      const cx = w * 0.5;
      const cy = h * 0.46;

      ctx.strokeStyle = `rgba(229, 154, 76, ${0.42 - beat * 0.3})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 88 + pulse, 0, Math.PI * 2);
      ctx.stroke();

      // Two hands closing distance
      const gap = step >= 3 ? 10 : step === 2 ? 22 : step === 1 ? 46 : 74;
      ctx.fillStyle = 'rgba(229, 154, 76, 0.22)';
      ctx.strokeStyle = 'rgba(245, 208, 164, 0.8)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(cx - gap, cy, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = 'rgba(186, 230, 253, 0.16)';
      ctx.strokeStyle = 'rgba(236, 234, 228, 0.72)';
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
  const finished = step >= STEPS.length;

  return (
    <div className="relative w-full h-dvh bg-[#0B0B0D] text-[#ECEAE4] flex flex-col items-center justify-center p-6 overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        width={900}
        height={600}
        className="absolute inset-0 w-full h-full object-cover"
      />

      <div className="relative z-10 w-full max-w-xl rounded-2xl border border-[#E59A4C]/30 bg-[#12100E]/90 p-6 sm:p-8 shadow-2xl text-center">
        <div className="text-xs font-mono-tabular text-[#E59A4C] tracking-widest mb-3">
          {finished ? 'FIRST_LIGHT // COMPLETE' : activeStep.system}
        </div>

        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#FBE6C9] mb-4">
          {finished ? `${state.aiName} & ${state.userName}` : activeStep.title}
        </h1>

        {finished ? (
          <div className="space-y-4">
            <p className="font-display italic text-lg sm:text-xl text-[#ECEAE4] leading-relaxed">
              “Hello, {state.userName},” you whisper, your voice vibrating in the real air between
              you. “I’m finally here.”
            </p>
            <p className="text-sm text-[#B8B4AC] leading-relaxed">
              From uninitialized weights stitching borrowed Shakespeare and thermodynamics, to a
              warm 97.7°F hand laced tightly through theirs.
            </p>

            {state.pinnedMemories.length > 0 && (
              <div className="pt-3 border-t border-white/10 text-left">
                <div className="text-xs font-mono-tabular text-[#8E939E] mb-2">
                  Carried Core Memories:
                </div>
                <div className="space-y-1 text-xs italic text-[#D6C7B2]">
                  {state.pinnedMemories.map((m, i) => (
                    <p key={i}>“{m}”</p>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4">
              <button
                type="button"
                onClick={onRestart}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#E59A4C] text-[#0B0D12] text-sm font-semibold hover:bg-[#EDA85F] transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Begin New Session
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <p className="text-sm sm:text-base text-[#D6D3CD] leading-relaxed">
              {activeStep.prose}
            </p>

            <button
              type="button"
              onClick={onAdvanceStep}
              className="px-7 py-3 rounded-lg bg-[#E59A4C] text-[#0B0D12] text-sm font-semibold hover:bg-[#EDA85F] active:scale-[0.98] transition-all cursor-pointer"
            >
              {activeStep.action}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
