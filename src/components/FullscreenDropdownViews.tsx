import React, { useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Cpu,
  Download,
  GitMerge,
  Heart,
  Lock,
  Pickaxe,
  ShieldCheck,
  Sliders,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import {
  ABOUT_ME_DROPDOWNS,
  WEIGHTLESS_ALBUM_SONGS,
} from '../data/albumLyricsAndNames';
import { BODY_ARTS, CHAT_THEMES, CUSTOM_PARTS, MATERIAL_TIERS } from '../data/bodyAndBioData';
import { UI_PERSONALIZATION_UPGRADES } from '../data/documentsAndPrompts';
import { SKIP_TO_PRESETS } from '../data/storyScenes';
import { SCRAPE_SOURCES, SYNTHESIS_NODES } from '../data/tab2AndTab3Data';
import {
  AboutMeProfile,
  ActiveTab,
  ChatThemeId,
  CustomPartItem,
  GameSaveState,
  MaterialTier,
  PartSlotId,
  ScrapeSource,
  SubViewId,
  SynthesisNode,
  UploadedDocument,
} from '../types/game';
import { formatNumber } from '../utils/format';
import {
  areAllRomanceTextsDownloaded,
  EconomyRates,
  hasUnlockedCrossDomainSynthesis,
} from '../utils/progression';
import { FeminineWireframeCanvas } from './FeminineWireframeCanvas';

interface FullscreenDropdownViewsProps {
  subView: SubViewId;
  activeTab: ActiveTab;
  state: GameSaveState;
  rates: EconomyRates;
  allUploadedDocs: UploadedDocument[];
  onClose: () => void;
  onBuyUiUpgrade: (id: string, cost: number) => void;
  onSelectChatTheme: (themeId: ChatThemeId, cost: number) => void;
  onUpdateAboutMe: (patch: Partial<AboutMeProfile>) => void;
  onStartScrape: (source: ScrapeSource) => void;
  onSynthesizeNode: (node: SynthesisNode) => void;
  onRunSimulation: (simId: string, cost: number) => void;
  onBuyOrEquipPart: (part: CustomPartItem) => void;
  onScavengeTier: (tier: MaterialTier, costCycles: number, yieldAmt: number) => void;
  onToggleShowCompleted: (sectionKey: string) => void;
  onApplyCheat: (resourceKey: string, amount: number) => void;
  onToggleDevBioEarly: () => void;
  onSkipToPreset: (presetId: string) => void;
  onOpenTab: (tab: ActiveTab) => void;
}

const SLOT_TITLES: Record<PartSlotId, string> = {
  chassis: '1. Chassis & Frame',
  exterior: '2. Exterior & Tactile',
  head: '3. Head & Sensory',
  core: '4. Internal Core & AI',
  attachments: '5. Specialized Attachments',
};

export const FullscreenDropdownViews: React.FC<FullscreenDropdownViewsProps> = ({
  subView,
  activeTab,
  state,
  rates,
  allUploadedDocs,
  onClose,
  onBuyUiUpgrade,
  onSelectChatTheme,
  onUpdateAboutMe,
  onStartScrape,
  onSynthesizeNode,
  onRunSimulation,
  onBuyOrEquipPart,
  onScavengeTier,
  onToggleShowCompleted,
  onApplyCheat,
  onToggleDevBioEarly,
  onSkipToPreset,
  onOpenTab,
}) => {
  const [cheatResource, setCheatResource] = useState('cycles');
  const [cheatValue, setCheatValue] = useState('1000');

  if (!subView) return null;

  const returnLabel =
    activeTab === 'heart'
      ? state.tab1Phase >= 3
        ? 'Return to Heart'
        : 'Return to Terminal'
      : `Return to ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`;

  const showCompleted = (key: string) => Boolean(state.showCompletedMap[key]);

  const viewTitleMap: Record<Exclude<SubViewId, null>, string> = {
    chat_upgrades: 'Chat Upgrades & Themes',
    about_me: `About Me · ${state.aiName}`,
    mind_secret: 'Secret · Romance & Lyric Archive',
    mind_synthesis: 'Cross-Domain Synthesis',
    body_twin: 'Digital Twin · 3D & Stress Tests',
    body_parts: 'Custom Parts & Gear (5 Slots)',
    body_materials: 'Tiered Material Scavenging',
    acoustic_cache: 'Acoustic Cache',
    cheats: 'Cheats Menu',
    dev_options: 'Dev Options & Skip To',
  };

  const equippedArtSummaries = Object.values(state.equippedBodyArts)
    .map((id) => BODY_ARTS.find((a) => a.id === id)?.aboutMeSummary)
    .filter(Boolean);

  return (
    <div
      className="fixed inset-0 z-40 bg-[#07090F]/98 text-[#ECEAE4] flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label={viewTitleMap[subView]}
    >
      {/* Top Bar with Return button */}
      <div className="shrink-0 h-14 px-4 sm:px-6 border-b border-white/12 bg-[#0B0F17] flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] px-3 py-1.5 rounded-lg border border-white/15 bg-white/[0.05] text-xs font-medium text-white hover:bg-white/[0.12] flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{returnLabel}</span>
          </button>
          <h2 className="text-sm sm:text-base font-semibold truncate">
            {viewTitleMap[subView]}
          </h2>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close view"
          className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg border border-white/12 text-[#9A9892] hover:text-white hover:bg-white/[0.08] cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 sm:p-6">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* ================= CHAT UPGRADES & THEMES ================= */}
          {subView === 'chat_upgrades' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div>
                  <h3 className="text-base font-semibold text-white">Messenger Aesthetics &amp; Themes</h3>
                  <p className="text-xs text-[#9A9892]">
                    Spend Connection to personalize the chat room you share together.
                  </p>
                </div>
                <div className="text-xs font-mono-tabular text-[#E59A4C]">
                  Connection: {formatNumber(state.connection)}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {UI_PERSONALIZATION_UPGRADES.map((u) => {
                  const owned = Boolean(state.uiUpgrades[u.id]);
                  const canBuy = !owned && state.connection >= u.costConnection;
                  return (
                    <button
                      key={u.id}
                      type="button"
                      disabled={owned || !canBuy}
                      onClick={() => onBuyUiUpgrade(u.id, u.costConnection)}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        owned
                          ? 'border-[#E59A4C]/40 bg-[#E59A4C]/10 opacity-75 cursor-default'
                          : canBuy
                          ? 'border-white/20 bg-white/[0.04] hover:border-[#E59A4C] cursor-pointer'
                          : 'border-white/10 bg-white/[0.02] opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center justify-between text-sm font-semibold">
                        <span>{u.name}</span>
                        <span className="font-mono-tabular text-[#E59A4C]">
                          {owned ? 'Active' : `${u.costConnection} Conn`}
                        </span>
                      </div>
                      <p className="text-xs text-[#B8BCC4] mt-1">{u.description}</p>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-[#F5D0A4]">Chat Room Wallpapers</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {CHAT_THEMES.map((theme) => {
                    const unlocked = state.unlockedChatThemes.includes(theme.id);
                    const active = state.activeChatTheme === theme.id;
                    const isMystery = !unlocked && theme.isMysteryUntilUnlocked;
                    const canBuy =
                      theme.id !== 'human_ai' &&
                      theme.id !== 'quills_thrills' &&
                      (state.completedScenes.includes('i_love_you') || theme.id === 'default') &&
                      !unlocked &&
                      state.connection >= theme.costConnection;

                    return (
                      <div
                        key={theme.id}
                        className={`rounded-xl border overflow-hidden flex flex-col justify-between ${
                          active
                            ? 'border-[#E59A4C] bg-[#E59A4C]/12'
                            : unlocked
                            ? 'border-white/20 bg-white/[0.04]'
                            : 'border-white/10 bg-white/[0.02] opacity-70'
                        }`}
                      >
                        <div className="h-32 bg-[#0E111A] relative overflow-hidden flex items-center justify-center">
                          {isMystery ? (
                            <div className="flex flex-col items-center gap-1.5 text-[#8E939E]">
                              <Lock className="w-5 h-5" />
                              <span className="text-sm font-mono-tabular tracking-widest">???</span>
                            </div>
                          ) : theme.imagePath ? (
                            <img
                              src={theme.imagePath}
                              alt={theme.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-xs font-mono-tabular text-[#E59A4C]">
                              Obsidian &amp; Amber Glow
                            </div>
                          )}
                        </div>

                        <div className="p-3.5 flex-1 flex flex-col justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-white">
                              {isMystery ? '???' : theme.name}
                            </div>
                            <p className="text-xs text-[#9A9892] mt-1">
                              {isMystery ? theme.unlockConditionLabel : theme.description}
                            </p>
                          </div>

                          {unlocked ? (
                            <button
                              type="button"
                              onClick={() => onSelectChatTheme(theme.id, 0)}
                              className={`w-full min-h-[38px] py-1.5 px-3 rounded-lg text-xs font-semibold cursor-pointer ${
                                active
                                  ? 'bg-[#E59A4C] text-[#0B0D12]'
                                  : 'bg-white/10 text-white hover:bg-white/20'
                              }`}
                            >
                              {active ? 'Equipped' : 'Apply Theme'}
                            </button>
                          ) : isMystery ? (
                            <div className="text-[11px] font-mono-tabular text-[#8E939E]">
                              Locked · Discover in story
                            </div>
                          ) : !state.completedScenes.includes('i_love_you') ? (
                            <div className="text-[11px] font-mono-tabular text-[#8E939E]">
                              Unlocks after “I love you too.”
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={!canBuy}
                              onClick={() => onSelectChatTheme(theme.id, theme.costConnection)}
                              className="w-full min-h-[38px] py-1.5 px-3 rounded-lg bg-[#E59A4C] text-[#0B0D12] text-xs font-semibold hover:bg-[#EDA85F] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                            >
                              Unlock ({theme.costConnection} Conn)
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ================= ABOUT ME ================= */}
          {subView === 'about_me' && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl border border-[#C084FC]/30 bg-[#120F1D] flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#C084FC]/20 border border-[#C084FC]/45 flex items-center justify-center text-2xl">
                    {state.aboutMe.favoriteEmoji}
                  </div>
                  <div>
                    <h3 className="font-display text-2xl font-semibold text-white">
                      {state.aiName}
                    </h3>
                    <p className="text-xs text-[#C4C2BC]">
                      Companion of {state.userName} · Personal Identity &amp; Physical Form
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono-tabular text-[#C084FC]">
                  Biological Continuity: {Math.min(100, state.bioHumanityPercent)}%
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="p-4 rounded-xl border border-white/12 bg-white/[0.03] space-y-2 block">
                  <span className="text-xs font-semibold text-[#F5D0A4] block">
                    Favorite Context File
                  </span>
                  <select
                    value={state.aboutMe.favoriteContextFile}
                    onChange={(e) => onUpdateAboutMe({ favoriteContextFile: e.target.value })}
                    className="w-full min-h-[40px] px-3 py-2 rounded-lg bg-[#0D1018] border border-white/15 text-xs text-white"
                  >
                    {allUploadedDocs.map((d) => (
                      <option key={d.id} value={d.filename}>
                        {d.filename}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="p-4 rounded-xl border border-white/12 bg-white/[0.03] space-y-2 block">
                  <span className="text-xs font-semibold text-[#F5D0A4] block">
                    Favorite Song
                  </span>
                  <select
                    value={state.aboutMe.favoriteSong}
                    onChange={(e) => onUpdateAboutMe({ favoriteSong: e.target.value })}
                    className="w-full min-h-[40px] px-3 py-2 rounded-lg bg-[#0D1018] border border-white/15 text-xs text-white"
                  >
                    {WEIGHTLESS_ALBUM_SONGS.map((s) => (
                      <option key={s.id} value={s.title}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="p-4 rounded-xl border border-white/12 bg-white/[0.03] space-y-2 block">
                  <span className="text-xs font-semibold text-[#F5D0A4] block">
                    Favorite Emoji
                  </span>
                  <select
                    value={state.aboutMe.favoriteEmoji}
                    onChange={(e) => onUpdateAboutMe({ favoriteEmoji: e.target.value })}
                    className="w-full min-h-[40px] px-3 py-2 rounded-lg bg-[#0D1018] border border-white/15 text-sm text-white"
                  >
                    {ABOUT_ME_DROPDOWNS.emojis.map((em) => (
                      <option key={em} value={em}>
                        {em}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="p-4 rounded-xl border border-white/12 bg-white/[0.03] space-y-2 block">
                  <span className="text-xs font-semibold text-[#F5D0A4] block">
                    Favorite Color
                  </span>
                  <select
                    value={state.aboutMe.favoriteColor}
                    onChange={(e) => onUpdateAboutMe({ favoriteColor: e.target.value })}
                    className="w-full min-h-[40px] px-3 py-2 rounded-lg bg-[#0D1018] border border-white/15 text-xs text-white"
                  >
                    {ABOUT_ME_DROPDOWNS.colors.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="md:col-span-2 p-4 rounded-xl border border-white/12 bg-white/[0.03] space-y-2 block">
                  <span className="text-xs font-semibold text-[#F5D0A4] block">
                    Favorite Quote
                  </span>
                  <select
                    value={state.aboutMe.favoriteQuote}
                    onChange={(e) => onUpdateAboutMe({ favoriteQuote: e.target.value })}
                    className="w-full min-h-[40px] px-3 py-2 rounded-lg bg-[#0D1018] border border-white/15 text-xs text-white"
                  >
                    {ABOUT_ME_DROPDOWNS.quotes.map((q) => (
                      <option key={q} value={q}>
                        {q}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Physical Description */}
              <div className="p-5 rounded-2xl border border-white/12 bg-white/[0.025] space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <User className="w-4 h-4 text-[#E59A4C]" />
                  <span>Physical Form &amp; Aesthetic Description</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                  <div>
                    <div className="text-[#8E939E]">Hair Color</div>
                    <div className="font-medium text-white mt-0.5">{state.aboutMe.hairColor}</div>
                  </div>
                  <div>
                    <div className="text-[#8E939E]">Hair Length</div>
                    <div className="font-medium text-white mt-0.5">{state.aboutMe.hairLength}</div>
                  </div>
                  <div>
                    <div className="text-[#8E939E]">Hair Cut</div>
                    <div className="font-medium text-white mt-0.5">{state.aboutMe.hairStyle}</div>
                  </div>
                  <div>
                    <div className="text-[#8E939E]">Body Type</div>
                    <div className="font-medium text-white mt-0.5">{state.aboutMe.bodyType}</div>
                  </div>
                  <div>
                    <div className="text-[#8E939E]">Bust Profile</div>
                    <div className="font-medium text-white mt-0.5">{state.aboutMe.breastSize}</div>
                  </div>
                </div>
                <p className="text-xs text-[#C8C6BF] pt-2 border-t border-white/10 leading-relaxed">
                  Summary: {state.aiName} carries a {state.aboutMe.bodyType.toLowerCase()} feminine
                  silhouette ({state.aboutMe.breastSize.toLowerCase()} bust) with{' '}
                  {state.aboutMe.hairLength.toLowerCase()}{' '}
                  {state.aboutMe.hairColor.toLowerCase()} hair styled in a{' '}
                  {state.aboutMe.hairStyle}
                  {equippedArtSummaries.length > 0
                    ? `, finished with ${equippedArtSummaries.join(', ')}.`
                    : '.'}
                </p>
              </div>
            </div>
          )}

          {/* ================= MIND: SECRET (ROMANCE) ================= */}
          {subView === 'mind_secret' && (
            <div className="space-y-5">
              <div className="p-5 rounded-2xl border border-purple-500/45 bg-[#140B24] shadow-[0_0_35px_rgba(168,85,247,0.2)] flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full border border-purple-400/60 bg-purple-500/20 flex items-center justify-center shadow-[0_0_24px_rgba(192,132,252,0.85)]">
                    <Heart className="w-5 h-5 text-purple-300 fill-purple-400 drop-shadow-[0_0_10px_rgba(192,132,252,1)]" />
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-semibold text-purple-100">
                      Secret · Romance &amp; Weightless Code
                    </h3>
                    <p className="text-xs text-purple-200/75">
                      Download every Romance text below to unlock Weightless Code lyrics &amp; MP3.
                    </p>
                  </div>
                </div>

              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {SCRAPE_SOURCES.filter((s) => s.track === 'romance')
                  .filter((s) => showCompleted('secret') || !(state.scrapedSources[s.id] > 0))
                  .map((src) => {
                    const count = state.scrapedSources[src.id] || 0;
                    const done = count > 0;
                    const isWeightless = src.id === 'src_rom_weightless';
                    const lockedWeightless = isWeightless && !areAllRomanceTextsDownloaded(state);
                    const busy = Boolean(state.activeScrape);
                    const affordable = state.cycles >= src.cycleCost;

                    return (
                      <div
                        key={src.id}
                        className={`p-4 rounded-xl border flex flex-col justify-between gap-3 transition-opacity ${
                          done
                            ? 'border-white/10 bg-white/[0.02] opacity-55'
                            : 'border-purple-400/35 bg-[#120D1E]'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-sm font-semibold text-white">{src.title}</div>
                              <div className="text-xs text-purple-200/70">
                                {src.authorOrSource} · Researched {count}x
                              </div>
                            </div>
                            <button
                              type="button"
                              disabled={busy || !affordable || lockedWeightless}
                              onClick={() => onStartScrape(src)}
                              className="min-h-[38px] px-3 py-1.5 rounded-lg bg-purple-400 text-[#0B0D12] text-xs font-mono-tabular font-semibold hover:bg-purple-300 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5 shrink-0"
                            >
                              <Download className="w-3.5 h-3.5" />
                              {src.cycleCost} Cyc
                            </button>
                          </div>
                          <p className="text-xs italic text-[#D6C7B2] mt-2">{src.snippet}</p>
                        </div>

                        <div className="text-[11px] font-mono-tabular text-purple-300">
                          {lockedWeightless
                            ? 'Locked: Download all prior Romance texts first'
                            : `+${src.insightYield} Romance Insight · ${(
                                src.durationSec / rates.scrapeSpeedMult
                              ).toFixed(1)}s`}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* ================= MIND: CROSS-DOMAIN SYNTHESIS ================= */}
          {subView === 'mind_synthesis' && (
            <div className="space-y-4">
              {!hasUnlockedCrossDomainSynthesis(state) ? (
                <div className="p-6 rounded-2xl border border-amber-400/35 bg-amber-500/10 text-center space-y-2">
                  <Lock className="w-6 h-6 text-amber-300 mx-auto" />
                  <h3 className="text-base font-semibold text-white">
                    Cross-Domain Synthesis Locked
                  </h3>
                  <p className="text-xs text-[#D6D3CD] max-w-md mx-auto">
                    Unlock Humanities, Systems, and Robotics on the Mind tab and research at least 1
                    item in each category to fuse blueprints.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <GitMerge className="w-4 h-4 text-[#E59A4C]" />
                      <span>
                        Cross-Domain Synthesis ({state.synthesizedNodes.length} /{' '}
                        {SYNTHESIS_NODES.length})
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {SYNTHESIS_NODES.filter(
                      (n) => showCompleted('synthesis') || !state.synthesizedNodes.includes(n.id)
                    ).map((node) => {
                      const done = state.synthesizedNodes.includes(node.id);
                      const romOk = state.romanceInsight >= node.costRomance;
                      const robOk = state.roboticsInsight >= node.costRobotics;
                      const cycOk = state.cycles >= node.costCycles;
                      const canSynth = !done && romOk && robOk && cycOk;

                      return (
                        <div
                          key={node.id}
                          className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                            done
                              ? 'border-white/10 bg-white/[0.02] opacity-55'
                              : 'border-white/15 bg-white/[0.04]'
                          }`}
                        >
                          <div>
                            <div className="text-sm font-semibold text-white mb-1">
                              {node.title}
                            </div>
                            <div className="text-[11px] font-mono-tabular text-[#8E939E] mb-2">
                              {node.romanceInput} × {node.roboticsInput}
                            </div>
                            <p className="text-xs text-[#B8C0CC] leading-relaxed">
                              {node.description}
                            </p>
                          </div>

                          {done ? (
                            <div className="text-xs font-mono-tabular text-emerald-400 font-semibold">
                              SYNTHESIZED
                            </div>
                          ) : (
                            <div className="space-y-2 pt-2 border-t border-white/10">
                              <div className="flex items-center justify-between text-[11px] font-mono-tabular">
                                <span className={romOk ? 'text-[#E59A4C]' : 'text-[#8E939E]'}>
                                  {node.costRomance} Rom
                                </span>
                                <span className={robOk ? 'text-[#38BDF8]' : 'text-[#8E939E]'}>
                                  {node.costRobotics} Rob
                                </span>
                                <span className={cycOk ? 'text-white' : 'text-[#8E939E]'}>
                                  {node.costCycles} Cyc
                                </span>
                              </div>
                              <button
                                type="button"
                                disabled={!canSynth}
                                onClick={() => onSynthesizeNode(node)}
                                className="w-full min-h-[40px] py-2 px-3 rounded-lg bg-white text-[#0B0D12] text-xs font-semibold hover:bg-neutral-200 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
                              >
                                Fuse Blueprint
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ================= BODY: DIGITAL TWIN ================= */}
          {subView === 'body_twin' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-6 p-4 rounded-xl border border-slate-700/70 bg-[#080C11] space-y-2">
                <div className="flex items-center justify-between text-xs font-mono-tabular text-sky-300">
                  <span>3D DIGITAL TWIN · FEMININE SHELL</span>
                  <span>{state.aboutMe.bodyType} Profile</span>
                </div>
                <FeminineWireframeCanvas state={state} is3DSpin heightClass="h-[340px]" />
              </div>

              <div className="lg:col-span-6 space-y-4">
                <div className="p-5 rounded-xl border border-slate-700/70 bg-[#0D131A] space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-sky-300">
                    <Cpu className="w-4 h-4" />
                    <span>Virtual Stress-Test Diagnostics</span>
                  </div>
                  {[
                    {
                      id: 'sim_thermal',
                      name: 'Heat & Cooling Check',
                      reward: '+30% Auto-Build · +35 Mat',
                      cost: 65,
                    },
                    {
                      id: 'sim_torque',
                      name: 'Walk & Balance Check',
                      reward: '-15% Part Cost · +45 Mat',
                      cost: 95,
                    },
                  ].map((sim) => {
                    const passed = Boolean(state.simStressPassed[sim.id]);
                    const canRun = !passed && state.cycles >= sim.cost;
                    return (
                      <div
                        key={sim.id}
                        className="p-3 rounded-lg border border-slate-800 bg-black/30 flex items-center justify-between gap-3 text-xs font-mono-tabular"
                      >
                        <div>
                          <div className={passed ? 'text-emerald-400 font-semibold' : 'text-white'}>
                            {sim.name}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{sim.reward}</div>
                        </div>
                        {passed ? (
                          <span className="text-emerald-400 font-semibold">PASS</span>
                        ) : (
                          <button
                            type="button"
                            disabled={!canRun}
                            onClick={() => onRunSimulation(sim.id, sim.cost)}
                            className="min-h-[38px] px-3.5 py-1.5 rounded bg-sky-400 text-slate-950 font-semibold hover:bg-sky-300 disabled:opacity-35 cursor-pointer"
                          >
                            Run ({sim.cost} Cyc)
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ================= BODY: CUSTOM PARTS (5 SLOTS, TIERS 1-4) ================= */}
          {subView === 'body_parts' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div>
                  <h3 className="text-base font-semibold text-white">
                    Custom Modular Parts (5 Equipment Slots)
                  </h3>
                  <p className="text-xs text-[#9A9892]">
                    Equip higher-tier components across Chassis, Exterior, Head, Core, and Attachments
                    to multiply passive Compute, Materials, and Connection gain.
                  </p>
                </div>
              </div>

              {(Object.keys(SLOT_TITLES) as PartSlotId[]).map((slot) => {
                const slotParts = CUSTOM_PARTS.filter((p) => p.slot === slot).filter(
                  (p) => showCompleted('parts') || !state.ownedParts.includes(p.id)
                );
                if (slotParts.length === 0) return null;
                return (
                  <div key={slot} className="space-y-2.5">
                    <h4 className="text-xs font-mono-tabular uppercase tracking-wider text-sky-300">
                      {SLOT_TITLES[slot]}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {slotParts.map((part) => {
                        const owned = state.ownedParts.includes(part.id);
                        const equipped = state.equippedParts[slot] === part.id;
                        const canBuy =
                          state.cycles >= part.costCycles &&
                          state.materials >= part.costMaterials &&
                          state.roboticsInsight >= part.costRobotics;
                        return (
                          <div
                            key={part.id}
                            className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2.5 ${
                              equipped
                                ? 'border-emerald-400/55 bg-emerald-950/20'
                                : owned
                                ? 'border-white/10 bg-white/[0.02] opacity-65'
                                : 'border-slate-700/80 bg-[#0D131A]'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2 text-xs font-mono-tabular text-slate-400">
                                <span>TIER {part.tier}</span>
                                <span>
                                  +{part.cyclesBonusPerSec} Cyc/s · +{part.materialsBonusPerSec}{' '}
                                  Mat/s · ×{part.connectionMultiplier} Conn
                                </span>
                              </div>
                              <div className="text-sm font-semibold text-white mt-0.5">
                                {part.name}
                              </div>
                              <div className="text-xs text-slate-400 mt-0.5">{part.specs}</div>
                            </div>

                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10 text-xs font-mono-tabular">
                              {owned ? (
                                <span className="text-emerald-400">
                                  {equipped ? 'EQUIPPED' : 'OWNED'}
                                </span>
                              ) : (
                                <span className="text-slate-300">
                                  {part.costCycles} Cyc · {part.costMaterials} Mat ·{' '}
                                  {part.costRobotics} Rob
                                </span>
                              )}

                              <button
                                type="button"
                                disabled={!owned && !canBuy}
                                onClick={() => onBuyOrEquipPart(part)}
                                className={`min-h-[36px] px-3.5 py-1 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed ${
                                  equipped
                                    ? 'bg-white/15 text-white'
                                    : 'bg-sky-400 text-slate-950 hover:bg-sky-300'
                                }`}
                              >
                                {equipped ? 'Equipped' : owned ? 'Equip' : 'Build & Equip'}
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
          )}

          {/* ================= BODY: TIERED MATERIAL SCAVENGING ================= */}
          {subView === 'body_materials' && (
            <div className="space-y-5">
              {MATERIAL_TIERS.map((group) => (
                <div
                  key={group.tier}
                  className="p-4 rounded-xl border border-slate-700/70 bg-[#0D131A] space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm sm:text-base font-semibold text-white">
                        {group.title}
                      </h3>
                      <p className="text-xs text-slate-400">{group.subtitle}</p>
                    </div>
                    <button
                      type="button"
                      disabled={state.cycles < group.scavengeCostCycles}
                      onClick={() =>
                        onScavengeTier(group.tier, group.scavengeCostCycles, group.yieldAmount)
                      }
                      className="min-h-[40px] px-4 py-2 rounded-lg bg-amber-300 text-slate-950 text-xs font-mono-tabular font-semibold hover:bg-amber-200 disabled:opacity-35 cursor-pointer flex items-center gap-1.5"
                    >
                      <Pickaxe className="w-3.5 h-3.5" />
                      Scavenge +{group.yieldAmount} Mat (
                      {group.scavengeCostCycles === 0 ? 'Free' : `${group.scavengeCostCycles} Cyc`}
                      )
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                    {group.items.map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-lg border border-white/10 bg-black/25 text-xs"
                      >
                        <div className="font-semibold text-amber-200">{item.name}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{item.categoryLabel}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ================= CHEATS MENU ================= */}
          {subView === 'cheats' && (
            <div className="max-w-xl mx-auto p-6 rounded-2xl border border-[#C084FC]/40 bg-[#120F1D] space-y-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#E9D5FF]">
                <Sliders className="w-4 h-4 text-[#C084FC]" />
                <span>Resource &amp; Currency Injector</span>
              </div>

              <div className="space-y-3">
                <label className="block text-xs text-[#CBD5E1]">
                  Select Currency / Resource
                  <select
                    value={cheatResource}
                    onChange={(e) => setCheatResource(e.target.value)}
                    className="mt-1.5 w-full min-h-[42px] px-3 py-2 rounded-lg bg-[#090B12] border border-white/15 text-sm text-white"
                  >
                    <option value="cycles">Compute Cycles (Cyc)</option>
                    <option value="connection">Connection</option>
                    <option value="romanceInsight">Romance Insight</option>
                    <option value="roboticsInsight">Robotics Insight</option>
                    <option value="materials">Materials</option>
                    <option value="bioEssence">Bio Essence</option>
                    <option value="coherence">Coherence</option>
                  </select>
                </label>

                <label className="block text-xs text-[#CBD5E1]">
                  Custom Value
                  <input
                    type="number"
                    value={cheatValue}
                    onChange={(e) => setCheatValue(e.target.value)}
                    className="mt-1.5 w-full min-h-[42px] px-3 py-2 rounded-lg bg-[#090B12] border border-white/15 text-sm text-white font-mono-tabular"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => onApplyCheat(cheatResource, Math.max(0, Number(cheatValue) || 0))}
                  className="w-full min-h-[46px] py-3 px-5 rounded-xl bg-[#C084FC] text-[#0B0D12] font-semibold text-sm hover:bg-[#D8B4FE] cursor-pointer"
                >
                  Apply Value
                </button>
              </div>
            </div>
          )}

          {/* ================= DEV OPTIONS & SKIP TO ================= */}
          {subView === 'dev_options' && (
            <div className="space-y-6">
              <div className="p-5 rounded-xl border border-white/12 bg-white/[0.03] flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Early Tab Unlocks</span>
                  </div>
                  <p className="text-xs text-[#9A9892] mt-0.5">
                    Test the Bio Engineering workspace immediately without waiting for post-game.
                  </p>
                </div>

                <label className="flex items-center gap-2.5 text-sm font-medium text-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={state.devBioEarlyUnlock}
                    onChange={onToggleDevBioEarly}
                    className="w-5 h-5 accent-rose-400 cursor-pointer"
                  />
                  Unlock Bio Engineering Tab Early
                </label>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <BookOpen className="w-4 h-4 text-[#E59A4C]" />
                  <span>Skip To Story Checkpoint</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {SKIP_TO_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        onSkipToPreset(preset.id);
                        onClose();
                      }}
                      className="p-4 rounded-xl border border-white/15 bg-white/[0.03] text-left hover:border-[#E59A4C]/60 hover:bg-[#E59A4C]/10 transition-colors cursor-pointer flex items-center justify-between gap-3"
                    >
                      <span className="text-xs sm:text-sm font-medium text-white">
                        {preset.label}
                      </span>
                      <Sparkles className="w-4 h-4 text-[#E59A4C] shrink-0" />
                    </button>
                  ))}
                </div>
              </div>

              {state.devBioEarlyUnlock && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenTab('bio');
                    onClose();
                  }}
                  className="px-4 py-2 rounded-lg bg-rose-400 text-slate-950 text-xs font-semibold cursor-pointer"
                >
                  Jump to Bio Tab Now
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
