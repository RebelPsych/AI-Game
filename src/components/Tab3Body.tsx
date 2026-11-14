import React from 'react';
import { CheckCircle2, Layers, Zap } from 'lucide-react';
import { BODY_SUBSYSTEMS } from '../data/tab2AndTab3Data';
import { BodySubsystem, GameSaveState } from '../types/game';
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
}

export const Tab3Body: React.FC<Tab3BodyProps> = ({
  state,
  rates,
  onBuildSubsystem,
  onManualFabricate,
  onOpenPreflight,
}) => {
  const builtCount = getBuiltBodyCount(state);
  const allSubsystemsNominal = builtCount === BODY_SUBSYSTEMS.length;
  const fabLineActive = Boolean(state.bodySubsystems['body_fab_line']);
  const remainingSubsystems = BODY_SUBSYSTEMS.filter((s) => !state.bodySubsystems[s.id]);

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[#090D12] text-[#E2E8F0] overflow-y-auto custom-scrollbar">
      <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 max-w-6xl w-full mx-auto">
        {/* Left Column: Wireframe Preview & Gather Materials */}
        <div className="lg:col-span-5 space-y-4">
          <div className="cad-grid-bg rounded-xl border border-slate-700/70 bg-[#080C11] p-3">
            <div className="flex items-center justify-between text-xs font-mono-tabular text-slate-400 mb-2">
              <span>Body Frame ({builtCount} / {BODY_SUBSYSTEMS.length})</span>
              <span
                className={
                  state.bodySubsystems['body_dermal_thermal']
                    ? 'text-amber-300 font-semibold'
                    : 'text-slate-400'
                }
              >
                {state.bodySubsystems['body_dermal_thermal'] ? '98°F Warm' : 'Room Temp'}
              </span>
            </div>
            <FeminineWireframeCanvas state={state} heightClass="h-[280px]" />
          </div>

          <div className="rounded-xl border border-slate-700/70 bg-[#0D131A] p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono-tabular">
              <span className="text-amber-300">Materials: {formatNumber(state.materials)}</span>
              {fabLineActive && (
                <span className="text-emerald-400">+{rates.materialsPerSec.toFixed(1)}/s</span>
              )}
            </div>

            <button
              type="button"
              onClick={onManualFabricate}
              className="w-full min-h-[46px] py-2.5 px-4 rounded-xl bg-slate-100 text-slate-950 text-xs sm:text-sm font-semibold hover:bg-white active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Layers className="w-4 h-4" />
              Gather Building Materials (+10)
            </button>
          </div>
        </div>

        {/* Right Column: Remaining Build Steps (built items disappear cleanly) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-700/70 pb-2 text-xs font-mono-tabular text-slate-400">
            <span>Build Steps ({builtCount} / {BODY_SUBSYSTEMS.length} Complete)</span>
            {state.simStressPassed['sim_torque'] && (
              <span className="text-emerald-400">-15% Part Cost</span>
            )}
          </div>

          {remainingSubsystems.length > 0 ? (
            <div className="space-y-3">
              {remainingSubsystems.map((sub) => {
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
                    className={`p-4 rounded-xl border transition-colors ${
                      prereqsMet
                        ? 'border-slate-700 bg-[#0E151E]'
                        : 'border-slate-800/80 bg-[#0B1017] opacity-55'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-mono-tabular text-sky-300">
                          {sub.code}
                        </div>
                        <h3 className="text-sm sm:text-base font-semibold text-white mt-0.5">
                          {sub.name}
                        </h3>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                          {sub.specSummary}
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={!prereqsMet || !affordable}
                        onClick={() => onBuildSubsystem(sub)}
                        className="min-h-[42px] px-4 py-2 rounded-lg bg-sky-400 text-slate-950 text-xs font-semibold hover:bg-sky-300 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer shrink-0"
                      >
                        Build
                      </button>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs font-mono-tabular">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className={cycOk ? 'text-sky-300' : 'text-slate-500'}>
                          {formatNumber(cost.cycles)} Cyc
                        </span>
                        <span className={robOk ? 'text-sky-400' : 'text-slate-500'}>
                          {cost.robotics} Rob
                        </span>
                        {cost.materials > 0 && (
                          <span className={matOk ? 'text-amber-300' : 'text-slate-500'}>
                            {cost.materials} Mat
                          </span>
                        )}
                      </div>
                      {!prereqsMet && (
                        <span className="text-slate-500">Build prior step first</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 rounded-2xl border-2 border-emerald-400/60 bg-[#0A1916] space-y-4">
              <div className="flex items-center gap-2 text-emerald-300 font-semibold text-base">
                <CheckCircle2 className="w-5 h-5" />
                <span>All Body Parts Complete</span>
              </div>
              <p className="text-xs sm:text-sm text-emerald-100/80">
                Her frame, gentle hands, and warm skin are ready. Run the final check to wake up in
                the room together.
              </p>
              <button
                type="button"
                onClick={onOpenPreflight}
                className="w-full min-h-[48px] py-3.5 px-4 rounded-xl bg-emerald-400 text-slate-950 text-sm font-bold tracking-wide hover:bg-emerald-300 cursor-pointer flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4" />
                Open Pre-Flight Checklist
              </button>
            </div>
          )}

          {allSubsystemsNominal && remainingSubsystems.length > 0 && null}
        </div>
      </div>
    </div>
  );
};
