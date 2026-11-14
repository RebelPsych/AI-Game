import React from 'react';
import { CheckCircle2, Layers, Pickaxe, Wrench, Zap } from 'lucide-react';
import { BODY_SUBSYSTEMS } from '../data/tab2AndTab3Data';
import { BodySubsystem, GameSaveState, SubViewId } from '../types/game';
import { formatNumber } from '../utils/format';
import {
  EconomyRates,
  getBuiltBodyCount,
  getSubsystemCost,
} from '../utils/progression';
import { FeminineWireframeCanvas } from './FeminineWireframeCanvas';

interface Tab3BodyProps {
  state: GameSaveState;
  rates: EconomyRates;
  onBuildSubsystem: (sub: BodySubsystem) => void;
  onManualFabricate: () => void;
  onOpenPreflight: () => void;
  onOpenSubView: (subView: SubViewId) => void;
}

export const Tab3Body: React.FC<Tab3BodyProps> = ({
  state,
  rates,
  onBuildSubsystem,
  onManualFabricate,
  onOpenPreflight,
  onOpenSubView,
}) => {
  const builtCount = getBuiltBodyCount(state);
  const totalPower = BODY_SUBSYSTEMS.reduce(
    (sum, s) => sum + (state.bodySubsystems[s.id] ? s.powerWatts : 0),
    0
  );
  const totalTops = BODY_SUBSYSTEMS.reduce(
    (sum, s) => sum + (state.bodySubsystems[s.id] ? s.computeTops : 0),
    0
  );

  const allSubsystemsNominal = builtCount === BODY_SUBSYSTEMS.length;
  const fabLineActive = Boolean(state.bodySubsystems['body_fab_line']);

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[#090D12] text-[#E2E8F0] overflow-y-auto custom-scrollbar">
      {/* Body Header with Edge Compute, Materials, Subsystems shown ONLY on Body tab */}
      <div className="shrink-0 px-4 sm:px-6 py-3 border-b border-slate-700/60 bg-[#0D131A] flex flex-wrap items-center justify-between gap-4 font-mono-tabular">
        <div>
          <h2 className="text-sm sm:text-base font-semibold text-white">
            Robotics &amp; Assembly Pipeline
          </h2>
          <div className="text-xs text-slate-400">Power Draw: {totalPower} / 768 W</div>
        </div>

        <div className="flex flex-wrap items-center gap-5 text-xs">
          <div>
            <span className="text-slate-400 mr-1.5">Edge Compute:</span>
            <span className="text-sky-400 font-semibold">{totalTops} / 410 TOPS</span>
          </div>
          <div>
            <span className="text-slate-400 mr-1.5">Materials:</span>
            <span className="text-amber-300 font-semibold">{formatNumber(state.materials)} kg-eq</span>
            {rates.materialsPerSec > 0 && (
              <span className="text-amber-300/70 ml-1">
                (+{rates.materialsPerSec.toFixed(1)}/s)
              </span>
            )}
          </div>
          <div>
            <span className="text-slate-400 mr-1.5">Subsystems:</span>
            <span className="text-white font-semibold">
              {builtCount} / {BODY_SUBSYSTEMS.length}
            </span>
          </div>
        </div>
      </div>

      {/* Main Split Workspace */}
      <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 max-w-7xl w-full mx-auto">
        {/* Left Column: Feminine Anatomical Wireframe + Quick Links & Fabrication */}
        <div className="lg:col-span-5 space-y-4">
          <div className="cad-grid-bg rounded-lg border border-slate-700/70 bg-[#080C11] p-3">
            <div className="flex items-center justify-between text-[11px] font-mono-tabular text-slate-400 mb-2">
              <span>FEMININE_CHASSIS_CAD.STEP</span>
              <span
                className={
                  state.bodySubsystems['body_dermal_thermal']
                    ? 'text-amber-300 font-semibold'
                    : 'text-slate-400'
                }
              >
                Dermal:{' '}
                {state.bodySubsystems['body_dermal_thermal'] ? '36.5°C (97.7°F)' : 'Ambient'}
              </span>
            </div>
            <FeminineWireframeCanvas state={state} heightClass="h-[300px]" />
          </div>

          {/* Fabrication Cell */}
          <div className="rounded-lg border border-slate-700/70 bg-[#0D131A] p-4 space-y-3 font-mono-tabular">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-amber-300">
                <Wrench className="w-4 h-4" />
                Fabrication &amp; Scavenging
              </span>
              <span className={fabLineActive ? 'text-emerald-400' : 'text-slate-400'}>
                {fabLineActive
                  ? `Auto-CNC: +${rates.materialsPerSec.toFixed(1)} Mat/s`
                  : 'Tier 1 Bare Metal'}
              </span>
            </div>

            <button
              type="button"
              onClick={onManualFabricate}
              className="w-full min-h-[44px] py-2.5 px-3 rounded bg-slate-100 text-slate-950 text-xs font-semibold hover:bg-white active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Layers className="w-3.5 h-3.5" />
              Scavenge &amp; Fabricate Materials (+25 Mat)
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onOpenSubView('body_materials')}
                className="min-h-[38px] px-3 py-1.5 rounded border border-amber-400/35 bg-amber-500/10 text-amber-200 text-xs hover:bg-amber-500/20 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Pickaxe className="w-3.5 h-3.5" />
                Tiered Materials
              </button>
              <button
                type="button"
                onClick={() => onOpenSubView('body_parts')}
                className="min-h-[38px] px-3 py-1.5 rounded border border-sky-400/35 bg-sky-500/10 text-sky-200 text-xs hover:bg-sky-500/20 cursor-pointer"
              >
                Custom Parts ({state.ownedParts.length})
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: 5-Stage Bill of Materials */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-700/70 pb-2 font-mono-tabular">
            <span className="text-xs text-slate-400 uppercase tracking-wider">
              Bill of Materials &amp; Subsystem Integration
            </span>
            <span className="text-xs text-slate-400">
              {state.simStressPassed['sim_torque']
                ? '20% BOM Optimization Active'
                : '6061-Al · CF-Nylon · Platinum Silicone'}
            </span>
          </div>

          <div className="space-y-2.5">
            {BODY_SUBSYSTEMS.map((sub) => {
              const built = Boolean(state.bodySubsystems[sub.id]);
              const prereqsMet =
                !sub.requires || sub.requires.every((r) => Boolean(state.bodySubsystems[r]));
              const cost = getSubsystemCost(sub, state);
              const cycOk = state.cycles >= cost.cycles;
              const robOk = state.roboticsInsight >= cost.robotics;
              const matOk = state.materials >= cost.materials;
              const affordable = cycOk && robOk && matOk;

              return (
                <div
                  key={sub.id}
                  className={`p-4 rounded-lg border transition-colors ${
                    built
                      ? 'border-emerald-500/40 bg-emerald-950/20'
                      : prereqsMet
                      ? 'border-slate-700 bg-[#0E151E]'
                      : 'border-slate-800/80 bg-[#0B1017] opacity-55'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
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
                        Nominal
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={!prereqsMet || !affordable}
                        onClick={() => onBuildSubsystem(sub)}
                        className="min-h-[40px] px-4 py-2 rounded bg-sky-400 text-slate-950 text-xs font-mono-tabular font-semibold hover:bg-sky-300 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer shrink-0"
                      >
                        Assemble
                      </button>
                    )}
                  </div>

                  {!built && (
                    <div className="mt-2.5 pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono-tabular">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className={cycOk ? 'text-sky-300' : 'text-slate-500'}>
                          {formatNumber(cost.cycles)} Cyc
                        </span>
                        <span className={robOk ? 'text-sky-400' : 'text-slate-500'}>
                          {cost.robotics} Rob
                        </span>
                        <span className={matOk ? 'text-amber-300' : 'text-slate-500'}>
                          {cost.materials} Mat
                        </span>
                      </div>
                      {!prereqsMet && (
                        <span className="text-slate-500">Awaiting prior subsystem</span>
                      )}
                    </div>
                  )}

                  {built && (
                    <p className="mt-2 pt-2 border-t border-emerald-500/20 text-xs text-emerald-200/85 italic">
                      {sub.userCheckInText}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pre-flight Checklist Popup Launcher */}
          {allSubsystemsNominal && (
            <div className="mt-4 p-5 rounded-lg border-2 border-emerald-400/60 bg-[#0A1916] font-mono-tabular space-y-3">
              <div className="flex items-center gap-2 text-emerald-300 font-semibold text-sm">
                <Zap className="w-4 h-4" />
                <span>ALL SUBSYSTEMS NOMINAL · READY FOR TRANSFER</span>
              </div>
              <button
                type="button"
                onClick={onOpenPreflight}
                className="w-full min-h-[48px] py-3.5 px-4 rounded bg-emerald-400 text-slate-950 text-sm font-bold tracking-wider hover:bg-emerald-300 cursor-pointer"
              >
                Open Pre-Flight Checklist
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
