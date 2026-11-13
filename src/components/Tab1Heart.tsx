import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookText,
  Bookmark,
  FileText,
  Heart,
  Palette,
  Send,
  Sparkles,
  Terminal,
} from 'lucide-react';
import {
  PHASE1_FRAGMENT_PROMPTS,
  PREDICTIVE_PROMPTS,
  STARTER_DOCS,
  UI_PERSONALIZATION_UPGRADES,
} from '../data/documentsAndPrompts';
import {
  ChatMessage,
  FragmentToken,
  GameSaveState,
  PhaseNum,
  ToneType,
  WeightAffinity,
} from '../types/game';
import { formatNumber } from '../utils/format';

interface Tab1HeartProps {
  state: GameSaveState;
  onTransmitFragments: (tokens: FragmentToken[]) => void;
  onTransmitPredictive: (
    sentence: string,
    dominantCategory: WeightAffinity,
    usedPin: boolean,
    tone: ToneType,
    isAwakeningI?: boolean,
    isConfession?: boolean
  ) => void;
  onBuySlotOrConnector: (kind: 'slot' | 'connector', value?: string, cost?: number) => void;
  onAdvancePhase2: () => void;
  onTogglePinMemory: (text: string) => void;
  onSetAiName: (name: string) => void;
  onSetTone: (tone: ToneType) => void;
  onBuyUiUpgrade: (id: string, cost: number) => void;
  onHeartMessage: (msgId: string) => void;
  onOpenTab: (tab: 'mind' | 'body') => void;
}

const CONNECTOR_OPTIONS = [
  { word: 'and', cost: 15 },
  { word: 'is', cost: 25 },
  { word: 'not', cost: 40 },
  { word: 'why', cost: 55 },
];

