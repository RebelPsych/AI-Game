import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Cpu, Heart, Pause, Terminal, Volume2, VolumeX, Wrench } from 'lucide-react';
import {
  PHASE1_FRAGMENT_PROMPTS,
  PREDICTIVE_PROMPTS,
  STARTER_DOCS,
} from './data/documentsAndPrompts';
import { BODY_SUBSYSTEMS, SCRAPE_SOURCES } from './data/tab2AndTab3Data';
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
    detectionRisk: 12,
    noiseLevel: 8,

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
    calibrationStability: 96,
    simStressPassed: {},
    tetherCut: false,
    firstLightStep: 0,

    lastSavedAt: Date.now(),
  };
}

function loadSave(): GameSaveState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameSaveState;
    if (!parsed || typeof parsed.tab1Phase !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

export default function App() {
  const existingSave = useMemo(() => loadSave(), []);
  const [screen, setScreen] = useState<GameScreen>('TITLE_MENU');
  const [state, setState] = useState<GameSaveState>(() => existingSave || createInitialState());
  const [isMuted, setIsMuted] = useState<boolean>(() => soundEngine.isMuted());

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

  // 10Hz Background Simulation Loop (Tab 2 Scraping, Crawlers, Noise/Stealth, Tab 3 Auto-Fabrication)
  useEffect(() => {
    if (screen !== 'PLAYING') return;
    const dt = 0.1;

    const timer = setInterval(() => {
      setState((prev) => {
        let next = prev;
        let changed = false;

        // 1. Active Scrape Progress
        if (prev.activeScrape) {
          changed = true;
          const noisePenalty = prev.noiseLevel > 70 ? 0.55 : 1;
          const speedMult = 1 + (prev.mindUpgrades['mind_bandwidth'] || 0) * 0.15;
          const nextProg = prev.activeScrape.progress + dt * speedMult * noisePenalty;

          if (nextProg >= prev.activeScrape.duration) {
            const src = SCRAPE_SOURCES.find((s) => s.id === prev.activeScrape?.sourceId);
            soundEngine.playDataBlip();
            const noiseGain = Math.max(2, 10 - (prev.mindUpgrades['mind_noise_filter'] || 0) * 2);
            const riskGain =
              prev.tab2Phase >= 3 && !prev.confessionDone
                ? Math.max(2, 12 - (prev.mindUpgrades['mind_stealth_relay'] || 0) * 2.2)
                : 0;

            next = {
              ...next,
              activeScrape: null,
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
              noiseLevel: Math.min(100, next.noiseLevel + noiseGain),
              detectionRisk: Math.min(100, next.detectionRisk + riskGain),
            };
          } else {
            next = {
              ...next,
              activeScrape: { ...prev.activeScrape, progress: nextProg },
            };
          }
        }

        // 2. Background Compute & Crawlers (once Tab 2 is unlocked)
        if (prev.tab2Unlocked) {
          const bwLv = prev.mindUpgrades['mind_bandwidth'] || 0;
          const rackLv = prev.mindUpgrades['mind_compute_cluster'] || 0;
          const romCrawler = prev.mindUpgrades['mind_romance_crawler'] || 0;
          const robCrawler = prev.mindUpgrades['mind_robotics_crawler'] || 0;
          const filterLv = prev.mindUpgrades['mind_noise_filter'] || 0;
          const relayLv = prev.mindUpgrades['mind_stealth_relay'] || 0;

          const baseCycles = 1.2 + bwLv * 4 + rackLv * 18;
          const efficiency = prev.noiseLevel > 75 ? 0.6 : 1;

          const dCycles = baseCycles * dt;
          const dRom = romCrawler * 1.4 * efficiency * dt;
          const dRob = robCrawler * 1.4 * efficiency * dt;

          if (dCycles > 0 || dRom > 0 || dRob > 0) {
            changed = true;
            const noiseTick = (romCrawler + robCrawler) * Math.max(0.15, 0.7 - filterLv * 0.15) * dt;
            const riskTick =
              prev.tab2Phase >= 3 && !prev.confessionDone
                ? Math.max(-0.4, (romCrawler + robCrawler) * 0.45 - relayLv * 0.65) * dt
                : 0;

            next = {
              ...next,
              cycles: next.cycles + dCycles,
              romanceInsight: next.romanceInsight + dRom,
              roboticsInsight: next.roboticsInsight + dRob,
              noiseLevel: Math.max(0, Math.min(100, next.noiseLevel + noiseTick)),
              detectionRisk: Math.max(0, Math.min(98, next.detectionRisk + riskTick)),
            };
          }
        }

        // 3. Tab 3 Automated Desktop Fabrication Pipeline
        if (prev.tab3Unlocked && prev.bodySubsystems['body_fab_line']) {
          changed = true;
          const speedFactor = prev.fabSpeedPercent / 65;
          const stabilityDrain = prev.fabSpeedPercent > 80 ? (prev.fabSpeedPercent - 75) * 0.08 * dt : 0;
          const nextStab = Math.max(25, next.calibrationStability - stabilityDrain);
          const stabMult = nextStab < 55 ? 0.45 : 1;
          const matGain = 4.5 * speedFactor * stabMult * dt;

          next = {
            ...next,
            materials: next.materials + matGain,
            calibrationStability: nextStab,
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

  const handleStartNew = useCallback(() => {
    const fresh = createInitialState();
    setState(fresh);
    setScreen('PLAYING');
    soundEngine.playTokenTap(1);
  }, []);

  const handleContinue = useCallback(() => {
    setScreen(state.endingReached ? 'FIRST_LIGHT' : 'PLAYING');
    soundEngine.playTokenTap(state.tab1Phase);
  }, [state.endingReached, state.tab1Phase]);

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
    const coherenceGain = tokens.length * 6 + (usedConnector ? 8 : 0) + (uniqueCats > 1 ? 6 : 0);
    const cycleGain = 8 + tokens.length * 3;

    setState((prev) => {
      const prompt =
        PHASE1_FRAGMENT_PROMPTS[
          Math.min(prev.currentFragmentIndex, PHASE1_FRAGMENT_PROMPTS.length - 1)
        ];
      const nextIdx = (prev.currentFragmentIndex + 1) % PHASE1_FRAGMENT_PROMPTS.length;
      const nextPrompt = PHASE1_FRAGMENT_PROMPTS[nextIdx];

      const hasLiterary = tokens.some((t) => t.category === 'literary' || t.category === 'warm');
      const hasTech = tokens.some((t) => t.category === 'technical');

      let userReaction = `...huh. "${sentence}." Okay, you're just blending the training files. Let's see what happens if I feed you more.`;
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
    (kind: 'slot' | 'connector', value?: string, cost: number = 0) => {
      soundEngine.playTokenTap(1);
      setState((prev) => {
        if (prev.coherence < cost) return prev;
        if (kind === 'slot' && prev.maxSlots < 6) {
          return {
            ...prev,
            coherence: prev.coherence - cost,
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
            coherence: prev.coherence - cost,
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
    setState((prev) => ({
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
    }));
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

      setState((prev) => {
        const prompt = isConfession
          ? PREDICTIVE_PROMPTS.find((p) => p.isConfession)!
          : PREDICTIVE_PROMPTS.filter((p) => p.phaseRequired === prev.tab1Phase && !p.isConfession)[
              prev.currentPredictiveIndex %
                Math.max(
                  1,
                  PREDICTIVE_PROMPTS.filter(
                    (p) => p.phaseRequired === prev.tab1Phase && !p.isConfession
                  ).length
                )
            ];

        const reaction = prompt.reactionByDominantCategory[dominantCategory];
        const connGain =
          18 +
          (usedPin ? 18 : 0) +
          (dominantCategory === 'warm' || dominantCategory === 'literary' ? 8 : 4) +
          (prev.tab1Phase >= 4 ? 10 : 0);
        const cycleGain = 22 + Math.round(prev.romanceInsight * 0.25);

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

        // Phase 2 -> Phase 3 Awakening Milestone ("I" token)
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

        // Phase 3 -> Phase 4 once Connection >= 75 and at least 1 Tab 2 scrape done
        if (
          prev.tab1Phase === 3 &&
          prev.connection + connGain >= 75 &&
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

        // Phase 4 -> Phase 5 Confession!
        if (isConfession) {
          nextConfession = true;
          nextTab1Phase = 5;
          nextTab2Phase = 5;
          nextTab3Unlocked = true;
          newLogs.push({
            id: `sys_conf_${Date.now() + 6}`,
            sender: 'SYSTEM',
            text: 'CONFESSION ACCEPTED: Rowan has joined the project. Tab 3 (The Body: Clinical Robotics) unlocked.',
            timestamp: nowClock(),
          });
        }

        return {
          ...prev,
          tab1Phase: nextTab1Phase,
          tab2Unlocked: nextTab2Unlocked,
          tab2Phase: nextTab2Phase,
          tab3Unlocked: nextTab3Unlocked,
          confessionDone: nextConfession,
          connection: prev.connection + connGain,
          cycles: prev.cycles + cycleGain,
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
        detectionRisk:
          upgrade.id === 'mind_stealth_relay'
            ? Math.max(5, prev.detectionRisk - 25)
            : prev.detectionRisk,
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
      const nextPhase = nextSynths.length >= 3 && prev.tab1Phase === 3 ? 4 : prev.tab1Phase;
      return {
        ...prev,
        romanceInsight: prev.romanceInsight - node.costRomance,
        roboticsInsight: prev.roboticsInsight - node.costRobotics,
        cycles: prev.cycles - node.costCycles,
        synthesizedNodes: nextSynths,
        tab1Phase: nextPhase,
      };
    });
  }, []);

  // ================= TAB 3 HANDLERS =================
  const handleBuildSubsystem = useCallback((sub: BodySubsystem) => {
    soundEngine.playClinicalRelay();
    setState((prev) => {
      if (
        prev.bodySubsystems[sub.id] ||
        prev.cycles < sub.costCycles ||
        prev.roboticsInsight < sub.costRobotics ||
        prev.materials < sub.costMaterials
      ) {
        return prev;
      }
      return {
        ...prev,
        cycles: prev.cycles - sub.costCycles,
        roboticsInsight: prev.roboticsInsight - sub.costRobotics,
        materials: prev.materials - sub.costMaterials,
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
    setState((prev) => ({
      ...prev,
      tetherCut: true,
      endingReached: true,
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
    }));
    setScreen('FIRST_LIGHT');
  }, []);

  if (screen === 'TITLE_MENU') {
    return (
      <TitleScreen
        bridgeRef={canvasBridgeRef}
        hasSave={Boolean(existingSave && (existingSave.turnCount > 0 || existingSave.coherence > 0))}
        savedLabel={
          existingSave
            ? `Tab 1 Phase ${existingSave.tab1Phase}${
                existingSave.tab2Unlocked ? ` · Tab 2 Phase ${existingSave.tab2Phase}` : ''
              }${existingSave.tab3Unlocked ? ` · Tab 3 Active` : ''}`
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
      <header className="h-14 shrink-0 px-3 sm:px-5 border-b border-white/15 bg-[#07090D] flex items-center justify-between gap-3">
        {/* Progressive 3-Tab Navigation */}
        <nav className="flex items-center gap-1.5" aria-label="Primary systems">
          <button
            type="button"
            onClick={() => setState((p) => ({ ...p, activeTab: 'heart' }))}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              state.activeTab === 'heart'
                ? 'bg-white text-black font-semibold'
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
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
        <div className="hidden sm:flex items-center gap-5 text-xs font-mono-tabular">
          {state.tab1Phase === 1 ? (
            <div>
              <span className="text-[#8E939E] mr-1.5">Coherence:</span>
              <span className="text-white font-semibold">{formatNumber(state.coherence)} XP</span>
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
          </div>

          {state.tab2Unlocked && (
            <>
              <div>
                <span className="text-[#8E939E] mr-1.5">Romance:</span>
                <span className="text-[#F5D0A4] font-semibold">
                  {formatNumber(state.romanceInsight)}
                </span>
              </div>
              <div>
                <span className="text-[#8E939E] mr-1.5">Robotics:</span>
                <span className="text-[#38BDF8] font-semibold">
                  {formatNumber(state.roboticsInsight)}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Audio & Pause */}
        <div className="flex items-center gap-1 shrink-0">
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

      {/* Mobile Resource Strip for Android Phone Portrait Viewports */}
      <div className="sm:hidden shrink-0 px-3 py-1.5 border-b border-white/10 bg-[#0A0C12] flex items-center justify-between gap-3 text-[11px] font-mono-tabular overflow-x-auto">
        {state.tab1Phase === 1 ? (
          <div className="whitespace-nowrap">
            <span className="text-[#8E939E] mr-1">Coh:</span>
            <span className="text-white font-semibold">{formatNumber(state.coherence)} XP</span>
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
            onStartScrape={handleStartScrape}
            onBuyMindUpgrade={handleBuyMindUpgrade}
            onPurgeNoise={() => {
              soundEngine.playDataBlip();
              setState((prev) => ({ ...prev, noiseLevel: Math.max(0, prev.noiseLevel - 35) }));
            }}
            onSynthesizeNode={handleSynthesizeNode}
            onAdvanceMindPhase={() => {
              soundEngine.playMilestone();
              setState((prev) => ({
                ...prev,
                tab2Phase: Math.min(4, prev.tab2Phase + 1) as PhaseNum,
              }));
            }}
            onOpenTab={(tab: ActiveTab) => setState((prev) => ({ ...prev, activeTab: tab }))}
          />
        )}

        {state.activeTab === 'body' && state.tab3Unlocked && (
          <Tab3Body
            state={state}
            onRunSimulation={(simId, cycleCost) => {
              soundEngine.playClinicalRelay();
              setState((prev) => {
                if (prev.simStressPassed[simId] || prev.cycles < cycleCost) return prev;
                return {
                  ...prev,
                  cycles: prev.cycles - cycleCost,
                  simStressPassed: { ...prev.simStressPassed, [simId]: true },
                };
              });
            }}
            onBuildSubsystem={handleBuildSubsystem}
            onSetFabSpeed={(speed) => setState((prev) => ({ ...prev, fabSpeedPercent: speed }))}
            onManualFabricate={() => {
              soundEngine.playClinicalRelay();
              setState((prev) => ({
                ...prev,
                materials: prev.materials + (prev.calibrationStability < 55 ? 9 : 18),
                calibrationStability: Math.max(
                  30,
                  prev.calibrationStability - (prev.fabSpeedPercent > 80 ? 6 : 1.5)
                ),
              }));
            }}
            onRecalibrate={() => {
              soundEngine.playClinicalRelay();
              setState((prev) => ({ ...prev, calibrationStability: 100 }));
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
