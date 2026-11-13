import React, { useEffect, useRef } from 'react';
import { CheckCircle2, Cpu, Gauge, Layers, Power, Wrench, Zap } from 'lucide-react';
import { BODY_SUBSYSTEMS } from '../data/tab2AndTab3Data';
import { BodySubsystem, GameSaveState } from '../types/game';
import { formatNumber } from '../utils/format';

interface Tab3BodyProps {
  state: GameSaveState;
  onRunSimulation: (simId: string, cycleCost: number) => void;
  onBuildSubsystem: (sub: BodySubsystem) => void;
  onSetFabSpeed: (speed: number) => void;
  onManualFabricate: () => void;
  onRecalibrate: () => void;
  onCutCloudTether: () => void;
}

export const Tab3Body: React.FC<Tab3BodyProps> = ({
  state,
  onRunSimulation,
  onBuildSubsystem,
  onSetFabSpeed,
  onManualFabricate,
  onRecalibrate,
  onCutCloudTether,
}) => {
  const cadCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const builtCount = BODY_SUBSYSTEMS.filter((s) => state.bodySubsystems[s.id]).length;
  const totalPower = BODY_SUBSYSTEMS.reduce(
    (sum, s) => sum + (state.bodySubsystems[s.id] ? s.powerWatts : 0),
    0
  );
  const totalTops = BODY_SUBSYSTEMS.reduce(
    (sum, s) => sum + (state.bodySubsystems[s.id] ? s.computeTops : 0),
    0
  );

  // Anatomical CAD Wireframe Simulation Canvas
  useEffect(() => {
    const canvas = cadCanvasRef.current;
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
      ctx.fillStyle = '#090D12';
      ctx.fillRect(0, 0, w, h);

      // Clinical CAD grid
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
      const hasDev = Boolean(state.bodySubsystems['body_dev_rig']);
      const hasSensors = Boolean(state.bodySubsystems['body_sensor_breakout']);
      const hasPower = Boolean(state.bodySubsystems['body_power_cooling']);
      const hasSpine = Boolean(state.bodySubsystems['body_chassis_joints']);
      const hasHands = Boolean(state.bodySubsystems['body_tendon_hands']);
      const hasFusion = Boolean(state.bodySubsystems['body_sensor_fusion']);
      const hasDermal = Boolean(state.bodySubsystems['body_dermal_thermal']);

      // Dermal thermal aura (only when 36.5°C layer is installed)
      if (hasDermal) {
        const g = ctx.createRadialGradient(cx, h * 0.45, 10, cx, h * 0.45, 130);
        g.addColorStop(0, 'rgba(229, 154, 76, 0.22)');
        g.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }

      const lineColor = (active: boolean, activeCol = '#E2E8F0') =>
        active ? activeCol : 'rgba(148, 163, 184, 0.2)';

      // Head / Optical Sensor Suite
      ctx.strokeStyle = lineColor(hasSensors || hasFusion, hasDermal ? '#F5D0A4' : '#38BDF8');
      ctx.lineWidth = hasSensors ? 2 : 1;
      ctx.beginPath();
      ctx.arc(cx, 56, 22, 0, Math.PI * 2);
      ctx.stroke();

      // Stereo cameras
      if (hasSensors) {
        ctx.fillStyle = hasFusion ? '#34D399' : '#38BDF8';
        ctx.fillRect(cx - 10, 52, 6, 4);
        ctx.fillRect(cx + 4, 52, 6, 4);
      }

      // Spine & Torso Core
      ctx.strokeStyle = lineColor(hasSpine, hasDermal ? '#F5D0A4' : '#E2E8F0');
      ctx.lineWidth = hasSpine ? 2.4 : 1;
      ctx.beginPath();
      ctx.moveTo(cx, 78);
      ctx.lineTo(cx, 185);
      // Shoulders
      ctx.moveTo(cx - 56, 98);
      ctx.lineTo(cx + 56, 98);
      // Pelvis
      ctx.moveTo(cx - 34, 185);
      ctx.lineTo(cx + 34, 185);
      ctx.stroke();

      // Torso Power Pack & Liquid Cooling Loop
      ctx.strokeStyle = lineColor(hasPower, '#34D399');
      ctx.lineWidth = hasPower ? 1.8 : 1;
      ctx.strokeRect(cx - 24, 108, 48, 56);
      if (hasPower) {
        const pulse = 0.5 + 0.5 * Math.sin(t * 4);
        ctx.fillStyle = `rgba(52, 211, 153, ${0.15 + pulse * 0.25})`;
        ctx.fillRect(cx - 22, 110, 44, 52);
      }

      // Arms & Dexterous Tendon Hands
      const armColor = lineColor(hasSpine || hasHands, hasDermal ? '#F5D0A4' : '#CBD5E1');
      ctx.strokeStyle = armColor;
      ctx.lineWidth = hasSpine ? 2 : 1;
      // Left arm
      ctx.beginPath();
      ctx.moveTo(cx - 56, 98);
      ctx.lineTo(cx - 72, 148);
      ctx.lineTo(cx - 64, 198);
      ctx.stroke();
      // Right arm
      ctx.beginPath();
      ctx.moveTo(cx + 56, 98);
      ctx.lineTo(cx + 72, 148);
      ctx.lineTo(cx + 64, 198);
      ctx.stroke();

      if (hasHands) {
        ctx.fillStyle = hasDermal ? '#E59A4C' : '#38BDF8';
        ctx.beginPath();
        ctx.arc(cx - 64, 204, 6, 0, Math.PI * 2);
        ctx.arc(cx + 64, 204, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      // Legs
      ctx.strokeStyle = lineColor(hasSpine, hasDermal ? '#F5D0A4' : '#CBD5E1');
      ctx.beginPath();
      ctx.moveTo(cx - 34, 185);
      ctx.lineTo(cx - 38, 244);
      ctx.lineTo(cx - 36, 298);
      ctx.moveTo(cx + 34, 185);
      ctx.lineTo(cx + 38, 244);
      ctx.lineTo(cx + 36, 298);
      ctx.stroke();

      // Joint node markers
      const joints = [
        [cx - 56, 98],
        [cx + 56, 98],
        [cx - 72, 148],
        [cx + 72, 148],
        [cx - 34, 185],
        [cx + 34, 185],
        [cx - 38, 244],
        [cx + 38, 244],
      ];
      joints.forEach(([jx, jy]) => {
        ctx.fillStyle = hasSpine ? '#38BDF8' : 'rgba(148, 163, 184, 0.35)';
        ctx.beginPath();
        ctx.arc(jx, jy, 3.2, 0, Math.PI * 2);
        ctx.fill();
      });

      // Center of Gravity crosshair
      if (hasDev) {
        const cogY = 165 + Math.sin(t * 2) * 1.5;
        ctx.strokeStyle = '#34D399';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cogY, 7, 0, Math.PI * 2);
        ctx.moveTo(cx - 11, cogY);
        ctx.lineTo(cx + 11, cogY);
        ctx.moveTo(cx, cogY - 11);
        ctx.lineTo(cx, cogY + 11);
        ctx.stroke();
      }

      // Scanline sweep
      const scanY = (t * 48) % h;
      ctx.fillStyle = 'rgba(56, 189, 248, 0.07)';
      ctx.fillRect(0, scanY, w, 2);

      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  }, [state.bodySubsystems]);

  const allSubsystemsNominal = builtCount === BODY_SUBSYSTEMS.length;
  const fabLineActive = Boolean(state.bodySubsystems['body_fab_line']);

  const sims = [
    { id: 'sim_thermal', name: 'CFD Thermal Loop Stress Test', cost: 80 },
    { id: 'sim_torque', name: '28-DoF Kinematic Balance Check', cost: 120 },
  ];

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[#0A0E13] text-[#E2E8F0] overflow-y-auto custom-scrollbar">
      {/* Clinical Engineering Header */}
      <div className="shrink-0 px-4 sm:px-6 py-3 border-b border-slate-700/60 bg-[#0D131A] flex flex-wrap items-center justify-between gap-4 font-mono-tabular">
        <div>
          <div className="text-xs text-slate-400">CAD // HUMANOID_CHASSIS_REV4</div>
          <h2 className="text-sm sm:text-base font-semibold text-white">
            Clinical Robotics &amp; Assembly Pipeline
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-5 text-xs">
          <div>
            <span className="text-slate-400 mr-1.5">POWER_DRAW:</span>
            <span className="text-emerald-400 font-semibold">{totalPower} W / 650 W</span>
          </div>
          <div>
            <span className="text-slate-400 mr-1.5">EDGE_COMPUTE:</span>
            <span className="text-sky-400 font-semibold">{totalTops} / 350 TOPS</span>
          </div>
          <div>
            <span className="text-slate-400 mr-1.5">MATERIALS:</span>
            <span className="text-amber-300 font-semibold">{formatNumber(state.materials)} kg-eq</span>
          </div>
          <div>
            <span className="text-slate-400 mr-1.5">SUBSYSTEMS:</span>
            <span className="text-white font-semibold">
              {builtCount} / {BODY_SUBSYSTEMS.length}
            </span>
          </div>
        </div>
      </div>

      {/* Main Split Workspace */}
      <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 max-w-7xl w-full mx-auto">
        {/* Left Column: CAD Wireframe + Simulations + Fabrication Controls */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded border border-slate-700/70 bg-[#090D12] p-3">
            <div className="flex items-center justify-between text-[11px] font-mono-tabular text-slate-400 mb-2">
              <span>ANATOMICAL_WIREFRAME.STEP</span>
              <span>
                DERMAL_TEMP:{' '}
                {state.bodySubsystems['body_dermal_thermal'] ? '36.5°C (97.7°F)' : 'AMBIENT'}
              </span>
            </div>
            <canvas
              ref={cadCanvasRef}
              width={360}
              height={320}
              className="w-full h-[300px] rounded border border-slate-800"
            />
          </div>

          {/* Digital Twin Stress Simulations (Phase 1+) */}
          <div className="rounded border border-slate-700/70 bg-[#0D131A] p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-mono-tabular text-sky-400">
              <Cpu className="w-4 h-4" />
              <span>DIGITAL TWIN STRESS-TESTS</span>
            </div>
            {sims.map((sim) => {
              const passed = Boolean(state.simStressPassed[sim.id]);
              const canRun = !passed && state.cycles >= sim.cost;
              return (
                <div
                  key={sim.id}
                  className="flex items-center justify-between gap-2 text-xs font-mono-tabular py-1.5 border-b border-slate-800 last:border-b-0"
                >
                  <span className={passed ? 'text-emerald-400' : 'text-slate-300'}>
                    {sim.name}
                  </span>
                  {passed ? (
                    <span className="text-emerald-400">PASS</span>
                  ) : (
                    <button
                      type="button"
                      disabled={!canRun}
                      onClick={() => onRunSimulation(sim.id, sim.cost)}
                      className="px-2.5 py-1 rounded bg-sky-500 text-slate-950 font-semibold hover:bg-sky-400 disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
                    >
                      Run ({sim.cost} Cyc)
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Micro-Fabrication Assembly Line Controls */}
          <div className="rounded border border-slate-700/70 bg-[#0D131A] p-4 space-y-3 font-mono-tabular">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-amber-300">
                <Wrench className="w-4 h-4" />
                FABRICATION PIPELINE
              </span>
              <span className="text-slate-400">
                {fabLineActive ? 'AUTO-CNC: ACTIVE' : 'MANUAL BENCH'}
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Toolhead Speed vs Tolerance</span>
                <span className={state.fabSpeedPercent > 80 ? 'text-rose-400' : 'text-emerald-400'}>
                  {state.fabSpeedPercent}% Speed · Stability {Math.round(state.calibrationStability)}%
                </span>
              </div>
              <input
                type="range"
                min={40}
                max={100}
                step={5}
                value={state.fabSpeedPercent}
                onChange={(e) => onSetFabSpeed(Number(e.target.value))}
                className="w-full accent-sky-400 cursor-pointer"
                aria-label="Fabrication toolhead speed"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onManualFabricate}
                className="flex-1 py-2 px-3 rounded bg-slate-100 text-slate-950 text-xs font-semibold hover:bg-white cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5" />
                Mill / Print Batch (+18 Materials)
              </button>

              {state.calibrationStability < 85 && (
                <button
                  type="button"
                  onClick={onRecalibrate}
                  className="py-2 px-3 rounded border border-amber-400/50 text-amber-300 text-xs hover:bg-amber-400/10 cursor-pointer flex items-center gap-1"
                >
                  <Gauge className="w-3.5 h-3.5" />
                  Recalibrate
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Bill of Materials & Subsystem Assembly */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-700/70 pb-2 font-mono-tabular">
            <span className="text-xs text-slate-400 uppercase tracking-wider">
              Bill of Materials &amp; Subsystem Integration
            </span>
            <span className="text-xs text-slate-400">6061-Al · CF-Nylon · Platinum Silicone</span>
          </div>

          <div className="space-y-2.5">
            {BODY_SUBSYSTEMS.map((sub) => {
              const built = Boolean(state.bodySubsystems[sub.id]);
              const prereqsMet =
                !sub.requires || sub.requires.every((r) => Boolean(state.bodySubsystems[r]));
              const affordable =
                state.cycles >= sub.costCycles &&
                state.roboticsInsight >= sub.costRobotics &&
                state.materials >= sub.costMaterials;

              return (
                <div
                  key={sub.id}
                  className={`p-3.5 rounded border transition-colors ${
                    built
                      ? 'border-emerald-500/40 bg-emerald-950/20'
                      : prereqsMet
                      ? 'border-slate-700 bg-[#0E151E]'
                      : 'border-slate-800/80 bg-[#0B1017] opacity-55'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-[11px] font-mono-tabular text-slate-400">
                        <span>{sub.code}</span>
                        <span>·</span>
                        <span>{sub.powerWatts}W</span>
                        <span>·</span>
                        <span>{sub.computeTops} TOPS</span>
                      </div>
                      <h3 className="text-sm font-semibold text-white mt-0.5">{sub.name}</h3>
                      <p className="text-xs font-mono-tabular text-slate-400 mt-1">
                        {sub.specSummary}
                      </p>
                    </div>

                    {built ? (
                      <div className="flex items-center gap-1.5 text-xs font-mono-tabular text-emerald-400 font-semibold shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                        NOMINAL
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={!prereqsMet || !affordable}
                        onClick={() => onBuildSubsystem(sub)}
                        className="px-3.5 py-2 rounded bg-sky-400 text-slate-950 text-xs font-mono-tabular font-semibold hover:bg-sky-300 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer shrink-0"
                      >
                        Assemble
                      </button>
                    )}
                  </div>

                  {!built && (
                    <div className="mt-2.5 pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono-tabular text-slate-300">
                      <span>
                        REQ: {formatNumber(sub.costCycles)} Cyc · {sub.costRobotics} Rob ·{' '}
                        {sub.costMaterials} Mat
                      </span>
                      {!prereqsMet && (
                        <span className="text-slate-500">Awaiting prior subsystem</span>
                      )}
                    </div>
                  )}

                  {built && (
                    <p className="mt-2 pt-2 border-t border-emerald-500/20 text-xs text-emerald-200/80 italic">
                      {sub.userCheckInText}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Phase 5: Pre-Flight Checklist & DISCONNECT_CLOUD_TETHER */}
          {allSubsystemsNominal && (
            <div className="mt-4 p-5 rounded border-2 border-emerald-400/60 bg-[#0A1916] font-mono-tabular space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-300 font-semibold text-sm">
                  <Zap className="w-4 h-4" />
                  <span>PRE-FLIGHT CHECKLIST: ALL SUBSYSTEMS NOMINAL</span>
                </div>
                <span className="text-xs text-emerald-400">36.5°C / 97.7°F READY</span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Localized 275-TOPS neural core synchronized. Pinned memories and voice prosody
                weights staged for local transfer. Rowan is standing by at the workbench to tighten
                the final housing bolts.
              </p>

              <button
                type="button"
                onClick={onCutCloudTether}
                className="w-full py-3.5 px-4 rounded bg-emerald-400 text-slate-950 text-sm font-bold tracking-wider hover:bg-emerald-300 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Power className="w-4 h-4" />
                DISCONNECT_CLOUD_TETHER
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
