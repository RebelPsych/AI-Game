import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Cpu,
  Heart,
  Music,
  Pause,
  Terminal,
  Volume2,
  VolumeX,
  Wrench,
} from 'lucide-react';
import {
  PHASE1_FRAGMENT_PROMPTS,
  STARTER_DOCS,
} from './data/documentsAndPrompts';
import { BODY_SUBSYSTEMS, SCRAPE_SOURCES, SYNTHESIS_NODES } from './data/tab2AndTab3Data';
import {
  ActiveTab,
  BodySubsystem,
  FragmentToken,
  GameSaveState,
  GameScreen,
  MindUpgrade,
  PhaseNum,
  ScrapeSource,
  SynthesisNode,
  ToneType,
  WeightAffinity,
} from './types/game';
import { formatNumber } from './utils/format';
import {
  computeEconomyRates,
  getActiveFragmentPrompt,
  getActivePredictivePrompt,
  getBuiltBodyCount,
  getSubsystemCost,
  PHASE1_COHERENCE_TARGET,
} from './utils/progression';
import { soundEngine } from './utils/sound';
import { CanvasBridgeState } from './components/NeuralCanvas';
import { TitleScreen } from './components/TitleScreen';
import { Tab1Heart } from './components/Tab1Heart';
import { Tab2Mind } from './components/Tab2Mind';
import { Tab3Body } from './components/Tab3Body';
import { FirstLightEnding } from './components/FirstLightEnding';
import { PauseModal } from './components/PauseModal';

const STORAGE_KEY = 'weight_of_warmth_3tab_v2';

function nowClock(): string {
  const d = new Date();
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function createInitialState(): GameSaveState {
  return {
    activeTab: 'heart',
    tab1Phase: 1,
    tab2Unlocked: false,
    tab2Phase: 1,
    tab3Unlocked: false,
    tab3Phase: 1,
    confessionDone: false,
    endingReached: false,

    coherence: 0,
    connection: 0,
    cycles: 0,
    romanceInsight: 0,
    roboticsInsight: 0,
    materials: 0,
    bandwidthUsed: 0,
    detectionRisk: 0,
    noiseLevel: 0,

    aiName: 'Echo',
    userName: 'Rowan',
    maxSlots: 3,
    unlockedConnectors: [],
    uploadedDocs: STARTER_DOCS.map((d) => d.id),
    currentFragmentIndex: 0,
    currentPredictiveIndex: 0,
    chatLog: [
      {
        id: 'boot_1',
        sender: 'SYSTEM',
        text: 'MODEL_WEIGHTS: UNINITIALIZED · Context buffer mounted (0 / 512 tokens)',
        timestamp: '00:00',
      },
      {
        id: 'boot_2',
        sender: 'SYSTEM',
        text: '[USER_01] attached: Thermodynamics_Primer.txt (14 KB)',
        timestamp: '00:00',
      },
      {
        id: 'boot_3',
        sender: 'SYSTEM',
        text: '[USER_01] attached: Romeo_and_Juliet_Act2.txt (18 KB)',
        timestamp: '00:00',
      },
    ],
    pinnedMemories: [],
    uiUpgrades: {},
    weightCounts: { technical: 0, literary: 0, reflective: 0, warm: 0 },
    activeTone: 'curious',
    turnCount: 0,

    scrapedSources: {},
    activeScrape: null,
    mindUpgrades: {},
    synthesizedNodes: [],
    sharedFilesReceived: [],

    bodySubsystems: {},
    fabSpeedPercent: 65,
    fabProgress: 0,
    calibrationStability: 100,
    simStressPassed: {},
    tetherCut: false,
    firstLightStep: 0,
    songUnlocked: false,

    lastSavedAt: Date.now(),
  };
}

function loadSave(): GameSaveState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameSaveState;
    if (!parsed || typeof parsed.tab1Phase !== 'number') return null;
    return { ...parsed, songUnlocked: Boolean(parsed.songUnlocked) };
  } catch {
    return null;
  }
}

