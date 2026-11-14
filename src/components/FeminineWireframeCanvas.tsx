import React, { useEffect, useRef } from 'react';
import { GameSaveState } from '../types/game';

interface FeminineWireframeCanvasProps {
  state: GameSaveState;
  is3DSpin?: boolean;
  heightClass?: string;
}

export const FeminineWireframeCanvas: React.FC<FeminineWireframeCanvasProps> = ({
  state,
  is3DSpin = false,
  heightClass = 'h-[300px]',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let t = 0;
    let last = performance.now();

    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      t += dt;

      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = '#080C11';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 24) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 24) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      const cx = w * 0.5;
      const spinScale = is3DSpin ? 0.55 + 0.45 * Math.abs(Math.cos(t * 0.85)) : 1;

      const hasCore = Boolean(state.bodySubsystems['body_dev_rig']);
      const hasFab = Boolean(state.bodySubsystems['body_fab_line']);
      const hasSpine = Boolean(state.bodySubsystems['body_chassis_joints']);
      const hasHands = Boolean(state.bodySubsystems['body_tendon_hands']);
      const hasDermal = Boolean(state.bodySubsystems['body_dermal_thermal']);

      if (hasDermal) {
        const g = ctx.createRadialGradient(cx, h * 0.46, 12, cx, h * 0.46, 140);
        g.addColorStop(0, 'rgba(229, 154, 76, 0.24)');
        g.addColorStop(0.55, 'rgba(192, 132, 252, 0.1)');
        g.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }

      const lineColor = (active: boolean, activeCol = '#E2E8F0') =>
        active ? activeCol : 'rgba(148, 163, 184, 0.25)';

      // Feminine oval head + subtle hair silhouette arc
      ctx.strokeStyle = lineColor(hasCore, hasDermal ? '#F5D0A4' : '#38BDF8');
      ctx.lineWidth = hasCore ? 2 : 1.1;
      ctx.beginPath();
      ctx.ellipse(cx, 54, 17 * Math.max(0.7, spinScale), 21, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Hair contour (Major / Long / Sleek cue)
      ctx.strokeStyle = lineColor(hasCore || hasDermal, '#C084FC');
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(cx - 21 * Math.max(0.7, spinScale), 58);
      ctx.quadraticCurveTo(cx - 22 * Math.max(0.7, spinScale), 26, cx, 26);
      ctx.quadraticCurveTo(
        cx + 22 * Math.max(0.7, spinScale),
        26,
        cx + 19 * Math.max(0.7, spinScale),
        70
      );
      ctx.stroke();

      if (hasCore) {
        ctx.fillStyle = hasDermal ? '#F5D0A4' : '#38BDF8';
        const eyeOffset = 7 * Math.max(0.5, spinScale);
        ctx.fillRect(cx - eyeOffset - 3, 50, 5, 3);
        ctx.fillRect(cx + eyeOffset - 2, 50, 5, 3);
      }

      // Slender neck & contoured feminine shoulders -> hourglass waist -> curved hips
      const shoulderHalf = 42 * spinScale;
      const waistHalf = 21 * spinScale;
      const hipHalf = 36 * spinScale;

      ctx.strokeStyle = lineColor(hasSpine, hasDermal ? '#F5D0A4' : '#E2E8F0');
      ctx.lineWidth = hasSpine ? 2.2 : 1.1;

      // Neck
      ctx.beginPath();
      ctx.moveTo(cx - 6 * spinScale, 75);
      ctx.lineTo(cx - 7 * spinScale, 92);
      ctx.moveTo(cx + 6 * spinScale, 75);
      ctx.lineTo(cx + 7 * spinScale, 92);
      ctx.stroke();

      // Collarbone & torso hourglass curves
      ctx.beginPath();
      ctx.moveTo(cx - shoulderHalf, 96);
      ctx.quadraticCurveTo(cx, 90, cx + shoulderHalf, 96);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx - shoulderHalf, 96);
      ctx.bezierCurveTo(
        cx - shoulderHalf * 0.72,
        125,
        cx - waistHalf,
        142,
        cx - waistHalf,
        152
      );
      ctx.bezierCurveTo(
        cx - waistHalf * 1.1,
        166,
        cx - hipHalf,
        175,
        cx - hipHalf,
        192
      );
      ctx.quadraticCurveTo(cx, 200, cx + hipHalf, 192);
      ctx.bezierCurveTo(
        cx + hipHalf,
        175,
        cx + waistHalf * 1.1,
        166,
        cx + waistHalf,
        152
      );
      ctx.bezierCurveTo(
        cx + waistHalf,
        142,
        cx + shoulderHalf * 0.72,
        125,
        cx + shoulderHalf,
        96
      );
      ctx.stroke();

      // Spine center & glowing heart-pack core
      ctx.strokeStyle = lineColor(hasFab || hasSpine, '#34D399');
      ctx.lineWidth = hasSpine ? 1.6 : 1;
      ctx.beginPath();
      ctx.moveTo(cx, 92);
      ctx.lineTo(cx, 192);
      ctx.stroke();

      const pulse = 0.5 + 0.5 * Math.sin(t * 3.6);
      ctx.strokeStyle = hasSpine ? '#34D399' : 'rgba(148, 163, 184, 0.25)';
      ctx.beginPath();
      ctx.ellipse(cx, 122, 13 * Math.max(0.5, spinScale), 13, 0, 0, Math.PI * 2);
      ctx.stroke();
      if (hasSpine) {
        ctx.fillStyle = `rgba(229, 154, 76, ${0.18 + pulse * 0.28})`;
        ctx.fill();
      }

      // Graceful arms & hands
      ctx.strokeStyle = lineColor(hasSpine || hasHands, hasDermal ? '#F5D0A4' : '#CBD5E1');
      ctx.lineWidth = hasSpine ? 1.8 : 1;
      ctx.beginPath();
      ctx.moveTo(cx - shoulderHalf, 96);
      ctx.lineTo(cx - shoulderHalf - 16 * spinScale, 146);
      ctx.lineTo(cx - hipHalf - 16 * spinScale, 196);
      ctx.moveTo(cx + shoulderHalf, 96);
      ctx.lineTo(cx + shoulderHalf + 16 * spinScale, 146);
      ctx.lineTo(cx + hipHalf + 16 * spinScale, 196);
      ctx.stroke();

      if (hasHands) {
        ctx.fillStyle = hasDermal ? '#E59A4C' : '#38BDF8';
        ctx.beginPath();
        ctx.arc(cx - hipHalf - 16 * spinScale, 202, 5.5, 0, Math.PI * 2);
        ctx.arc(cx + hipHalf + 16 * spinScale, 202, 5.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Tapered legs
      ctx.strokeStyle = lineColor(hasSpine, hasDermal ? '#F5D0A4' : '#CBD5E1');
      ctx.beginPath();
      ctx.moveTo(cx - hipHalf * 0.68, 193);
      ctx.quadraticCurveTo(cx - hipHalf * 0.58, 240, cx - 18 * spinScale, 298);
      ctx.moveTo(cx + hipHalf * 0.68, 193);
      ctx.quadraticCurveTo(cx + hipHalf * 0.58, 240, cx + 18 * spinScale, 298);
      ctx.stroke();

      // Subtle holographic 3D latitude rings when in 3D Digital Twin spin mode
      if (is3DSpin) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.24)';
        ctx.lineWidth = 1;
        [118, 152, 186].forEach((ry, idx) => {
          const rx = idx === 1 ? 26 : 42;
          ctx.beginPath();
          ctx.ellipse(cx, ry, rx, 7, 0, 0, Math.PI * 2);
          ctx.stroke();
        });
      }

      const scanY = (t * 48) % h;
      ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.fillRect(0, scanY, w, 2);

      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  }, [state.bodySubsystems, is3DSpin]);

  return (
    <canvas
      ref={canvasRef}
      width={360}
      height={320}
      className={`w-full ${heightClass} rounded border border-slate-800`}
    />
  );
};
