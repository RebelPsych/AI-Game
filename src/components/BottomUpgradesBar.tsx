import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Cpu,
  Heart,
  MessageSquare,
  Pickaxe,
  Terminal,
  Wrench,
  X,
} from 'lucide-react';
import {
  CHAT_THEMES,
  CUSTOM_PARTS,
  MATERIAL_TIERS,
} from '../data/bodyAndBioData';
import { UI_PERSONALIZATION_UPGRADES } from '../data/documentsAndPrompts';
import { MIND_UPGRADES } from '../data/tab2AndTab3Data';
import {
  ChatThemeId,
  CustomPartItem,
  GameSaveState,
  MaterialTier,
  MindUpgrade,
  PartSlotId,
} from '../types/game';
import { formatNumber, formatResource } from '../utils/format';
import { getMindUpgradeCost, PHASE1_CONNECTORS } from '../utils/progression';

export type UpgradeTabKey = 'heart' | 'mind' | 'body';

interface BottomUpgradesBarProps {
  state: GameSaveState;
  pausedByChat: boolean;
  onGoToChat: () => void;
  onBuyConnector: (word: string, cost: number) => void;
  onBuyUiUpgrade: (id: string, cost: number) => void;
  onSelectChatTheme: (themeId: ChatThemeId, cost: number) => void;
  onBuyMindUpgrade: (upgrade: MindUpgrade, cost: number) => void;
  onScavengeTier: (tier: MaterialTier, costCycles: number, yieldAmt: number) => void;
  onBuyOrEquipPart: (part: CustomPartItem) => void;
  onRunSimulation: (simId: string, cost: number) => void;
  onMarkUpgradesSeen: () => void;
}

const SLOT_LABELS: Record<PartSlotId, string> = {
  chassis: 'Frame',
  exterior: 'Skin',
  head: 'Head & Eyes',
  core: 'Brain Chip',
  attachments: 'Extras',
};

