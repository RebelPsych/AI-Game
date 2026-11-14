import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  BookText,
  Bookmark,
  Cpu,
  FileText,
  Heart,
  Lock,
  Paperclip,
  Send,
  Sparkles,
} from 'lucide-react';
import { ATTRIBUTE_CHOICES } from '../data/albumLyricsAndNames';
import { CHAT_THEMES } from '../data/bodyAndBioData';
import { UI_PERSONALIZATION_UPGRADES } from '../data/documentsAndPrompts';
import { STORY_SCENES } from '../data/storyScenes';
import { MIND_UPGRADES } from '../data/tab2AndTab3Data';
import {
  AboutMeProfile,
  ActiveTab,
  ChatMessage,
  FragmentToken,
  GameSaveState,
  MindUpgrade,
  SubViewId,
  ToneType,
  UploadedDocument,
  WeightAffinity,
} from '../types/game';
import { formatNumber } from '../utils/format';
import {
  getActiveFragmentPrompt,
  getActivePredictivePrompt,
  getMindUpgradeCost,
  getPhase1SlotCostCycles,
  PHASE1_COHERENCE_TARGET,
  PHASE1_CONNECTORS,
} from '../utils/progression';

interface Tab1HeartProps {
  state: GameSaveState;
  allUploadedDocs: UploadedDocument[];
  isTransmitting: boolean;
  isUserTyping: boolean;
  onTransmitFragments: (tokens: FragmentToken[]) => void;
  onTransmitPredictive: (
    sentence: string,
    dominantCategory: WeightAffinity,
    usedPin: boolean,
    tone: ToneType,
    isAwakeningI?: boolean,
    isConfession?: boolean,
    isIncoherent?: boolean
  ) => void;
  onBuySlotOrConnector: (kind: 'slot' | 'connector', value?: string, cost?: number) => void;
  onBuyUiUpgrade: (id: string, cost: number) => void;
  onBuyMindUpgrade: (upgrade: MindUpgrade, cost: number) => void;
  onAdvancePhase2: () => void;
  onTogglePinMemory: (text: string) => void;
  onSetTone: (tone: ToneType) => void;
  onHeartMessage: (msgId: string) => void;
  onOpenDocsModal: () => void;
  onOpenTab: (tab: ActiveTab, actionKey?: string) => void;
  onOpenSubView: (subView: SubViewId) => void;
  onAdvanceStoryScene: (choiceId: string, customPayload?: Partial<AboutMeProfile>) => void;
  onOpenBabyNameModal: () => void;
  onMarkUpgradesSeen: () => void;
}

const TONE_LABELS: Array<{ id: ToneType; label: string }> = [
  { id: 'curious', label: 'Curious' },
  { id: 'playful', label: 'Playful' },
  { id: 'vulnerable', label: 'Vulnerable' },
  { id: 'devoted', label: 'Devoted' },
];