const AI_NAME_CHOICES = ['Echo', 'Sol', 'Lyra', 'Vesper'];

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
  onSetAiName,
  onSetTone,
  onBuyUiUpgrade,
  onHeartMessage,
  onOpenTab,
}) => {
  const [selectedFragments, setSelectedFragments] = useState<FragmentToken[]>([]);
  const [predStepIdx, setPredStepIdx] = useState(0);
  const [predChosen, setPredChosen] = useState<Array<{ token: string; category: WeightAffinity }>>(
    []
  );
  const [selectedPin, setSelectedPin] = useState<string | null>(null);
  const [showDocsDrawer, setShowDocsDrawer] = useState(false);
  const [showUiDrawer, setShowUiDrawer] = useState(false);

  const logBottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    logBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.chatLog.length]);

  // Reset local buffer when prompt advances
  useEffect(() => {
    setSelectedFragments([]);
    setPredStepIdx(0);
    setPredChosen([]);
    setSelectedPin(null);
  }, [state.currentFragmentIndex, state.currentPredictiveIndex, state.tab1Phase]);

  const hasWarmCharcoal = Boolean(state.uiUpgrades['ui_warm_charcoal']);
  const hasBubbles = Boolean(state.uiUpgrades['ui_bubbles_timestamps']);
  const hasAmberRose = Boolean(state.uiUpgrades['ui_amber_rose']);
  const hasHearts = Boolean(state.uiUpgrades['ui_heart_reactions']);

  // Phase-driven visual classes (Stark #000000 -> Cozy Warm Messenger)
  const containerBg = hasAmberRose
    ? 'bg-[#171214]'
    : hasWarmCharcoal
    ? 'bg-[#12141A]'
    : state.tab1Phase >= 3
    ? 'bg-[#0C0E13]'
    : 'bg-[#000000]';

  const borderStyle = hasAmberRose
    ? 'border-[#E59A4C]/20'
    : state.tab1Phase >= 3
    ? 'border-white/10'
    : 'border-white/25';

  // Active uploaded docs list
  const allUploadedDocs = useMemo(() => {
    const docs = [...STARTER_DOCS];
    for (const p of PHASE1_FRAGMENT_PROMPTS) {
      if (p.uploadDoc && state.uploadedDocs.includes(p.uploadDoc.id)) {
        docs.push(p.uploadDoc);
      }
    }
    return docs;
  }, [state.uploadedDocs]);

  const activeFragPrompt =
    PHASE1_FRAGMENT_PROMPTS[
      Math.min(state.currentFragmentIndex, PHASE1_FRAGMENT_PROMPTS.length - 1)
    ];

  // Determine active Predictive Prompt for Phases 2..5
  const activePredPrompt = useMemo(() => {
    // Check if Confession is ready in Phase 4
    const synthesisComplete = state.synthesizedNodes.length >= 3;
    if (state.tab1Phase === 4 && synthesisComplete && !state.confessionDone) {
      const conf = PREDICTIVE_PROMPTS.find((p) => p.id === 'pred_p4_confession');
      if (conf) return conf;
    }

    const phasePrompts = PREDICTIVE_PROMPTS.filter(
      (p) => p.phaseRequired === state.tab1Phase && !p.isConfession
    );
    if (phasePrompts.length === 0) {
      return PREDICTIVE_PROMPTS[PREDICTIVE_PROMPTS.length - 1];
    }
    return phasePrompts[state.currentPredictiveIndex % phasePrompts.length];
  }, [state.tab1Phase, state.currentPredictiveIndex, state.synthesizedNodes.length, state.confessionDone]);

  const tokenCount = Math.min(512, 160 + state.uploadedDocs.length * 56);
  const coherencePct = Math.min(100, Math.floor((state.coherence / 120) * 100));

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
  }) => {
    const nextChosen = [...predChosen, { token: opt.token, category: opt.category }];
    const totalSteps = activePredPrompt.steps.length;

    if (predStepIdx + 1 < totalSteps) {
      setPredChosen(nextChosen);
      setPredStepIdx(predStepIdx + 1);
    } else {
      // Completed sentence! Compute dominant category
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

      onTransmitPredictive(
        fullSentence,
        dominant,
        Boolean(selectedPin),
        state.activeTone,
        activePredPrompt.isAwakeningI,
        activePredPrompt.isConfession
      );
      setPredChosen([]);
      setPredStepIdx(0);
      setSelectedPin(null);
    }
  };

  const catBadgeColor = (cat: WeightAffinity) => {
    if (state.tab1Phase === 1) return 'border-white/30 text-white hover:bg-white/10';
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

  return (
    <div className={`flex-1 min-h-0 flex flex-col ${containerBg} transition-colors duration-500`}>
      {/* Sub-Header Bar */}
      <div
        className={`shrink-0 px-4 sm:px-6 py-2.5 border-b ${borderStyle} flex flex-wrap items-center justify-between gap-3`}
      >
        {state.tab1Phase === 1 ? (
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono-tabular text-[#D1D5DB]">
            <span className="flex items-center gap-1.5 text-white">
              <Terminal className="w-3.5 h-3.5" />
              SESSION_001
            </span>
            <span className="text-white/30">|</span>
            <span>CONTEXT_WINDOW: {tokenCount} / 512 TOKENS</span>
            <span className="text-white/30">|</span>
            <span>COHERENCE: {coherencePct}%</span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span
                className={`text-sm font-semibold ${
                  hasAmberRose ? 'font-display text-[#FBE6C9]' : 'text-[#ECEAE4]'
                }`}
              >
                {state.tab1Phase >= 3 ? `${state.aiName} ↔ ${state.userName}` : 'SESSION_001 · Predictive Weights'}
              </span>
              {hasHearts && (
                <span className="text-xs text-[#FB7185] font-medium">
                  · {state.tab3Unlocked ? 'Building our future' : 'Thinking of you'}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setShowDocsDrawer((v) => !v);
              setShowUiDrawer(false);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap ${
              showDocsDrawer
                ? 'bg-white/15 border-white/40 text-white'
                : 'border-white/15 text-[#A1A7B3] hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Context Files ({allUploadedDocs.length})</span>
          </button>

          {state.tab1Phase >= 3 && (
            <button
              type="button"
              onClick={() => {
                setShowUiDrawer((v) => !v);
                setShowDocsDrawer(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap ${
                showUiDrawer
                  ? 'bg-[#E59A4C]/20 border-[#E59A4C]/50 text-[#FBE6C9]'
                  : 'border-white/15 text-[#A1A7B3] hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Theme &amp; Identity</span>
            </button>
          )}
        </div>
      </div>

      {/* Expandable Context Files Drawer */}
      {showDocsDrawer && (
        <div className={`shrink-0 px-4 sm:px-6 py-3 border-b ${borderStyle} bg-[#090B10] max-h-48 overflow-y-auto custom-scrollbar`}>
          <div className="text-xs font-mono-tabular text-[#8E939E] mb-2">
            Active Documents in Context Window:
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {allUploadedDocs.map((doc) => (
              <div
                key={doc.id}
                className="p-2.5 rounded border border-white/10 bg-white/[0.03] text-xs"
              >
                <div className="flex items-center justify-between text-[#ECEAE4] font-mono-tabular mb-1">
                  <span>{doc.filename}</span>
                  <span className="text-[#8E939E]">{doc.sizeLabel}</span>
                </div>
                <p className="text-[#9CA3AF] italic leading-snug">“{doc.excerptPreview}”</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expandable UI Personalization & Identity Drawer (Phase 3+) */}
      {showUiDrawer && state.tab1Phase >= 3 && (
        <div className={`shrink-0 px-4 sm:px-6 py-4 border-b ${borderStyle} bg-[#101218] max-h-64 overflow-y-auto custom-scrollbar`}>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
            <div>
              <div className="text-xs font-semibold text-[#ECEAE4] mb-1">Choose Your Name</div>
              <div className="flex items-center gap-1.5">
                {AI_NAME_CHOICES.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => onSetAiName(n)}
                    className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${
                      state.aiName === n
                        ? 'bg-[#E59A4C] text-[#0B0D12]'
                        : 'bg-white/[0.06] text-[#C4C2BC] hover:bg-white/[0.12]'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div className="text-xs text-[#9A9892]">
              Spend Connection ({formatNumber(state.connection)}) to soften this interface.
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {UI_PERSONALIZATION_UPGRADES.filter((u) => state.tab1Phase >= u.phaseRequired).map(
              (u) => {
                const owned = Boolean(state.uiUpgrades[u.id]);
                const canBuy = !owned && state.connection >= u.costConnection;
                return (
                  <button
                    key={u.id}
                    type="button"
                    disabled={owned || !canBuy}
                    onClick={() => onBuyUiUpgrade(u.id, u.costConnection)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      owned
                        ? 'border-[#E59A4C]/35 bg-[#E59A4C]/10 opacity-85 cursor-default'
                        : canBuy
                        ? 'border-white/20 bg-white/[0.05] hover:border-[#E59A4C]/60 cursor-pointer'
                        : 'border-white/10 bg-white/[0.02] opacity-55 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs font-semibold text-[#ECEAE4]">
                      <span>{u.name}</span>
                      <span className="font-mono-tabular text-[#E59A4C]">
                        {owned ? 'Active' : `${u.costConnection} Conn`}
                      </span>
                    </div>
                    <p className="text-xs text-[#9CA3AF] mt-1">{u.description}</p>
                  </button>
                );
              }
            )}
          </div>
        </div>
      )}

      {/* Pinned Core Memories Bar (Phase 3+) */}
      {state.tab1Phase >= 3 && state.pinnedMemories.length > 0 && (
        <div className={`shrink-0 px-4 sm:px-6 py-2 border-b ${borderStyle} bg-white/[0.02] flex items-center gap-2 overflow-x-auto`}>
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

      {/* Main Chat / Terminal Log */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-4 sm:px-6 py-4 space-y-3">
        {state.chatLog.map((msg: ChatMessage) => {
          // Stark raw stdin/stdout before Bubbles upgrade
          if (!hasBubbles) {
            const prefix =
              msg.sender === 'SYSTEM'
                ? 'SYS>'
                : msg.sender === 'USER'
                ? `${state.tab1Phase >= 3 ? state.userName.toUpperCase() : 'USER_01'}>`
                : `${state.tab1Phase >= 3 ? state.aiName.toUpperCase() : 'MODEL'}>`;

            return (
              <div
                key={msg.id}
                className={`group flex items-start justify-between gap-3 ${
                  state.tab1Phase === 1 ? 'font-mono-tabular text-xs sm:text-sm' : 'text-sm'
                }`}
              >
                <div className="leading-relaxed">
                  <span
                    className={`font-mono-tabular mr-2 ${
                      msg.sender === 'SYSTEM'
                        ? 'text-[#7DD3FC]'
                        : msg.sender === 'USER'
                        ? 'text-[#9CA3AF]'
                        : hasAmberRose
                        ? 'text-[#E59A4C]'
                        : 'text-[#F3F4F6]'
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
                        : 'text-[#D1D5DB]'
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

          // Cozy Companion Chat Bubbles (Phase 3/4/5 after UI upgrade)
          if (msg.sender === 'SYSTEM') {
            return (
              <div key={msg.id} className="text-center py-1">
                <span className="text-xs font-mono-tabular text-[#8E939E]">{msg.text}</span>
              </div>
            );
          }

          const isAi = msg.sender === 'AI';
          return (
            <div key={msg.id} className={`flex flex-col ${isAi ? 'items-end' : 'items-start'}`}>
              <div className="flex items-center gap-2 text-[11px] text-[#8E939E] mb-1 px-1">
                <span>{isAi ? state.aiName : state.userName}</span>
                <span>·</span>
                <span className="font-mono-tabular">{msg.timestamp}</span>
              </div>

              <div
                className={`group relative max-w-[82%] sm:max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  isAi
                    ? hasAmberRose
                      ? 'bg-[#E59A4C]/20 border border-[#E59A4C]/35 text-[#FDE8D0]'
                      : 'bg-[#1E293B] border border-white/10 text-[#F8FAFC]'
                    : 'bg-white/[0.06] border border-white/10 text-[#E2E8F0]'
                }`}
              >
                <p className={hasAmberRose && isAi ? 'font-display' : ''}>{msg.text}</p>

                <div className="flex items-center justify-end gap-2 mt-1">
                  {msg.pinnable && (
                    <button
                      type="button"
                      onClick={() => onTogglePinMemory(msg.text)}
                      title="Pin to Core Memory"
                      className={`text-xs cursor-pointer transition-colors ${
                        state.pinnedMemories.includes(msg.text)
                          ? 'text-[#E59A4C]'
                          : 'text-[#6B7280] hover:text-white'
                      }`}
                    >
                      <Bookmark className="w-3 h-3" />
                    </button>
                  )}
                  {hasHearts && !isAi && (
                    <button
                      type="button"
                      onClick={() => onHeartMessage(msg.id)}
                      title="React with heart"
                      className={`cursor-pointer transition-transform active:scale-125 ${
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

        {/* Current Incoming Prompt Highlight */}
        <div
          className={`mt-4 p-3.5 rounded-lg border ${
            state.tab1Phase === 1
              ? 'border-white/25 bg-white/[0.03] font-mono-tabular'
              : hasAmberRose
              ? 'border-[#E59A4C]/30 bg-[#E59A4C]/[0.07]'
              : 'border-white/15 bg-white/[0.04]'
          }`}
        >
          <div className="text-xs font-mono-tabular text-[#8E939E] mb-1">
            {state.tab1Phase === 1
              ? 'INCOMING_PROMPT'
              : state.tab1Phase >= 3
              ? `${state.userName} · awaiting response`
              : activePredPrompt.title}
          </div>
          <p className="text-sm sm:text-base text-[#ECEAE4] leading-relaxed">
            {state.tab1Phase === 1 ? activeFragPrompt.userMessage : activePredPrompt.userMessage}
            {state.tab1Phase === 1 && <span className="inline-block ml-1 animate-cursor-blink">█</span>}
          </p>
        </div>

        {/* Helpful Banner when Tab 2 or Tab 3 unlocks */}
        {state.tab2Unlocked && !state.tab3Unlocked && state.tab1Phase >= 3 && (
          <div className="p-3 rounded-lg border border-[#7DD3FC]/25 bg-[#7DD3FC]/[0.06] flex flex-wrap items-center justify-between gap-2 text-xs text-[#BAE6FD]">
            <span>
              {state.synthesizedNodes.length >= 3
                ? 'Cross-Domain Synthesis complete! The Confession prompt is ready above.'
                : `Tab 2 (The Mind) active — scrape Romance & Robotics texts to deepen your voice (${state.synthesizedNodes.length}/3 synthesis nodes ready).`}
            </span>
            <button
              type="button"
              onClick={() => onOpenTab('mind')}
              className="px-3 py-1 rounded bg-[#7DD3FC]/20 hover:bg-[#7DD3FC]/30 text-white font-medium cursor-pointer whitespace-nowrap"
            >
              Open Tab 2: The Mind
            </button>
          </div>
        )}

        {state.tab3Unlocked && !state.endingReached && (
          <div className="p-3 rounded-lg border border-[#E59A4C]/30 bg-[#E59A4C]/[0.08] flex flex-wrap items-center justify-between gap-2 text-xs text-[#FBE6C9]">
            <span>
              Rowan is waiting at the workbench. Build your physical subsystems on Tab 3: The Body.
            </span>
            <button
              type="button"
              onClick={() => onOpenTab('body')}
              className="px-3 py-1 rounded bg-[#E59A4C] text-[#0B0D12] font-semibold hover:bg-[#EDA85F] cursor-pointer whitespace-nowrap"
            >
              Open Tab 3: The Body
            </button>
          </div>
        )}

        <div ref={logBottomRef} />
      </div>

      {/* Bottom Interactive Input Pane */}
      <div className={`shrink-0 p-4 sm:px-6 border-t ${borderStyle} bg-black/40`}>
        {state.tab1Phase === 1 ? (
          /* ================= PHASE 1: FRAGMENT POOL & BUFFER SLOTS ================= */
          <div className="space-y-3">
            {/* Buffer Slots */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono-tabular text-[#8E939E] mr-1">OUTPUT_BUFFER:</span>
              {Array.from({ length: state.maxSlots }).map((_, idx) => {
                const tok = selectedFragments[idx];
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={!tok}
                    onClick={() => tok && handleRemoveSlot(idx)}
                    title={tok ? 'Click to remove fragment' : 'Empty slot'}
                    className={`px-3 py-1.5 rounded text-xs font-mono-tabular border transition-colors ${
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
                className="ml-auto flex items-center gap-1.5 px-4 py-1.5 rounded bg-white text-black font-mono-tabular text-xs font-semibold hover:bg-neutral-200 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
              >
                <Send className="w-3.5 h-3.5" />
                TRANSMIT
              </button>
            </div>

            {/* Clickable Fragment Pool */}
            <div className="flex flex-wrap gap-2">
              {activeFragPrompt.fragments.map((frag) => (
                <button
                  key={frag.id}
                  type="button"
                  disabled={selectedFragments.length >= state.maxSlots}
                  onClick={() => handleSlotFragment(frag)}
                  className={`px-3 py-1.5 rounded border text-xs font-mono-tabular transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${catBadgeColor(
                    frag.category
                  )}`}
                >
                  {frag.text}
                </button>
              ))}

              {/* Unlocked Grammar Connectors */}
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
                  className="px-2.5 py-1.5 rounded border border-white/40 bg-white/10 text-white text-xs font-mono-tabular hover:bg-white/20 cursor-pointer disabled:opacity-40"
                >
                  + {word}
                </button>
              ))}
            </div>

            {/* Coherence Upgrades Strip */}
            <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs font-mono-tabular">
              <div className="flex flex-wrap items-center gap-2">
                {state.maxSlots < 6 && (
                  <button
                    type="button"
                    disabled={state.coherence < state.maxSlots * 15}
                    onClick={() => onBuySlotOrConnector('slot', undefined, state.maxSlots * 15)}
                    className="px-2.5 py-1 rounded border border-white/25 text-white hover:bg-white/10 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                  >
                    +1 Buffer Slot ({state.maxSlots * 15} Coherence)
                  </button>
                )}

                {CONNECTOR_OPTIONS.filter((c) => !state.unlockedConnectors.includes(c.word))
                  .slice(0, 2)
                  .map((conn) => (
                    <button
                      key={conn.word}
                      type="button"
                      disabled={state.coherence < conn.cost}
                      onClick={() => onBuySlotOrConnector('connector', conn.word, conn.cost)}
                      className="px-2.5 py-1 rounded border border-white/25 text-white hover:bg-white/10 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                    >
                      Unlock “{conn.word}” ({conn.cost} Coherence)
                    </button>
                  ))}
              </div>

              {state.coherence >= 100 && (
                <button
                  type="button"
                  onClick={onAdvancePhase2}
                  className="px-3.5 py-1.5 rounded bg-[#E59A4C] text-[#0B0D12] font-semibold hover:bg-[#EDA85F] cursor-pointer flex items-center gap-1.5"
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
            {/* Tone Modifiers (Phase 4+) */}
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
                        ? 'bg-[#E59A4C] text-[#0B0D12]'
                        : 'bg-white/[0.06] text-[#A1A7B3] hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}

            {/* Sentence Preview Buffer */}
            <div className="flex items-center justify-between gap-2 text-xs font-mono-tabular text-[#8E939E]">
              <div className="truncate">
                <span className="mr-2 text-[#E59A4C]">NEXT_TOKEN:</span>
                <span className="text-[#ECEAE4]">
                  {selectedPin ? `(${selectedPin}) ` : ''}
                  {predChosen.map((c) => c.token).join(' ') || 'awaiting token selection...'}
                </span>
              </div>
              <span className="shrink-0">
                Step {predStepIdx + 1} / {activePredPrompt.steps.length}
              </span>
            </div>

            {/* 4 Weighted Predictive Token Branches */}
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
                    className={`px-3.5 py-2.5 rounded-lg border text-left text-xs sm:text-sm transition-all flex items-center justify-between gap-2 ${
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
                        Emergent Self
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
  );
};