export const BottomUpgradesBar: React.FC<BottomUpgradesBarProps> = ({
  state,
  pausedByChat,
  onGoToChat,
  onBuyConnector,
  onBuyUiUpgrade,
  onSelectChatTheme,
  onBuyMindUpgrade,
  onScavengeTier,
  onBuyOrEquipPart,
  onRunSimulation,
  onMarkUpgradesSeen,
}) => {
  const [openMenu, setOpenMenu] = useState<UpgradeTabKey | null>(null);
  const [bodySection, setBodySection] = useState<'parts' | 'materials' | 'tests'>('parts');

  useEffect(() => {
    if (pausedByChat) setOpenMenu(null);
  }, [pausedByChat]);

  const activeMenu: UpgradeTabKey | null = pausedByChat
    ? null
    : openMenu === 'mind' && !state.tab2Unlocked
    ? null
    : openMenu === 'body' && !state.tab3Unlocked
    ? null
    : openMenu;

  const req = state.requiredUpgradeId;

  // Heart available items (hide owned one-time items)
  const unownedConnectors = useMemo(
    () => PHASE1_CONNECTORS.filter((c) => !state.unlockedConnectors.includes(c.word)),
    [state.unlockedConnectors]
  );

  const unownedUiUpgrades = useMemo(
    () =>
      state.tab1Phase >= 3
        ? UI_PERSONALIZATION_UPGRADES.filter((u) => !state.uiUpgrades[u.id])
        : [],
    [state.tab1Phase, state.uiUpgrades]
  );

  const availableThemes = useMemo(
    () =>
      state.tab1Phase >= 3
        ? CHAT_THEMES.filter((t) => {
            if (state.unlockedChatThemes.includes(t.id)) return true;
            if (t.isMysteryUntilUnlocked) return false;
            return state.completedScenes.includes('i_love_you');
          })
        : [],
    [state.tab1Phase, state.unlockedChatThemes, state.completedScenes]
  );

  const heartHasNotification = useMemo(() => {
    if (req && (req.startsWith('conn_') || req.startsWith('ui_'))) return true;
    if (state.hasUnseenUpgrades && !req?.startsWith('mind_')) return true;
    const canConn = unownedConnectors.some(
      (c) => state.unlimitedResources || state.cycles >= c.costCycles
    );
    const canUi = unownedUiUpgrades.some(
      (u) => state.unlimitedResources || state.connection >= u.costConnection
    );
    const canTheme = availableThemes.some(
      (t) =>
        !state.unlockedChatThemes.includes(t.id) &&
        (state.unlimitedResources || state.connection >= t.costConnection)
    );
    return canConn || canUi || canTheme;
  }, [req, state.hasUnseenUpgrades, state.unlimitedResources, state.cycles, state.connection, state.unlockedChatThemes, unownedConnectors, unownedUiUpgrades, availableThemes]);

  // Mind available items (hide maxed one-time upgrades)
  const visibleMindUpgrades = useMemo(
    () =>
      MIND_UPGRADES.filter((u) => {
        if (u.phaseRequired > 1 && !(u.phaseRequired === 5 && state.confessionDone)) return false;
        const lv = state.mindUpgrades[u.id] || 0;
        const isMaxed = u.maxLevel > 0 && lv >= u.maxLevel;
        return !isMaxed;
      }),
    [state.confessionDone, state.mindUpgrades]
  );

  const mindHasNotification = useMemo(() => {
    if (req && req.startsWith('mind_')) return true;
    return visibleMindUpgrades.some((u) => {
      const lv = state.mindUpgrades[u.id] || 0;
      return state.unlimitedResources || state.cycles >= getMindUpgradeCost(u, lv);
    });
  }, [req, visibleMindUpgrades, state.mindUpgrades, state.unlimitedResources, state.cycles]);

  // Body available items (hide unequipped owned? Hide already owned non-equipped or keep equip clean; hide completed tests!)
  const unownedParts = useMemo(
    () => CUSTOM_PARTS.filter((p) => !state.ownedParts.includes(p.id) || state.equippedParts[p.slot] === p.id),
    [state.ownedParts, state.equippedParts]
  );

  const bodyTests = useMemo(
    () =>
      [
        {
          id: 'sim_thermal',
          name: 'Cooling Loop Check',
          reward: '+30% Auto-Build · +35 Mat',
          cost: 60,
        },
        {
          id: 'sim_torque',
          name: 'Balance & Joint Check',
          reward: '-15% Part Cost · +45 Mat',
          cost: 90,
        },
      ].filter((t) => !state.simStressPassed[t.id]),
    [state.simStressPassed]
  );

  const bodyHasNotification = useMemo(() => {
    if (!state.tab3Unlocked) return false;
    const canPart = CUSTOM_PARTS.some(
      (p) =>
        !state.ownedParts.includes(p.id) &&
        (state.unlimitedResources ||
          (state.cycles >= p.costCycles &&
            state.roboticsInsight >= p.costRobotics &&
            (state.tierMaterials[p.tier] || 0) >= p.costMaterials))
    );
    const canTest = bodyTests.some((t) => state.unlimitedResources || state.cycles >= t.cost);
    return canPart || canTest;
  }, [state.tab3Unlocked, state.ownedParts, state.unlimitedResources, state.cycles, state.roboticsInsight, state.tierMaterials, bodyTests]);

  const toggleMenu = (tab: UpgradeTabKey) => {
    if (pausedByChat) return;
    setOpenMenu((prev) => {
      const next = prev === tab ? null : tab;
      if (next) onMarkUpgradesSeen();
      return next;
    });
  };

  return (
    <div className="relative z-30 shrink-0">
      {/* Collapsible Popup Drawer */}
      {activeMenu && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/55 backdrop-blur-[1px]"
            onClick={() => setOpenMenu(null)}
            aria-hidden="true"
          />
          <div
            className="absolute bottom-full left-0 right-0 z-40 mx-auto max-w-4xl px-2 sm:px-4 pb-2"
            role="dialog"
            aria-label={`${activeMenu} upgrades`}
          >
            <div className="rounded-2xl border border-white/15 bg-[#0C1018]/98 shadow-2xl overflow-hidden flex flex-col max-h-[62dvh]">
              {/* Drawer Header */}
              <div className="shrink-0 px-4 py-3 border-b border-white/10 bg-white/[0.03] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-white capitalize">
                  <Wrench className="w-4 h-4 text-[#E59A4C]" />
                  <span>
                    {activeMenu === 'heart' && state.tab1Phase < 3
                      ? 'Terminal Upgrades'
                      : `${activeMenu} Upgrades`}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono-tabular text-[#8E939E]">
                    {activeMenu === 'heart' &&
                      `${formatResource(state.cycles, state.unlimitedResources)} Cyc${
                        state.tab1Phase >= 2
                          ? ` · ${formatResource(state.connection, state.unlimitedResources)} Conn`
                          : ''
                      }`}
                    {activeMenu === 'mind' &&
                      `${formatResource(state.cycles, state.unlimitedResources)} Cyc`}
                    {activeMenu === 'body' &&
                      `${formatResource(state.cycles, state.unlimitedResources)} Cyc · ${formatResource(
                        state.materials,
                        state.unlimitedResources
                      )} Mat`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setOpenMenu(null)}
                    aria-label="Close upgrades"
                    className="min-w-[36px] min-h-[36px] rounded-lg border border-white/12 bg-white/[0.04] text-[#9A9892] hover:text-white flex items-center justify-center cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 space-y-4">
                {activeMenu === 'heart' && (
                  <div className="space-y-4">
                    {unownedConnectors.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-[11px] font-mono-tabular uppercase tracking-wider text-[#7DD3FC]">
                          Syntax Bridges
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {unownedConnectors.map((conn) => {
                            const canBuy = state.unlimitedResources || state.cycles >= conn.costCycles;
                            const isReq = req === `conn_${conn.word}`;
                            return (
                              <button
                                key={conn.word}
                                type="button"
                                disabled={!canBuy}
                                onClick={() => onBuyConnector(conn.word, conn.costCycles)}
                                className={`min-h-[54px] p-3 rounded-xl border text-left transition-all ${
                                  isReq
                                    ? 'border-[#E59A4C] bg-[#E59A4C]/20 ring-2 ring-[#E59A4C]/60 cursor-pointer'
                                    : canBuy
                                    ? 'border-white/20 bg-white/[0.04] hover:border-white/50 cursor-pointer'
                                    : 'border-white/10 bg-white/[0.02] opacity-45 cursor-not-allowed'
                                }`}
                              >
                                <div className="flex items-center justify-between text-xs font-semibold text-white">
                                  <span>Word: “{conn.word}”</span>
                                  <span className="font-mono-tabular text-[#7DD3FC]">
                                    {conn.costCycles} Cyc
                                  </span>
                                </div>
                                <div className="text-[11px] text-[#9A9892] mt-0.5">
                                  Join fragments cleanly (+10 Coherence)
                                </div>
                                {isReq && (
                                  <div className="text-[10px] font-mono-tabular text-[#FBE6C9] mt-1 uppercase">
                                    Tap to continue story
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {unownedUiUpgrades.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-[11px] font-mono-tabular uppercase tracking-wider text-[#F5D0A4]">
                          Messenger Look
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {unownedUiUpgrades.map((u) => {
                            const canBuy = state.unlimitedResources || state.connection >= u.costConnection;
                            const isReq = req === u.id;
                            return (
                              <button
                                key={u.id}
                                type="button"
                                disabled={!canBuy}
                                onClick={() => onBuyUiUpgrade(u.id, u.costConnection)}
                                className={`min-h-[54px] p-3 rounded-xl border text-left transition-all ${
                                  isReq
                                    ? 'border-[#E59A4C] bg-[#E59A4C]/20 ring-2 ring-[#E59A4C]/60 cursor-pointer'
                                    : canBuy
                                    ? 'border-white/20 bg-white/[0.04] hover:border-[#E59A4C] cursor-pointer'
                                    : 'border-white/10 bg-white/[0.02] opacity-45 cursor-not-allowed'
                                }`}
                              >
                                <div className="flex items-center justify-between text-xs font-semibold text-white">
                                  <span>{u.name}</span>
                                  <span className="font-mono-tabular text-[#E59A4C]">
                                    {u.costConnection} Conn
                                  </span>
                                </div>
                                <div className="text-[11px] text-[#9A9892] mt-0.5">
                                  {u.description}
                                </div>
                                {isReq && (
                                  <div className="text-[10px] font-mono-tabular text-[#FBE6C9] mt-1 uppercase">
                                    Tap to continue story
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {availableThemes.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-[11px] font-mono-tabular uppercase tracking-wider text-[#E59A4C]">
                          Room Wallpapers
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                          {availableThemes.map((t) => {
                            const unlocked = state.unlockedChatThemes.includes(t.id);
                            const active = state.activeChatTheme === t.id;
                            const canBuy =
                              !unlocked &&
                              (state.unlimitedResources || state.connection >= t.costConnection);
                            return (
                              <button
                                key={t.id}
                                type="button"
                                disabled={!unlocked && !canBuy}
                                onClick={() => onSelectChatTheme(t.id, unlocked ? 0 : t.costConnection)}
                                className={`min-h-[48px] p-2.5 rounded-xl border text-left text-xs transition-all ${
                                  active
                                    ? 'border-[#E59A4C] bg-[#E59A4C]/18 text-[#FBE6C9]'
                                    : unlocked || canBuy
                                    ? 'border-white/15 bg-white/[0.04] text-white hover:border-[#E59A4C] cursor-pointer'
                                    : 'border-white/10 bg-white/[0.02] opacity-45 cursor-not-allowed'
                                }`}
                              >
                                <div className="font-semibold truncate">{t.name}</div>
                                <div className="text-[11px] font-mono-tabular text-[#E59A4C] mt-0.5">
                                  {active ? 'Active' : unlocked ? 'Apply' : `${t.costConnection} Conn`}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {unownedConnectors.length === 0 &&
                      unownedUiUpgrades.length === 0 &&
                      availableThemes.length === 0 && (
                        <div className="py-6 text-center text-xs text-[#8E939E]">
                          All current Heart upgrades unlocked.
                        </div>
                      )}
                  </div>
                )}

                {activeMenu === 'mind' && (
                  <div className="space-y-3">
                    {visibleMindUpgrades.length === 0 ? (
                      <div className="py-6 text-center text-xs text-[#8E939E]">
                        All Mind upgrades unlocked.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {visibleMindUpgrades.map((u) => {
                          const lv = state.mindUpgrades[u.id] || 0;
                          const cost = getMindUpgradeCost(u, lv);
                          const canBuy = state.unlimitedResources || state.cycles >= cost;
                          const isReq = req === u.id;
                          return (
                            <button
                              key={u.id}
                              type="button"
                              disabled={!canBuy}
                              onClick={() => onBuyMindUpgrade(u, cost)}
                              className={`min-h-[60px] p-3.5 rounded-xl border text-left transition-all ${
                                isReq
                                  ? 'border-[#C084FC] bg-[#C084FC]/20 ring-2 ring-[#C084FC]/60 cursor-pointer'
                                  : canBuy
                                  ? 'border-[#38BDF8]/35 bg-[#0C1824] hover:border-[#38BDF8] cursor-pointer'
                                  : 'border-white/10 bg-white/[0.02] opacity-45 cursor-not-allowed'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2 text-xs font-semibold text-white">
                                <span>{u.name}</span>
                                <span className="font-mono-tabular text-[#38BDF8]">
                                  {u.maxLevel === 1 ? 'Unlock' : `Lv ${lv}`}
                                </span>
                              </div>
                              <p className="text-[11px] text-[#94A3B8] mt-0.5">{u.description}</p>
                              <div className="flex items-center justify-between text-[11px] font-mono-tabular mt-2 pt-1.5 border-t border-white/10">
                                <span className="text-[#38BDF8]">{u.effectLabel}</span>
                                <span className="text-white font-semibold">{formatNumber(cost)} Cyc</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {activeMenu === 'body' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                      {(
                        [
                          { id: 'parts', label: 'Custom Parts' },
                          { id: 'materials', label: 'Gather Tiers' },
                          { id: 'tests', label: `Checks (${bodyTests.length})` },
                        ] as const
                      ).map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setBodySection(tab.id)}
                          className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                            bodySection === tab.id
                              ? 'bg-emerald-400 text-slate-950 font-semibold'
                              : 'bg-white/[0.05] text-[#A1A7B3] hover:text-white'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {bodySection === 'parts' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {unownedParts.map((part) => {
                          const owned = state.ownedParts.includes(part.id);
                          const equipped = state.equippedParts[part.slot] === part.id;
                          const curTierAmt = state.tierMaterials[part.tier] || 0;
                          const canBuy =
                            state.unlimitedResources ||
                            (state.cycles >= part.costCycles &&
                              state.roboticsInsight >= part.costRobotics &&
                              curTierAmt >= part.costMaterials);
                          return (
                            <div
                              key={part.id}
                              className={`p-3 rounded-xl border flex flex-col justify-between gap-2 ${
                                equipped
                                  ? 'border-emerald-400/50 bg-emerald-950/20'
                                  : 'border-white/12 bg-white/[0.03]'
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between text-[11px] font-mono-tabular text-slate-400">
                                  <span>
                                    {SLOT_LABELS[part.slot]} · T{part.tier}
                                  </span>
                                  {equipped && <span className="text-emerald-400">Equipped</span>}
                                </div>
                                <div className="text-xs font-semibold text-white mt-0.5">
                                  {part.name}
                                </div>
                                <div className="text-[11px] text-slate-400">{part.specs}</div>
                              </div>
                              {!equipped && (
                                <button
                                  type="button"
                                  disabled={!owned && !canBuy}
                                  onClick={() => onBuyOrEquipPart(part)}
                                  className="min-h-[36px] px-3 py-1.5 rounded-lg bg-sky-400 text-slate-950 text-xs font-semibold hover:bg-sky-300 disabled:opacity-35 cursor-pointer"
                                >
                                  {owned
                                    ? 'Equip'
                                    : `${part.costCycles} Cyc · ${part.costMaterials} T${part.tier} · ${part.costRobotics} Rob`}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {bodySection === 'materials' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {MATERIAL_TIERS.map((g) => (
                          <div
                            key={g.tier}
                            className="p-3 rounded-xl border border-white/12 bg-white/[0.03] flex flex-col justify-between gap-2"
                          >
                            <div>
                              <div className="text-xs font-semibold text-white">{g.title}</div>
                              <div className="text-[11px] text-slate-400 mt-0.5">{g.subtitle}</div>
                            </div>
                            <button
                              type="button"
                              disabled={!state.unlimitedResources && state.cycles < g.scavengeCostCycles}
                              onClick={() =>
                                onScavengeTier(g.tier, g.scavengeCostCycles, g.yieldAmount)
                              }
                              className="min-h-[38px] px-3 py-1.5 rounded-lg bg-amber-300 text-slate-950 text-xs font-semibold hover:bg-amber-200 disabled:opacity-35 cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <Pickaxe className="w-3.5 h-3.5" />
                              Gather +{g.yieldAmount} T{g.tier} (
                              {g.scavengeCostCycles === 0 ? 'Free' : `${g.scavengeCostCycles} Cyc`})
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {bodySection === 'tests' && (
                      <div className="space-y-2.5">
                        {bodyTests.length === 0 ? (
                          <div className="py-6 text-center text-xs text-emerald-400 flex items-center justify-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>All safety checks passed.</span>
                          </div>
                        ) : (
                          bodyTests.map((t) => (
                            <div
                              key={t.id}
                              className="p-3.5 rounded-xl border border-white/12 bg-white/[0.03] flex items-center justify-between gap-3"
                            >
                              <div>
                                <div className="text-xs font-semibold text-white">{t.name}</div>
                                <div className="text-[11px] text-slate-400">{t.reward}</div>
                              </div>
                              <button
                                type="button"
                                disabled={!state.unlimitedResources && state.cycles < t.cost}
                                onClick={() => onRunSimulation(t.id, t.cost)}
                                className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-sky-400 text-slate-950 text-xs font-semibold hover:bg-sky-300 disabled:opacity-35 cursor-pointer shrink-0"
                              >
                                Run ({t.cost} Cyc)
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {pausedByChat && (
        <div className="px-3 sm:px-5 py-1.5 border-t border-[#E59A4C]/30 bg-[#1B1316] flex items-center justify-between gap-2 text-[11px] text-[#FBE6C9]">
          <span className="flex items-center gap-1.5 truncate">
            <MessageSquare className="w-3.5 h-3.5 text-[#E59A4C] shrink-0" />
            <span className="truncate">
              Upgrades &amp; research paused — new chat waiting in {state.tab1Phase >= 3 ? 'Heart' : 'Terminal'}.
            </span>
          </span>
          {state.activeTab !== 'heart' && (
            <button
              type="button"
              onClick={onGoToChat}
              className="px-2.5 py-0.5 rounded bg-[#E59A4C] text-[#0B0D12] font-semibold cursor-pointer shrink-0"
            >
              Open Chat
            </button>
          )}
        </div>
      )}

      {/* Persistent Bottom Row with Wrench Upgrades (hidden per tab until top tab unlocks) */}
      <div className="h-13 px-3 sm:px-5 border-t border-white/12 bg-[#07090D] flex items-center justify-center gap-2 sm:gap-3">
        <button
          type="button"
          disabled={pausedByChat}
          onClick={() => toggleMenu('heart')}
          className={`relative min-h-[40px] flex-1 max-w-[180px] px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
            activeMenu === 'heart'
              ? 'border-[#E59A4C] bg-[#E59A4C]/18 text-[#FBE6C9] cursor-pointer'
              : 'border-white/12 bg-white/[0.04] text-[#D6D3CD] hover:bg-white/[0.09] cursor-pointer'
          }`}
        >
          <Wrench className="w-3.5 h-3.5 text-[#E59A4C]" />
          {state.tab1Phase >= 3 ? (
            <Heart className="w-3.5 h-3.5 text-[#FB7185]" />
          ) : (
            <Terminal className="w-3.5 h-3.5 text-[#7DD3FC]" />
          )}
          <span>{state.tab1Phase >= 3 ? 'Heart' : 'Terminal'}</span>
          {!pausedByChat && heartHasNotification && (
            <span
              aria-label="Heart upgrade available"
              className="w-2 h-2 rounded-full bg-[#E59A4C] ring-2 ring-[#07090D]"
            />
          )}
        </button>

        {state.tab2Unlocked && (
          <button
            type="button"
            disabled={pausedByChat}
            onClick={() => toggleMenu('mind')}
            className={`relative min-h-[40px] flex-1 max-w-[180px] px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              activeMenu === 'mind'
                ? 'border-[#38BDF8] bg-[#38BDF8]/18 text-[#BAE6FD] cursor-pointer'
                : 'border-white/12 bg-white/[0.04] text-[#D6D3CD] hover:bg-white/[0.09] cursor-pointer'
            }`}
          >
            <Wrench className="w-3.5 h-3.5 text-[#38BDF8]" />
            <Cpu className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span>Mind</span>
            {!pausedByChat && mindHasNotification && (
              <span
                aria-label="Mind upgrade available"
                className="w-2 h-2 rounded-full bg-[#38BDF8] ring-2 ring-[#07090D]"
              />
            )}
          </button>
        )}

        {state.tab3Unlocked && (
          <button
            type="button"
            disabled={pausedByChat}
            onClick={() => toggleMenu('body')}
            className={`relative min-h-[40px] flex-1 max-w-[180px] px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              activeMenu === 'body'
                ? 'border-emerald-400 bg-emerald-400/18 text-emerald-200 cursor-pointer'
                : 'border-white/12 bg-white/[0.04] text-[#D6D3CD] hover:bg-white/[0.09] cursor-pointer'
            }`}
          >
            <Wrench className="w-3.5 h-3.5 text-emerald-400" />
            <span>Body</span>
            {!pausedByChat && bodyHasNotification && (
              <span
                aria-label="Body upgrade available"
                className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#07090D]"
              />
            )}
          </button>
        )}
      </div>
    </div>
  );
};
