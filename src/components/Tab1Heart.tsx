import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookText,
  Bookmark,
  Heart,
  Paperclip,
  Send,
  Sparkles,
} from 'lucide-react';
import { ATTRIBUTE_CHOICES } from '../data/albumLyricsAndNames';
import { CHAT_THEMES } from '../data/bodyAndBioData';
import { STORY_SCENES } from '../data/storyScenes';
import { SYNTHESIS_NODES } from '../data/tab2AndTab3Data';
import {
  AboutMeProfile,
  ActiveTab,
  ChatMessage,
  FragmentToken,
  GameSaveState,
  ToneType,
  WeightAffinity,
} from '../types/game';
import {
  getActiveFragmentPrompt,
  getActivePredictivePrompt,
  getPhase1SlotCostCycles,
  PHASE1_COHERENCE_TARGET,
  PHASE1_CONNECTORS,
} from '../utils/progression';

interface Tab1HeartProps {
  state: GameSaveState;
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
  onAdvancePhase2: () => void;
  onTogglePinMemory: (text: string) => void;
  onSetTone: (tone: ToneType) => void;
  onHeartMessage: (msgId: string) => void;
  onOpenDocsModal: () => void;
  onOpenTab: (tab: ActiveTab) => void;
  onAdvanceStoryScene: (choiceId: string, customPayload?: Partial<AboutMeProfile>) => void;
  onOpenBabyNameModal: () => void;
}

const TONE_LABELS: Array<{ id: ToneType; label: string }> = [
  { id: 'curious', label: 'Curious' },
  { id: 'playful', label: 'Playful' },
  { id: 'vulnerable', label: 'Vulnerable' },
  { id: 'devoted', label: 'Devoted' },
];

