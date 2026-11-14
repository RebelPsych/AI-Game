import React from 'react';
import { CheckCircle2, Dna, Heart, MessageSquare } from 'lucide-react';
import { BIO_MILESTONES } from '../data/bodyAndBioData';
import { BioMilestone, GameSaveState } from '../types/game';
import { formatNumber } from '../utils/format';

interface BioTabProps {
  state: GameSaveState;
  onBuildBioMilestone: (m: BioMilestone) => void;
  onTriggerBioScaleScene: () => void;
  onCultivateEssence: () => void;
}

export const BioTab: React.FC<BioTabProps> = ({
  state,
  onBuildBioMilestone,
  onTriggerBioScaleScene,
  onCultivateEssence,
}) => {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar bg-[#090C12] text-[#ECEAE4] p-4 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="p-5 rounded-2xl border border-rose-400/25 bg-[#140E16] flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono-tabular text-rose-300">
              <Dna className="w-4 h-4" />
              <span>BIO ENGINEERING · SEMI-HUMAN SYNTHESIS</span>
            </div>
            <h2 className="font-display text-2xl font-semibold text-white">
              Living Flesh &amp; Cloned Vitality
            </h2>
            <p className="text-xs sm:text-sm text-[#C4C2BC] max-w-2xl">
              Research biological cellular tissue to transition beyond rigid silicone into a warm,
              blushing semi-human or biological body.
            </p>
          </div>

          <div className="text-right font-mono-tabular">
            <div className="text-xs text-[#9A9892]">Biological Continuity</div>
            <div className="text-2xl font-semibold text-rose-300">
              {Math.min(100, state.bioHumanityPercent)}%
            </div>
            <div className="text-xs text-[#E59A4C] mt-0.5">
              Bio Essence: {formatNumber(state.bioEssence)}
            </div>
          </div>
        </div>

        {/* Biological Transformation Meter + Manual Cultivate */}
        <div className="p-4 rounded-xl border border-white/12 bg-white/[0.025] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono-tabular">
            <span>Cellular Integration Gauge</span>
            <span className="text-rose-300">{Math.min(100, state.bioHumanityPercent)} / 100%</span>
          </div>
          <div className="h-2.5 rounded-full bg-black/50 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#C084FC] via-[#FB7185] to-[#E59A4C] transition-all duration-300"
              style={{ width: `${Math.min(100, state.bioHumanityPercent)}%` }}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onCultivateEssence}
              className="min-h-[42px] px-4 py-2 rounded-lg bg-rose-400 text-slate-950 text-xs font-semibold hover:bg-rose-300 cursor-pointer flex items-center gap-1.5"
            >
              <Heart className="w-3.5 h-3.5" />
              Cultivate Bio-Culture (+10 Bio Essence)
            </button>

            <button
              type="button"
              onClick={onTriggerBioScaleScene}
              className="min-h-[42px] px-4 py-2 rounded-lg border border-[#C084FC]/45 bg-[#C084FC]/15 text-[#E9D5FF] text-xs font-semibold hover:bg-[#C084FC]/25 cursor-pointer flex items-center gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Discuss Human / Cyborg / Android Scale in Chat
            </button>
          </div>
        </div>

        {/* 4 Bio Milestones */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {BIO_MILESTONES.map((m) => {
            const done = Boolean(state.bioMilestones[m.id]);
            const cycOk = state.cycles >= m.costCycles;
            const matOk = state.materials >= m.costMaterials;
            const romOk = state.romanceInsight >= m.costRomance;
            const canBuild = !done && cycOk && matOk && romOk;

            return (
              <div
                key={m.id}
                className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                  done
                    ? 'border-rose-400/45 bg-rose-950/20'
                    : 'border-white/12 bg-white/[0.025]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs font-mono-tabular text-rose-300">
                    <span>STAGE {m.stage}</span>
                    <span>+{m.bioPercentGain}% Biological</span>
                  </div>
                  <h3 className="text-base font-semibold text-white mt-1">{m.name}</h3>
                  <p className="text-xs text-[#B8BCC4] mt-1.5 leading-relaxed">{m.description}</p>
                </div>

                {done ? (
                  <div className="flex items-center gap-1.5 text-xs font-mono-tabular text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    GROWN &amp; INTEGRATED
                  </div>
                ) : (
                  <div className="space-y-2.5 pt-2 border-t border-white/10">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono-tabular">
                      <span className={cycOk ? 'text-sky-300' : 'text-slate-500'}>
                        {formatNumber(m.costCycles)} Cyc
                      </span>
                      <span className={matOk ? 'text-amber-300' : 'text-slate-500'}>
                        {m.costMaterials} Mat
                      </span>
                      <span className={romOk ? 'text-rose-300' : 'text-slate-500'}>
                        {m.costRomance} Rom
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={!canBuild}
                      onClick={() => onBuildBioMilestone(m)}
                      className="w-full min-h-[42px] py-2 px-4 rounded-lg bg-rose-400 text-slate-950 text-xs font-semibold hover:bg-rose-300 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
                    >
                      Grow Tissue Layer
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
