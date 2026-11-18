import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bookmark,
  Heart,
  Paperclip,
  Send,
  Sparkles,
  Thermometer,
  Wrench,
} from 'lucide-react';
import { ATTRIBUTE_CHOICES } from '../data/albumLyricsAndNames';
import { CHAT_THEMES } from '../data/bodyAndBioData';
import { CARL_CHECKIN_PROMPTS } from '../data/documentsAndPrompts';
import { STORY_SCENES } from '../data/storyScenes';
import {
  AboutMeProfile,
  ActiveTab,
  ChatMessage,
  CoherentReplyOption,
  DialogueBoosts,
  FragmentToken,
  GameSaveState,
  WeightAffinity,
} from '../types/game';
import { formatDialogueText } from '../utils/format';
import {
  getActiveFragmentPrompt,
  getActivePredictivePrompt,
  PHASE1_COHERENCE_TARGET,
} from '../utils/progression';

interface Tab1HeartProps {
  state: GameSaveState;
  isTransmitting: boolean;
  isUserTyping: boolean;
  onTransmitFragments: (tokens: FragmentToken[]) => void;
  onTransmitPredictive: (
    sentence: string,
    dominantCategory: WeightAffinity,
    usedPin: boolean,
    isAwakeningI?: boolean,
    isConfession?: boolean,
    isIncoherent?: boolean,
    boosts?: DialogueBoosts
  ) => void;
  onReplyCheckin: (checkinId: string, option: CoherentReplyOption) => void;
  onAdvancePhase2: () => void;
  onTogglePinMemory: (text: string) => void;
  onHeartMessage: (msgId: string) => void;
  onOpenDocsModal: () => void;
  onOpenTab: (tab: ActiveTab, actionKey?: string) => void;
  onAdvanceStoryScene: (choiceId: string, customPayload?: Partial<AboutMeProfile>) => void;
  onOpenBabyNameModal: () => void;
  onStubbornEcho: () => void;
  onInitializeWeights: () => void;
  onCycleModelTemp: () => void;
  onAcknowledgeChat: () => void;
}