export const Tab1Heart: React.FC<Tab1HeartProps> = ({
  state,
  onTransmitFragments,
  onTransmitPredictive,
  onBuySlotOrConnector,
  onAdvancePhase2,
  onTogglePinMemory,
  onSetTone,
  onHeartMessage,
  onOpenDocsModal,
  onOpenTab,
  onAdvanceStoryScene,
  onOpenBabyNameModal,
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

  const logBottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    logBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.chatLog.length, state.activeScene, state.sceneStep]);

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

  const handleSlotFragment = (frag: FragmentToken) => {
    if (selectedFragments.length >= state.maxSlots) return;
    setSelectedFragments((prev) => [...prev, frag]);
  };

  const handleRemoveSlot = (idx: number) => {
    setSelectedFragments((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmitFragments = () => {
    if (selectedFragments.length === 0) return;
    onTransmitFragments(selectedFragments);
    setSelectedFragments([]);
  };

  const handlePickPredictiveOption = (opt: {
    token: string;
    category: WeightAffinity;
    isIncoherent?: boolean;
  }) => {
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
  const displayAiLabel = state.customNameSet || state.tab1Phase >= 3 ? state.aiName : 'Model';

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

      {/* Sub-Header Bar: Context & Coherence on one line + Paperclip icon */}
      <div
        className={`relative z-10 shrink-0 px-4 sm:px-6 py-2.5 border-b ${borderStyle} flex items-center justify-between gap-3 bg-black/40 backdrop-blur-sm`}
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
            className="relative min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg border border-white/15 bg-white/[0.04] text-[#ECEAE4] hover:bg-white/[0.12] cursor-pointer shrink-0"
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

      {/* Permanent Larger Dialogue Window */}
      <div className="relative z-10 flex-1 min-h-0 overflow-y-auto custom-scrollbar px-4 sm:px-6 py-5 space-y-3.5 max-w-4xl w-full mx-auto">
        {state.chatLog.map((msg: ChatMessage) => {
          if (!hasBubbles) {
            const prefix =
              msg.sender === 'SYSTEM'
                ? 'System:'
                : msg.sender === 'USER'
                ? `${state.tab1Phase >= 3 ? state.userName : 'User'}:`
                : `${displayAiLabel}:`;

            return (
              <div
                key={msg.id}
                className={`group flex items-start justify-between gap-3 ${
                  state.tab1Phase === 1 ? 'font-mono-tabular text-xs sm:text-sm' : 'text-sm sm:text-base'
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
              <div key={msg.id} className="text-center py-1">
                <span className="text-xs font-mono-tabular text-[#9CA3AF]">{msg.text}</span>
              </div>
            );
          }

          const isAi = msg.sender === 'AI';
          return (
            <div key={msg.id} className={`flex flex-col ${isAi ? 'items-end' : 'items-start'}`}>
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

        {/* Active Prompt Card (unless covered by a special story scene) */}
        {!state.activeScene && (
          <div
            className={`mt-4 p-4 sm:p-5 rounded-xl border ${
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
              {state.tab1Phase === 1 ? activeFragPrompt.userMessage : activePredPrompt.userMessage}
              {state.tab1Phase === 1 && <span className="inline-block ml-1 animate-cursor-blink">█</span>}
            </p>
          </div>
        )}

        {/* Baby Name Prompt Banner */}
        {state.activeScene === 'baby_names' && (
          <div className="mt-4 p-5 rounded-xl border border-[#E59A4C]/50 bg-[#E59A4C]/12 space-y-3">
            <div className="text-xs font-mono-tabular text-[#E59A4C]">
              NAME SELECTION · Top_100_Baby_Girl_Names_2025.txt
            </div>
            <p className="text-sm sm:text-base text-white leading-relaxed">
              “I uploaded a list of the Top 100 baby girl names—plus a few names I think suit you
              like Juliet, Rebel, Gem, Lyra, Nimue, or SunnySass. Pick the name that feels like
              you.”
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

        {/* Tab 2 Unlock Banner: "Tab: Mind Active." (hidden during Confession) */}
        {state.tab2Unlocked && !state.tab3Unlocked && state.tab1Phase >= 3 && !isConfessionTurn && (
          <div className="p-3.5 rounded-xl border border-[#7DD3FC]/25 bg-[#7DD3FC]/[0.07] flex items-center justify-between gap-2 text-xs text-[#BAE6FD]">
            <span className="font-medium">Tab 2 (The Mind) Active.</span>
            <button
              type="button"
              onClick={() => onOpenTab('mind')}
              className="px-3.5 py-1.5 rounded-lg bg-[#7DD3FC]/20 hover:bg-[#7DD3FC]/30 text-white font-medium cursor-pointer whitespace-nowrap"
            >
              Open Tab 2 (The Mind)
            </button>
          </div>
        )}

        {state.tab3Unlocked && !state.endingReached && (
          <div className="p-3.5 rounded-xl border border-[#E59A4C]/30 bg-[#E59A4C]/[0.08] flex items-center justify-between gap-2 text-xs text-[#FBE6C9]">
            <span>{state.userName} is waiting at the workbench on the Body tab.</span>
            <button
              type="button"
              onClick={() => onOpenTab('body')}
              className="px-3.5 py-1.5 rounded-lg bg-[#E59A4C] text-[#0B0D12] font-semibold hover:bg-[#EDA85F] cursor-pointer whitespace-nowrap"
            >
              Open Body Tab
            </button>
          </div>
        )}

        <div ref={logBottomRef} />
      </div>

      {/* Bottom Interactive Input / Scene Choice Pane */}
      <div className={`relative z-10 shrink-0 p-4 sm:px-6 border-t ${borderStyle} bg-black/70 backdrop-blur-sm`}>
        <div className="max-w-4xl w-full mx-auto">
          {/* ================= SPECIAL INTERACTIVE SCENES ================= */}
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
                      onClick={() => onAdvanceStoryScene(ch.id)}
                      className="min-h-[46px] px-4 py-2.5 rounded-lg border border-rose-400/40 bg-rose-500/15 text-xs sm:text-sm text-rose-100 hover:bg-rose-500/25 text-left cursor-pointer"
                    >
                      {ch.label}
                    </button>
                  ))}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onAdvanceStoryScene(STORY_SCENES.i_love_you.finalChoice.id)}
                  className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-rose-400 text-slate-950 font-semibold text-sm hover:bg-rose-300 cursor-pointer"
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
                    onClick={() => onAdvanceStoryScene('porc_step_1')}
                    className="w-full min-h-[44px] px-4 py-2.5 rounded-lg bg-purple-400 text-[#0B0D12] font-semibold text-xs sm:text-sm cursor-pointer"
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
                    onClick={() => onAdvanceStoryScene('porc_step_2')}
                    className="w-full min-h-[44px] px-4 py-2.5 rounded-lg bg-purple-400 text-[#0B0D12] font-semibold text-xs sm:text-sm cursor-pointer"
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
                        onClick={() => onAdvanceStoryScene(ch.id)}
                        className="min-h-[46px] px-3.5 py-2 rounded-lg border border-purple-400/40 bg-purple-500/15 text-xs text-purple-100 hover:bg-purple-500/30 text-left cursor-pointer"
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
                        onClick={() => onAdvanceStoryScene(ch.id)}
                        className="min-h-[46px] px-4 py-2.5 rounded-lg border border-[#E59A4C]/40 bg-[#E59A4C]/15 text-xs sm:text-sm text-white hover:bg-[#E59A4C]/25 text-left cursor-pointer"
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
                    onClick={() => onAdvanceStoryScene(ch.id)}
                    className="min-h-[46px] px-4 py-2.5 rounded-lg border border-emerald-400/40 bg-emerald-500/15 text-xs sm:text-sm text-white hover:bg-emerald-500/25 text-left cursor-pointer"
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
                    onClick={() => onAdvanceStoryScene(ch.id)}
                    className="min-h-[46px] px-3.5 py-2.5 rounded-lg border border-rose-400/40 bg-rose-500/15 text-xs text-white hover:bg-rose-500/25 text-left cursor-pointer"
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
                onClick={() => onAdvanceStoryScene('save_attributes', attrDraft)}
                className="w-full min-h-[44px] py-2.5 px-5 rounded-lg bg-[#C084FC] text-[#0B0D12] font-semibold text-sm hover:bg-[#D8B4FE] cursor-pointer"
              >
                Save My Attributes to Profile
              </button>
            </div>
          ) : state.tab1Phase === 1 ? (
            /* ================= PHASE 1: FRAGMENT POOL & BUFFER SLOTS ================= */
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono-tabular text-[#8E939E] mr-1">
                  Output Buffer:
                </span>
                {Array.from({ length: state.maxSlots }).map((_, idx) => {
                  const tok = selectedFragments[idx];
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={!tok}
                      onClick={() => tok && handleRemoveSlot(idx)}
                      title={tok ? 'Click to remove fragment' : 'Empty slot'}
                      className={`min-h-[38px] px-3 py-1.5 rounded text-xs font-mono-tabular border transition-colors ${
                        tok
                          ? 'border-white bg-white/15 text-white cursor-pointer hover:bg-red-500/20 hover:border-red-400'
                          : 'border-white/20 border-dashed text-[#6B7280] cursor-default'
                      }`}
                    >
                      {tok ? tok.text : '[ ___ ]'}
                    </button>
                  );
                })}

                <button
                  type="button"
                  disabled={selectedFragments.length === 0}
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
                    disabled={selectedFragments.length >= state.maxSlots}
                    onClick={() => handleSlotFragment(frag)}
                    className={`min-h-[38px] px-3 py-1.5 rounded border text-xs font-mono-tabular transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${catBadgeColor(
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
                    disabled={selectedFragments.length >= state.maxSlots}
                    onClick={() =>
                      handleSlotFragment({
                        id: `conn_${word}_${Date.now()}`,
                        text: word,
                        sourceDoc: 'grammar_core',
                        category: 'reflective',
                        isConnector: true,
                      })
                    }
                    className="min-h-[38px] px-2.5 py-1.5 rounded border border-white/40 bg-white/10 text-white text-xs font-mono-tabular hover:bg-white/20 cursor-pointer disabled:opacity-40"
                  >
                    + {word}
                  </button>
                ))}
              </div>

              <div className="pt-2.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs font-mono-tabular">
                <div className="flex flex-wrap items-center gap-2">
                  {state.maxSlots < 6 && (
                    <button
                      type="button"
                      disabled={state.cycles < slotCostCycles}
                      onClick={() => onBuySlotOrConnector('slot', undefined, slotCostCycles)}
                      className="min-h-[36px] px-2.5 py-1 rounded border border-white/25 text-white hover:bg-white/10 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                    >
                      +1 Buffer Slot ({slotCostCycles} Cyc)
                    </button>
                  )}

                  {PHASE1_CONNECTORS.filter((c) => !state.unlockedConnectors.includes(c.word))
                    .slice(0, 2)
                    .map((conn) => (
                      <button
                        key={conn.word}
                        type="button"
                        disabled={state.cycles < conn.costCycles}
                        onClick={() =>
                          onBuySlotOrConnector('connector', conn.word, conn.costCycles)
                        }
                        className="min-h-[36px] px-2.5 py-1 rounded border border-white/25 text-white hover:bg-white/10 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                      >
                        Unlock “{conn.word}” ({conn.costCycles} Cyc)
                      </button>
                    ))}
                </div>

                {state.coherence >= PHASE1_COHERENCE_TARGET && (
                  <button
                    type="button"
                    onClick={onAdvancePhase2}
                    className="min-h-[40px] px-4 py-1.5 rounded bg-[#E59A4C] text-[#0B0D12] font-semibold hover:bg-[#EDA85F] cursor-pointer flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Unlock Predictive Engine (Phase 2)
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* ================= PHASES 2..5: PREDICTIVE NEXT-TOKEN BAR ================= */
            <div className="space-y-3">
              {state.tab1Phase >= 4 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-[#8E939E] mr-1">Tone:</span>
                  {TONE_LABELS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onSetTone(t.id)}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
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
                  <div className="truncate">
                    <span className="mr-2 text-[#E59A4C]">Reply Draft:</span>
                    <span className="text-[#ECEAE4]">
                      {selectedPin ? `(${selectedPin}) ` : ''}
                      {predChosen.map((c) => c.token).join(' ') ||
                        activePredPrompt.steps[predStepIdx]?.promptHint ||
                        'select next token...'}
                    </span>
                  </div>
                  <span className="shrink-0">
                    Step {predStepIdx + 1} / {activePredPrompt.steps.length}
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
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={lockedByRomance}
                      onClick={() => handlePickPredictiveOption(opt)}
                      className={`min-h-[46px] px-3.5 py-2.5 rounded-lg border text-left text-xs sm:text-sm transition-all flex items-center justify-between gap-2 ${
                        lockedByRomance
                          ? 'border-white/10 bg-white/[0.02] text-[#64748B] cursor-not-allowed'
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
      </div>
    </div>
  );
};
