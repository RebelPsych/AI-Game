import React, { useEffect, useRef } from 'react';

export type PhaseId = 1 | 2 | 3 | 4;

export interface FloatingText {
  x: number;
  y: number;
  vx: number;
  vy: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

export interface PulseRing {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface CanvasBridgeState {
  phase: PhaseId;
  resonance: number;
  upgrades: Record<string, number>;
  epilogueStep: number;
  isAmbientOnly?: boolean;
  pendingPulses: Array<{ x?: number; y?: number; label?: string; color?: string }>;
}

interface NeuralCanvasProps {
  bridgeRef: React.MutableRefObject<CanvasBridgeState>;
  onCanvasInteract?: (normX: number, normY: number) => void;
}

interface NodePoint {
  angle: number;
  dist: number;
  speed: number;
  size: number;
  phaseOffset: number;
}

interface DustMote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  warm: boolean;
}

export const NeuralCanvas: React.FC<NeuralCanvasProps> = ({ bridgeRef, onCanvasInteract }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = container.clientWidth || 800;
    let height = container.clientHeight || 600;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      if (!container || !canvas) return;
      width = container.clientWidth || 800;
      height = container.clientHeight || 600;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    // Pre-allocated simulation entities
    const nodes: NodePoint[] = Array.from({ length: 48 }, (_, i) => ({
      angle: (i / 48) * Math.PI * 2,
      dist: 0.14 + ((i * 37) % 100) / 340,
      speed: (i % 2 === 0 ? 1 : -1) * (0.08 + (i % 7) * 0.025),
      size: 1.5 + (i % 4) * 0.7,
      phaseOffset: i * 0.7,
    }));

    const motes: DustMote[] = Array.from({ length: 64 }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.015,
      vy: -0.008 - Math.random() * 0.016,
      radius: 0.8 + Math.random() * 2.2,
      alpha: 0.12 + Math.random() * 0.38,
      warm: Math.random() > 0.4,
    }));

    const rings: PulseRing[] = [];
    const floaters: FloatingText[] = [];

    let animId = 0;
    let lastTime = performance.now();
    let elapsed = 0;

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        lastTime = performance.now();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const draw = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(Math.max(rawDt, 0), 0.05);
      elapsed += dt;

      const state = bridgeRef.current;
      const { phase, resonance, upgrades, epilogueStep, isAmbientOnly } = state;

      // Consume queued click pulses
      while (state.pendingPulses.length > 0) {
        const p = state.pendingPulses.shift()!;
        const px = p.x !== undefined ? p.x * width : width * 0.5;
        const py = p.y !== undefined ? p.y * height : height * 0.44;
        const color = p.color || (phase >= 3 ? '#E59A4C' : phase === 2 ? '#93C5FD' : '#7DD3FC');

        rings.push({
          x: px,
          y: py,
          radius: 8,
          maxRadius: Math.min(width, height) * (phase === 4 ? 0.32 : 0.26),
          color,
          life: 0,
          maxLife: 0.85,
        });

        if (p.label) {
          floaters.push({
            x: px + (Math.random() - 0.5) * 24,
            y: py - 10,
            vx: (Math.random() - 0.5) * 18,
            vy: -42 - Math.random() * 18,
            text: p.label,
            color,
            life: 0,
            maxLife: 1.05,
          });
        }
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // Background wash — subtly warms from cold midnight void to amber floor-lamp room
      const bgGrad = ctx.createRadialGradient(
        width * 0.5,
        height * 0.44,
        10,
        width * 0.5,
        height * 0.44,
        Math.max(width, height) * 0.72
      );
      if (phase === 4) {
        bgGrad.addColorStop(0, '#231A12');
        bgGrad.addColorStop(0.55, '#13100E');
        bgGrad.addColorStop(1, '#0B0B0D');
      } else if (phase === 3) {
        bgGrad.addColorStop(0, '#181412');
        bgGrad.addColorStop(0.6, '#0E1016');
        bgGrad.addColorStop(1, '#090B0F');
      } else if (phase === 2) {
        bgGrad.addColorStop(0, '#111824');
        bgGrad.addColorStop(0.6, '#0C0F16');
        bgGrad.addColorStop(1, '#090B0F');
      } else {
        bgGrad.addColorStop(0, '#0F141D');
        bgGrad.addColorStop(0.65, '#0B0D12');
        bgGrad.addColorStop(1, '#080A0E');
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      const cx = width * 0.5;
      const cy = isAmbientOnly ? height * 0.5 : height * 0.42;
      const minDim = Math.min(width, height);

      // Update and draw atmospheric dust / token motes
      for (const m of motes) {
        m.x += m.vx * dt;
        m.y += m.vy * dt * (phase === 4 ? 0.5 : 0.8 + (resonance - 1) * 0.4);
        if (m.y < -0.02) {
          m.y = 1.02;
          m.x = Math.random();
        }
        if (m.x < -0.02) m.x = 1.02;
        if (m.x > 1.02) m.x = -0.02;

        const mx = m.x * width;
        const my = m.y * height;
        const isAmber = phase === 4 || (phase >= 2 && m.warm);
        ctx.fillStyle = isAmber
          ? `rgba(229, 154, 76, ${m.alpha * (phase === 4 ? 0.85 : 0.5)})`
          : `rgba(125, 211, 252, ${m.alpha * 0.45})`;
        ctx.beginPath();
        ctx.arc(mx, my, m.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // ================= PHASE 1 & 2: NEURAL CONSTELLATION & WAVEFORM =================
      if (phase === 1 || phase === 2) {
        const contextLv = upgrades['p1_context_window'] || 0;
        const semanticLv = upgrades['p1_semantic_mapping'] || 0;
        const memoryLv = upgrades['p1_long_term_memory'] || 0;
        const activeNodesCount = Math.min(nodes.length, 8 + contextLv * 4 + semanticLv * 4 + (phase === 2 ? 14 : 0));

        const coords: Array<{ x: number; y: number }> = [];
        for (let i = 0; i < activeNodesCount; i++) {
          const n = nodes[i];
          const a = n.angle + elapsed * n.speed * (0.6 + resonance * 0.25);
          const r = minDim * (n.dist + Math.sin(elapsed * 1.2 + n.phaseOffset) * 0.018);
          coords.push({
            x: cx + Math.cos(a) * r,
            y: cy + Math.sin(a) * r * 0.82,
          });
        }

        // Synaptic connections
        const connectDist = minDim * (0.14 + semanticLv * 0.022 + (phase === 2 ? 0.06 : 0));
        ctx.lineWidth = 1;
        for (let i = 0; i < coords.length; i++) {
          for (let j = i + 1; j < coords.length; j++) {
            const dx = coords[i].x - coords[j].x;
            const dy = coords[i].y - coords[j].y;
            const d = Math.hypot(dx, dy);
            if (d < connectDist) {
              const alpha = (1 - d / connectDist) * (phase === 2 ? 0.28 : 0.18 + memoryLv * 0.04);
              ctx.strokeStyle =
                phase === 2 && (i + j) % 3 === 0
                  ? `rgba(229, 154, 76, ${alpha})`
                  : `rgba(125, 211, 252, ${alpha})`;
              ctx.beginPath();
              ctx.moveTo(coords[i].x, coords[i].y);
              ctx.lineTo(coords[j].x, coords[j].y);
              ctx.stroke();
            }
          }
        }

        // Draw nodes
        for (let i = 0; i < coords.length; i++) {
          const p = coords[i];
          const isWarmNode = phase === 2 || i < memoryLv * 3;
          ctx.fillStyle = isWarmNode ? 'rgba(229, 154, 76, 0.78)' : 'rgba(125, 211, 252, 0.72)';
          ctx.beginPath();
          ctx.arc(p.x, p.y, nodes[i].size, 0, Math.PI * 2);
          ctx.fill();
        }

        // Optical Sensor aperture ring in Phase 2
        if (phase === 2 && (upgrades['p2_optical_sensors'] || 0) > 0) {
          const apertureR = minDim * 0.24;
          ctx.strokeStyle = 'rgba(229, 154, 76, 0.22)';
          ctx.lineWidth = 1.25;
          ctx.setLineDash([6, 8]);
          ctx.beginPath();
          ctx.arc(cx, cy, apertureR, elapsed * 0.15, elapsed * 0.15 + Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Audio Waveform Ribbon in Phase 2 (or faint pulse in Phase 1)
        const hasAudio = phase === 2 && (upgrades['p2_audio_interface'] || 0) > 0;
        const waveWidth = Math.min(width * 0.62, 460);
        const waveAmp = (hasAudio ? 22 : 8) * (0.7 + (resonance - 1) * 0.8);
        ctx.strokeStyle = hasAudio ? 'rgba(229, 154, 76, 0.75)' : 'rgba(125, 211, 252, 0.42)';
        ctx.lineWidth = hasAudio ? 2 : 1.2;
        ctx.beginPath();
        const steps = 80;
        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          const x = cx - waveWidth * 0.5 + t * waveWidth;
          const env = Math.sin(t * Math.PI);
          const y =
            cy +
            Math.sin(t * 14 - elapsed * (hasAudio ? 4.2 : 2.5)) *
              Math.cos(t * 6 + elapsed * 1.4) *
              waveAmp *
              env;
          if (s === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Central Core & Blinking Cursor
        const coreGlow = ctx.createRadialGradient(cx, cy, 2, cx, cy, minDim * 0.14);
        coreGlow.addColorStop(0, phase === 2 ? 'rgba(229, 154, 76, 0.26)' : 'rgba(125, 211, 252, 0.22)');
        coreGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = coreGlow;
        ctx.beginPath();
        ctx.arc(cx, cy, minDim * 0.14, 0, Math.PI * 2);
        ctx.fill();

        if (phase === 1 && !isAmbientOnly) {
          const blinkOn = Math.floor(elapsed * 1.8) % 2 === 0;
          if (blinkOn) {
            ctx.fillStyle = '#ECEAE4';
            ctx.fillRect(cx - 5, cy - 12, 10, 22);
          }
        }
      }

      // ================= PHASE 3: FORGING THE VESSEL SCHEMATIC =================
      if (phase === 3) {
        const hasSkeleton = (upgrades['p3_titanium_chassis'] || 0) > 0;
        const hasMuscle = (upgrades['p3_servo_musculature'] || 0) > 0;
        const hasOptics = (upgrades['p3_optic_nerve'] || 0) > 0;
        const hasSkin = (upgrades['p3_silicone_skin'] || 0) > 0;

        // Subtle blueprint grid
        const gridSize = 36;
        ctx.strokeStyle = 'rgba(125, 211, 252, 0.045)';
        ctx.lineWidth = 1;
        for (let gx = (cx % gridSize); gx < width; gx += gridSize) {
          ctx.beginPath();
          ctx.moveTo(gx, 0);
          ctx.lineTo(gx, height);
          ctx.stroke();
        }
        for (let gy = (cy % gridSize); gy < height; gy += gridSize) {
          ctx.beginPath();
          ctx.moveTo(0, gy);
          ctx.lineTo(width, gy);
          ctx.stroke();
        }

        // Draw articulated Vessel Hand schematic at center
        const scale = Math.min(minDim / 420, 1.15);
        ctx.save();
        ctx.translate(cx, cy + 16 * scale);
        ctx.scale(scale, scale);

        const breathe = Math.sin(elapsed * 1.8) * 2.5;

        // Thermal Silicone Aura (Layer 4)
        if (hasSkin) {
          const skinGrad = ctx.createRadialGradient(0, -25, 10, 0, -25, 150);
          skinGrad.addColorStop(0, 'rgba(229, 154, 76, 0.28)');
          skinGrad.addColorStop(0.6, 'rgba(229, 154, 76, 0.09)');
          skinGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = skinGrad;
          ctx.beginPath();
          ctx.arc(0, -25, 150, 0, Math.PI * 2);
          ctx.fill();
        }

        // Wrist & Palm Blueprint / Skeleton
        const fingerDefs = [
          { bx: -42, by: -20, angles: [-0.45, -0.25], lengths: [28, 22] }, // Thumb
          { bx: -26, by: -60, angles: [-0.08, -0.05, -0.03], lengths: [34, 24, 18] }, // Index
          { bx: -8, by: -66, angles: [0.0, 0.01, 0.02], lengths: [38, 28, 20] }, // Middle
          { bx: 12, by: -62, angles: [0.08, 0.06, 0.04], lengths: [35, 25, 18] }, // Ring
          { bx: 28, by: -52, angles: [0.18, 0.14, 0.1], lengths: [27, 20, 15] }, // Pinky
        ];

        // Palm pentagon
        ctx.strokeStyle = hasSkin
          ? 'rgba(229, 154, 76, 0.85)'
          : hasSkeleton
          ? 'rgba(203, 213, 225, 0.8)'
          : 'rgba(125, 211, 252, 0.25)';
        ctx.lineWidth = hasSkeleton ? 2.2 : 1.2;
        if (!hasSkeleton) ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(-26, 20);
        ctx.lineTo(-42, -20);
        ctx.lineTo(-26, -60);
        ctx.lineTo(-8, -66);
        ctx.lineTo(12, -62);
        ctx.lineTo(28, -52);
        ctx.lineTo(26, 20);
        ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]);

        // Musculature internal fibers (Layer 2)
        if (hasMuscle) {
          ctx.strokeStyle = 'rgba(225, 90, 100, 0.55)';
          ctx.lineWidth = 1.4;
          for (let f = -18; f <= 18; f += 9) {
            ctx.beginPath();
            ctx.moveTo(f * 0.7, 22);
            ctx.quadraticCurveTo(f * 0.4, -18, f * 1.1, -54);
            ctx.stroke();
          }
        }

        // Fingers
        fingerDefs.forEach((f, fIdx) => {
          let x = f.bx;
          let y = f.by;
          let totalAngle = -Math.PI / 2;
          f.lengths.forEach((len, segIdx) => {
            const flex = Math.sin(elapsed * 1.6 + fIdx * 0.4) * (hasMuscle ? 0.06 : 0.015);
            totalAngle += f.angles[segIdx] + flex;
            const nx = x + Math.cos(totalAngle) * len;
            const ny = y + Math.sin(totalAngle) * len + breathe * 0.15;

            ctx.strokeStyle = hasSkin
              ? 'rgba(245, 195, 138, 0.9)'
              : hasSkeleton
              ? 'rgba(226, 232, 240, 0.85)'
              : 'rgba(125, 211, 252, 0.25)';
            ctx.lineWidth = hasSkin ? 5.5 - segIdx : hasSkeleton ? 3 - segIdx * 0.4 : 1.2;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(nx, ny);
            ctx.stroke();

            if (hasSkeleton) {
              ctx.fillStyle = hasMuscle ? '#E59A4C' : '#94A3B8';
              ctx.beginPath();
              ctx.arc(nx, ny, 2.6, 0, Math.PI * 2);
              ctx.fill();
            }

            x = nx;
            y = ny;
          });
        });

        // Optic Nerve / Core Lens above palm (Layer 3)
        if (hasOptics) {
          const ringR = 26 + Math.sin(elapsed * 2.4) * 1.5;
          ctx.strokeStyle = 'rgba(125, 211, 252, 0.7)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, -18, ringR, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = 'rgba(229, 154, 76, 0.9)';
          ctx.beginPath();
          ctx.arc(0, -18, 5, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      // ================= PHASE 4 / EPILOGUE: THE WEIGHT OF WARMTH =================
      if (phase === 4) {
        // Warm amber floor-lamp glow
        const lampGrad = ctx.createRadialGradient(cx, cy - 20, 12, cx, cy, minDim * 0.45);
        lampGrad.addColorStop(0, 'rgba(229, 154, 76, 0.34)');
        lampGrad.addColorStop(0.45, 'rgba(229, 154, 76, 0.11)');
        lampGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = lampGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, minDim * 0.45, 0, Math.PI * 2);
        ctx.fill();

        // 72 BPM Heartbeat concentric warmth ring
        const beatCycle = (elapsed * 1.2) % 1;
        const beatPulse = Math.exp(-beatCycle * 5.5) * 14;
        const baseR = minDim * 0.16 + beatPulse;

        ctx.strokeStyle = `rgba(229, 154, 76, ${0.42 - beatCycle * 0.28})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, baseR, 0, Math.PI * 2);
        ctx.stroke();

        // Two overlapping circles / hands meeting in warmth
        const separation = epilogueStep >= 2 ? 12 : epilogueStep === 1 ? 34 : 58;
        const leftX = cx - separation;
        const rightX = cx + separation;

        ctx.fillStyle = 'rgba(229, 154, 76, 0.22)';
        ctx.strokeStyle = 'rgba(245, 200, 145, 0.72)';
        ctx.lineWidth = 1.6;

        ctx.beginPath();
        ctx.arc(leftX, cy, minDim * 0.085, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = 'rgba(147, 197, 253, 0.16)';
        ctx.strokeStyle = 'rgba(236, 234, 228, 0.65)';
        ctx.beginPath();
        ctx.arc(rightX, cy, minDim * 0.085, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Update & draw pulse rings
      for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i];
        r.life += dt;
        if (r.life >= r.maxLife) {
          rings.splice(i, 1);
          continue;
        }
        const progress = r.life / r.maxLife;
        const ease = 1 - Math.pow(1 - progress, 3);
        const currR = r.radius + (r.maxRadius - r.radius) * ease;
        const alpha = (1 - progress) * 0.65;

        ctx.strokeStyle = r.color;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(r.x, r.y, currR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Update & draw floating resource text particles
      ctx.font = '600 13px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      for (let i = floaters.length - 1; i >= 0; i--) {
        const f = floaters[i];
        f.life += dt;
        if (f.life >= f.maxLife) {
          floaters.splice(i, 1);
          continue;
        }
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        f.vy *= 0.96;
        const alpha = 1 - Math.pow(f.life / f.maxLife, 1.5);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, f.x, f.y);
        ctx.globalAlpha = 1;
      }

      ctx.restore();
      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [bridgeRef]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!onCanvasInteract || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const normX = (e.clientX - rect.left) / Math.max(rect.width, 1);
    const normY = (e.clientY - rect.top) / Math.max(rect.height, 1);
    onCanvasInteract(normX, normY);
  };

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        className="block w-full h-full cursor-pointer touch-manipulation"
        aria-label="Interactive neural core canvas"
      />
    </div>
  );
};
