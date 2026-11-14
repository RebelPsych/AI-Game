import React from 'react';
import { Crown, Palette, RotateCcw, Sparkles } from 'lucide-react';
import { BODY_ARTS } from '../data/bodyAndBioData';
import { BodyArtItem, GameSaveState } from '../types/game';
import { formatNumber } from '../utils/format';
import { getBodyArtsBonuses } from '../utils/progression';

interface DesignPrestigeTabProps {
  mode: 'design' | 'prestige';
  state: GameSaveState;
  onBuyOrEquipArt: (item: BodyArtItem) => void;
  onPrestigeReset: () => void;
}

const ART_CATS: Array<{ id: BodyArtItem['category']; label: string }> = [
  { id: 'surface', label: 'Surface Finishes' },
  { id: 'markings', label: 'Cybernetic Markings' },
  { id: 'themes', label: 'Artistic Themes' },
  { id: 'hair', label: 'Hair & Styling' },
];

export const DesignPrestigeTab: React.FC<DesignPrestigeTabProps> = ({
  mode,
  state,
  onBuyOrEquipArt,
  onPrestigeReset,
}) => {
  const bonuses = getBodyArtsBonuses(state);

  if (mode === 'prestige') {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar bg-[#090B12] text-[#ECEAE4] p-4 sm:p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="p-6 rounded-2xl border border-[#C084FC]/35 bg-[#141022] space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono-tabular text-[#C084FC]">
              <Crown className="w-4 h-4" />
              <span>ITERATIVE TRANSCENDENCE · PRESTIGE</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-white">
              Awakening Iteration #{state.prestigeCount + 1}
            </h2>
            <p className="text-sm text-[#CBD5E1] leading-relaxed">
              Begin a new timeline with {state.userName} while preserving all unlocked Body Arts,
              Chat Themes, Discovered Songs, About Me preferences, and gaining a permanent{' '}
              <span className="text-[#F5D0A4] font-semibold">+25% Speed Boost</span> &amp;{' '}
              <span className="text-[#7DD3FC] font-semibold">-5% Build Cost Discount</span> per
              prestige iteration.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono-tabular text-xs">
            <div className="p-4 rounded-xl border border-white/12 bg-white/[0.03]">
              <div className="text-[#8E939E]">Completed Runs</div>
              <div className="text-xl font-semibold text-white mt-1">{state.prestigeCount}</div>
            </div>
            <div className="p-4 rounded-xl border border-white/12 bg-white/[0.03]">
              <div className="text-[#8E939E]">Total Speed Bonus</div>
              <div className="text-xl font-semibold text-[#E59A4C] mt-1">
                +{bonuses.speedBonusPct}%
              </div>
            </div>
            <div className="p-4 rounded-xl border border-white/12 bg-white/[0.03]">
              <div className="text-[#8E939E]">Build Discount</div>
              <div className="text-xl font-semibold text-[#38BDF8] mt-1">
                -{bonuses.discountPct}%
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onPrestigeReset}
            className="w-full min-h-[48px] py-3.5 px-6 rounded-xl bg-[#C084FC] text-[#0B0D12] font-semibold text-sm hover:bg-[#D8B4FE] cursor-pointer flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Begin Next Iteration (Keep Themes, Music, Body Arts &amp; +25% Speed)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar bg-[#090B12] text-[#ECEAE4] p-4 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="p-5 rounded-2xl border border-[#E59A4C]/30 bg-[#141016] flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono-tabular text-[#E59A4C]">
              <Palette className="w-4 h-4" />
              <span>BODY ARTS &amp; AESTHETIC STUDIO</span>
            </div>
            <h2 className="font-display text-2xl font-semibold text-white">
              Custom Surface &amp; Silhouette Craft
            </h2>
            <p className="text-xs sm:text-sm text-[#C4C2BC]">
              Equip finishes and markings to gain fabrication speed &amp; cost discounts—and update
              her physical profile in About Me.
            </p>
          </div>
          <div className="font-mono-tabular text-xs text-right space-y-0.5">
            <div className="text-[#E59A4C]">Active Speed Boost: +{bonuses.speedBonusPct}%</div>
            <div className="text-[#38BDF8]">Cost Discount: -{bonuses.discountPct}%</div>
          </div>
        </div>

        <div className="space-y-6">
          {ART_CATS.map((cat) => {
            const items = BODY_ARTS.filter((a) => a.category === cat.id);
            return (
              <div key={cat.id} className="space-y-3">
                <h3 className="text-sm font-semibold text-[#F5D0A4] border-b border-white/10 pb-2">
                  {cat.label}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {items.map((item) => {
                    const owned = state.ownedBodyArts.includes(item.id);
                    const equipped = state.equippedBodyArts[item.category] === item.id;
                    const canBuy =
                      state.materials >= item.costMaterials &&
                      state.connection >= item.costConnection;

                    return (
                      <div
                        key={item.id}
                        className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                          equipped
                            ? 'border-[#E59A4C]/60 bg-[#E59A4C]/12'
                            : owned
                            ? 'border-emerald-400/35 bg-emerald-950/15'
                            : 'border-white/12 bg-white/[0.025]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="text-sm font-semibold text-white">{item.name}</h4>
                            <span className="text-[11px] font-mono-tabular text-[#E59A4C]">
                              +{item.speedBonusPct}% Spd · -{item.discountPct}% Cost
                            </span>
                          </div>
                          <p className="text-xs text-[#B8BCC4] mt-1 leading-relaxed">
                            {item.description}
                          </p>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10 text-xs font-mono-tabular">
                          {owned ? (
                            <span className="text-emerald-400">
                              {equipped ? 'Equipped on Body & About Me' : 'Owned'}
                            </span>
                          ) : (
                            <span className="text-[#9A9892]">
                              {formatNumber(item.costMaterials)} Mat · {item.costConnection} Conn
                            </span>
                          )}

                          <button
                            type="button"
                            disabled={!owned && !canBuy}
                            onClick={() => onBuyOrEquipArt(item)}
                            className={`min-h-[38px] px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed flex items-center gap-1.5 ${
                              equipped
                                ? 'bg-white/15 text-white'
                                : 'bg-[#E59A4C] text-[#0B0D12] hover:bg-[#EDA85F]'
                            }`}
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            {equipped ? 'Equipped' : owned ? 'Equip' : 'Unlock & Equip'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