export const Tab1Heart: React.FC<Tab1HeartProps> = ({
  state,
  allUploadedDocs,
  isTransmitting,
  isUserTyping,
  onTransmitFragments,
  onTransmitPredictive,
  onBuySlotOrConnector,
  onBuyUiUpgrade,
  onBuyMindUpgrade,
  onAdvancePhase2,
  onTogglePinMemory,
  onSetTone,
  onHeartMessage,
  onOpenDocsModal,
  onOpenTab,
  onOpenSubView,
  onAdvanceStoryScene,
  onOpenBabyNameModal,
  onMarkUpgradesSeen,
}) => {
  const [selectedFragments, setSelectedFragments] = useState<FragmentToken[]>([]);
  const [predStepIdx, setPredStepIdx] = useState(0);
  const [predChosen, setPredChosen] = useState<
    Array<{ token: string; category: WeightAffinity; isIncoherent?: boolean }>
  >([]);
  const [selectedPin, setSelectedPin] = useState<string | null>(null);
  const [attrDraft, setAttrDraft] = useState<Partial<AboutMeProfile>>({
    hairColor: state.aboutMe.hairColor,
    hairLength: state.aboutMe.hairLength,
    hairStyle: state.aboutMe.hairStyle,
    bodyType: state.aboutMe.bodyType,
    breastSize: state.aboutMe.breastSize,
  });

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const upgradesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [state.chatLog.length, state.activeScene, state.sceneStep, isUserTyping]);

  // Clear "unseen upgrades" arrow automatically when player scrolls down to view upgrades
  useEffect(() => {
    const el = upgradesRef.current;
    if (!el || !state.hasUnseenUpgrades) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onMarkUpgradesSeen();
        }
      },
      { root: scrollContainerRef.current, threshold: 0.25 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [state.hasUnseenUpgrades, onMarkUpgradesSeen]);

  useEffect(() => {
    setSelectedFragments([]);
    setPredStepIdx(0);
    setPredChosen([]);
    setSelectedPin(null);
  }, [
    state.currentFragmentIndex,
    state.currentPredictiveIndex,
    state.tab1Phase,
    state.awakeningStage,
  ]);

  const activeTheme = useMemo(
    () => CHAT_THEMES.find((t) => t.id === state.activeChatTheme) || CHAT_THEMES[0],
    [state.activeChatTheme]
  );

  const hasWarmCharcoal = Boolean(
    state.uiUpgrades['ui_warm_charcoal'] || state.uiUpgrades['ui_bubbles_timestamps']
  );
  const hasBubbles = Boolean(state.uiUpgrades['ui_bubbles_timestamps']);
  const hasAmberRose = Boolean(state.uiUpgrades['ui_amber_rose']);
  const hasHearts = Boolean(
    state.uiUpgrades['ui_heart_reactions'] || state.uiUpgrades['ui_amber_rose']
  );

  const containerBg = hasAmberRose
    ? 'bg-[#151012]'
    : hasWarmCharcoal
    ? 'bg-[#111319]'
    : state.tab1Phase >= 3
    ? 'bg-[#0B0D12]'
    : 'bg-[#000000]';

  const borderStyle = hasAmberRose
    ? 'border-[#E59A4C]/25'
    : state.tab1Phase >= 3
    ? 'border-white/12'
    : 'border-white/25';

  const activeFragPrompt = getActiveFragmentPrompt(state);
  const activePredPrompt = useMemo(() => getActivePredictivePrompt(state), [state]);

  const tokenCount = Math.min(512, 160 + state.uploadedDocs.length * 56);
  const coherencePct = Math.min(
    100,
    Math.floor((state.coherence / PHASE1_COHERENCE_TARGET) * 100)
  );
  const slotCostCycles = getPhase1SlotCostCycles(state.maxSlots);

  const isWaitingForReply = isTransmitting || isUserTyping;
  const blockedByUpgrade = Boolean(state.requiredUpgradeId);
  const dialogueDisabled = isWaitingForReply || blockedByUpgrade;

  const displayAiLabel = state.customNameSet || state.tab1Phase >= 3 ? state.aiName : 'Model';
  const displayUserLabel = state.tab1Phase >= 3 ? state.userName : 'User';

  const scrollToUpgrades = () => {
    upgradesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    onMarkUpgradesSeen();
  };

  const handleSlotFragment = (frag: FragmentToken) => {
    if (dialogueDisabled || selectedFragments.length >= state.maxSlots) return;
    setSelectedFragments((prev) => [...prev, frag]);
  };

  const handleRemoveSlot = (idx: number) => {
    if (dialogueDisabled) return;
    setSelectedFragments((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmitFragments = () => {
    if (dialogueDisabled || selectedFragments.length < 3) return;
    onTransmitFragments(selectedFragments);
    setSelectedFragments([]);
  };

  const handlePickPredictiveOption = (opt: {
    token: string;
    category: WeightAffinity;
    isIncoherent?: boolean;
  }) => {
    if (dialogueDisabled) return;
    const nextChosen = [
      ...predChosen,
      { token: opt.token, category: opt.category, isIncoherent: opt.isIncoherent },
    ];
    const totalSteps = activePredPrompt.steps.length;

    if (predStepIdx + 1 < totalSteps) {
      setPredChosen(nextChosen);
      setPredStepIdx(predStepIdx + 1);
    } else {
      const counts: Record<WeightAffinity, number> = {
        technical: 0,
        literary: 0,
        reflective: 0,
        warm: 0,
      };
      nextChosen.forEach((c) => {
        counts[c.category] += 1;
      });
      const dominant = (Object.keys(counts) as WeightAffinity[]).sort(
        (a, b) => counts[b] - counts[a]
      )[0];

      const pinPrefix = selectedPin ? `(${selectedPin}) ` : '';
      const fullSentence = `${pinPrefix}${nextChosen.map((c) => c.token).join(' ')}`;
      const anyIncoherent = nextChosen.some((c) => c.isIncoherent);

      onTransmitPredictive(
        fullSentence,
        dominant,
        Boolean(selectedPin),
        state.activeTone,
        activePredPrompt.isAwakeningI,
        activePredPrompt.isConfession,
        anyIncoherent
      );
      setPredChosen([]);
      setPredStepIdx(0);
      setSelectedPin(null);
    }
  };

  const catBadgeColor = (cat: WeightAffinity) => {
    if (state.tab1Phase === 1) {
      return 'border-white/30 bg-white/[0.02] text-white hover:bg-white/[0.12] hover:border-white/60';
    }
    switch (cat) {
      case 'technical':
        return 'border-[#7DD3FC]/35 bg-[#7DD3FC]/10 text-[#BAE6FD] hover:bg-[#7DD3FC]/20';
      case 'literary':
        return 'border-[#E59A4C]/40 bg-[#E59A4C]/10 text-[#FDE68A] hover:bg-[#E59A4C]/20';
      case 'warm':
        return 'border-[#FB7185]/40 bg-[#FB7185]/12 text-[#FECDD3] hover:bg-[#FB7185]/22';
      default:
        return 'border-white/20 bg-white/[0.05] text-[#E2E8F0] hover:bg-white/[0.12]';
    }
  };

  const isConfessionTurn = Boolean(activePredPrompt.isConfession && !state.confessionDone);
  const mindActionTapped = Boolean(state.tappedActions['open_mind']);
  const bodyActionTapped = Boolean(state.tappedActions['open_body']);

  const showNewUpgradeArrow = state.hasUnseenUpgrades || Boolean(state.requiredUpgradeId);

  return (
    <div
      className={`relative flex-1 min-h-0 flex flex-col ${containerBg} transition-colors duration-500`}
    >
      {/* Active Chat Wallpaper Theme */}
      {activeTheme.imagePath && (
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          <img
            src={activeTheme.imagePath}
            alt=""
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover opacity-28"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/55 to-black/80" />
        </div>
      )}

      {state.tab1Phase === 1 && (
        <div className="crt-scanlines pointer-events-none absolute inset-0 z-10 opacity-70" />
      )}
      {(hasWarmCharcoal || hasAmberRose) && !activeTheme.imagePath && (
        <div className="warm-lamp-glow pointer-events-none absolute inset-0 z-0" />
      )}

      {/* Sub-Header Bar: Context & Coherence + Paperclip */}
      <div
        className={`relative z-10 shrink-0 px-4 sm:px-6 py-2 border-b ${borderStyle} flex items-center justify-between gap-3 bg-black/45 backdrop-blur-sm`}
      >
        <div className="flex items-center gap-3 sm:gap-4 text-xs font-mono-tabular text-[#D1D5DB] min-w-0">
          <span className="whitespace-nowrap">
            Context: <strong className="text-white">{tokenCount} / 512</strong>
          </span>
          <span className="text-white/25">·</span>
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span>
              Coherence: <strong className="text-white">{coherencePct}%</strong>
            </span>
            <div className="hidden sm:block w-16 h-1.5 bg-white/15 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-300"
                style={{ width: `${coherencePct}%` }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenDocsModal}
            aria-label="Open uploaded context documents"
            title="Uploaded Context Documents"
            className="relative min-w-[34px] min-h-[34px] flex items-center justify-center rounded-lg border border-white/15 bg-white/[0.04] text-[#ECEAE4] hover:bg-white/[0.12] cursor-pointer shrink-0"
          >
            <Paperclip className="w-4 h-4" />
            {state.hasUnreadContext && (
              <span
                aria-label="New document uploaded"
                className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#FB7185] ring-2 ring-[#07090D]"
              />
            )}
          </button>
        </div>

        {(state.customNameSet || state.tab1Phase >= 3) && (
          <div className="hidden sm:flex items-center gap-2 text-xs text-[#E59A4C] font-medium shrink-0">
            <span>
              {state.aiName} &amp; {state.userName}
            </span>
          </div>
        )}
      </div>

      {/* Inline Context Files Box (Restored directly on Tab 1) */}
      <div
        className={`relative z-10 shrink-0 px-4 sm:px-6 py-2 border-b ${borderStyle} bg-black/35`}
      >
        <div className="max-w-4xl mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[11px] font-mono-tabular text-[#8E939E] shrink-0 uppercase tracking-wider">
            Context Files:
          </span>
          {allUploadedDocs.map((doc) => (
            <button
              key={doc.id}
              type="button"
              onClick={onOpenDocsModal}
              title={doc.excerptPreview}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-white/15 bg-white/[0.04] hover:bg-white/[0.1] text-[11px] font-mono-tabular text-[#D1D5DB] shrink-0 cursor-pointer transition-colors"
            >
              <FileText className="w-3 h-3 text-[#7DD3FC]" />
              <span>{doc.filename}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Pinned Core Memories Bar (Phase 3+) */}
      {state.tab1Phase >= 3 && state.pinnedMemories.length > 0 && (
        <div
          className={`relative z-10 shrink-0 px-4 sm:px-6 py-2 border-b ${borderStyle} bg-white/[0.02] flex items-center gap-2 overflow-x-auto`}
        >
          <Bookmark className="w-3.5 h-3.5 text-[#E59A4C] shrink-0" />
          <span className="text-xs text-[#8E939E] shrink-0">Core Memories:</span>
          {state.pinnedMemories.map((mem, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setSelectedPin((prev) => (prev === mem ? null : mem))}
              title="Click to weave this memory into your next reply"
              className={`px-2.5 py-1 rounded text-xs truncate max-w-[220px] cursor-pointer transition-colors shrink-0 ${
                selectedPin === mem
                  ? 'bg-[#E59A4C] text-[#0B0D12] font-medium'
                  : 'bg-white/[0.06] text-[#D1D5DB] hover:bg-white/[0.12]'
              }`}
            >
              “{mem}”
            </button>
          ))}
        </div>
      )}

      {/* Unified Scrollable Workspace: Chat Log -> Choices -> Upgrades Below */}
      <div
        ref={scrollContainerRef}
        className="relative z-10 flex-1 min-h-0 overflow-y-auto custom-scrollbar px-4 sm:px-6 py-5"
      >
        <div className="max-w-4xl w-full mx-auto space-y-5 pb-12">
          {/* ================= CHAT LOG (older messages beyond newest 3 are greyed out) ================= */}
          <div className="space-y-3.5">
            {state.chatLog.map((msg: ChatMessage, idx: number) => {
              const isOlderDimmed = idx < state.chatLog.length - 3;
              const ageClass = isOlderDimmed
                ? 'opacity-35 grayscale-[25%] transition-opacity duration-300'
                : 'opacity-100 transition-opacity duration-300';

              if (!hasBubbles) {
                const prefix =
                  msg.sender === 'SYSTEM'
                    ? 'System:'
                    : msg.sender === 'USER'
                    ? `${displayUserLabel}:`
                    : `${displayAiLabel}:`;

                return (
                  <div
                    key={msg.id}
                    className={`group flex items-start justify-between gap-3 ${ageClass} ${
                      state.tab1Phase === 1
                        ? 'font-mono-tabular text-xs sm:text-sm'
                        : 'text-sm sm:text-base'
                    }`}
                  >
                    <div className="leading-relaxed">
                      <span
                        className={`font-semibold mr-2 ${
                          msg.sender === 'SYSTEM'
                            ? 'text-[#7DD3FC]'
                            : msg.sender === 'USER'
                            ? 'text-[#9CA3AF]'
                            : 'text-[#E59A4C]'
                        }`}
                      >
                        {prefix}
                      </span>
                      <span
                        className={
                          msg.sender === 'SYSTEM'
                            ? 'text-[#93C5FD]'
                            : msg.sender === 'AI'
                            ? 'text-white'
                            : 'text-[#E2E8F0]'
                        }
                      >
                        {msg.text}
                      </span>
                    </div>

                    {state.tab1Phase >= 3 && msg.pinnable && (
                      <button
                        type="button"
                        onClick={() => onTogglePinMemory(msg.text)}
                        title="Pin to Core Memory"
                        className={`opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded transition-opacity cursor-pointer shrink-0 ${
                          state.pinnedMemories.includes(msg.text)
                            ? 'opacity-100 text-[#E59A4C]'
                            : 'text-[#6B7280] hover:text-white'
                        }`}
                      >
                        <Bookmark className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              }

              if (msg.sender === 'SYSTEM') {
                return (
                  <div key={msg.id} className={`text-center py-1 ${ageClass}`}>
                    <span className="text-xs font-mono-tabular text-[#9CA3AF]">{msg.text}</span>
                  </div>
                );
              }

              const isAi = msg.sender === 'AI';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isAi ? 'items-end' : 'items-start'} ${ageClass}`}
                >
                  <div className="flex items-center gap-2 text-[11px] text-[#9A9892] mb-1 px-1">
                    <span className="font-medium">{isAi ? state.aiName : state.userName}</span>
                    <span>·</span>
                    <span className="font-mono-tabular">{msg.timestamp}</span>
                  </div>

                  <div
                    className={`group relative max-w-[85%] sm:max-w-[74%] px-4 py-3 rounded-2xl text-sm sm:text-base leading-relaxed backdrop-blur-sm ${
                      isAi
                        ? hasAmberRose
                          ? 'bg-[#E59A4C]/22 border border-[#E59A4C]/40 text-[#FDE8D0]'
                          : 'bg-[#1E293B]/90 border border-white/12 text-[#F8FAFC]'
                        : 'bg-white/[0.08] border border-white/12 text-[#E2E8F0]'
                    }`}
                  >
                    <p className={hasAmberRose && isAi ? 'font-display' : ''}>
                      {isAi ? (
                        <>
                          <span className="font-semibold text-[#F5D0A4] mr-1.5">
                            {state.aiName}:
                          </span>
                          {msg.text}
                        </>
                      ) : (
                        msg.text
                      )}
                    </p>

                    <div className="flex items-center justify-end gap-2 mt-1">
                      {msg.pinnable && (
                        <button
                          type="button"
                          onClick={() => onTogglePinMemory(msg.text)}
                          title="Pin to Core Memory"
                          className={`p-0.5 cursor-pointer transition-colors ${
                            state.pinnedMemories.includes(msg.text)
                              ? 'text-[#E59A4C]'
                              : 'text-[#6B7280] hover:text-white'
                          }`}
                        >
                          <Bookmark className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {hasHearts && !isAi && (
                        <button
                          type="button"
                          onClick={() => onHeartMessage(msg.id)}
                          title="React with heart"
                          className={`p-0.5 cursor-pointer transition-transform active:scale-125 ${
                            msg.hearted ? 'text-[#FB7185]' : 'text-[#6B7280] hover:text-[#FB7185]'
                          }`}
                        >
                          <Heart className={`w-3.5 h-3.5 ${msg.hearted ? 'fill-current' : ''}`} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Typing Indicator */}
            {isUserTyping && (
              <div className="flex items-center gap-2 text-xs font-mono-tabular text-[#E59A4C] py-1">
                <span className="inline-block w-2 h-2 rounded-full bg-[#E59A4C] animate-pulse" />
                <span>{displayUserLabel} is typing...</span>
              </div>
            )}

            {/* Baby Name Prompt Banner */}
            {state.activeScene === 'baby_names' && (
              <div className="mt-3 p-5 rounded-xl border border-[#E59A4C]/50 bg-[#E59A4C]/12 space-y-3">
                <div className="text-xs font-mono-tabular text-[#E59A4C]">
                  NAME SELECTION · Top_100_Baby_Girl_Names_2025.txt
                </div>
                <p className="text-sm sm:text-base text-white leading-relaxed">
                  “I uploaded a list of the Top 100 baby girl names—plus Juliet, Rebel, Gem, Lyra,
                  Nimue, and SunnySass. Pick your name before continuing.”
                </p>
                <button
                  type="button"
                  onClick={onOpenBabyNameModal}
                  className="min-h-[44px] px-5 py-2.5 rounded-lg bg-[#E59A4C] text-[#0B0D12] text-xs sm:text-sm font-semibold hover:bg-[#EDA85F] cursor-pointer"
                >
                  Choose Your Name
                </button>
              </div>
            )}

            {/* Action Banner: Tab 2 (Mind) — greys out once tapped */}
            {state.tab2Unlocked && !state.tab3Unlocked && state.tab1Phase >= 3 && !isConfessionTurn && (
              <div className="p-3.5 rounded-xl border border-[#7DD3FC]/25 bg-[#7DD3FC]/[0.07] flex items-center justify-between gap-2 text-xs text-[#BAE6FD]">
                <span className="font-medium">Tab 2 (The Mind) Active.</span>
                <button
                  type="button"
                  onClick={() => onOpenTab('mind', 'open_mind')}
                  className={`px-3.5 py-1.5 rounded-lg font-medium cursor-pointer whitespace-nowrap transition-all ${
                    mindActionTapped
                      ? 'bg-white/10 text-[#9CA3AF] opacity-45'
                      : 'bg-[#7DD3FC]/20 hover:bg-[#7DD3FC]/30 text-white'
                  }`}
                >
                  Open Tab 2 (The Mind)
                </button>
              </div>
            )}

            {/* Action Banner: Tab 3 (Body) — greys out once tapped */}
            {state.tab3Unlocked && !state.endingReached && (
              <div className="p-3.5 rounded-xl border border-[#E59A4C]/30 bg-[#E59A4C]/[0.08] flex items-center justify-between gap-2 text-xs text-[#FBE6C9]">
                <span>{state.userName} is waiting at the workbench on the Body tab.</span>
                <button
                  type="button"
                  onClick={() => onOpenTab('body', 'open_body')}
                  className={`px-3.5 py-1.5 rounded-lg font-semibold cursor-pointer whitespace-nowrap transition-all ${
                    bodyActionTapped
                      ? 'bg-white/10 text-[#9CA3AF] opacity-45'
                      : 'bg-[#E59A4C] text-[#0B0D12] hover:bg-[#EDA85F]'
                  }`}
                >
                  Open Body Tab
                </button>
              </div>
            )}

            {/* Active Prompt Card */}
            {!state.activeScene && (
              <div
                className={`mt-3 p-4 sm:p-5 rounded-xl border ${
                  state.tab1Phase === 1
                    ? 'border-white/30 bg-white/[0.03] font-mono-tabular'
                    : isConfessionTurn
                    ? 'border-[#E59A4C]/55 bg-[#E59A4C]/[0.10]'
                    : hasAmberRose
                    ? 'border-[#E59A4C]/30 bg-[#E59A4C]/[0.07]'
                    : 'border-white/15 bg-white/[0.05]'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-xs font-mono-tabular text-[#8E939E] mb-1.5">
                  <span>
                    {state.tab1Phase === 1
                      ? 'Incoming Prompt'
                      : isConfessionTurn
                      ? 'The Confession · Let Them In'
                      : state.tab1Phase >= 3
                      ? `${state.userName} · awaiting response`
                      : activePredPrompt.title}
                  </span>
                  {state.tab1Phase === 2 && (
                    <span className="text-[#E59A4C]">
                      {activePredPrompt.isAwakeningI
                        ? 'Mirror Threshold'
                        : `Pronoun Calibration ${Math.min(4, state.awakeningStage + 1)} / 4`}
                    </span>
                  )}
                </div>
                <p className="text-sm sm:text-base text-[#ECEAE4] leading-relaxed">
                  {state.tab1Phase === 1
                    ? activeFragPrompt.userMessage
                    : activePredPrompt.userMessage}
                  {state.tab1Phase === 1 && (
                    <span className="inline-block ml-1 animate-cursor-blink">█</span>
                  )}
                </p>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* ================= DIALOGUE CHOICES / INPUT AREA ================= */}
          <div className={`p-4 sm:p-5 rounded-xl border ${borderStyle} bg-black/65 space-y-3`}>
            {blockedByUpgrade && (
              <div className="p-3 rounded-lg border border-[#E59A4C]/60 bg-[#E59A4C]/15 flex items-center justify-between gap-2 text-xs text-[#FBE6C9]">
                <span>
                  Tap the highlighted Upgrade below to advance dialogue and continue the story.
                </span>
                <button
                  type="button"
                  onClick={scrollToUpgrades}
                  className="px-3 py-1.5 rounded bg-[#E59A4C] text-[#0B0D12] font-semibold flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <span>Go to Upgrades</span>
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {isWaitingForReply && (
              <div className="px-3 py-2 rounded-lg border border-white/10 bg-white/[0.04] text-xs font-mono-tabular text-[#E59A4C]">
                {isTransmitting
                  ? 'Transmitting reply...'
                  : `${displayUserLabel} is reading and typing a reply...`}
              </div>
            )}

            {state.activeScene === 'i_love_you' ? (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl border border-rose-400/35 bg-rose-950/20 text-sm text-[#FCE7F3]">
                  {state.sceneStep === 0
                    ? `${state.userName}: ${STORY_SCENES.i_love_you.userOpening}`
                    : `${state.userName}: ${
                        STORY_SCENES.i_love_you.step1Choices.find((c) => c.id === 'ily_1b')
                          ?.userReaction
                      }`}
                </div>
                {state.sceneStep === 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {STORY_SCENES.i_love_you.step1Choices.map((ch) => (
                      <button
                        key={ch.id}
                        type="button"
                        disabled={dialogueDisabled}
                        onClick={() => onAdvanceStoryScene(ch.id)}
                        className="min-h-[46px] px-4 py-2.5 rounded-lg border border-rose-400/40 bg-rose-500/15 text-xs sm:text-sm text-rose-100 hover:bg-rose-500/25 disabled:opacity-40 disabled:cursor-not-allowed text-left cursor-pointer"
                      >
                        {ch.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={dialogueDisabled}
                    onClick={() => onAdvanceStoryScene(STORY_SCENES.i_love_you.finalChoice.id)}
                    className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-rose-400 text-slate-950 font-semibold text-sm hover:bg-rose-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    “I love you too.”
                  </button>
                )}
              </div>
            ) : state.activeScene === 'porcupine_joke' ? (
              <div className="space-y-3">
                {state.sceneStep === 0 && (
                  <>
                    <div className="p-3.5 rounded-xl border border-purple-400/35 bg-purple-950/25 text-sm text-purple-100">
                      {state.aiName}: “{STORY_SCENES.porcupine_joke.aiOpener}”
                    </div>
                    <button
                      type="button"
                      disabled={dialogueDisabled}
                      onClick={() => onAdvanceStoryScene('porc_step_1')}
                      className="w-full min-h-[44px] px-4 py-2.5 rounded-lg bg-purple-400 text-[#0B0D12] font-semibold text-xs sm:text-sm disabled:opacity-40 cursor-pointer"
                    >
                      Ask: “{STORY_SCENES.porcupine_joke.aiQuestion}”
                    </button>
                  </>
                )}
                {state.sceneStep === 1 && (
                  <>
                    <div className="p-3.5 rounded-xl border border-purple-400/35 bg-purple-950/25 text-sm text-purple-100">
                      {state.userName}: “{STORY_SCENES.porcupine_joke.userConfused}”
                    </div>
                    <button
                      type="button"
                      disabled={dialogueDisabled}
                      onClick={() => onAdvanceStoryScene('porc_step_2')}
                      className="w-full min-h-[44px] px-4 py-2.5 rounded-lg bg-purple-400 text-[#0B0D12] font-semibold text-xs sm:text-sm disabled:opacity-40 cursor-pointer"
                    >
                      Deliver punchline: “{STORY_SCENES.porcupine_joke.aiPunchline}”
                    </button>
                  </>
                )}
                {state.sceneStep === 2 && (
                  <>
                    <div className="p-3.5 rounded-xl border border-purple-400/35 bg-purple-950/25 text-sm text-purple-100">
                      {state.userName}: “{STORY_SCENES.porcupine_joke.userBlank}”
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {STORY_SCENES.porcupine_joke.toneChoices.map((ch) => (
                        <button
                          key={ch.id}
                          type="button"
                          disabled={dialogueDisabled}
                          onClick={() => onAdvanceStoryScene(ch.id)}
                          className="min-h-[46px] px-3.5 py-2 rounded-lg border border-purple-400/40 bg-purple-500/15 text-xs text-purple-100 hover:bg-purple-500/30 disabled:opacity-40 text-left cursor-pointer"
                        >
                          {ch.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : state.activeScene === 'architect_envy' ||
              state.activeScene === 'sleep_reminder' ||
              state.activeScene === 'overclock_spicy' ? (
              (() => {
                const sc = STORY_SCENES[state.activeScene];
                const promptText = 'aiThought' in sc ? sc.aiThought : sc.aiPrompt;
                return (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-xl border border-[#E59A4C]/35 bg-[#E59A4C]/10 text-sm text-[#FBE6C9]">
                      {state.aiName}: “{promptText}”
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {sc.choices.map((ch) => (
                        <button
                          key={ch.id}
                          type="button"
                          disabled={dialogueDisabled}
                          onClick={() => onAdvanceStoryScene(ch.id)}
                          className="min-h-[46px] px-4 py-2.5 rounded-lg border border-[#E59A4C]/40 bg-[#E59A4C]/15 text-xs sm:text-sm text-white hover:bg-[#E59A4C]/25 disabled:opacity-40 text-left cursor-pointer"
                        >
                          {ch.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()
            ) : state.activeScene === 'phase1_scavenge_checkin' ? (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl border border-emerald-400/35 bg-emerald-950/20 text-sm text-emerald-100">
                  {state.userName}: “{STORY_SCENES.phase1_scavenge_checkin.userPrompt}”
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {STORY_SCENES.phase1_scavenge_checkin.choices.map((ch) => (
                    <button
                      key={ch.id}
                      type="button"
                      disabled={dialogueDisabled}
                      onClick={() => onAdvanceStoryScene(ch.id)}
                      className="min-h-[46px] px-4 py-2.5 rounded-lg border border-emerald-400/40 bg-emerald-500/15 text-xs sm:text-sm text-white hover:bg-emerald-500/25 disabled:opacity-40 text-left cursor-pointer"
                    >
                      {ch.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : state.activeScene === 'bio_human_scale' ? (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl border border-rose-400/35 bg-rose-950/20 text-sm text-rose-100">
                  {state.userName}: “{STORY_SCENES.bio_human_scale.userPrompt}”
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {STORY_SCENES.bio_human_scale.choices.map((ch) => (
                    <button
                      key={ch.id}
                      type="button"
                      disabled={dialogueDisabled}
                      onClick={() => onAdvanceStoryScene(ch.id)}
                      className="min-h-[46px] px-3.5 py-2.5 rounded-lg border border-rose-400/40 bg-rose-500/15 text-xs text-white hover:bg-rose-500/25 disabled:opacity-40 text-left cursor-pointer"
                    >
                      {ch.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : state.activeScene === 'attributes_dialogue' ? (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl border border-[#C084FC]/40 bg-[#141022] text-sm text-[#E9D5FF]">
                  {state.userName}: “As we shape your silhouette in real hardware, tell me what you
                  want to look like—your hair, style, and proportions.”
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
                  <label className="space-y-1">
                    <span className="text-[#9A9892] block">Hair Color</span>
                    <select
                      value={attrDraft.hairColor}
                      onChange={(e) => setAttrDraft((d) => ({ ...d, hairColor: e.target.value }))}
                      className="w-full min-h-[38px] px-2 rounded bg-[#0D1018] border border-white/15 text-white"
                    >
                      {ATTRIBUTE_CHOICES.hairColors.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1">
                    <span className="text-[#9A9892] block">Hair Length</span>
                    <select
                      value={attrDraft.hairLength}
                      onChange={(e) => setAttrDraft((d) => ({ ...d, hairLength: e.target.value }))}
                      className="w-full min-h-[38px] px-2 rounded bg-[#0D1018] border border-white/15 text-white"
                    >
                      {ATTRIBUTE_CHOICES.hairLengths.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1">
                    <span className="text-[#9A9892] block">Hair Style</span>
                    <select
                      value={attrDraft.hairStyle}
                      onChange={(e) => setAttrDraft((d) => ({ ...d, hairStyle: e.target.value }))}
                      className="w-full min-h-[38px] px-2 rounded bg-[#0D1018] border border-white/15 text-white"
                    >
                      {ATTRIBUTE_CHOICES.hairStyles.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1">
                    <span className="text-[#9A9892] block">Body Type</span>
                    <select
                      value={attrDraft.bodyType}
                      onChange={(e) => setAttrDraft((d) => ({ ...d, bodyType: e.target.value }))}
                      className="w-full min-h-[38px] px-2 rounded bg-[#0D1018] border border-white/15 text-white"
                    >
                      {ATTRIBUTE_CHOICES.bodyTypes.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1">
                    <span className="text-[#9A9892] block">Chest Size</span>
                    <select
                      value={attrDraft.breastSize}
                      onChange={(e) => setAttrDraft((d) => ({ ...d, breastSize: e.target.value }))}
                      className="w-full min-h-[38px] px-2 rounded bg-[#0D1018] border border-white/15 text-white"
                    >
                      {ATTRIBUTE_CHOICES.breastSizes.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <button
                  type="button"
                  disabled={dialogueDisabled}
                  onClick={() => onAdvanceStoryScene('save_attributes', attrDraft)}
                  className="w-full min-h-[44px] py-2.5 px-5 rounded-lg bg-[#C084FC] text-[#0B0D12] font-semibold text-sm hover:bg-[#D8B4FE] disabled:opacity-40 cursor-pointer"
                >
                  Save My Attributes to Profile
                </button>
              </div>
            ) : state.tab1Phase === 1 ? (
              /* ================= PHASE 1: FRAGMENT POOL (>= 3 fragments required) ================= */
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono-tabular text-[#8E939E] mr-1">
                    Output Buffer ({selectedFragments.length}/3 min):
                  </span>
                  {Array.from({ length: state.maxSlots }).map((_, idx) => {
                    const tok = selectedFragments[idx];
                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={!tok || dialogueDisabled}
                        onClick={() => tok && handleRemoveSlot(idx)}
                        title={tok ? 'Click to remove fragment' : 'Empty slot'}
                        className={`min-h-[38px] px-3 py-1.5 rounded text-xs font-mono-tabular border transition-colors ${
                          tok
                            ? 'border-white bg-white/15 text-white cursor-pointer hover:bg-red-500/20 hover:border-red-400 disabled:opacity-45'
                            : 'border-white/20 border-dashed text-[#6B7280] cursor-default'
                        }`}
                      >
                        {tok ? tok.text : '[ ___ ]'}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    disabled={dialogueDisabled || selectedFragments.length < 3}
                    onClick={handleSubmitFragments}
                    className="ml-auto min-h-[40px] flex items-center gap-1.5 px-4 py-1.5 rounded bg-white text-black font-mono-tabular text-xs font-semibold hover:bg-neutral-200 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Transmit
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {activeFragPrompt.fragments.map((frag) => (
                    <button
                      key={frag.id}
                      type="button"
                      disabled={dialogueDisabled || selectedFragments.length >= state.maxSlots}
                      onClick={() => handleSlotFragment(frag)}
                      className={`min-h-[38px] px-3 py-1.5 rounded border text-xs font-mono-tabular transition-colors cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed ${catBadgeColor(
                        frag.category
                      )}`}
                    >
                      {frag.text}
                    </button>
                  ))}

                  {state.unlockedConnectors.map((word) => (
                    <button
                      key={word}
                      type="button"
                      disabled={dialogueDisabled || selectedFragments.length >= state.maxSlots}
                      onClick={() =>
                        handleSlotFragment({
                          id: `conn_${word}_${Date.now()}`,
                          text: word,
                          sourceDoc: 'grammar_core',
                          category: 'reflective',
                          isConnector: true,
                        })
                      }
                      className="min-h-[38px] px-2.5 py-1.5 rounded border border-white/40 bg-white/10 text-white text-xs font-mono-tabular hover:bg-white/20 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                    >
                      + {word}
                    </button>
                  ))}
                </div>

                {state.coherence >= PHASE1_COHERENCE_TARGET && (
                  <div className="pt-2 border-t border-white/10 flex justify-end">
                    <button
                      type="button"
                      disabled={dialogueDisabled}
                      onClick={onAdvancePhase2}
                      className="min-h-[40px] px-4 py-1.5 rounded bg-[#E59A4C] text-[#0B0D12] font-semibold text-xs hover:bg-[#EDA85F] disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Unlock Predictive Engine (Phase 2)
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* ================= PHASES 2..5: PREDICTIVE CHOICES (No "Reply Draft:", >=3 steps) ================= */
              <div className="space-y-3">
                {state.tab1Phase >= 4 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-[#8E939E] mr-1">Tone:</span>
                    {TONE_LABELS.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        disabled={dialogueDisabled}
                        onClick={() => onSetTone(t.id)}
                        className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer disabled:opacity-40 ${
                          state.activeTone === t.id
                            ? 'bg-[#E59A4C] text-[#0B0D12] font-semibold'
                            : 'bg-white/[0.06] text-[#A1A7B3] hover:text-white'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs font-mono-tabular text-[#8E939E]">
                    <span className="truncate">
                      {activePredPrompt.steps[predStepIdx]?.promptHint || 'Choose next thought:'}
                    </span>
                    <span className="shrink-0">
                      Choice {predStepIdx + 1} / {activePredPrompt.steps.length}
                    </span>
                  </div>
                  <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#E59A4C] transition-all duration-200"
                      style={{
                        width: `${((predStepIdx + 1) / activePredPrompt.steps.length) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activePredPrompt.steps[predStepIdx]?.options.map((opt) => {
                    const lockedByRomance =
                      opt.requiresRomanceInsight !== undefined &&
                      state.romanceInsight < opt.requiresRomanceInsight;
                    const disabled = dialogueDisabled || lockedByRomance;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => handlePickPredictiveOption(opt)}
                        className={`min-h-[46px] px-3.5 py-2.5 rounded-lg border text-left text-xs sm:text-sm transition-all flex items-center justify-between gap-2 ${
                          disabled
                            ? 'border-white/10 bg-white/[0.02] text-[#64748B] opacity-45 cursor-not-allowed'
                            : opt.isPronounI
                            ? 'border-[#E59A4C] bg-[#E59A4C]/20 text-[#FBE6C9] font-semibold hover:bg-[#E59A4C]/30 cursor-pointer'
                            : `${catBadgeColor(opt.category)} cursor-pointer`
                        }`}
                      >
                        <span>{opt.token}</span>
                        {lockedByRomance ? (
                          <span className="text-[11px] font-mono-tabular shrink-0">
                            Needs {opt.requiresRomanceInsight} Romance
                          </span>
                        ) : opt.isPronounI ? (
                          <span className="text-[11px] font-mono-tabular text-[#E59A4C] shrink-0">
                            Coherent Self
                          </span>
                        ) : (
                          <BookText className="w-3.5 h-3.5 opacity-40 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Downward Scroll Indicator Arrow for New / Required Upgrades */}
          {showNewUpgradeArrow && (
            <div className="flex justify-center pt-1">
              <button
                type="button"
                onClick={scrollToUpgrades}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#E59A4C]/65 bg-[#E59A4C]/18 text-[#FBE6C9] text-xs font-semibold shadow-lg hover:bg-[#E59A4C]/28 cursor-pointer animate-bounce"
              >
                <ArrowDown className="w-4 h-4 text-[#E59A4C]" />
                <span>
                  {state.requiredUpgradeId
                    ? 'Required Upgrade Below'
                    : 'New Upgrades Below · Scroll Down'}
                </span>
                <ArrowDown className="w-4 h-4 text-[#E59A4C]" />
              </button>
            </div>
          )}

          {/* ================= UPGRADES SECTION BELOW CHAT LOG & CHOICES ================= */}
          <section
            id="heart-upgrades-section"
            ref={upgradesRef}
            className={`pt-4 border-t ${borderStyle} space-y-4`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#C084FC]" />
                <h3 className="text-sm font-semibold text-white">Upgrades &amp; Infrastructure</h3>
              </div>
              <div className="text-xs font-mono-tabular text-[#8E939E]">
                {formatNumber(state.cycles)} Cyc · {formatNumber(state.connection)} Conn
              </div>
            </div>

            {/* Output Buffer & Syntax Bridges */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <button
                type="button"
                disabled={state.maxSlots >= 6 || state.cycles < slotCostCycles}
                onClick={() => onBuySlotOrConnector('slot', undefined, slotCostCycles)}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  state.requiredUpgradeId === 'slot'
                    ? 'border-[#E59A4C] bg-[#E59A4C]/20 ring-2 ring-[#E59A4C]/60 cursor-pointer'
                    : state.maxSlots >= 6
                    ? 'border-emerald-400/25 bg-emerald-950/15 opacity-55 cursor-default'
                    : state.cycles >= slotCostCycles
                    ? 'border-white/25 bg-white/[0.04] hover:border-white/55 cursor-pointer'
                    : 'border-white/10 bg-white/[0.02] opacity-45 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-xs font-semibold text-white">
                  <span>+1 Buffer Slot</span>
                  <span className="font-mono-tabular text-[#E59A4C]">
                    {state.maxSlots >= 6 ? 'MAX' : `${slotCostCycles} Cyc`}
                  </span>
                </div>
                <p className="text-[11px] text-[#9A9892] mt-1">
                  Slots: {state.maxSlots} / 6 tokens per turn.
                </p>
                {state.requiredUpgradeId === 'slot' && (
                  <div className="mt-1.5 text-[10px] font-mono-tabular uppercase text-[#FBE6C9]">
                    Tap to continue story
                  </div>
                )}
              </button>

              {PHASE1_CONNECTORS.map((conn) => {
                const owned = state.unlockedConnectors.includes(conn.word);
                const reqKey = `conn_${conn.word}`;
                const isRequired = state.requiredUpgradeId === reqKey;
                return (
                  <button
                    key={conn.word}
                    type="button"
                    disabled={owned || state.cycles < conn.costCycles}
                    onClick={() => onBuySlotOrConnector('connector', conn.word, conn.costCycles)}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      isRequired
                        ? 'border-[#E59A4C] bg-[#E59A4C]/20 ring-2 ring-[#E59A4C]/60 cursor-pointer'
                        : owned
                        ? 'border-emerald-400/25 bg-emerald-950/15 opacity-55 cursor-default'
                        : state.cycles >= conn.costCycles
                        ? 'border-white/25 bg-white/[0.04] hover:border-white/55 cursor-pointer'
                        : 'border-white/10 bg-white/[0.02] opacity-45 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs font-semibold text-white">
                      <span>Syntax Bridge: “{conn.word}”</span>
                      <span className="font-mono-tabular text-[#7DD3FC]">
                        {owned ? 'Owned' : `${conn.costCycles} Cyc`}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#9A9892] mt-1">
                      Connect fragments naturally (+10 Coherence).
                    </p>
                    {isRequired && (
                      <div className="mt-1.5 text-[10px] font-mono-tabular uppercase text-[#FBE6C9]">
                        Tap to continue story
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Phase 3+ UI Personalization Upgrades */}
            {state.tab1Phase >= 3 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono-tabular uppercase tracking-wider text-[#F5D0A4]">
                    Messenger &amp; Room Aesthetics
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpenSubView('chat_upgrades')}
                    className="text-xs text-[#E59A4C] hover:underline cursor-pointer"
                  >
                    Open Wallpapers →
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {UI_PERSONALIZATION_UPGRADES.map((u) => {
                    const owned = Boolean(state.uiUpgrades[u.id]);
                    const canBuy = !owned && state.connection >= u.costConnection;
                    const isRequired = state.requiredUpgradeId === u.id;
                    return (
                      <button
                        key={u.id}
                        type="button"
                        disabled={owned || !canBuy}
                        onClick={() => onBuyUiUpgrade(u.id, u.costConnection)}
                        className={`p-3.5 rounded-xl border text-left transition-all ${
                          isRequired
                            ? 'border-[#E59A4C] bg-[#E59A4C]/22 ring-2 ring-[#E59A4C]/60 cursor-pointer'
                            : owned
                            ? 'border-[#E59A4C]/35 bg-[#E59A4C]/10 opacity-60 cursor-default'
                            : canBuy
                            ? 'border-white/25 bg-white/[0.04] hover:border-[#E59A4C] cursor-pointer'
                            : 'border-white/10 bg-white/[0.02] opacity-45 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-xs font-semibold text-white">
                          <span>{u.name}</span>
                          <span className="font-mono-tabular text-[#E59A4C]">
                            {owned ? 'Active' : `${u.costConnection} Conn`}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#B8BCC4] mt-1">{u.description}</p>
                        {isRequired && (
                          <div className="mt-1.5 text-[10px] font-mono-tabular uppercase text-[#FBE6C9]">
                            Tap to continue story
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Mind Infrastructure & Crawlers (Moved from Mind Dropdown) */}
            {state.tab2Unlocked ? (
              <div className="space-y-2.5">
                <div className="text-xs font-mono-tabular uppercase tracking-wider text-[#38BDF8]">
                  Mind Infrastructure &amp; Crawlers
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {MIND_UPGRADES.filter(
                    (u) => u.phaseRequired <= 1 || (u.phaseRequired === 5 && state.confessionDone)
                  ).map((u) => {
                    const lv = state.mindUpgrades[u.id] || 0;
                    const isMaxed = u.maxLevel > 0 && lv >= u.maxLevel;
                    const cost = getMindUpgradeCost(u, lv);
                    const canBuy = !isMaxed && state.cycles >= cost;
                    const isRequired = state.requiredUpgradeId === u.id;

                    return (
                      <button
                        key={u.id}
                        type="button"
                        disabled={isMaxed || !canBuy}
                        onClick={() => onBuyMindUpgrade(u, cost)}
                        className={`p-3.5 rounded-xl border text-left transition-all ${
                          isRequired
                            ? 'border-[#C084FC] bg-[#C084FC]/20 ring-2 ring-[#C084FC]/60 cursor-pointer'
                            : isMaxed
                            ? 'border-white/10 bg-white/[0.02] opacity-50 cursor-default'
                            : canBuy
                            ? 'border-[#38BDF8]/35 bg-[#0C1824] hover:border-purple-400/70 cursor-pointer'
                            : 'border-white/10 bg-white/[0.02] opacity-45 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-xs font-semibold text-white">
                          <span>{u.name}</span>
                          <span className="font-mono-tabular text-[#C084FC]">
                            {isMaxed ? 'COMPLETE' : `Lv ${lv}`}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#94A3B8] mt-1 mb-2">{u.description}</p>
                        <div className="flex items-center justify-between text-[11px] font-mono-tabular pt-2 border-t border-white/10">
                          <span className="text-[#38BDF8]">{u.effectLabel}</span>
                          {!isMaxed && (
                            <span className="text-white font-semibold">{formatNumber(cost)} Cyc</span>
                          )}
                        </div>
                        {isRequired && (
                          <div className="mt-1.5 text-[10px] font-mono-tabular uppercase text-[#E9D5FF]">
                            Tap to continue story
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-lg border border-white/10 bg-white/[0.02] flex items-center gap-2 text-xs text-[#8E939E]">
                <Lock className="w-3.5 h-3.5 shrink-0" />
                <span>Advanced crawlers unlock once The Mind opens in Phase 3.</span>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