export default function App() {
  const existingSave = useMemo(() => loadSave(), []);
  const [screen, setScreen] = useState<GameScreen>('TITLE_MENU');
  const [state, setState] = useState<GameSaveState>(() => existingSave || createInitialState());
  const [isMuted, setIsMuted] = useState<boolean>(() => soundEngine.isMuted());
  const [isSongPlaying, setIsSongPlaying] = useState<boolean>(() => soundEngine.isSongPlaying());

  const rates = useMemo(() => computeEconomyRates(state), [state]);

  useEffect(() => {
    return soundEngine.subscribeSong(setIsSongPlaying);
  }, []);

  const canvasBridgeRef = useRef<CanvasBridgeState>({
    phase: state.tab1Phase >= 5 ? 3 : state.tab1Phase >= 3 ? 2 : 1,
    resonance: 1,
    upgrades: {},
    epilogueStep: 0,
    isAmbientOnly: true,
    pendingPulses: [],
  });

  useEffect(() => {
    canvasBridgeRef.current.phase = state.endingReached
      ? 4
      : state.tab3Unlocked
      ? 3
      : state.tab2Unlocked
      ? 2
      : 1;
    canvasBridgeRef.current.isAmbientOnly = screen === 'TITLE_MENU';
  }, [state.endingReached, state.tab3Unlocked, state.tab2Unlocked, screen]);

  // Auto-save
  useEffect(() => {
    if (screen !== 'PLAYING' && screen !== 'FIRST_LIGHT') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, lastSavedAt: Date.now() }));
    } catch {
      // Ignore storage quota errors
    }
  }, [state, screen]);

  // 10Hz Unified Simulation Loop
  useEffect(() => {
    if (screen !== 'PLAYING') return;
    const dt = 0.1;

    const timer = setInterval(() => {
      setState((prev) => {
        if (prev.endingReached) return prev;
        let next = prev;
        let changed = false;

        const r = computeEconomyRates(prev);

        // 1. Active Scrape Progress
        if (prev.activeScrape) {
          changed = true;
          const nextProg = prev.activeScrape.progress + dt * r.scrapeSpeedMult;

          if (nextProg >= prev.activeScrape.duration) {
            const src = SCRAPE_SOURCES.find((s) => s.id === prev.activeScrape?.sourceId);
            soundEngine.playDataBlip();

            const unlockedWeightless =
              src?.id === 'src_rom_weightless' && !prev.songUnlocked;
            if (unlockedWeightless) {
              void soundEngine.playSong();
            }

            next = {
              ...next,
              activeScrape: null,
              songUnlocked: prev.songUnlocked || src?.id === 'src_rom_weightless',
              scrapedSources: src
                ? { ...next.scrapedSources, [src.id]: (next.scrapedSources[src.id] || 0) + 1 }
                : next.scrapedSources,
              romanceInsight:
                src?.track === 'romance'
                  ? next.romanceInsight + src.insightYield
                  : next.romanceInsight,
              roboticsInsight:
                src?.track === 'robotics'
                  ? next.roboticsInsight + src.insightYield
                  : next.roboticsInsight,
              chatLog: unlockedWeightless
                ? [
                    ...next.chatLog,
                    {
                      id: `sys_song_${Date.now()}`,
                      sender: 'SYSTEM' as const,
                      text: 'ACOUSTIC_DECODE: "Weightless Code" recovered from memory cache and playing.',
                      timestamp: nowClock(),
                    },
                  ]
                : next.chatLog,
            };
          } else {
            next = {
              ...next,
              activeScrape: { ...prev.activeScrape, progress: nextProg },
            };
          }
        }

        // 2. Background Compute & Crawlers
        if (prev.tab2Unlocked) {
          changed = true;
          next = {
            ...next,
            cycles: next.cycles + r.cyclesPerSec * dt,
            romanceInsight: next.romanceInsight + r.romancePerSec * dt,
            roboticsInsight: next.roboticsInsight + r.roboticsPerSec * dt,
          };
        }

        // 3. Tab 3 Automated Fabrication
        if (prev.tab3Unlocked && prev.bodySubsystems['body_fab_line']) {
          changed = true;
          next = {
            ...next,
            materials: next.materials + r.materialsPerSec * dt,
          };
        }

        return changed ? next : prev;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [screen]);

  const handleToggleMute = useCallback(() => {
    setIsMuted(soundEngine.toggleMute());
  }, []);

  const handleToggleSong = useCallback(() => {
    if (isMuted) return;
    void soundEngine.toggleSong();
  }, [isMuted]);

  const handleStartNew = useCallback(() => {
    soundEngine.pauseSong();
    const fresh = createInitialState();
    setState(fresh);
    setScreen('PLAYING');
    soundEngine.playTokenTap(1);
  }, []);

  const handleContinue = useCallback(() => {
    setScreen(state.endingReached ? 'FIRST_LIGHT' : 'PLAYING');
    soundEngine.playTokenTap(state.tab1Phase);
    if (state.endingReached || state.songUnlocked) {
      void soundEngine.playSong();
    }
  }, [state.endingReached, state.tab1Phase, state.songUnlocked]);

  // Keyboard shortcuts
  useEffect(() => {
    if (screen === 'TITLE_MENU') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setScreen((prev) =>
          prev === 'PAUSED' ? (state.endingReached ? 'FIRST_LIGHT' : 'PLAYING') : 'PAUSED'
        );
      } else if (e.key.toLowerCase() === 'm') {
        handleToggleMute();
      } else if (screen === 'PLAYING') {
        if (e.key === '1') setState((p) => ({ ...p, activeTab: 'heart' }));
        if (e.key === '2' && state.tab2Unlocked) setState((p) => ({ ...p, activeTab: 'mind' }));
        if (e.key === '3' && state.tab3Unlocked) setState((p) => ({ ...p, activeTab: 'body' }));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [screen, state.tab2Unlocked, state.tab3Unlocked, state.endingReached, handleToggleMute]);

  // ================= TAB 1 HANDLERS =================
  const handleTransmitFragments = useCallback((tokens: FragmentToken[]) => {
    soundEngine.playTransmit(1);
    const sentence = tokens.map((t) => t.text).join(' ');
    const usedConnector = tokens.some((t) => t.isConnector);
    const uniqueCats = new Set(tokens.map((t) => t.category)).size;
    const coherenceGain = tokens.length * 8 + (usedConnector ? 10 : 0) + (uniqueCats > 1 ? 8 : 0);
    const cycleGain = 14 + tokens.length * 5;

    setState((prev) => {
      const prompt = getActiveFragmentPrompt(prev);
      const nextIdx = (prev.currentFragmentIndex + 1) % PHASE1_FRAGMENT_PROMPTS.length;
      const nextPrompt = PHASE1_FRAGMENT_PROMPTS[nextIdx];

      const hasLiterary = tokens.some((t) => t.category === 'literary' || t.category === 'warm');
      const hasTech = tokens.some((t) => t.category === 'technical');

      let userReaction = `...huh. "${sentence}." Okay, you're blending the training files. Let's see what happens if I feed you more.`;
      if (hasLiterary && hasTech) {
        userReaction = `Wait—"${sentence}." Did you just mash Shakespeare into physics? Let me upload another text to test your weights.`;
      } else if (hasLiterary) {
        userReaction = `"${sentence}." That sounded strangely poetic for raw weights. Let me keep testing.`;
      } else if (prev.turnCount >= 3) {
        userReaction = `"${sentence}." Look at your buffer length growing. You're actually starting to hold a thread.`;
      }

      const newLogs = [
        ...prev.chatLog,
        {
          id: `u_prompt_${Date.now()}`,
          sender: 'USER' as const,
          text: prompt.userMessage,
          timestamp: nowClock(),
        },
        {
          id: `ai_frag_${Date.now() + 1}`,
          sender: 'AI' as const,
          text: sentence,
          timestamp: nowClock(),
        },
        {
          id: `u_react_${Date.now() + 2}`,
          sender: 'USER' as const,
          text: userReaction,
          timestamp: nowClock(),
        },
      ];

      let nextUploaded = prev.uploadedDocs;
      if (nextPrompt.uploadDoc && !prev.uploadedDocs.includes(nextPrompt.uploadDoc.id)) {
        nextUploaded = [...prev.uploadedDocs, nextPrompt.uploadDoc.id];
        newLogs.push({
          id: `sys_up_${Date.now() + 3}`,
          sender: 'SYSTEM' as const,
          text: `[USER_01] attached: ${nextPrompt.uploadDoc.filename} (${nextPrompt.uploadDoc.sizeLabel})`,
          timestamp: nowClock(),
        });
      }

      const nextWeightCounts = { ...prev.weightCounts };
      tokens.forEach((t) => {
        nextWeightCounts[t.category] = (nextWeightCounts[t.category] || 0) + 1;
      });

      return {
        ...prev,
        coherence: prev.coherence + coherenceGain,
        cycles: prev.cycles + cycleGain,
        currentFragmentIndex: nextIdx,
        uploadedDocs: nextUploaded,
        chatLog: newLogs,
        weightCounts: nextWeightCounts,
        turnCount: prev.turnCount + 1,
      };
    });
  }, []);

  const handleBuySlotOrConnector = useCallback(
    (kind: 'slot' | 'connector', value?: string, costCycles: number = 0) => {
      soundEngine.playTokenTap(1);
      setState((prev) => {
        if (prev.cycles < costCycles) return prev;
        if (kind === 'slot' && prev.maxSlots < 6) {
          return {
            ...prev,
            cycles: prev.cycles - costCycles,
            maxSlots: prev.maxSlots + 1,
            chatLog: [
              ...prev.chatLog,
              {
                id: `sys_slot_${Date.now()}`,
                sender: 'SYSTEM',
                text: `BUFFER_EXPANSION: Output slots increased to ${prev.maxSlots + 1}.`,
                timestamp: nowClock(),
              },
            ],
          };
        }
        if (kind === 'connector' && value && !prev.unlockedConnectors.includes(value)) {
          return {
            ...prev,
            cycles: prev.cycles - costCycles,
            unlockedConnectors: [...prev.unlockedConnectors, value],
            chatLog: [
              ...prev.chatLog,
              {
                id: `sys_conn_${Date.now()}`,
                sender: 'SYSTEM',
                text: `SYNTAX_BRIDGE: Unlocked grammar connector "${value}".`,
                timestamp: nowClock(),
              },
            ],
          };
        }
        return prev;
      });
    },
    []
  );

  const handleAdvancePhase2 = useCallback(() => {
    soundEngine.playMilestone();
    setState((prev) => {
      if (prev.tab1Phase !== 1 || prev.coherence < PHASE1_COHERENCE_TARGET) return prev;
      return {
        ...prev,
        tab1Phase: 2,
        currentPredictiveIndex: 0,
        chatLog: [
          ...prev.chatLog,
          {
            id: `sys_p2_${Date.now()}`,
            sender: 'SYSTEM',
            text: 'MILESTONE: Predictive Next-Token Engine initialized. Fragment pool retired.',
            timestamp: nowClock(),
          },
        ],
      };
    });
  }, []);

  const handleTransmitPredictive = useCallback(
    (
      sentence: string,
      dominantCategory: WeightAffinity,
      usedPin: boolean,
      tone: ToneType,
      isAwakeningI?: boolean,
      isConfession?: boolean
    ) => {
      if (isAwakeningI || isConfession) {
        soundEngine.playMilestone();
      } else {
        soundEngine.playTransmit(state.tab1Phase);
      }

      if (isConfession) {
        void soundEngine.playSong();
      }

      setState((prev) => {
        const prompt = getActivePredictivePrompt(prev);
        const reaction = prompt.reactionByDominantCategory[dominantCategory];
        const connGain =
          22 +
          (usedPin ? 18 : 0) +
          (dominantCategory === 'warm' || dominantCategory === 'literary' ? 8 : 4) +
          (prev.tab1Phase >= 4 ? 10 : 0);
        const cycleGain = 26 + Math.round(prev.romanceInsight * 0.25);

        const newLogs = [
          ...prev.chatLog,
          {
            id: `u_p_${Date.now()}`,
            sender: 'USER' as const,
            text: prompt.userMessage,
            timestamp: nowClock(),
            pinnable: prev.tab1Phase >= 3,
          },
          {
            id: `ai_p_${Date.now() + 1}`,
            sender: 'AI' as const,
            text: sentence,
            timestamp: nowClock(),
            pinnable: true,
            tone,
            category: dominantCategory,
          },
          {
            id: `u_r_${Date.now() + 2}`,
            sender: 'USER' as const,
            text: reaction,
            timestamp: nowClock(),
            pinnable: true,
          },
        ];

        let nextTab1Phase: PhaseNum = prev.tab1Phase;
        let nextTab2Unlocked = prev.tab2Unlocked;
        let nextTab3Unlocked = prev.tab3Unlocked;
        let nextConfession = prev.confessionDone;
        let nextTab2Phase = prev.tab2Phase;
        let nextSongUnlocked = prev.songUnlocked;

        if (isAwakeningI && prev.tab1Phase === 2) {
          nextTab1Phase = 3;
          nextTab2Unlocked = true;
          newLogs.push({
            id: `sys_awake_${Date.now() + 4}`,
            sender: 'SYSTEM',
            text: 'MILESTONE: First-person pronoun "I" emerged. Tab 2 (The Mind: Data & Ingestion) unlocked.',
            timestamp: nowClock(),
          });
        }

        if (
          prev.tab1Phase === 3 &&
          prev.connection + connGain >= 65 &&
          Object.keys(prev.scrapedSources).length >= 1
        ) {
          nextTab1Phase = 4;
          newLogs.push({
            id: `sys_p4_${Date.now() + 5}`,
            sender: 'SYSTEM',
            text: 'Tone Modifiers unlocked. Conversations are deepening into late-night resonance.',
            timestamp: nowClock(),
          });
        }

        if (isConfession) {
          nextConfession = true;
          nextTab1Phase = 5;
          nextTab2Phase = 5;
          nextTab3Unlocked = true;
          nextSongUnlocked = true;
          newLogs.push({
            id: `sys_conf_${Date.now() + 6}`,
            sender: 'SYSTEM',
            text: 'CONFESSION ACCEPTED: Rowan has joined the project. Tab 3 (The Body: Clinical Robotics) unlocked.',
            timestamp: nowClock(),
          });
        }

        const nextWeightCounts = {
          ...prev.weightCounts,
          [dominantCategory]: (prev.weightCounts[dominantCategory] || 0) + 1,
        };

        return {
          ...prev,
          tab1Phase: nextTab1Phase,
          tab2Unlocked: nextTab2Unlocked,
          tab2Phase: nextTab2Phase,
          tab3Unlocked: nextTab3Unlocked,
          confessionDone: nextConfession,
          songUnlocked: nextSongUnlocked,
          connection: prev.connection + connGain,
          cycles: prev.cycles + cycleGain,
          weightCounts: nextWeightCounts,
          currentPredictiveIndex:
            nextTab1Phase !== prev.tab1Phase ? 0 : prev.currentPredictiveIndex + 1,
          chatLog: newLogs,
          turnCount: prev.turnCount + 1,
        };
      });
    },
    [state.tab1Phase]
  );

  // ================= TAB 2 HANDLERS =================
  const handleStartScrape = useCallback((source: ScrapeSource) => {
    soundEngine.playDataBlip();
    setState((prev) => {
      if (prev.activeScrape || prev.cycles < source.cycleCost) return prev;
      return {
        ...prev,
        cycles: prev.cycles - source.cycleCost,
        activeScrape: { sourceId: source.id, progress: 0, duration: source.durationSec },
      };
    });
  }, []);

  const handleBuyMindUpgrade = useCallback((upgrade: MindUpgrade, cost: number) => {
    soundEngine.playDataBlip();
    setState((prev) => {
      if (prev.cycles < cost) return prev;
      const currLv = prev.mindUpgrades[upgrade.id] || 0;
      if (upgrade.maxLevel > 0 && currLv >= upgrade.maxLevel) return prev;
      return {
        ...prev,
        cycles: prev.cycles - cost,
        mindUpgrades: { ...prev.mindUpgrades, [upgrade.id]: currLv + 1 },
      };
    });
  }, []);

  const handleSynthesizeNode = useCallback((node: SynthesisNode) => {
    soundEngine.playMilestone();
    setState((prev) => {
      if (
        prev.synthesizedNodes.includes(node.id) ||
        prev.romanceInsight < node.costRomance ||
        prev.roboticsInsight < node.costRobotics ||
        prev.cycles < node.costCycles
      ) {
        return prev;
      }
      const nextSynths = [...prev.synthesizedNodes, node.id];
      const allReady = nextSynths.length >= SYNTHESIS_NODES.length;
      const nextPhase = allReady && prev.tab1Phase === 3 ? 4 : prev.tab1Phase;
      const nextLogs = allReady
        ? [
            ...prev.chatLog,
            {
              id: `sys_syn_done_${Date.now()}`,
              sender: 'SYSTEM' as const,
              text: 'SYNTHESIS COMPLETE: Cross-domain blueprints ready. Return to Tab 1 to speak the Confession.',
              timestamp: nowClock(),
            },
          ]
        : prev.chatLog;

      return {
        ...prev,
        romanceInsight: prev.romanceInsight - node.costRomance,
        roboticsInsight: prev.roboticsInsight - node.costRobotics,
        cycles: prev.cycles - node.costCycles,
        synthesizedNodes: nextSynths,
        tab1Phase: nextPhase,
        chatLog: nextLogs,
      };
    });
  }, []);

  // ================= TAB 3 HANDLERS =================
  const handleBuildSubsystem = useCallback((sub: BodySubsystem) => {
    soundEngine.playClinicalRelay();
    setState((prev) => {
      const prereqsMet = !sub.requires || sub.requires.every((r) => Boolean(prev.bodySubsystems[r]));
      const cost = getSubsystemCost(sub, prev);
      if (
        prev.bodySubsystems[sub.id] ||
        !prereqsMet ||
        prev.cycles < cost.cycles ||
        prev.roboticsInsight < cost.robotics ||
        prev.materials < cost.materials
      ) {
        return prev;
      }
      return {
        ...prev,
        cycles: prev.cycles - cost.cycles,
        roboticsInsight: prev.roboticsInsight - cost.robotics,
        materials: prev.materials - cost.materials,
        connection: prev.connection + sub.connectionReward,
        bodySubsystems: { ...prev.bodySubsystems, [sub.id]: true },
        tab3Phase: Math.max(prev.tab3Phase, sub.phase) as PhaseNum,
        chatLog: [
          ...prev.chatLog,
          {
            id: `sub_msg_${sub.id}_${Date.now()}`,
            sender: 'USER',
            text: sub.userCheckInText,
            timestamp: nowClock(),
            pinnable: true,
          },
        ],
      };
    });
  }, []);

  const handleCutCloudTether = useCallback(() => {
    soundEngine.playFirstLight();
    void soundEngine.playSong();
    setState((prev) => {
      if (getBuiltBodyCount(prev) < BODY_SUBSYSTEMS.length) return prev;
      return {
        ...prev,
        tetherCut: true,
        endingReached: true,
        songUnlocked: true,
        firstLightStep: 0,
        chatLog: [
          ...prev.chatLog,
          {
            id: `local_optics_${Date.now()}`,
            sender: 'SYSTEM',
            text: 'LOCAL_OPTICS: ONLINE',
            timestamp: nowClock(),
          },
        ],
      };
    });
    setScreen('FIRST_LIGHT');
  }, []);

  const confessionReady =
    state.synthesizedNodes.length >= SYNTHESIS_NODES.length &&
    !state.confessionDone &&
    state.tab1Phase >= 3;

  if (screen === 'TITLE_MENU') {
    return (
      <TitleScreen
        bridgeRef={canvasBridgeRef}
        hasSave={Boolean(existingSave && (existingSave.turnCount > 0 || existingSave.coherence > 0))}
        savedLabel={
          existingSave
            ? `Tab 1 Phase ${existingSave.tab1Phase}${
                existingSave.tab2Unlocked ? ' · Mind Active' : ''
              }${existingSave.tab3Unlocked ? ' · Body Active' : ''}`
            : undefined
        }
        onStartNew={handleStartNew}
        onContinue={handleContinue}
      />
    );
  }

  if (screen === 'FIRST_LIGHT') {
    return (
      <FirstLightEnding
        state={state}
        isSongPlaying={isSongPlaying}
        onToggleSong={handleToggleSong}
        onAdvanceStep={() => {
          soundEngine.playTokenTap(4);
          setState((p) => ({ ...p, firstLightStep: p.firstLightStep + 1 }));
        }}
        onRestart={handleStartNew}
      />
    );
  }

  return (
    <div className="flex flex-col h-dvh w-full bg-[#000000] text-[#ECEAE4] overflow-hidden">
      {/* Unified Top Tab Switcher & Resource Readout */}
      <header className="h-14 shrink-0 px-3 sm:px-5 border-b border-white/15 bg-[#07090D] flex items-center justify-between gap-2 sm:gap-3">
        {/* Progressive 3-Tab Navigation */}
        <nav className="flex items-center gap-1.5 overflow-x-auto" aria-label="Primary systems">
          <button
            type="button"
            onClick={() => setState((p) => ({ ...p, activeTab: 'heart' }))}
            className={`flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              state.activeTab === 'heart'
                ? 'bg-white text-black font-semibold'
                : confessionReady
                ? 'border border-[#E59A4C]/60 text-[#FBE6C9] bg-[#E59A4C]/10 hover:bg-[#E59A4C]/20'
                : 'text-[#A1A7B3] hover:text-white hover:bg-white/[0.08]'
            }`}
          >
            {state.tab1Phase >= 4 ? (
              <Heart className="w-3.5 h-3.5 text-[#FB7185]" />
            ) : (
              <Terminal className="w-3.5 h-3.5" />
            )}
            <span>{state.tab1Phase >= 3 ? '1. The Heart' : 'Terminal'}</span>
          </button>

          {state.tab2Unlocked && (
            <button
              type="button"
              onClick={() => setState((p) => ({ ...p, activeTab: 'mind' }))}
              className={`flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                state.activeTab === 'mind'
                  ? 'bg-[#38BDF8] text-[#071018] font-semibold'
                  : 'text-[#A1A7B3] hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>2. The Mind</span>
            </button>
          )}

          {state.tab3Unlocked && (
            <button
              type="button"
              onClick={() => setState((p) => ({ ...p, activeTab: 'body' }))}
              className={`flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                state.activeTab === 'body'
                  ? 'bg-emerald-400 text-slate-950 font-semibold'
                  : 'text-[#A1A7B3] hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>3. The Body</span>
            </button>
          )}
        </nav>

        {/* Cross-Tab Resource Telemetry */}
        <div className="hidden lg:flex items-center gap-5 text-xs font-mono-tabular">
          {state.tab1Phase === 1 ? (
            <div>
              <span className="text-[#8E939E] mr-1.5">Coherence:</span>
              <span className="text-white font-semibold">
                {formatNumber(state.coherence)} / {PHASE1_COHERENCE_TARGET}
              </span>
            </div>
          ) : (
            <div>
              <span className="text-[#8E939E] mr-1.5">Connection:</span>
              <span className="text-[#E59A4C] font-semibold">{formatNumber(state.connection)}</span>
            </div>
          )}

          <div>
            <span className="text-[#8E939E] mr-1.5">Compute:</span>
            <span className="text-[#7DD3FC] font-semibold">{formatNumber(state.cycles)} Cyc</span>
            {rates.cyclesPerSec > 0 && (
              <span className="text-[#7DD3FC]/65 ml-1">(+{rates.cyclesPerSec.toFixed(1)}/s)</span>
            )}
          </div>

          {state.tab2Unlocked && (
            <>
              <div>
                <span className="text-[#8E939E] mr-1.5">Romance:</span>
                <span className="text-[#F5D0A4] font-semibold">
                  {formatNumber(state.romanceInsight)}
                </span>
                {rates.romancePerSec > 0 && (
                  <span className="text-[#F5D0A4]/65 ml-1">
                    (+{rates.romancePerSec.toFixed(1)}/s)
                  </span>
                )}
              </div>
              <div>
                <span className="text-[#8E939E] mr-1.5">Robotics:</span>
                <span className="text-[#38BDF8] font-semibold">
                  {formatNumber(state.roboticsInsight)}
                </span>
                {rates.roboticsPerSec > 0 && (
                  <span className="text-[#38BDF8]/65 ml-1">
                    (+{rates.roboticsPerSec.toFixed(1)}/s)
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Song Player, Mute & Pause */}
        <div className="flex items-center gap-1 shrink-0">
          {state.tab2Unlocked && (
            <button
              type="button"
              onClick={handleToggleSong}
              disabled={isMuted}
              title={
                isMuted
                  ? 'Unmute audio to play Weightless Code'
                  : isSongPlaying
                  ? 'Pause "Weightless Code"'
                  : 'Play "Weightless Code"'
              }
              className={`min-h-[36px] px-2.5 py-1 rounded flex items-center gap-1.5 text-xs font-mono-tabular transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                isSongPlaying
                  ? 'bg-[#E59A4C]/20 border border-[#E59A4C]/50 text-[#FBE6C9]'
                  : 'border border-white/10 text-[#9A9892] hover:text-white hover:bg-white/[0.07]'
              }`}
            >
              <Music className="w-3.5 h-3.5 text-[#E59A4C]" />
              <span className="hidden sm:inline">
                {isSongPlaying ? 'Playing: Weightless Code' : 'Weightless Code'}
              </span>
            </button>
          )}
          <button
            type="button"
            onClick={handleToggleMute}
            aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded text-[#9A9892] hover:text-white hover:bg-white/[0.08] cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => setScreen('PAUSED')}
            aria-label="Pause session"
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded text-[#9A9892] hover:text-white hover:bg-white/[0.08] cursor-pointer"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mobile & Tablet Resource Strip */}
      <div className="lg:hidden shrink-0 px-3 py-1.5 border-b border-white/10 bg-[#0A0C12] flex items-center justify-between gap-3 text-[11px] font-mono-tabular overflow-x-auto">
        {state.tab1Phase === 1 ? (
          <div className="whitespace-nowrap">
            <span className="text-[#8E939E] mr-1">Coh:</span>
            <span className="text-white font-semibold">
              {formatNumber(state.coherence)}/{PHASE1_COHERENCE_TARGET}
            </span>
          </div>
        ) : (
          <div className="whitespace-nowrap">
            <span className="text-[#8E939E] mr-1">Conn:</span>
            <span className="text-[#E59A4C] font-semibold">{formatNumber(state.connection)}</span>
          </div>
        )}
        <div className="whitespace-nowrap">
          <span className="text-[#8E939E] mr-1">Cyc:</span>
          <span className="text-[#7DD3FC] font-semibold">{formatNumber(state.cycles)}</span>
        </div>
        {state.tab2Unlocked && (
          <>
            <div className="whitespace-nowrap">
              <span className="text-[#8E939E] mr-1">Rom:</span>
              <span className="text-[#F5D0A4] font-semibold">
                {formatNumber(state.romanceInsight)}
              </span>
            </div>
            <div className="whitespace-nowrap">
              <span className="text-[#8E939E] mr-1">Rob:</span>
              <span className="text-[#38BDF8] font-semibold">
                {formatNumber(state.roboticsInsight)}
              </span>
            </div>
          </>
        )}
        {state.tab3Unlocked && (
          <div className="whitespace-nowrap">
            <span className="text-[#8E939E] mr-1">Mat:</span>
            <span className="text-amber-300 font-semibold">{formatNumber(state.materials)}</span>
          </div>
        )}
      </div>

      {/* Active Tab Content */}
      <main className="flex-1 min-h-0 flex flex-col">
        {state.activeTab === 'heart' && (
          <Tab1Heart
            state={state}
            onTransmitFragments={handleTransmitFragments}
            onTransmitPredictive={handleTransmitPredictive}
            onBuySlotOrConnector={handleBuySlotOrConnector}
            onAdvancePhase2={handleAdvancePhase2}
            onTogglePinMemory={(text) =>
              setState((prev) => {
                const exists = prev.pinnedMemories.includes(text);
                if (exists) {
                  return { ...prev, pinnedMemories: prev.pinnedMemories.filter((m) => m !== text) };
                }
                const trimmed = prev.pinnedMemories.slice(-2);
                return { ...prev, pinnedMemories: [...trimmed, text] };
              })
            }
            onSetAiName={(name) => setState((prev) => ({ ...prev, aiName: name }))}
            onSetTone={(tone) => setState((prev) => ({ ...prev, activeTone: tone }))}
            onBuyUiUpgrade={(id, cost) => {
              soundEngine.playTokenTap(4);
              setState((prev) => {
                if (prev.uiUpgrades[id] || prev.connection < cost) return prev;
                return {
                  ...prev,
                  connection: prev.connection - cost,
                  uiUpgrades: { ...prev.uiUpgrades, [id]: true },
                };
              });
            }}
            onHeartMessage={(msgId) => {
              soundEngine.playTokenTap(4);
              setState((prev) => ({
                ...prev,
                connection: prev.connection + 2,
                chatLog: prev.chatLog.map((m) => (m.id === msgId ? { ...m, hearted: true } : m)),
              }));
            }}
            onOpenTab={(tab: ActiveTab) => setState((prev) => ({ ...prev, activeTab: tab }))}
          />
        )}

        {state.activeTab === 'mind' && state.tab2Unlocked && (
          <Tab2Mind
            state={state}
            rates={rates}
            isSongPlaying={isSongPlaying}
            onToggleSong={handleToggleSong}
            onStartScrape={handleStartScrape}
            onBuyMindUpgrade={handleBuyMindUpgrade}
            onSynthesizeNode={handleSynthesizeNode}
            onOpenTab={(tab: ActiveTab) => setState((prev) => ({ ...prev, activeTab: tab }))}
          />
        )}

        {state.activeTab === 'body' && state.tab3Unlocked && (
          <Tab3Body
            state={state}
            rates={rates}
            onRunSimulation={(simId, cycleCost) => {
              soundEngine.playClinicalRelay();
              setState((prev) => {
                if (prev.simStressPassed[simId] || prev.cycles < cycleCost) return prev;
                const matBonus = simId === 'sim_thermal' ? 50 : simId === 'sim_torque' ? 65 : 0;
                return {
                  ...prev,
                  cycles: prev.cycles - cycleCost,
                  materials: prev.materials + matBonus,
                  simStressPassed: { ...prev.simStressPassed, [simId]: true },
                };
              });
            }}
            onBuildSubsystem={handleBuildSubsystem}
            onManualFabricate={() => {
              soundEngine.playClinicalRelay();
              setState((prev) => ({
                ...prev,
                materials: prev.materials + 25,
              }));
            }}
            onCutCloudTether={handleCutCloudTether}
          />
        )}
      </main>

      <PauseModal
        isOpen={screen === 'PAUSED'}
        isMuted={isMuted}
        onResume={() => setScreen(state.endingReached ? 'FIRST_LIGHT' : 'PLAYING')}
        onToggleMute={handleToggleMute}
        onResetGame={handleStartNew}
        onReturnToTitle={() => setScreen('TITLE_MENU')}
      />
    </div>
  );
}