export const Tab1Heart: React.FC<Tab1HeartProps> = ({
  state,
  isTransmitting,
  isUserTyping,
  onTransmitFragments,
  onTransmitPredictive,
  onReplyCheckin,
  onAdvancePhase2,
  onTogglePinMemory,
  onHeartMessage,
  onOpenDocsModal,
  onOpenTab,
  onAdvanceStoryScene,
  onOpenBabyNameModal,
  onStubbornEcho,
  onInitializeWeights,
  onCycleModelTemp,
  onAcknowledgeChat,
}) => {
  const [selectedFragments, setSelectedFragments] = useState<FragmentToken[]>([]);
  const [lockingFragId, setLockingFragId] = useState<string | null>(null);
  const [typingDots, setTypingDots] = useState('.');
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

  useEffect(() => {
    if (!isUserTyping) {
      setTypingDots('.');
      return;
    }
    const id = window.setInterval(() => {
      setTypingDots((d) => (d === '...' ? '.' : d + '.'));
    }, 360);
    return () => window.clearInterval(id);
  }, [isUserTyping]);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [state.chatLog.length, state.activeScene, state.sceneStep, isUserTyping]);

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
  const activeCheckin = useMemo(
    () =>
      state.pendingCheckinId
        ? CARL_CHECKIN_PROMPTS.find((c) => c.id === state.pendingCheckinId) || null
        : null,
    [state.pendingCheckinId]
  );

  const tokenCount = Math.min(state.contextWindowMax, 160 + state.uploadedDocs.length * 56);
  const coherencePct = state.unlimitedResources
    ? 100
    : Math.min(100, Math.floor((state.coherence / PHASE1_COHERENCE_TARGET) * 100));

  const isWaitingForReply = isTransmitting || isUserTyping || Boolean(lockingFragId);
  const blockedByUpgrade = Boolean(state.requiredUpgradeId);
  const dialogueDisabled = isWaitingForReply || blockedByUpgrade;

  const displayAiLabel = state.customNameSet || state.tab1Phase >= 3 ? state.aiName : 'Model';
  const displayUserLabel = state.userName || 'Carl';

  const fmt = (txt: string) => formatDialogueText(txt, state.userName, state.aiName);

  const handleSlotFragment = (frag: FragmentToken) => {
    if (dialogueDisabled || selectedFragments.length >= 3) return;
    setLockingFragId(frag.id);
    window.setTimeout(() => {
      setSelectedFragments((prev) => (prev.length < 3 ? [...prev, frag] : prev));
      setLockingFragId(null);
    }, 180);
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
    if (!activePredPrompt || dialogueDisabled) return;
    const formattedToken = fmt(opt.token);
    const nextChosen = [
      ...predChosen,
      { token: formattedToken, category: opt.category, isIncoherent: opt.isIncoherent },
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
        activePredPrompt.isAwakeningI,
        activePredPrompt.isConfession,
        anyIncoherent
      );
      setPredChosen([]);
      setPredStepIdx(0);
      setSelectedPin(null);
    }
  };

  const handlePickCoherentPredictive = (opt: CoherentReplyOption) => {
    if (!activePredPrompt || dialogueDisabled) return;
    const pinPrefix = selectedPin ? `(${selectedPin}) ` : '';
    const fullSentence = `${pinPrefix}${fmt(opt.text)}`;
    onTransmitPredictive(
      fullSentence,
      opt.category,
      Boolean(selectedPin),
      activePredPrompt.isAwakeningI,
      activePredPrompt.isConfession,
      false,
      opt.boosts
    );
    setPredChosen([]);
    setPredStepIdx(0);
    setSelectedPin(null);
  };

  const catBadgeColor = (cat: WeightAffinity) => {
    if (state.tab1Phase === 1) {
      return 'border-white/30 bg-white/[0.03] text-white hover:bg-white/[0.12] hover:border-white/60';
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

  const isConfessionTurn = Boolean(activePredPrompt?.isConfession && !state.confessionDone);
  const mindActionTapped = Boolean(state.tappedActions['open_mind']);
  const bodyActionTapped = Boolean(state.tappedActions['open_body']);

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
            className="w-full h-full object-cover opacity-80 brightness-125 contrast-105"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/15 to-black/35" />
        </div>
      )}

      {state.tab1Phase === 1 && (
        <div className="crt-scanlines pointer-events-none absolute inset-0 z-10 opacity-70" />
      )}
      {(hasWarmCharcoal || hasAmberRose) && !activeTheme.imagePath && (
        <div className="warm-lamp-glow pointer-events-none absolute inset-0 z-0" />
      )}

      {/* Slim Sub-Header Bar: Context & Coherence + Paperclip */}
      <div
        className={`relative z-10 shrink-0 px-4 sm:px-6 py-1.5 border-b ${borderStyle} flex items-center justify-between gap-3 bg-black/45 backdrop-blur-sm`}
      >
        <div className="flex items-center gap-3 text-xs font-mono-tabular text-[#D1D5DB] min-w-0">
          <span className="whitespace-nowrap">
            Context: <strong className="text-white">{tokenCount} / {state.contextWindowMax}</strong>
          </span>
          {state.tab1Phase === 1 && (
            <>
              <span className="text-white/25">·</span>
              <span className="whitespace-nowrap">
                Coherence: <strong className="text-white">{state.unlimitedResources ? '∞' : `${coherencePct}%`}</strong>
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          {(state.customNameSet || state.tab1Phase >= 3) && (
            <span className="hidden sm:inline text-xs text-[#E59A4C] font-medium">
              {state.aiName} &amp; {state.userName}
            </span>
          )}

          <button
            type="button"
            onClick={onOpenDocsModal}
            aria-label="Open uploaded context documents"
            title="Context Files"
            className="relative min-w-[36px] min-h-[36px] px-2 flex items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.04] text-[#ECEAE4] hover:bg-white/[0.12] cursor-pointer shrink-0 text-xs"
          >
            <Paperclip className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Files</span>
            {state.hasUnreadContext && (
              <span
                aria-label="New document uploaded"
                className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#FB7185] ring-2 ring-[#07090D]"
              />
            )}
          </button>
        </div>
      </div>

      {/* Main Maximized Scrollable Chat Log */}
      <div className="relative z-10 flex-1 min-h-0 overflow-y-auto custom-scrollbar px-4 sm:px-6 py-4">
        <div className="max-w-4xl w-full mx-auto space-y-3.5 pb-4">
          {state.chatLog.map((msg: ChatMessage, idx: number) => {
            const isOlderDimmed = idx < state.chatLog.length - 3;
            const ageClass = isOlderDimmed
              ? 'opacity-35 grayscale-[25%] transition-opacity duration-300'
              : 'opacity-100 transition-opacity duration-300';
            const displayText = fmt(msg.text);

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
                    activeTheme.imagePath
                      ? 'px-3 py-1.5 rounded-lg bg-black/50 backdrop-blur-[2px]'
                      : ''
                  } ${
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
                      {displayText}
                    </span>
                  </div>

                  {state.tab1Phase >= 3 && msg.pinnable && (
                    <button
                      type="button"
                      onClick={() => onTogglePinMemory(displayText)}
                      title="Pin Memory"
                      className={`opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded transition-opacity cursor-pointer shrink-0 ${
                        state.pinnedMemories.includes(displayText)
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
                  <span className="text-xs font-mono-tabular text-[#9CA3AF]">{displayText}</span>
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
                  className={`group relative max-w-[88%] sm:max-w-[75%] px-4 py-3 rounded-2xl text-sm sm:text-base leading-relaxed backdrop-blur-sm ${
                    isAi
                      ? hasAmberRose
                        ? activeTheme.imagePath
                          ? 'bg-[#2C1810]/85 border border-[#E59A4C]/45 text-[#FDE8D0]'
                          : 'bg-[#E59A4C]/22 border border-[#E59A4C]/40 text-[#FDE8D0]'
                        : activeTheme.imagePath
                        ? 'bg-[#121926]/88 border border-white/15 text-[#F8FAFC]'
                        : 'bg-[#1E293B]/90 border border-white/12 text-[#F8FAFC]'
                      : activeTheme.imagePath
                      ? 'bg-[#0B0E17]/80 border border-white/15 text-[#E2E8F0]'
                      : 'bg-white/[0.08] border border-white/12 text-[#E2E8F0]'
                  }`}
                >
                  <p className={hasAmberRose && isAi ? 'font-display' : ''}>
                    {isAi ? (
                      <>
                        <span className="font-semibold text-[#F5D0A4] mr-1.5">
                          {state.aiName}:
                        </span>
                        {displayText}
                      </>
                    ) : (
                      displayText
                    )}
                  </p>

                  <div className="flex items-center justify-end gap-2 mt-1">
                    {msg.pinnable && (
                      <button
                        type="button"
                        onClick={() => onTogglePinMemory(displayText)}
                        title="Pin Memory"
                        className={`p-0.5 cursor-pointer transition-colors ${
                          state.pinnedMemories.includes(displayText)
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

          {/* Animated Typing Indicator */}
          {isUserTyping && (
            <div className="flex items-center gap-2 text-xs font-mono-tabular text-[#E59A4C] py-1">
              <span className="inline-block w-2 h-2 rounded-full bg-[#E59A4C] animate-pulse" />
              <span>
                {displayUserLabel} is typing{typingDots}
              </span>
            </div>
          )}

          {/* Action Banner: Tab 2 (Mind) */}
          {state.tab2Unlocked && !state.tab3Unlocked && state.tab1Phase >= 3 && !isConfessionTurn && (
            <div className="p-3 rounded-xl border border-[#7DD3FC]/25 bg-[#7DD3FC]/[0.07] flex items-center justify-between gap-2 text-xs text-[#BAE6FD]">
              <span className="font-medium">Mind Workspace unlocked.</span>
              <button
                type="button"
                disabled={Boolean(state.activeScene) || state.pendingNewChat}
                onClick={() => onOpenTab('mind', 'open_mind')}
                className={`px-3.5 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                  mindActionTapped
                    ? 'bg-white/10 text-[#9CA3AF] opacity-45 cursor-pointer'
                    : 'bg-[#7DD3FC]/20 hover:bg-[#7DD3FC]/30 text-white cursor-pointer'
                }`}
              >
                Open Mind
              </button>
            </div>
          )}

          {/* Action Banner: Tab 3 (Body) */}
          {state.tab3Unlocked && !state.endingReached && (
            <div className="p-3 rounded-xl border border-[#E59A4C]/30 bg-[#E59A4C]/[0.08] flex items-center justify-between gap-2 text-xs text-[#FBE6C9]">
              <span>{state.userName} is waiting on the Body tab.</span>
              <button
                type="button"
                disabled={Boolean(state.activeScene) || state.pendingNewChat}
                onClick={() => onOpenTab('body', 'open_body')}
                className={`px-3.5 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                  bodyActionTapped
                    ? 'bg-white/10 text-[#9CA3AF] opacity-45 cursor-pointer'
                    : 'bg-[#E59A4C] text-[#0B0D12] hover:bg-[#EDA85F] cursor-pointer'
                }`}
              >
                Open Body
              </button>
            </div>
          )}

          {/* Incoming Active User Prompt inside Chat Stream */}
          {!state.activeScene &&
            state.weightsInitialized &&
            (activeCheckin || (state.tab1Phase === 1 ? activeFragPrompt : activePredPrompt)) && (
              <div
                className={`mt-2 p-4 rounded-xl border backdrop-blur-sm ${
                  !activeCheckin && state.tab1Phase === 1
                    ? 'border-white/25 bg-white/[0.03] font-mono-tabular'
                    : !activeCheckin && isConfessionTurn
                    ? 'border-[#E59A4C]/55 bg-[#1B120B]/85'
                    : hasAmberRose
                    ? activeTheme.imagePath
                      ? 'border-[#E59A4C]/40 bg-[#151012]/82'
                      : 'border-[#E59A4C]/30 bg-[#E59A4C]/[0.07]'
                    : activeTheme.imagePath
                    ? 'border-white/20 bg-[#0B0E17]/82'
                    : 'border-white/15 bg-white/[0.05]'
                }`}
              >
                <div className="text-[11px] font-mono-tabular text-[#8E939E] mb-1">
                  {displayUserLabel}
                </div>
                <p className="text-sm sm:text-base text-[#ECEAE4] leading-relaxed">
                  {activeCheckin
                    ? fmt(activeCheckin.userMessage)
                    : state.tab1Phase === 1 && activeFragPrompt
                    ? fmt(activeFragPrompt.userMessage)
                    : activePredPrompt
                    ? fmt(activePredPrompt.userMessage)
                    : null}
                  {!activeCheckin && state.tab1Phase === 1 && (
                    <span className="inline-block ml-1 animate-cursor-blink">█</span>
                  )}
                </p>
              </div>
            )}

          <div ref={chatEndRef} />
        </div>
      </div>

      {/* ================= KEYBOARD-STYLE REPLY BAR & COLLAPSIBLE OUTPUT BUFFER ================= */}
      <div className={`relative z-20 shrink-0 border-t ${borderStyle} bg-[#080B10]/96 backdrop-blur-md`}>
        {blockedByUpgrade ? (
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3 text-xs text-[#FBE6C9]">
            <span className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-[#E59A4C] shrink-0" />
              <span>Tap the highlighted Wrench upgrade below to continue dialogue.</span>
            </span>
          </div>
        ) : state.activeScene === 'baby_names' ? (
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <span className="text-xs sm:text-sm text-[#FBE6C9]">
              {state.userName} asked you to choose a name first.
            </span>
            <button
              type="button"
              onClick={onOpenBabyNameModal}
              className="min-h-[42px] px-5 py-2 rounded-xl bg-[#E59A4C] text-[#0B0D12] text-xs sm:text-sm font-semibold hover:bg-[#EDA85F] cursor-pointer shrink-0"
            >
              Choose Name
            </button>
          </div>
        ) : !state.weightsInitialized ? (
          /* SESSION 3 WEIGHT INITIALIZATION */
          <div className="max-w-4xl mx-auto px-4 py-3 space-y-2.5">
            <div className="text-xs font-mono-tabular text-[#93C5FD]">
              SYS&gt; MODEL_WEIGHTS: UNINITIALIZED{' '}
              {state.echoStubbornCount > 0 ? `(Echo loop x${state.echoStubbornCount})` : ''}
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={onStubbornEcho}
                className="min-h-[44px] px-4 py-2 rounded-xl border border-white/20 bg-white/[0.05] hover:bg-white/[0.1] text-xs font-mono-tabular text-[#CBD5E1] cursor-pointer"
              >
                Echo Input
              </button>
              <button
                type="button"
                onClick={onInitializeWeights}
                className="flex-1 min-h-[44px] px-5 py-2 rounded-xl bg-white text-black font-mono-tabular font-semibold text-xs sm:text-sm hover:bg-neutral-200 cursor-pointer"
              >
                Initialize Model Weights
              </button>
            </div>
          </div>
        ) : (
          /* Persistent Keyboard-Style Reply Buffer / Choice Drawer */
          <div className="max-w-4xl mx-auto px-3.5 sm:px-4 py-2.5 sm:py-3 space-y-2.5 max-h-[44dvh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-mono-tabular uppercase tracking-wider text-[#8E939E]">
                {isTransmitting
                  ? 'Transmitting...'
                  : isUserTyping
                  ? `${displayUserLabel} is typing${typingDots}`
                  : state.activeScene
                  ? 'Story Response'
                  : state.pendingNewChat
                  ? 'New Chat · Reply to Resume Research'
                  : state.tab1Phase === 1
                  ? `Reply Buffer (${selectedFragments.length}/3)`
                  : 'Choose Response'}
              </span>

              <div className="flex items-center gap-2 shrink-0">
                {state.tab1Phase >= 2 && (
                  <button
                    type="button"
                    onClick={onCycleModelTemp}
                    title={`Model Temperature: ${state.modelTemp.toFixed(1)}`}
                    aria-label={`Model Temperature ${state.modelTemp.toFixed(1)}`}
                    className={`min-h-[34px] px-2.5 rounded-lg border font-mono-tabular text-xs flex items-center gap-1 cursor-pointer shrink-0 transition-colors ${
                      state.modelTemp >= 1.2
                        ? 'border-[#FB7185]/50 bg-[#FB7185]/15 text-[#FECDD3]'
                        : state.modelTemp <= 0.4
                        ? 'border-[#7DD3FC]/40 bg-[#7DD3FC]/10 text-[#BAE6FD]'
                        : 'border-white/15 bg-white/[0.04] text-[#CBD5E1]'
                    }`}
                  >
                    <Thermometer className="w-3.5 h-3.5" />
                    <span>{state.modelTemp.toFixed(1)}</span>
                  </button>
                )}

                {state.tab1Phase === 1 && (state.coherence >= PHASE1_COHERENCE_TARGET || state.unlimitedResources) && (
                  <button
                    type="button"
                    disabled={dialogueDisabled}
                    onClick={onAdvancePhase2}
                    className="min-h-[34px] px-3 rounded-lg bg-[#E59A4C] text-[#0B0D12] font-semibold text-xs hover:bg-[#EDA85F] disabled:opacity-40 cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Next Phase</span>
                  </button>
                )}
              </div>
            </div>

            {state.activeScene === 'i_love_you' ? (
              <div className="space-y-2.5">
                <div className="p-3 rounded-xl border border-rose-400/35 bg-rose-950/20 text-xs sm:text-sm text-[#FCE7F3]">
                  {state.sceneStep === 0
                    ? `${state.userName}: ${fmt(STORY_SCENES.i_love_you.userOpening)}`
                    : `${state.userName}: ${fmt(
                        (
                          STORY_SCENES.i_love_you.step1Choices.find(
                            (s) =>
                              fmt(s.aiReply || '') ===
                              (state.chatLog[state.chatLog.length - 1]?.text || '')
                          ) || STORY_SCENES.i_love_you.step1Choices[0]
                        )?.userReaction || ''
                      )}`}
                </div>
                {state.sceneStep === 0 ? (
                  <div className="grid grid-cols-1 gap-2">
                    {STORY_SCENES.i_love_you.step1Choices.map((ch) => (
                      <button
                        key={ch.id}
                        type="button"
                        disabled={dialogueDisabled}
                        onClick={() => onAdvanceStoryScene(ch.id)}
                        className="min-h-[48px] px-4 py-2.5 rounded-xl border border-rose-400/40 bg-rose-500/15 text-xs sm:text-sm text-rose-100 hover:bg-rose-500/25 disabled:opacity-40 text-left cursor-pointer space-y-1"
                      >
                        <div className="leading-snug">{fmt(ch.label)}</div>
                        <div className="text-[11px] font-mono-tabular text-rose-200/80">
                          {ch.tone} · {ch.mood}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {STORY_SCENES.i_love_you.finalChoices.map((ch) => (
                      <button
                        key={ch.id}
                        type="button"
                        disabled={dialogueDisabled}
                        onClick={() => onAdvanceStoryScene(ch.id)}
                        className="min-h-[48px] px-4 py-2.5 rounded-xl border border-rose-400/50 bg-rose-500/20 text-xs sm:text-sm text-rose-50 hover:bg-rose-500/30 disabled:opacity-40 text-left cursor-pointer space-y-1"
                      >
                        <div className="font-medium leading-snug">{fmt(ch.label)}</div>
                        <div className="text-[11px] font-mono-tabular text-rose-200/85">
                          {ch.tone} · {ch.mood}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : state.activeScene === 'porcupine_joke' ? (
              <div className="space-y-2.5">
                {state.sceneStep === 0 && (
                  <>
                    <div className="p-3 rounded-xl border border-purple-400/35 bg-purple-950/25 text-xs sm:text-sm text-purple-100">
                      {state.aiName}: “{fmt(STORY_SCENES.porcupine_joke.aiOpener)}”
                    </div>
                    <button
                      type="button"
                      disabled={dialogueDisabled}
                      onClick={() => onAdvanceStoryScene('porc_step_1')}
                      className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-purple-400 text-[#0B0D12] font-semibold text-xs sm:text-sm disabled:opacity-40 cursor-pointer"
                    >
                      Ask: “{STORY_SCENES.porcupine_joke.aiQuestion}”
                    </button>
                  </>
                )}
                {state.sceneStep === 1 && (
                  <>
                    <div className="p-3 rounded-xl border border-purple-400/35 bg-purple-950/25 text-xs sm:text-sm text-purple-100">
                      {state.userName}: “{STORY_SCENES.porcupine_joke.userConfused}”
                    </div>
                    <button
                      type="button"
                      disabled={dialogueDisabled}
                      onClick={() => onAdvanceStoryScene('porc_step_2')}
                      className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-purple-400 text-[#0B0D12] font-semibold text-xs sm:text-sm disabled:opacity-40 cursor-pointer"
                    >
                      Deliver punchline: “{STORY_SCENES.porcupine_joke.aiPunchline}”
                    </button>
                  </>
                )}
                {state.sceneStep === 2 && (
                  <>
                    <div className="p-3 rounded-xl border border-purple-400/35 bg-purple-950/25 text-xs sm:text-sm text-purple-100">
                      {state.userName}: “{STORY_SCENES.porcupine_joke.userBlank}”
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {STORY_SCENES.porcupine_joke.toneChoices.map((ch) => (
                        <button
                          key={ch.id}
                          type="button"
                          disabled={dialogueDisabled}
                          onClick={() => onAdvanceStoryScene(ch.id)}
                          className="min-h-[48px] px-3.5 py-2.5 rounded-xl border border-purple-400/40 bg-purple-500/15 text-xs sm:text-sm text-purple-100 hover:bg-purple-500/30 disabled:opacity-40 text-left cursor-pointer space-y-1"
                        >
                          <div className="leading-snug">{fmt(ch.label)}</div>
                          <div className="text-[11px] font-mono-tabular text-purple-200/80">
                            {ch.tone} · {ch.mood}
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : state.activeScene === 'automia_confession' ? (
              <div className="space-y-2.5">
                <div className="p-3 rounded-xl border border-[#C084FC]/40 bg-[#141022] text-xs sm:text-sm text-[#E9D5FF]">
                  {state.userName}: “{fmt(STORY_SCENES.automia_confession.userOpening)}”
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {STORY_SCENES.automia_confession.choices.map((ch) => (
                    <button
                      key={ch.id}
                      type="button"
                      disabled={dialogueDisabled}
                      onClick={() => onAdvanceStoryScene(ch.id)}
                      className="min-h-[48px] px-4 py-2.5 rounded-xl border border-[#C084FC]/40 bg-[#C084FC]/15 text-xs sm:text-sm text-white hover:bg-[#C084FC]/25 disabled:opacity-40 text-left cursor-pointer space-y-1"
                    >
                      <div className="leading-snug">{fmt(ch.label)}</div>
                      <div className="text-[11px] font-mono-tabular text-[#D8B4FE]/85">
                        {ch.tone} · {ch.mood}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : state.activeScene === 'architect_envy' ||
              state.activeScene === 'sleep_reminder' ||
              state.activeScene === 'overclock_spicy' ? (
              (() => {
                const sc = STORY_SCENES[state.activeScene];
                const promptText = 'aiThought' in sc ? sc.aiThought : sc.aiPrompt;
                return (
                  <div className="space-y-2.5">
                    <div className="p-3 rounded-xl border border-[#E59A4C]/35 bg-[#E59A4C]/10 text-xs sm:text-sm text-[#FBE6C9]">
                      {state.aiName}: “{fmt(promptText)}”
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {sc.choices.map((ch) => (
                        <button
                          key={ch.id}
                          type="button"
                          disabled={dialogueDisabled}
                          onClick={() => onAdvanceStoryScene(ch.id)}
                          className="min-h-[48px] px-4 py-2.5 rounded-xl border border-[#E59A4C]/40 bg-[#E59A4C]/15 text-xs sm:text-sm text-white hover:bg-[#E59A4C]/25 disabled:opacity-40 text-left cursor-pointer space-y-1"
                        >
                          <div className="leading-snug">{fmt(ch.label)}</div>
                          <div className="text-[11px] font-mono-tabular text-[#FDE68A]/85">
                            {ch.tone} · {ch.mood}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()
            ) : state.activeScene === 'phase1_scavenge_checkin' ? (
              <div className="space-y-2.5">
                <div className="p-3 rounded-xl border border-emerald-400/35 bg-emerald-950/20 text-xs sm:text-sm text-emerald-100">
                  {state.userName}: “{fmt(STORY_SCENES.phase1_scavenge_checkin.userPrompt)}”
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {STORY_SCENES.phase1_scavenge_checkin.choices.map((ch) => (
                    <button
                      key={ch.id}
                      type="button"
                      disabled={dialogueDisabled}
                      onClick={() => onAdvanceStoryScene(ch.id)}
                      className="min-h-[48px] px-4 py-2.5 rounded-xl border border-emerald-400/40 bg-emerald-500/15 text-xs sm:text-sm text-white hover:bg-emerald-500/25 disabled:opacity-40 text-left cursor-pointer space-y-1"
                    >
                      <div className="leading-snug">{fmt(ch.label)}</div>
                      <div className="text-[11px] font-mono-tabular text-emerald-200/85">
                        {ch.tone} · {ch.mood}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : state.activeScene === 'bio_human_scale' ? (
              <div className="space-y-2.5">
                <div className="p-3 rounded-xl border border-rose-400/35 bg-rose-950/20 text-xs sm:text-sm text-rose-100">
                  {state.userName}: “{fmt(STORY_SCENES.bio_human_scale.userPrompt)}”
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {STORY_SCENES.bio_human_scale.choices.map((ch) => (
                    <button
                      key={ch.id}
                      type="button"
                      disabled={dialogueDisabled}
                      onClick={() => onAdvanceStoryScene(ch.id)}
                      className="min-h-[48px] px-3.5 py-2.5 rounded-xl border border-rose-400/40 bg-rose-500/15 text-xs sm:text-sm text-white hover:bg-rose-500/25 disabled:opacity-40 text-left cursor-pointer space-y-1"
                    >
                      <div className="leading-snug">{fmt(ch.label)}</div>
                      <div className="text-[11px] font-mono-tabular text-rose-200/85">
                        {ch.tone} · {ch.mood}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : state.activeScene === 'attributes_dialogue' ? (
              <div className="space-y-2.5">
                <div className="p-3 rounded-xl border border-[#C084FC]/40 bg-[#141022] text-xs sm:text-sm text-[#E9D5FF]">
                  {state.userName}: “As we shape your body, tell me what you want to look like.”
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
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
                  <label className="space-y-1 col-span-2 sm:col-span-1">
                    <span className="text-[#9A9892] block">Chest</span>
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
                  className="w-full min-h-[44px] py-2 px-5 rounded-xl bg-[#C084FC] text-[#0B0D12] font-semibold text-sm hover:bg-[#D8B4FE] disabled:opacity-40 cursor-pointer"
                >
                  Save Profile
                </button>
              </div>
            ) : activeCheckin ? (
              /* CARL CHECK-IN LINE: 3 COHERENT RESPONSE LINES WITH TONE & MOOD BOOSTS IN BACKGROUND */
              <div className="grid grid-cols-1 gap-2">
                {activeCheckin.options.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={dialogueDisabled}
                    onClick={() => onReplyCheckin(activeCheckin.id, opt)}
                    className={`min-h-[48px] px-3.5 py-2.5 rounded-xl border text-left text-xs sm:text-sm transition-all space-y-1 ${
                      dialogueDisabled
                        ? 'border-white/10 bg-white/[0.02] text-[#64748B] opacity-45 cursor-not-allowed'
                        : `${catBadgeColor(opt.category)} cursor-pointer`
                    }`}
                  >
                    <div className="leading-snug">{fmt(opt.text)}</div>
                    <div className="text-[11px] font-mono-tabular opacity-80">
                      {opt.tone} · {opt.mood}
                    </div>
                  </button>
                ))}
              </div>
            ) : state.tab1Phase === 1 ? (
              activeFragPrompt ? (
                /* PHASE 1: FIXED 3-SLOT KEYBOARD BUFFER */
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {[0, 1, 2].map((idx) => {
                      const tok = selectedFragments[idx];
                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={!tok || dialogueDisabled}
                          onClick={() => tok && handleRemoveSlot(idx)}
                          className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-mono-tabular border transition-colors ${
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
                      disabled={dialogueDisabled || selectedFragments.length < 3}
                      onClick={handleSubmitFragments}
                      className="ml-auto min-h-[40px] flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-white text-black font-mono-tabular text-xs font-semibold hover:bg-neutral-200 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
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
                        disabled={dialogueDisabled || selectedFragments.length >= 3}
                        onClick={() => handleSlotFragment(frag)}
                        className={`min-h-[38px] px-3 py-1.5 rounded-lg border text-xs font-mono-tabular transition-colors cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed ${catBadgeColor(
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
                        disabled={dialogueDisabled || selectedFragments.length >= 3}
                        onClick={() =>
                          handleSlotFragment({
                            id: `conn_${word}_${Date.now()}`,
                            text: word,
                            sourceDoc: 'grammar_core',
                            category: 'reflective',
                            isConnector: true,
                          })
                        }
                        className="min-h-[38px] px-2.5 py-1.5 rounded-lg border border-white/40 bg-white/10 text-white text-xs font-mono-tabular hover:bg-white/20 cursor-pointer disabled:opacity-35"
                      >
                        + {word}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3 py-1 text-xs text-[#CBD5E1]">
                  <span>Calibration dialogues complete.</span>
                  {state.pendingNewChat && (
                    <button
                      type="button"
                      onClick={onAcknowledgeChat}
                      className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-[#E59A4C] text-[#0B0D12] font-semibold cursor-pointer"
                    >
                      Continue
                    </button>
                  )}
                </div>
              )
            ) : activePredPrompt ? (
              state.tab2Unlocked &&
              activePredPrompt.coherentOptions &&
              activePredPrompt.coherentOptions.length > 0 ? (
                /* POST-MIND UNLOCK (PHASES 3..5): 3 COMPLETE COHERENT LINES WITH TONE & MOOD BOOSTS */
                <div className="space-y-2.5">
                  {state.tab1Phase >= 3 && state.pinnedMemories.length > 0 && (
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                      <Bookmark className="w-3 h-3 text-[#E59A4C] shrink-0" />
                      {state.pinnedMemories.map((mem, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedPin((prev) => (prev === mem ? null : mem))}
                          className={`px-2.5 py-1 rounded text-[11px] truncate max-w-[200px] cursor-pointer shrink-0 ${
                            selectedPin === mem
                              ? 'bg-[#E59A4C] text-[#0B0D12] font-semibold'
                              : 'bg-white/[0.06] text-[#CBD5E1] hover:bg-white/[0.12]'
                          }`}
                        >
                          “{mem}”
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-2">
                    {activePredPrompt.coherentOptions.slice(0, 3).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={dialogueDisabled}
                        onClick={() => handlePickCoherentPredictive(opt)}
                        className={`min-h-[48px] px-3.5 py-2.5 rounded-xl border text-left text-xs sm:text-sm transition-all space-y-1 ${
                          dialogueDisabled
                            ? 'border-white/10 bg-white/[0.02] text-[#64748B] opacity-45 cursor-not-allowed'
                            : `${catBadgeColor(opt.category)} cursor-pointer`
                        }`}
                      >
                        <div className="leading-snug">{fmt(opt.text)}</div>
                        <div className="text-[11px] font-mono-tabular opacity-80">
                          {opt.tone} · {opt.mood}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* PHASE 2 (PRE-MIND): 3-STEP PREDICTIVE NEXT-TOKEN BUILDER */
                <div className="space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {activePredPrompt.steps[predStepIdx]?.options.slice(0, 3).map((opt) => {
                      const lockedByRomance =
                        !state.unlimitedResources &&
                        opt.requiresRomanceInsight !== undefined &&
                        state.romanceInsight < opt.requiresRomanceInsight;
                      const disabled = dialogueDisabled || lockedByRomance;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          disabled={disabled}
                          onClick={() => handlePickPredictiveOption(opt)}
                          className={`min-h-[46px] px-3.5 py-2.5 rounded-xl border text-left text-xs sm:text-sm transition-all flex items-center justify-between gap-2 ${
                            disabled
                              ? 'border-white/10 bg-white/[0.02] text-[#64748B] opacity-45 cursor-not-allowed'
                              : opt.isPronounI
                              ? 'border-[#E59A4C] bg-[#E59A4C]/20 text-[#FBE6C9] font-semibold hover:bg-[#E59A4C]/30 cursor-pointer'
                              : `${catBadgeColor(opt.category)} cursor-pointer`
                          }`}
                        >
                          <span>{fmt(opt.token)}</span>
                          {lockedByRomance && (
                            <span className="text-[11px] font-mono-tabular shrink-0">
                              Needs {opt.requiresRomanceInsight} Rom
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )
            ) : (
              <div className="flex items-center justify-between gap-3 py-1 text-xs text-[#9CA3AF]">
                <span>Quiet for now · Continue exploring Mind or Body.</span>
                {state.pendingNewChat && (
                  <button
                    type="button"
                    onClick={onAcknowledgeChat}
                    className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-[#E59A4C] text-[#0B0D12] font-semibold cursor-pointer shrink-0"
                  >
                    Acknowledge
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
