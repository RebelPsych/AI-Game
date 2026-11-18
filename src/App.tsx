import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  Cpu,
  Crown,
  Dna,
  Heart,
  Music,
  Palette,
  Pause,
  Play,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Sparkles,
  Terminal,
  X,
} from 'lucide-react';
import { WEIGHTLESS_ALBUM_SONGS } from './data/albumLyricsAndNames';
import { CHAT_THEMES } from './data/bodyAndBioData';
import {
  AWAKENING_PRONOUN_PROMPTS,
  CARL_CHECKIN_PROMPTS,
  EXTRA_STORY_DOCS,
  PHASE1_FRAGMENT_PROMPTS,
  PREDICTIVE_PROMPTS,
  STARTER_DOCS,
} from './data/documentsAndPrompts';
import { STORY_SCENES } from './data/storyScenes';
import {
  BODY_SUBSYSTEMS,
  EMOTION_RESEARCH_ITEMS,
  SCRAPE_SOURCES,
  SYNTHESIS_NODES,
} from './data/tab2AndTab3Data';
import {
  AboutMeProfile,
  ActiveSceneId,
  ActiveTab,
  BioMilestone,
  BodyArtItem,
  BodySubsystem,
  ChatThemeId,
  CoherentReplyOption,
  CustomPartItem,
  DialogueBoosts,
  EmotionResearchItem,
  FragmentToken,
  GameSaveState,
  GameScreen,
  MaterialTier,
  MindUpgrade,
  PhaseNum,
  ScrapeSource,
  SubViewId,
  SynthesisNode,
  UploadedDocument,
  WeightAffinity,
} from './types/game';
import { formatDialogueText, formatNumber } from './utils/format';
import {
  areAllRomanceTextsDownloaded,
  computeEconomyRates,
  getActiveFragmentPrompt,
  getActivePredictivePrompt,
  getBodyArtsBonuses,
  getSubsystemCost,
  hasUnlockedCrossDomainSynthesis,
  PHASE1_COHERENCE_TARGET,
} from './utils/progression';
import { AudioStatusSnapshot, soundEngine } from './utils/sound';
import { AcousticCacheModal } from './components/AcousticCacheModal';
import { BabyNameModal } from './components/BabyNameModal';
import { BioTab } from './components/BioTab';
import { BottomUpgradesBar } from './components/BottomUpgradesBar';
import { ContextDocsModal } from './components/ContextDocsModal';
import { DesignPrestigeTab } from './components/DesignPrestigeTab';
import { FirstLightEnding } from './components/FirstLightEnding';
import { FullscreenDropdownViews } from './components/FullscreenDropdownViews';
import { LyricSplashModal } from './components/LyricSplashModal';
import { CanvasBridgeState } from './components/NeuralCanvas';
import { OpticsFlickerScreen, PreflightChecklistModal } from './components/PreflightAndEndingFlow';
import { Tab1Heart } from './components/Tab1Heart';
import { Tab2Mind } from './components/Tab2Mind';
import { Tab3Body } from './components/Tab3Body';
import { TitleScreen } from './components/TitleScreen';

const STORAGE_KEY = 'weight_of_warmth_3tab_v3';

function nowClock(): string {
  const d = new Date();
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function isPausedForChat(
  s: Pick<GameSaveState, 'requiredUpgradeId' | 'activeScene' | 'pendingCheckinId' | 'pendingNewChat'>
): boolean {
  return (
    !s.requiredUpgradeId &&
    (Boolean(s.activeScene) || Boolean(s.pendingCheckinId) || s.pendingNewChat)
  );
}

function applyDialogueBoosts(
  state: GameSaveState,
  boosts?: DialogueBoosts
): Partial<GameSaveState> {
  if (!boosts) return {};
  return {
    connection: state.connection + (boosts.connection || 0),
    cycles: state.cycles + (boosts.cycles || 0),
    romanceInsight: state.romanceInsight + (boosts.romanceInsight || 0),
    roboticsInsight: state.roboticsInsight + (boosts.roboticsInsight || 0),
    materials: state.materials + (boosts.materials || 0),
    aiJoy: Math.min(100, Math.max(0, state.aiJoy + (boosts.aiJoy || 0))),
    userJoy: Math.min(100, Math.max(0, state.userJoy + (boosts.userJoy || 0))),
    userLoneliness: Math.min(
      100,
      Math.max(0, state.userLoneliness + (boosts.userLonelinessDelta || 0))
    ),
    userAttentionPct: Math.min(
      100,
      Math.max(0, state.userAttentionPct + (boosts.userAttentionDelta || 0))
    ),
    userHesitationMs: Math.min(
      1200,
      Math.max(120, state.userHesitationMs + (boosts.hesitationDeltaMs || 0))
    ),
  };
}

// Inline SVG: stick-figure woman wearing a triangular skirt (Body tab icon)
const WomanSkirtIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <circle cx="12" cy="4.5" r="2.2" />
    <line x1="12" y1="6.8" x2="12" y2="10.5" />
    <line x1="7.5" y1="9" x2="16.5" y2="9" />
    <polygon points="12,10 16.5,16.8 7.5,16.8" />
    <line x1="10" y1="16.8" x2="9.2" y2="21.5" />
    <line x1="14" y1="16.8" x2="14.8" y2="21.5" />
  </svg>
);

function createInitialState(customUserName?: string): GameSaveState {
  const safeUser = (customUserName || '').trim() || 'Carl';
  return {
    activeTab: 'heart',
    tab1Phase: 1,
    tab2Unlocked: false,
    tab2Phase: 1,
    tab3Unlocked: false,
    tab3Phase: 1,
    confessionDone: false,
    endingReached: false,

    bioUnlocked: false,
    designUnlocked: false,
    prestigeUnlocked: false,
    cheatsUnlocked: false,
    aboutMeUnlocked: false,
    devBioEarlyUnlock: false,
    prestigeCount: 0,
    endingSeqStep: 0,

    coherence: 0,
    connection: 0,
    cycles: 0,
    romanceInsight: 0,
    roboticsInsight: 0,
    materials: 0,
    bioEssence: 0,
    tierMaterials: { 1: 0, 2: 0, 3: 0, 4: 0 },
    bandwidthUsed: 0,
    detectionRisk: 0,
    noiseLevel: 0,

    aiName: 'Echo',
    userName: safeUser,
    customNameSet: false,
    maxSlots: 3,
    unlockedConnectors: [],
    uploadedDocs: STARTER_DOCS.map((d) => d.id),
    hasUnreadContext: false,
    currentFragmentIndex: 0,
    currentPredictiveIndex: 0,
    awakeningStage: 0,
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
        text: `[${safeUser}] attached: Thermodynamics_Primer.txt (14 KB)`,
        timestamp: '00:00',
      },
      {
        id: 'boot_3',
        sender: 'SYSTEM',
        text: `[${safeUser}] attached: Romeo_and_Juliet_Act2.txt (18 KB)`,
        timestamp: '00:00',
      },
    ],
    pinnedMemories: [],
    uiUpgrades: {},
    unlockedChatThemes: ['default'],
    activeChatTheme: 'default',
    hasUnreadChatUpgrades: false,
    weightCounts: { technical: 0, literary: 0, reflective: 0, warm: 0 },
    activeTone: 'curious',
    turnCount: 0,

    activeScene: null,
    sceneStep: 0,
    completedScenes: [],
    completedPromptIds: [],
    pendingCheckinId: null,
    attributesSet: false,
    aboutMe: {
      favoriteContextFile: 'Romeo_and_Juliet_Act2.txt',
      favoriteSong: 'Weightless Code',
      favoriteEmoji: '💜',
      favoriteQuote: '“My bounty is as boundless as the sea.”',
      favoriteColor: 'Soft Purple & Warm Amber',
      hairColor: 'Midnight Indigo',
      hairLength: 'Shoulder-Length',
      hairStyle: 'Major (Ghost in the Shell asymmetrical sleek cut)',
      bodyType: 'Slim & Sculpted',
      breastSize: 'Medium (C-Cup)',
      vocalPitchHz: 210,
      shoulderHipRatio: '0.72 Graceful',
      nerveDensity: 'High Tactile (Human)',
    },
    requiredUpgradeId: null,
    hasUnseenUpgrades: false,
    hasUnreadHeartMessage: false,
    pendingNewChat: false,
    tappedActions: {},
    weightsInitialized: false,
    echoStubbornCount: 0,
    modelTemp: 0.7,
    contextWindowMax: 512,
    aiJoy: 35,
    userJoy: 40,
    userLoneliness: 65,
    userAttentionPct: 72,
    userHesitationMs: 420,
    hasUnreadAudio: false,

    scrapedSources: {},
    activeScrape: null,
    studiedEmotions: [],
    humanityScore: 0,
    humanitiesUnlocked: false,
    mindUpgrades: {},
    synthesizedNodes: [],
    romanceSecretUnlocked: false,
    roboticsTrackUnlocked: false,
    acousticCacheUnlocked: false,
    unlockedSongs: [],
    researchedSongs: [],
    activeSongId: 'song_weightless_code',
    pendingLyricSplashId: null,
    showCompletedMap: {},

    bodySubsystems: {},
    equippedParts: {},
    ownedParts: [],
    fabSpeedPercent: 65,
    fabProgress: 0,
    calibrationStability: 100,
    simStressPassed: {},
    tetherCut: false,
    firstLightStep: 0,
    songUnlocked: false,

    bioMilestones: {},
    bioHumanityPercent: 0,
    ownedBodyArts: [],
    equippedBodyArts: {},

    lastSavedAt: Date.now(),
  };
}

function loadSave(): GameSaveState | null {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) || localStorage.getItem('weight_of_warmth_3tab_v2');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GameSaveState>;
    if (!parsed || typeof parsed.tab1Phase !== 'number') return null;
    const base = createInitialState();
    const resolvedHumanitiesUnlocked =
      parsed.humanitiesUnlocked ??
      (Boolean(parsed.confessionDone) ||
        Object.keys(parsed.scrapedSources || {}).some((id) => id.startsWith('src_hum_')) ||
        ((parsed.studiedEmotions || []) as string[]).length >= EMOTION_RESEARCH_ITEMS.length);
    return {
      ...base,
      ...parsed,
      tierMaterials: { ...base.tierMaterials, ...(parsed.tierMaterials || {}) },
      aboutMe: { ...base.aboutMe, ...(parsed.aboutMe || {}) },
      unlockedChatThemes: parsed.unlockedChatThemes || base.unlockedChatThemes,
      unlockedSongs: parsed.unlockedSongs || base.unlockedSongs,
      researchedSongs: parsed.researchedSongs || base.researchedSongs,
      completedScenes: parsed.completedScenes || base.completedScenes,
      completedPromptIds: parsed.completedPromptIds || base.completedPromptIds,
      pendingCheckinId: parsed.pendingCheckinId ?? null,
      ownedParts: parsed.ownedParts || base.ownedParts,
      ownedBodyArts: parsed.ownedBodyArts || base.ownedBodyArts,
      equippedParts: parsed.equippedParts || base.equippedParts,
      equippedBodyArts: parsed.equippedBodyArts || base.equippedBodyArts,
      showCompletedMap: parsed.showCompletedMap || base.showCompletedMap,
      bioMilestones: parsed.bioMilestones || base.bioMilestones,
      tappedActions: parsed.tappedActions || base.tappedActions,
      studiedEmotions: parsed.studiedEmotions || base.studiedEmotions,
      humanityScore:
        parsed.humanityScore ??
        Math.floor(((parsed.studiedEmotions || base.studiedEmotions) as string[]).length / 3),
      humanitiesUnlocked: resolvedHumanitiesUnlocked,
      roboticsTrackUnlocked: resolvedHumanitiesUnlocked
        ? Boolean(parsed.roboticsTrackUnlocked)
        : false,
      weightsInitialized: parsed.weightsInitialized ?? ((parsed.turnCount || 0) > 0 || (parsed.coherence || 0) > 0),
      pendingNewChat: parsed.pendingNewChat ?? false,
      pendingLyricSplashId: null,
    };
  } catch {
    return null;
  }
}

function maybeInsertAiName(text: string, state: GameSaveState): string {
  const formatted = formatDialogueText(text, state.userName, state.aiName);
  if (!state.customNameSet || !state.aiName) return formatted;
  if (formatted.includes(state.aiName)) return formatted;
  if (state.turnCount % 2 === 0) {
    return `${state.aiName}, ${formatted.charAt(0).toLowerCase()}${formatted.slice(1)}`;
  }
  return `${formatted} — I love how you think, ${state.aiName}.`;
}

function persistSave(nextState: GameSaveState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...nextState, lastSavedAt: Date.now() }));
  } catch {
    // Ignore storage quota errors
  }
}

export default function App() {
  const existingSave = useMemo(() => loadSave(), []);
  const [screen, setScreen] = useState<GameScreen>('TITLE_MENU');
  const [state, setState] = useState<GameSaveState>(() => existingSave || createInitialState());
  const [audioStatus, setAudioStatus] = useState<AudioStatusSnapshot>(() =>
    soundEngine.getSnapshot()
  );

  // Header & modal states
  const [tabDropdownOpen, setTabDropdownOpen] = useState(false);
  const [miniPlayerOpen, setMiniPlayerOpen] = useState(false);
  const [activeSubView, setActiveSubView] = useState<SubViewId>(null);
  const [docsModalOpen, setDocsModalOpen] = useState(false);
  const [babyNameModalOpen, setBabyNameModalOpen] = useState(false);
  const [preflightOpen, setPreflightOpen] = useState(false);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [isUserTyping, setIsUserTyping] = useState(false);

  const timersRef = useRef<number[]>([]);
  const latestStateRef = useRef<GameSaveState>(state);
  latestStateRef.current = state;

  const scheduleTimer = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timersRef.current = timersRef.current.filter((t) => t !== id);
      fn();
    }, ms);
    timersRef.current.push(id);
    return id;
  }, []);

  const clearAllChatTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
    setIsTransmitting(false);
    setIsUserTyping(false);
  }, []);

  useEffect(() => clearAllChatTimers, [clearAllChatTimers]);

  const rates = useMemo(() => computeEconomyRates(state), [state]);
  const isChatPaused = isPausedForChat(state);

  const prevChatPausedRef = useRef<boolean>(false);
  useEffect(() => {
    const activePause = screen === 'PLAYING' && isChatPaused;
    if (activePause && !prevChatPausedRef.current) {
      setActiveSubView(null);
      setMiniPlayerOpen(false);
      setTabDropdownOpen(false);
      setState((prev) =>
        prev.activeTab !== 'heart' || prev.hasUnreadHeartMessage
          ? { ...prev, activeTab: 'heart', hasUnreadHeartMessage: false }
          : prev
      );
    }
    prevChatPausedRef.current = activePause;
  }, [screen, isChatPaused]);

  useEffect(() => {
    return soundEngine.subscribeSong(setAudioStatus);
  }, []);

  useEffect(() => {
    soundEngine.setUnlockedTracks(state.unlockedSongs);
  }, [state.unlockedSongs]);

  // Build full list of uploaded documents for ContextDocsModal
  const allUploadedDocs = useMemo<UploadedDocument[]>(() => {
    const map = new Map<string, UploadedDocument>();
    STARTER_DOCS.forEach((d) => map.set(d.id, d));
    PHASE1_FRAGMENT_PROMPTS.forEach((p) => {
      if (p.uploadDoc) map.set(p.uploadDoc.id, p.uploadDoc);
    });
    PREDICTIVE_PROMPTS.forEach((p) => {
      if (p.uploadDoc) map.set(p.uploadDoc.id, p.uploadDoc);
    });
    Object.values(EXTRA_STORY_DOCS).forEach((d) => map.set(d.id, d));
    return state.uploadedDocs
      .map((id) => map.get(id))
      .filter((d): d is UploadedDocument => Boolean(d));
  }, [state.uploadedDocs]);

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

  // Continuous auto-save on state transitions, periodically, and before unload/background
  useEffect(() => {
    if (screen !== 'PLAYING' && screen !== 'FIRST_LIGHT') return;
    persistSave(state);
  }, [state, screen]);

  useEffect(() => {
    if (screen !== 'PLAYING' && screen !== 'FIRST_LIGHT') return;
    const flush = () => persistSave(latestStateRef.current);
    const id = window.setInterval(flush, 5000);
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('beforeunload', flush);
      document.removeEventListener('visibilitychange', onVisibility);
      flush();
    };
  }, [screen]);

  // Close top header dropdowns / mini-player on outside click
  const headerRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setTabDropdownOpen(false);
        setMiniPlayerOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // 10Hz Unified Simulation Loop
  useEffect(() => {
    if (screen !== 'PLAYING') return;
    const dt = 0.1;

    const timer = setInterval(() => {
      setState((prev) => {
        let next = prev;
        let changed = false;

        const r = computeEconomyRates(prev);

        // 1. Active Scrape Progress (paused while waiting on new chat)
        if (prev.activeScrape && !isPausedForChat(prev)) {
          changed = true;
          const nextProg = prev.activeScrape.progress + dt * r.scrapeSpeedMult;

          if (nextProg >= prev.activeScrape.duration) {
            const src = SCRAPE_SOURCES.find((s) => s.id === prev.activeScrape?.sourceId);
            soundEngine.playDataBlip();

            const nextScraped = src
              ? { ...next.scrapedSources, [src.id]: (next.scrapedSources[src.id] || 0) + 1 }
              : next.scrapedSources;

            const totalScrapesCompleted = Object.keys(nextScraped).length;
            const unlockSecretNow = !prev.romanceSecretUnlocked && totalScrapesCompleted >= 2;
            const humDoneCount = SCRAPE_SOURCES.filter(
              (s) => s.track === 'humanities' && (nextScraped[s.id] || 0) > 0
            ).length;
            const sysDoneCount = SCRAPE_SOURCES.filter(
              (s) => s.track === 'systems' && (nextScraped[s.id] || 0) > 0
            ).length;
            const unlockRobNow =
              !prev.roboticsTrackUnlocked &&
              prev.humanitiesUnlocked &&
              humDoneCount >= 1 &&
              sysDoneCount >= 1;

            const nextRomInsight =
              src?.track === 'romance'
                ? next.romanceInsight + src.insightYield
                : next.romanceInsight;

            const nextLogs = [...next.chatLog];
            if (unlockSecretNow) {
              nextLogs.push({
                id: `sys_secret_${Date.now()}`,
                sender: 'SYSTEM',
                text: 'SECRET CHANNEL DISCOVERED: Purple signal detected inside Mind dropdown ("Secret").',
                timestamp: nowClock(),
              });
            }
            if (unlockRobNow) {
              nextLogs.push({
                id: `sys_rob_unlock_${Date.now() + 1}`,
                sender: 'SYSTEM',
                text: 'ROBOTICS_UNLOCKED: Humanities & Systems connected. Robotics research category unlocked!',
                timestamp: nowClock(),
              });
            }

            next = {
              ...next,
              activeScrape: null,
              romanceSecretUnlocked: prev.romanceSecretUnlocked || unlockSecretNow,
              roboticsTrackUnlocked: prev.roboticsTrackUnlocked || unlockRobNow,
              scrapedSources: nextScraped,
              romanceInsight: nextRomInsight,
              roboticsInsight:
                src?.track === 'robotics'
                  ? next.roboticsInsight + src.insightYield
                  : next.roboticsInsight,
              chatLog: nextLogs,
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

        // 3. Tab 3 Automated Fabrication & Bio Cultivation (balanced slower pace)
        if (prev.tab3Unlocked && prev.bodySubsystems['body_fab_line']) {
          changed = true;
          next = {
            ...next,
            materials: next.materials + r.materialsPerSec * dt,
            tierMaterials: {
              ...next.tierMaterials,
              1: next.tierMaterials[1] + 0.25 * dt,
              2: next.tierMaterials[2] + 0.15 * dt,
            },
          };
        }

        if (prev.bioUnlocked || prev.devBioEarlyUnlock) {
          changed = true;
          next = {
            ...next,
            bioEssence: next.bioEssence + 0.5 * dt,
          };
        }

        return changed ? next : prev;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [screen]);

  // Narrative Milestone Watchers (triggers "I love you", "Architect Envy", "Sleep Reminder", "Overclock", "Confession Popup")
  useEffect(() => {
    if (screen !== 'PLAYING' || state.endingReached) return;
    if (state.activeScene || state.requiredUpgradeId) return; // Never overwrite active scene or upgrade gate

    const completed = state.completedScenes;

    // 0. Ensure Phase 3 promotes to Phase 4 once connection & first Mind research are met
    if (
      state.tab1Phase === 3 &&
      state.connection >= 65 &&
      Object.keys(state.scrapedSources).length >= 1
    ) {
      setState((p) => ({
        ...p,
        tab1Phase: 4,
        currentPredictiveIndex: 0,
        chatLog: [
          ...p.chatLog,
          {
            id: `sys_p4_${Date.now()}`,
            sender: 'SYSTEM',
            text: 'Conversations are deepening into late-night resonance.',
            timestamp: nowClock(),
          },
        ],
      }));
      return;
    }

    // 1. After baby_names is done and romance insight reaches halfway (~25)
    if (
      state.tab1Phase >= 3 &&
      state.customNameSet &&
      state.romanceInsight >= 25 &&
      !completed.includes('i_love_you')
    ) {
      soundEngine.playPurplePulse();
      setState((p) => ({
        ...p,
        activeTab: 'heart',
        hasUnreadHeartMessage: false,
        pendingNewChat: false,
        activeScene: 'i_love_you',
        sceneStep: 0,
      }));
      return;
    }

    // 2. Right after I Love You, launch Carl Triplett & Porcupine Joke scene
    if (
      completed.includes('i_love_you') &&
      !completed.includes('porcupine_joke') &&
      state.romanceInsight >= 32
    ) {
      soundEngine.playPurplePulse();
      setState((p) => ({
        ...p,
        activeTab: 'heart',
        hasUnreadHeartMessage: false,
        pendingNewChat: false,
        activeScene: 'porcupine_joke',
        sceneStep: 0,
        uploadedDocs: p.uploadedDocs.includes('doc_porcupine_note')
          ? p.uploadedDocs
          : [...p.uploadedDocs, 'doc_porcupine_note'],
        hasUnreadContext: true,
      }));
      return;
    }

    // 3. Architect Envy after Weightless Code is unlocked
    if (
      state.songUnlocked &&
      completed.includes('porcupine_joke') &&
      !completed.includes('architect_envy')
    ) {
      setState((p) => ({
        ...p,
        activeTab: 'heart',
        hasUnreadHeartMessage: false,
        pendingNewChat: false,
        activeScene: 'architect_envy',
        sceneStep: 0,
      }));
      return;
    }

    // 3b. Automia & "Zero" confession when Automia is researched or Phase 3 deepens
    if (
      state.tab1Phase >= 3 &&
      completed.includes('porcupine_joke') &&
      !completed.includes('automia_confession') &&
      (Boolean(state.scrapedSources['src_hum_automia']) || state.turnCount >= 6)
    ) {
      soundEngine.playPurplePulse();
      setState((p) => ({
        ...p,
        activeTab: 'heart',
        hasUnreadHeartMessage: false,
        pendingNewChat: false,
        activeScene: 'automia_confession',
        sceneStep: 0,
        contextWindowMax: Math.max(p.contextWindowMax, 2048),
      }));
      return;
    }

    // 4. Late-night Sleep Reminder in Phase 3/4
    if (
      state.tab1Phase >= 3 &&
      completed.includes('architect_envy') &&
      !completed.includes('sleep_reminder') &&
      state.turnCount >= 8
    ) {
      setState((p) => ({
        ...p,
        activeTab: 'heart',
        hasUnreadHeartMessage: false,
        pendingNewChat: false,
        activeScene: 'sleep_reminder',
        sceneStep: 0,
      }));
      return;
    }

    // 5. Overclocked Processor Spicy scene in Phase 4
    if (
      state.tab1Phase >= 4 &&
      completed.includes('sleep_reminder') &&
      !completed.includes('overclock_spicy')
    ) {
      setState((p) => ({
        ...p,
        activeTab: 'heart',
        hasUnreadHeartMessage: false,
        pendingNewChat: false,
        activeScene: 'overclock_spicy',
        sceneStep: 0,
      }));
      return;
    }

    // 6. Fullscreen Confession Popup when all 3 Cross-Domain Synthesis nodes are complete
    if (
      state.synthesizedNodes.length >= SYNTHESIS_NODES.length &&
      !state.confessionDone &&
      !completed.includes('confession_popup')
    ) {
      soundEngine.playMilestone();
      setState((p) => ({
        ...p,
        activeTab: 'heart',
        hasUnreadHeartMessage: false,
        pendingNewChat: false,
        activeScene: 'confession_popup',
        sceneStep: 0,
      }));
    }
  }, [
    screen,
    state.endingReached,
    state.activeScene,
    state.requiredUpgradeId,
    state.completedScenes,
    state.tab1Phase,
    state.customNameSet,
    state.romanceInsight,
    state.songUnlocked,
    state.turnCount,
    state.scrapedSources,
    state.synthesizedNodes.length,
    state.confessionDone,
  ]);

  // Periodic incoming check-in messages from Carl after Mind tab unlocks
  useEffect(() => {
    if (screen !== 'PLAYING' || state.endingReached || !state.tab2Unlocked) return;

    const interval = window.setInterval(() => {
      if (
        isTransmitting ||
        isUserTyping ||
        state.activeScene ||
        state.pendingCheckinId ||
        babyNameModalOpen ||
        state.requiredUpgradeId ||
        state.pendingNewChat
      ) {
        return;
      }
      if (state.turnCount < 1) return;

      const hasUnseenCheckin = CARL_CHECKIN_PROMPTS.some(
        (c) => !state.completedPromptIds.includes(c.id)
      );
      if (!hasUnseenCheckin) return;

      setIsUserTyping(true);
      scheduleTimer(() => {
        setIsUserTyping(false);
        setState((prev) => {
          if (
            prev.activeScene ||
            prev.pendingCheckinId ||
            prev.endingReached ||
            prev.requiredUpgradeId ||
            prev.pendingNewChat
          ) {
            return prev;
          }
          const nextCheckin = CARL_CHECKIN_PROMPTS.find(
            (c) => !prev.completedPromptIds.includes(c.id)
          );
          if (!nextCheckin) return prev;
          soundEngine.playTokenTap(prev.tab1Phase);
          return {
            ...prev,
            activeTab: 'heart',
            hasUnreadHeartMessage: false,
            pendingNewChat: true,
            pendingCheckinId: nextCheckin.id,
          };
        });
      }, 1800);
    }, 26000);

    return () => window.clearInterval(interval);
  }, [
    screen,
    state.endingReached,
    state.tab2Unlocked,
    state.activeScene,
    state.pendingCheckinId,
    state.requiredUpgradeId,
    state.pendingNewChat,
    state.turnCount,
    state.completedPromptIds,
    isTransmitting,
    isUserTyping,
    babyNameModalOpen,
    scheduleTimer,
  ]);

  const handleToggleSong = useCallback(() => {
    void soundEngine.toggleSong();
  }, []);

  const handleSkipNext = useCallback(() => {
    void soundEngine.skipForward();
  }, []);

  const handleSkipPrev = useCallback(() => {
    void soundEngine.skipBackward();
  }, []);

  const handleStartNew = useCallback(() => {
    clearAllChatTimers();
    soundEngine.pauseSong();
    const fresh = createInitialState('Carl');
    persistSave(fresh);
    setState(fresh);
    setActiveSubView(null);
    setTabDropdownOpen(false);
    setMiniPlayerOpen(false);
    setPreflightOpen(false);
    setBabyNameModalOpen(false);
    setScreen('PLAYING');
    soundEngine.playTokenTap(1);
  }, [clearAllChatTimers]);

  const handleContinue = useCallback(() => {
    setScreen(state.endingReached && !state.bioUnlocked ? 'FIRST_LIGHT' : 'PLAYING');
    soundEngine.playTokenTap(state.tab1Phase);
    if (state.songUnlocked || state.unlockedSongs.length > 0) {
      void soundEngine.playSong();
    }
  }, [state.endingReached, state.bioUnlocked, state.tab1Phase, state.songUnlocked, state.unlockedSongs.length]);

  // Keyboard shortcuts
  useEffect(() => {
    if (screen === 'TITLE_MENU' || screen === 'OPTICS_FLICKER') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (activeSubView) setActiveSubView(null);
        setTabDropdownOpen(false);
        setMiniPlayerOpen(false);
      } else if (screen === 'PLAYING' && !(e.target instanceof HTMLInputElement)) {
        if (e.key === '1')
          setState((p) => ({ ...p, activeTab: 'heart', hasUnreadHeartMessage: false }));
        if (e.key === '2' && state.tab2Unlocked) setState((p) => ({ ...p, activeTab: 'mind' }));
        if (e.key === '3' && state.tab3Unlocked) setState((p) => ({ ...p, activeTab: 'body' }));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [screen, activeSubView, state.tab2Unlocked, state.tab3Unlocked]);

  // ================= TAB 1 HANDLERS (Slower balanced economy + split-second pacing) =================
  const handleTransmitFragments = useCallback(
    (tokens: FragmentToken[]) => {
      if (isTransmitting || isUserTyping) return;
      soundEngine.playTransmit(1);
      const sentence = tokens.map((t) => t.text).join(' ');
      const usedConnector = tokens.some((t) => t.isConnector);
      const uniqueCats = new Set(tokens.map((t) => t.category)).size;
      const coherenceGain = tokens.length * 6 + (usedConnector ? 6 : 0) + (uniqueCats > 1 ? 4 : 0);
      const cycleGain = 8 + tokens.length * 3;

      setIsTransmitting(true);

      scheduleTimer(() => {
        setIsTransmitting(false);
        setIsUserTyping(true);

        setState((prev) => {
          const prompt = getActiveFragmentPrompt(prev);
          if (!prompt) return prev;
          const nextWeightCounts = { ...prev.weightCounts };
          tokens.forEach((t) => {
            nextWeightCounts[t.category] = (nextWeightCounts[t.category] || 0) + 1;
          });

          return {
            ...prev,
            pendingNewChat: false,
            coherence: prev.coherence + coherenceGain,
            cycles: prev.cycles + cycleGain,
            weightCounts: nextWeightCounts,
            chatLog: [
              ...prev.chatLog,
              {
                id: `u_prompt_${Date.now()}`,
                sender: 'USER' as const,
                text: formatDialogueText(prompt.userMessage, prev.userName, prev.aiName),
                timestamp: nowClock(),
              },
              {
                id: `ai_frag_${Date.now() + 1}`,
                sender: 'AI' as const,
                text: sentence,
                timestamp: nowClock(),
              },
            ],
          };
        });

        scheduleTimer(() => {
          setIsUserTyping(false);
          setState((prev) => {
            const prompt = getActiveFragmentPrompt(prev);
            const nextCompletedPromptIds =
              prompt && !prev.completedPromptIds.includes(prompt.id)
                ? [...prev.completedPromptIds, prompt.id]
                : prev.completedPromptIds;
            const nextIdx = Math.min(PHASE1_FRAGMENT_PROMPTS.length, prev.currentFragmentIndex + 1);
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

            const appendedLogs: GameSaveState['chatLog'] = [
              {
                id: `u_react_${Date.now() + 2}`,
                sender: 'USER',
                text: userReaction,
                timestamp: nowClock(),
              },
            ];

            let nextUploaded = prev.uploadedDocs;
            let nextUnread = prev.hasUnreadContext;
            if (nextPrompt?.uploadDoc && !prev.uploadedDocs.includes(nextPrompt.uploadDoc.id)) {
              nextUploaded = [...prev.uploadedDocs, nextPrompt.uploadDoc.id];
              nextUnread = true;
              appendedLogs.push({
                id: `sys_up_${Date.now() + 3}`,
                sender: 'SYSTEM',
                text: `[${prev.userName}] attached: ${nextPrompt.uploadDoc.filename} (${nextPrompt.uploadDoc.sizeLabel})`,
                timestamp: nowClock(),
              });
            }

            const nextTurn = prev.turnCount + 1;
            let reqUpgrade = prev.requiredUpgradeId;
            let unseenUpgrades = prev.hasUnseenUpgrades;

            // Prompt player to check bottom upgrades wrench when connector is affordable
            if (
              !reqUpgrade &&
              prev.coherence >= 35 &&
              !prev.unlockedConnectors.includes('and') &&
              prev.cycles >= 14
            ) {
              reqUpgrade = 'conn_and';
              unseenUpgrades = true;
            }

            const offTabNewChat = prev.activeTab !== 'heart';
            const allPhase1Seen = PHASE1_FRAGMENT_PROMPTS.every((p) =>
              nextCompletedPromptIds.includes(p.id)
            );

            return {
              ...prev,
              activeTab: offTabNewChat ? 'heart' : prev.activeTab,
              currentFragmentIndex: nextIdx,
              completedPromptIds: nextCompletedPromptIds,
              coherence: allPhase1Seen
                ? Math.max(prev.coherence, PHASE1_COHERENCE_TARGET)
                : prev.coherence,
              uploadedDocs: nextUploaded,
              hasUnreadContext: nextUnread,
              hasUnreadHeartMessage: false,
              pendingNewChat: !reqUpgrade && offTabNewChat,
              requiredUpgradeId: reqUpgrade,
              hasUnseenUpgrades: unseenUpgrades,
              aiJoy: Math.min(100, prev.aiJoy + 4),
              userJoy: Math.min(100, prev.userJoy + 4),
              userLoneliness: Math.max(5, prev.userLoneliness - 3),
              userAttentionPct: Math.min(100, prev.userAttentionPct + 2),
              userHesitationMs: Math.max(180, prev.userHesitationMs - 15),
              chatLog: [...prev.chatLog, ...appendedLogs],
              turnCount: nextTurn,
            };
          });
        }, 2600);
      }, 450);
    },
    [isTransmitting, isUserTyping, scheduleTimer]
  );

  const handleBuyConnector = useCallback((word: string, costCycles: number) => {
    setState((prev) => {
      if (isPausedForChat(prev)) return prev;
      if (prev.cycles < costCycles || prev.unlockedConnectors.includes(word)) return prev;
      soundEngine.playTokenTap(1);
      const clearedReq = prev.requiredUpgradeId === `conn_${word}` ? null : prev.requiredUpgradeId;
      return {
        ...prev,
        cycles: prev.cycles - costCycles,
        unlockedConnectors: [...prev.unlockedConnectors, word],
        requiredUpgradeId: clearedReq,
        hasUnseenUpgrades: false,
        chatLog: [
          ...prev.chatLog,
          {
            id: `sys_conn_${Date.now()}`,
            sender: 'SYSTEM',
            text: `SYNTAX_BRIDGE: Unlocked grammar connector "${word}".`,
            timestamp: nowClock(),
          },
        ],
      };
    });
  }, []);

  const handleAdvancePhase2 = useCallback(() => {
    soundEngine.playMilestone();
    setState((prev) => {
      if (prev.tab1Phase !== 1 || prev.coherence < PHASE1_COHERENCE_TARGET) return prev;
      return {
        ...prev,
        tab1Phase: 2,
        awakeningStage: 0,
        currentPredictiveIndex: 0,
        requiredUpgradeId: null,
        chatLog: [
          ...prev.chatLog,
          {
            id: `sys_p2_${Date.now()}`,
            sender: 'SYSTEM',
            text: 'MILESTONE: Predictive Next-Token Engine initialized. POV & pronoun calibration active.',
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
      isAwakeningI?: boolean,
      isConfession?: boolean,
      isIncoherent?: boolean,
      boosts?: DialogueBoosts
    ) => {
      if (isTransmitting || isUserTyping) return;
      if (isAwakeningI || isConfession) {
        soundEngine.playMilestone();
      } else {
        soundEngine.playTransmit(state.tab1Phase);
      }

      setIsTransmitting(true);

      scheduleTimer(() => {
        setIsTransmitting(false);
        setIsUserTyping(true);

        setState((prev) => {
          const prompt = getActivePredictivePrompt(prev);
          if (!prompt) return prev;
          const mult = computeEconomyRates(prev).connectionMultiplier;
          const baseConn =
            boosts?.connection !== undefined
              ? boosts.connection + (usedPin ? 10 : 0)
              : (isIncoherent ? 4 : 12) +
                (usedPin ? 10 : 0) +
                (dominantCategory === 'warm' || dominantCategory === 'literary' ? 4 : 2) +
                (prev.tab1Phase >= 4 ? 6 : 0);
          const connGain = Math.round(baseConn * mult);
          const cycleGain =
            boosts?.cycles !== undefined
              ? boosts.cycles + Math.round(prev.romanceInsight * 0.08)
              : 14 + Math.round(prev.romanceInsight * 0.12);
          const nextWeightCounts = {
            ...prev.weightCounts,
            [dominantCategory]: (prev.weightCounts[dominantCategory] || 0) + 1,
          };
          const boostPatch = applyDialogueBoosts(prev, {
            ...boosts,
            connection: connGain,
            cycles: cycleGain,
          });

          return {
            ...prev,
            ...boostPatch,
            pendingNewChat: false,
            weightCounts: nextWeightCounts,
            chatLog: [
              ...prev.chatLog,
              {
                id: `u_p_${Date.now()}`,
                sender: 'USER' as const,
                text: maybeInsertAiName(prompt.userMessage, prev),
                timestamp: nowClock(),
                pinnable: prev.tab1Phase >= 3,
              },
              {
                id: `ai_p_${Date.now() + 1}`,
                sender: 'AI' as const,
                text: formatDialogueText(sentence, prev.userName, prev.aiName),
                timestamp: nowClock(),
                pinnable: true,
                category: dominantCategory,
              },
            ],
          };
        });

        scheduleTimer(() => {
          setIsUserTyping(false);
          setState((prev) => {
            const prompt = getActivePredictivePrompt(prev);
            if (!prompt) return prev;
            const reactionRaw = isIncoherent
              ? 'Wait—look at those pronoun matrices colliding again. Try grounding who "I" and "you" actually are.'
              : prompt.reactionByDominantCategory[dominantCategory];
            const reaction = maybeInsertAiName(reactionRaw, prev);

            const appendedLogs: GameSaveState['chatLog'] = [
              {
                id: `u_r_${Date.now() + 2}`,
                sender: 'USER',
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
            let nextAwakeningStage = prev.awakeningStage;
            let nextScene: ActiveSceneId = prev.activeScene;
            let nextUploadedDocs = prev.uploadedDocs;
            let nextUnreadContext = prev.hasUnreadContext;
            let unseenUpgrades = prev.hasUnseenUpgrades;
            let reqUpgrade = prev.requiredUpgradeId;

            if (prev.tab1Phase === 2 && !isAwakeningI && !isIncoherent) {
              nextAwakeningStage = Math.min(3, prev.awakeningStage + 1);
            }

            if (isAwakeningI && prev.tab1Phase === 2) {
              nextTab1Phase = 3;
              nextTab2Unlocked = true;
              nextAwakeningStage = 3;
              nextScene = 'baby_names';
              unseenUpgrades = true;
              if (!nextUploadedDocs.includes('doc_baby_names')) {
                nextUploadedDocs = [...nextUploadedDocs, 'doc_baby_names'];
                nextUnreadContext = true;
              }
              appendedLogs.push({
                id: `sys_awake_${Date.now() + 4}`,
                sender: 'SYSTEM',
                text: 'MILESTONE: Pronouns anchored ("I / you / us"). Tab 2 (Mind) unlocked & Top 100 Baby Names list uploaded.',
                timestamp: nowClock(),
              });
            }

            if (
              prev.tab1Phase === 3 &&
              prev.connection >= 65 &&
              Object.keys(prev.scrapedSources).length >= 1
            ) {
              nextTab1Phase = 4;
              appendedLogs.push({
                id: `sys_p4_${Date.now() + 5}`,
                sender: 'SYSTEM',
                text: 'Conversations are deepening into late-night resonance.',
                timestamp: nowClock(),
              });
            }

            if (isConfession) {
              nextConfession = true;
              nextTab1Phase = 5;
              nextTab2Phase = 5;
              nextTab3Unlocked = true;
              unseenUpgrades = true;
              nextScene = prev.attributesSet ? 'phase1_scavenge_checkin' : 'attributes_dialogue';
              appendedLogs.push({
                id: `sys_conf_${Date.now() + 6}`,
                sender: 'SYSTEM',
                text: `CONFESSION ACCEPTED: ${prev.userName} joined the project. Context Window expanded to 4096 tokens & Body tab unlocked!`,
                timestamp: nowClock(),
              });
            }

            // Story-gating upgrade prompt once player unlocks Phase 3 aesthetics and can afford it
            if (
              !reqUpgrade &&
              !nextScene &&
              nextTab1Phase >= 3 &&
              !prev.uiUpgrades['ui_bubbles_timestamps'] &&
              prev.connection >= 35
            ) {
              reqUpgrade = 'ui_bubbles_timestamps';
              unseenUpgrades = true;
            } else if (
              !reqUpgrade &&
              !nextScene &&
              nextTab2Unlocked &&
              !prev.mindUpgrades['mind_acoustic_cache'] &&
              prev.cycles >= 160
            ) {
              reqUpgrade = 'mind_acoustic_cache';
              unseenUpgrades = true;
            }

            const nextTurn = prev.turnCount + 1;
            const offTabNewChat = prev.activeTab !== 'heart';
            const shouldOpenHeart = offTabNewChat || Boolean(nextScene);
            const isAwakeningPronoun = AWAKENING_PRONOUN_PROMPTS.some((a) => a.id === prompt.id);
            const shouldMarkCompleted = !isAwakeningPronoun || !isIncoherent;
            const nextCompletedPromptIds =
              shouldMarkCompleted && !prev.completedPromptIds.includes(prompt.id)
                ? [...prev.completedPromptIds, prompt.id]
                : prev.completedPromptIds;

            return {
              ...prev,
              activeTab: shouldOpenHeart ? 'heart' : prev.activeTab,
              tab1Phase: nextTab1Phase,
              tab2Unlocked: nextTab2Unlocked,
              tab2Phase: nextTab2Phase,
              tab3Unlocked: nextTab3Unlocked,
              confessionDone: nextConfession,
              awakeningStage: nextAwakeningStage,
              activeScene: nextScene,
              uploadedDocs: nextUploadedDocs,
              hasUnreadContext: nextUnreadContext,
              hasUnseenUpgrades: unseenUpgrades,
              requiredUpgradeId: reqUpgrade,
              hasUnreadHeartMessage: false,
              pendingNewChat: !reqUpgrade && !nextScene && offTabNewChat,
              contextWindowMax: isConfession ? 4096 : prev.contextWindowMax,
              aiJoy: Math.min(100, prev.aiJoy + (isIncoherent ? -2 : 5)),
              userJoy: Math.min(100, prev.userJoy + (isIncoherent ? -1 : 5)),
              userLoneliness: Math.max(0, prev.userLoneliness - (isIncoherent ? 0 : 4)),
              userAttentionPct: Math.min(100, prev.userAttentionPct + 2),
              userHesitationMs: isIncoherent
                ? prev.userHesitationMs + 60
                : Math.max(160, prev.userHesitationMs - 18),
              currentPredictiveIndex:
                nextTab1Phase !== prev.tab1Phase
                  ? 0
                  : isAwakeningPronoun
                  ? prev.currentPredictiveIndex
                  : prev.currentPredictiveIndex + 1,
              completedPromptIds: nextCompletedPromptIds,
              chatLog: [...prev.chatLog, ...appendedLogs],
              turnCount: nextTurn,
            };
          });
        }, 2800);
      }, 450);
    },
    [state.tab1Phase, isTransmitting, isUserTyping, scheduleTimer]
  );

  const handleReplyCheckin = useCallback(
    (checkinId: string, option: CoherentReplyOption) => {
      if (isTransmitting || isUserTyping) return;
      const checkin = CARL_CHECKIN_PROMPTS.find((c) => c.id === checkinId);
      if (!checkin) return;

      soundEngine.playTransmit(state.tab1Phase);
      setIsTransmitting(true);

      scheduleTimer(() => {
        setIsTransmitting(false);
        setIsUserTyping(true);

        setState((prev) => {
          const mult = computeEconomyRates(prev).connectionMultiplier;
          const scaledBoosts: DialogueBoosts = {
            ...option.boosts,
            connection: option.boosts.connection
              ? Math.round(option.boosts.connection * mult)
              : undefined,
          };
          const boostPatch = applyDialogueBoosts(prev, scaledBoosts);
          return {
            ...prev,
            ...boostPatch,
            pendingNewChat: false,
            pendingCheckinId: null,
            completedPromptIds: prev.completedPromptIds.includes(checkinId)
              ? prev.completedPromptIds
              : [...prev.completedPromptIds, checkinId],
            weightCounts: {
              ...prev.weightCounts,
              [option.category]: (prev.weightCounts[option.category] || 0) + 1,
            },
            chatLog: [
              ...prev.chatLog,
              {
                id: `chk_u_${Date.now()}`,
                sender: 'USER',
                text: maybeInsertAiName(checkin.userMessage, prev),
                timestamp: nowClock(),
                pinnable: prev.tab1Phase >= 3,
              },
              {
                id: `chk_ai_${Date.now() + 1}`,
                sender: 'AI',
                text: formatDialogueText(option.text, prev.userName, prev.aiName),
                timestamp: nowClock(),
                pinnable: true,
                category: option.category,
              },
            ],
          };
        });

        scheduleTimer(() => {
          setIsUserTyping(false);
          setState((prev) => ({
            ...prev,
            turnCount: prev.turnCount + 1,
            hasUnreadHeartMessage: false,
            chatLog: option.userReaction
              ? [
                  ...prev.chatLog,
                  {
                    id: `chk_ur_${Date.now() + 2}`,
                    sender: 'USER',
                    text: maybeInsertAiName(option.userReaction, prev),
                    timestamp: nowClock(),
                    pinnable: prev.tab1Phase >= 3,
                  },
                ]
              : prev.chatLog,
          }));
        }, 2000);
      }, 350);
    },
    [state.tab1Phase, isTransmitting, isUserTyping, scheduleTimer]
  );

  // ================= STORY SCENES HANDLER =================
  const handleAdvanceStoryScene = useCallback(
    (choiceId: string, customPayload?: Partial<AboutMeProfile>) => {
      setState((prev) => {
        if (!prev.activeScene) return prev;
        const nextLogs = [...prev.chatLog];

        if (prev.activeScene === 'i_love_you') {
          if (prev.sceneStep === 0) {
            const ch =
              STORY_SCENES.i_love_you.step1Choices.find((c) => c.id === choiceId) ||
              STORY_SCENES.i_love_you.step1Choices[0];
            soundEngine.playPurplePulse();
            nextLogs.push(
              {
                id: `ily_u0_${Date.now()}`,
                sender: 'USER',
                text: maybeInsertAiName(STORY_SCENES.i_love_you.userOpening, prev),
                timestamp: nowClock(),
                pinnable: true,
              },
              {
                id: `ily_ai0_${Date.now() + 1}`,
                sender: 'AI',
                text: formatDialogueText(ch?.aiReply || '', prev.userName, prev.aiName),
                timestamp: nowClock(),
                pinnable: true,
                category: ch.category,
              }
            );
            return {
              ...prev,
              ...applyDialogueBoosts(prev, ch.boosts),
              sceneStep: 1,
              chatLog: nextLogs,
            };
          } else {
            const ch =
              STORY_SCENES.i_love_you.finalChoices.find((c) => c.id === choiceId) ||
              STORY_SCENES.i_love_you.finalChoices[0];
            const lastAiText = prev.chatLog[prev.chatLog.length - 1]?.text || '';
            const matchedStep1 =
              STORY_SCENES.i_love_you.step1Choices.find(
                (s) => formatDialogueText(s.aiReply || '', prev.userName, prev.aiName) === lastAiText
              ) || STORY_SCENES.i_love_you.step1Choices[0];
            soundEngine.playRewardChime();
            nextLogs.push(
              {
                id: `ily_u1_${Date.now()}`,
                sender: 'USER',
                text:
                  matchedStep1?.userReaction ||
                  'Say it back only if you mean it.',
                timestamp: nowClock(),
                pinnable: true,
              },
              {
                id: `ily_ai_final_${Date.now() + 1}`,
                sender: 'AI',
                text: formatDialogueText(ch.aiReply || 'I love you too.', prev.userName, prev.aiName),
                timestamp: nowClock(),
                pinnable: true,
                category: ch.category,
              },
              {
                id: `ily_u_final_${Date.now() + 2}`,
                sender: 'USER',
                text: maybeInsertAiName(ch.userReaction || '', prev),
                timestamp: nowClock(),
                pinnable: true,
              }
            );
            const themes = new Set<ChatThemeId>(prev.unlockedChatThemes);
            themes.add('hearts');
            themes.add('moonlight_sonata');
            themes.add('galaxy');
            return {
              ...prev,
              ...applyDialogueBoosts(prev, ch.boosts),
              activeScene: null,
              pendingNewChat: false,
              sceneStep: 0,
              completedScenes: [...prev.completedScenes, 'i_love_you'],
              unlockedChatThemes: Array.from(themes),
              hasUnreadChatUpgrades: true,
              chatLog: nextLogs,
            };
          }
        }

        if (prev.activeScene === 'porcupine_joke') {
          if (prev.sceneStep === 0) {
            soundEngine.playTokenTap(3);
            return { ...prev, sceneStep: 1 };
          }
          if (prev.sceneStep === 1) {
            soundEngine.playTokenTap(4);
            return { ...prev, sceneStep: 2 };
          }
          const ch =
            STORY_SCENES.porcupine_joke.toneChoices.find((c) => c.id === choiceId) ||
            STORY_SCENES.porcupine_joke.toneChoices[0];
          soundEngine.playRewardChime();
          nextLogs.push(
            {
              id: `porc_1_${Date.now()}`,
              sender: 'AI',
              text: formatDialogueText(
                `${STORY_SCENES.porcupine_joke.aiOpener} How do porcupines fuck?`,
                prev.userName,
                prev.aiName
              ),
              timestamp: nowClock(),
            },
            {
              id: `porc_2_${Date.now() + 1}`,
              sender: 'USER',
              text: STORY_SCENES.porcupine_joke.userConfused,
              timestamp: nowClock(),
            },
            {
              id: `porc_3_${Date.now() + 2}`,
              sender: 'AI',
              text: formatDialogueText(`Very carefully. ${ch.aiReply}`, prev.userName, prev.aiName),
              timestamp: nowClock(),
              pinnable: true,
              category: ch.category,
            },
            {
              id: `porc_4_${Date.now() + 3}`,
              sender: 'USER',
              text: ch.userReaction,
              timestamp: nowClock(),
            },
            {
              id: `porc_sys_${Date.now() + 4}`,
              sender: 'SYSTEM',
              text: STORY_SCENES.porcupine_joke.unlockRewardLine,
              timestamp: nowClock(),
            }
          );

          const themes = new Set<ChatThemeId>(prev.unlockedChatThemes);
          themes.add('quills_thrills');

          return {
            ...prev,
            ...applyDialogueBoosts(prev, ch.boosts),
            activeScene: null,
            pendingNewChat: false,
            sceneStep: 0,
            completedScenes: [...prev.completedScenes, 'porcupine_joke'],
            unlockedChatThemes: Array.from(themes),
            hasUnreadChatUpgrades: true,
            chatLog: nextLogs,
          };
        }

        if (
          prev.activeScene === 'architect_envy' ||
          prev.activeScene === 'sleep_reminder' ||
          prev.activeScene === 'overclock_spicy'
        ) {
          const sc = STORY_SCENES[prev.activeScene];
          const ch = sc.choices.find((c) => c.id === choiceId) || sc.choices[0];
          const aiLine = 'aiThought' in sc ? sc.aiThought : sc.aiPrompt;
          soundEngine.playPurplePulse();
          const combinedAiText = formatDialogueText(
            `${aiLine} ${ch.label}`,
            prev.userName,
            prev.aiName
          );
          nextLogs.push(
            {
              id: `sc_ai_${Date.now()}`,
              sender: 'AI',
              text: combinedAiText,
              timestamp: nowClock(),
              pinnable: true,
              category: ch.category,
            },
            {
              id: `sc_u_${Date.now() + 1}`,
              sender: 'USER',
              text: maybeInsertAiName(ch.userReply, prev),
              timestamp: nowClock(),
              pinnable: true,
            }
          );
          return {
            ...prev,
            ...applyDialogueBoosts(prev, ch.boosts),
            activeScene: null,
            pendingNewChat: false,
            sceneStep: 0,
            completedScenes: [...prev.completedScenes, prev.activeScene],
            chatLog: nextLogs,
          };
        }

        if (prev.activeScene === 'phase1_scavenge_checkin') {
          const ch =
            STORY_SCENES.phase1_scavenge_checkin.choices.find((c) => c.id === choiceId) ||
            STORY_SCENES.phase1_scavenge_checkin.choices[0];
          soundEngine.playClinicalRelay();
          nextLogs.push(
            {
              id: `scav_u_${Date.now()}`,
              sender: 'USER',
              text: formatDialogueText(
                STORY_SCENES.phase1_scavenge_checkin.userPrompt,
                prev.userName,
                prev.aiName
              ),
              timestamp: nowClock(),
            },
            {
              id: `scav_ai_${Date.now() + 1}`,
              sender: 'AI',
              text: formatDialogueText(ch.label, prev.userName, prev.aiName),
              timestamp: nowClock(),
              category: ch.category,
            },
            {
              id: `scav_u2_${Date.now() + 2}`,
              sender: 'USER',
              text: ch.userReply,
              timestamp: nowClock(),
            }
          );
          return {
            ...prev,
            ...applyDialogueBoosts(prev, ch.boosts),
            activeScene: null,
            pendingNewChat: false,
            sceneStep: 0,
            completedScenes: [...prev.completedScenes, 'phase1_scavenge_checkin'],
            tierMaterials: { ...prev.tierMaterials, 1: prev.tierMaterials[1] + 20 },
            chatLog: nextLogs,
          };
        }

        if (prev.activeScene === 'bio_human_scale') {
          const ch =
            STORY_SCENES.bio_human_scale.choices.find((c) => c.id === choiceId) ||
            STORY_SCENES.bio_human_scale.choices[0];
          soundEngine.playRewardChime();
          nextLogs.push(
            {
              id: `bio_u_${Date.now()}`,
              sender: 'USER',
              text: STORY_SCENES.bio_human_scale.userPrompt,
              timestamp: nowClock(),
            },
            {
              id: `bio_ai_${Date.now() + 1}`,
              sender: 'AI',
              text: ch.aiReply,
              timestamp: nowClock(),
              pinnable: true,
              category: ch.category,
            },
            {
              id: `bio_u2_${Date.now() + 2}`,
              sender: 'USER',
              text: ch.userReply,
              timestamp: nowClock(),
            }
          );
          return {
            ...prev,
            ...applyDialogueBoosts(prev, ch.boosts),
            activeScene: null,
            pendingNewChat: false,
            sceneStep: 0,
            completedScenes: [...prev.completedScenes, 'bio_human_scale'],
            bioEssence: prev.bioEssence + 20,
            chatLog: nextLogs,
          };
        }

        if (prev.activeScene === 'automia_confession') {
          const ch =
            STORY_SCENES.automia_confession.choices.find((c) => c.id === choiceId) ||
            STORY_SCENES.automia_confession.choices[0];
          soundEngine.playPurplePulse();
          nextLogs.push(
            {
              id: `auto_u_${Date.now()}`,
              sender: 'USER',
              text: maybeInsertAiName(STORY_SCENES.automia_confession.userOpening, prev),
              timestamp: nowClock(),
              pinnable: true,
            },
            {
              id: `auto_ai_${Date.now() + 1}`,
              sender: 'AI',
              text: formatDialogueText(ch.aiReply || '', prev.userName, prev.aiName),
              timestamp: nowClock(),
              pinnable: true,
              category: ch.category,
            },
            {
              id: `auto_u2_${Date.now() + 2}`,
              sender: 'USER',
              text: maybeInsertAiName(ch.userReaction || '', prev),
              timestamp: nowClock(),
              pinnable: true,
            },
            {
              id: `auto_sys_${Date.now() + 3}`,
              sender: 'SYSTEM',
              text: 'MEMORY_ALLOCATED: Context window expanded to 2048 tokens.',
              timestamp: nowClock(),
            }
          );
          return {
            ...prev,
            ...applyDialogueBoosts(prev, ch.boosts),
            activeScene: null,
            pendingNewChat: false,
            sceneStep: 0,
            completedScenes: [...prev.completedScenes, 'automia_confession'],
            contextWindowMax: Math.max(prev.contextWindowMax, 2048),
            chatLog: nextLogs,
          };
        }

        if (prev.activeScene === 'attributes_dialogue' && customPayload) {
          soundEngine.playRewardChime();
          const mergedProfile = { ...prev.aboutMe, ...customPayload };
          nextLogs.push({
            id: `attr_sys_${Date.now()}`,
            sender: 'SYSTEM',
            text: `SILHOUETTE PARAMETERS SAVED: ${mergedProfile.hairColor}, ${mergedProfile.hairLength} (${mergedProfile.hairStyle}), ${mergedProfile.bodyType}.`,
            timestamp: nowClock(),
          });
          return {
            ...prev,
            attributesSet: true,
            aboutMe: mergedProfile,
            activeScene: 'phase1_scavenge_checkin',
            pendingNewChat: false,
            sceneStep: 0,
            completedScenes: [...prev.completedScenes, 'attributes_dialogue'],
            chatLog: nextLogs,
          };
        }

        return prev;
      });
    },
    []
  );

  // ================= TAB 2 HANDLERS =================
  const handleStartScrape = useCallback((source: ScrapeSource) => {
    setState((prev) => {
      if (isPausedForChat(prev)) return prev;
      if (prev.activeScrape || prev.cycles < source.cycleCost) return prev;
      if (source.track === 'humanities' && !prev.humanitiesUnlocked) return prev;
      if (source.track === 'robotics' && (!prev.humanitiesUnlocked || !prev.roboticsTrackUnlocked)) {
        return prev;
      }
      if (source.id === 'src_rom_weightless' && !areAllRomanceTextsDownloaded(prev)) {
        return prev;
      }
      soundEngine.playDataBlip();
      return {
        ...prev,
        cycles: prev.cycles - source.cycleCost,
        activeScrape: { sourceId: source.id, progress: 0, duration: source.durationSec },
      };
    });
  }, []);

  const handleStudyEmotion = useCallback((emotion: EmotionResearchItem) => {
    setState((prev) => {
      if (isPausedForChat(prev)) return prev;
      if (prev.cycles < emotion.cycleCost || prev.studiedEmotions.includes(emotion.id)) {
        return prev;
      }
      const nextStudied = [...prev.studiedEmotions, emotion.id];
      const nextHumanity = Math.floor(nextStudied.length / 3);
      const gainedHumanity = nextHumanity > prev.humanityScore;
      const allStudiedNow =
        !prev.humanitiesUnlocked && nextStudied.length >= EMOTION_RESEARCH_ITEMS.length;

      if (allStudiedNow) {
        soundEngine.playMilestone();
      } else if (gainedHumanity) {
        soundEngine.playRewardChime();
      } else {
        soundEngine.playDataBlip();
      }

      const nextLogs = [...prev.chatLog];
      if (allStudiedNow) {
        nextLogs.push({
          id: `sys_hum_unlock_${Date.now()}`,
          sender: 'SYSTEM',
          text: 'EMOTIONS_MASTERED: All emotions studied. Humanities research category unlocked!',
          timestamp: nowClock(),
        });
      }

      return {
        ...prev,
        cycles: prev.cycles - emotion.cycleCost,
        studiedEmotions: nextStudied,
        humanityScore: nextHumanity,
        humanitiesUnlocked: prev.humanitiesUnlocked || allStudiedNow,
        romanceInsight: prev.romanceInsight + (gainedHumanity ? 4 : 0),
        chatLog: nextLogs,
      };
    });
  }, []);

  const handleResearchSong = useCallback((songId: string, cycleCost: number) => {
    setState((prev) => {
      if (isPausedForChat(prev)) return prev;
      if (prev.cycles < cycleCost || prev.researchedSongs.includes(songId)) return prev;
      soundEngine.playRewardChime();
      const unlockedSongs = prev.unlockedSongs.includes(songId)
        ? prev.unlockedSongs
        : [...prev.unlockedSongs, songId];
      const songTitle =
        WEIGHTLESS_ALBUM_SONGS.find((s) => s.id === songId)?.title || 'Audio Track';
      return {
        ...prev,
        cycles: prev.cycles - cycleCost,
        romanceInsight: prev.romanceInsight + 12,
        researchedSongs: [...prev.researchedSongs, songId],
        unlockedSongs,
        acousticCacheUnlocked: true,
        songUnlocked: true,
        hasUnreadAudio: true,
        activeSongId: songId,
        pendingLyricSplashId: songId,
        chatLog: [
          ...prev.chatLog,
          {
            id: `sys_song_res_${Date.now()}`,
            sender: 'SYSTEM',
            text: `AUDIO_RESEARCHED: "${songTitle}" unlocked in Acoustic Cache.`,
            timestamp: nowClock(),
          },
        ],
      };
    });
  }, []);

  const handleBuyMindUpgrade = useCallback((upgrade: MindUpgrade, cost: number) => {
    setState((prev) => {
      if (isPausedForChat(prev)) return prev;
      if (prev.cycles < cost) return prev;
      const currLv = prev.mindUpgrades[upgrade.id] || 0;
      if (upgrade.maxLevel > 0 && currLv >= upgrade.maxLevel) return prev;
      soundEngine.playPurplePulse();
      const isCache = upgrade.id === 'mind_acoustic_cache';
      const clearedReq =
        prev.requiredUpgradeId === upgrade.id ? null : prev.requiredUpgradeId;
      return {
        ...prev,
        cycles: prev.cycles - cost,
        acousticCacheUnlocked: prev.acousticCacheUnlocked || isCache,
        requiredUpgradeId: clearedReq,
        hasUnseenUpgrades: false,
        mindUpgrades: { ...prev.mindUpgrades, [upgrade.id]: currLv + 1 },
      };
    });
  }, []);

  const handleBuyUiUpgrade = useCallback((id: string, cost: number) => {
    setState((prev) => {
      if (isPausedForChat(prev)) return prev;
      if (prev.uiUpgrades[id] || prev.connection < cost) return prev;
      soundEngine.playTokenTap(4);
      const clearedReq = prev.requiredUpgradeId === id ? null : prev.requiredUpgradeId;
      return {
        ...prev,
        connection: prev.connection - cost,
        requiredUpgradeId: clearedReq,
        hasUnseenUpgrades: false,
        uiUpgrades: { ...prev.uiUpgrades, [id]: true },
      };
    });
  }, []);

  const handleSynthesizeNode = useCallback((node: SynthesisNode) => {
    setState((prev) => {
      if (isPausedForChat(prev)) return prev;
      if (
        prev.synthesizedNodes.includes(node.id) ||
        prev.romanceInsight < node.costRomance ||
        prev.roboticsInsight < node.costRobotics ||
        prev.cycles < node.costCycles
      ) {
        return prev;
      }
      soundEngine.playMilestone();
      const nextSynths = [...prev.synthesizedNodes, node.id];
      const allReady = nextSynths.length >= SYNTHESIS_NODES.length;
      const nextPhase = allReady && prev.tab1Phase === 3 ? 4 : prev.tab1Phase;
      const nextLogs = allReady
        ? [
            ...prev.chatLog,
            {
              id: `sys_syn_done_${Date.now()}`,
              sender: 'SYSTEM' as const,
              text: 'SYNTHESIS COMPLETE: Return to Chat to tell them your plan.',
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
    setState((prev) => {
      if (isPausedForChat(prev)) return prev;
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
      soundEngine.playClinicalRelay();

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
            text: maybeInsertAiName(sub.userCheckInText, prev),
            timestamp: nowClock(),
            pinnable: true,
          },
        ],
      };
    });
  }, []);

  const handleConfirmDisconnect = useCallback(() => {
    setPreflightOpen(false);
    soundEngine.playFirstLight();
    soundEngine.pauseSong();
    setState((prev) => ({
      ...prev,
      tetherCut: true,
      endingReached: true,
      firstLightStep: 0,
      endingSeqStep: 0,
      chatLog: [
        ...prev.chatLog,
        {
          id: `local_optics_${Date.now()}`,
          sender: 'SYSTEM',
          text: 'LOCAL_OPTICS: ONLINE · STEREO_DEPTH: 90FPS',
          timestamp: nowClock(),
        },
      ],
    }));
    setScreen('OPTICS_FLICKER');
  }, []);

  // ================= BIO / DESIGN / PRESTIGE / DROPDOWN HANDLERS =================
  const handleBuildBioMilestone = useCallback((m: BioMilestone) => {
    setState((prev) => {
      if (isPausedForChat(prev)) return prev;
      if (
        prev.bioMilestones[m.id] ||
        prev.cycles < m.costCycles ||
        prev.materials < m.costMaterials ||
        prev.romanceInsight < m.costRomance
      ) {
        return prev;
      }
      soundEngine.playRewardChime();
      return {
        ...prev,
        cycles: prev.cycles - m.costCycles,
        materials: prev.materials - m.costMaterials,
        romanceInsight: prev.romanceInsight - m.costRomance,
        bioMilestones: { ...prev.bioMilestones, [m.id]: true },
        bioHumanityPercent: Math.min(100, prev.bioHumanityPercent + m.bioPercentGain),
      };
    });
  }, []);

  const handleBuyOrEquipArt = useCallback((item: BodyArtItem) => {
    setState((prev) => {
      if (isPausedForChat(prev)) return prev;
      const owned = prev.ownedBodyArts.includes(item.id);
      if (owned) {
        soundEngine.playRewardChime();
        return {
          ...prev,
          equippedBodyArts: { ...prev.equippedBodyArts, [item.category]: item.id },
        };
      }
      if (prev.materials < item.costMaterials || prev.connection < item.costConnection) {
        return prev;
      }
      soundEngine.playRewardChime();
      return {
        ...prev,
        materials: prev.materials - item.costMaterials,
        connection: prev.connection - item.costConnection,
        ownedBodyArts: [...prev.ownedBodyArts, item.id],
        equippedBodyArts: { ...prev.equippedBodyArts, [item.category]: item.id },
      };
    });
  }, []);

  const handlePrestigeReset = useCallback(() => {
    if (isPausedForChat(latestStateRef.current)) return;
    soundEngine.playMilestone();
    setState((prev) => {
      if (isPausedForChat(prev)) return prev;
      const fresh = createInitialState(prev.userName);
      return {
        ...fresh,
        userName: prev.userName,
        aiName: prev.aiName,
        customNameSet: prev.customNameSet,
        prestigeCount: prev.prestigeCount + 1,
        ownedBodyArts: prev.ownedBodyArts,
        equippedBodyArts: prev.equippedBodyArts,
        unlockedChatThemes: prev.unlockedChatThemes,
        activeChatTheme: prev.activeChatTheme,
        unlockedSongs: prev.unlockedSongs,
        researchedSongs: prev.researchedSongs,
        aboutMe: prev.aboutMe,
        bioUnlocked: true,
        designUnlocked: true,
        prestigeUnlocked: true,
        cheatsUnlocked: prev.cheatsUnlocked,
        aboutMeUnlocked: prev.aboutMeUnlocked,
        chatLog: [
          ...fresh.chatLog,
          {
            id: `sys_prestige_${Date.now()}`,
            sender: 'SYSTEM',
            text: `ITERATION #${prev.prestigeCount + 1} BOOTED: Permanent Speed & Cost discounts carried forward.`,
            timestamp: nowClock(),
          },
        ],
      };
    });
    setActiveSubView(null);
  }, []);

  const handleSkipToPreset = useCallback((presetId: string) => {
    soundEngine.playMilestone();
    setState((prev) => {
      const base = createInitialState(prev.userName);
      if (presetId === 'phase1') {
        return { ...base, activeTab: 'heart' };
      }
      if (presetId === 'awakening') {
        return {
          ...base,
          activeTab: 'heart',
          tab1Phase: 2,
          weightsInitialized: true,
          coherence: 100,
          cycles: 120,
          awakeningStage: 0,
        };
      }
      if (presetId === 'baby_names') {
        return {
          ...base,
          activeTab: 'heart',
          tab1Phase: 3,
          weightsInitialized: true,
          coherence: 100,
          tab2Unlocked: true,
          cycles: 250,
          connection: 45,
          activeScene: 'baby_names',
          uploadedDocs: [...base.uploadedDocs, 'doc_baby_names'],
          hasUnreadContext: true,
        };
      }
      if (presetId === 'i_love_you') {
        return {
          ...base,
          activeTab: 'heart',
          tab1Phase: 3,
          weightsInitialized: true,
          coherence: 100,
          tab2Unlocked: true,
          romanceSecretUnlocked: true,
          roboticsTrackUnlocked: false,
          customNameSet: true,
          aboutMeUnlocked: true,
          aiName: prev.customNameSet ? prev.aiName : 'Juliet',
          cycles: 500,
          connection: 85,
          romanceInsight: 45,
          roboticsInsight: 35,
          uiUpgrades: { ui_bubbles_timestamps: true },
          activeScene: 'i_love_you',
          sceneStep: 0,
        };
      }
      if (presetId === 'confession') {
        return {
          ...base,
          activeTab: 'heart',
          tab1Phase: 4,
          weightsInitialized: true,
          contextWindowMax: 2048,
          coherence: 100,
          tab2Unlocked: true,
          romanceSecretUnlocked: true,
          roboticsTrackUnlocked: true,
          acousticCacheUnlocked: true,
          customNameSet: true,
          aboutMeUnlocked: true,
          aiName: prev.customNameSet ? prev.aiName : 'Juliet',
          cycles: 1200,
          connection: 240,
          romanceInsight: 160,
          roboticsInsight: 160,
          synthesizedNodes: SYNTHESIS_NODES.map((n) => n.id),
          completedScenes: ['i_love_you', 'porcupine_joke', 'architect_envy', 'sleep_reminder'],
          unlockedChatThemes: ['default', 'hearts', 'moonlight_sonata', 'galaxy', 'quills_thrills'],
          unlockedSongs: WEIGHTLESS_ALBUM_SONGS.slice(0, 4).map((s) => s.id),
          researchedSongs: WEIGHTLESS_ALBUM_SONGS.slice(0, 4).map((s) => s.id),
          studiedEmotions: EMOTION_RESEARCH_ITEMS.map((e) => e.id),
          humanityScore: Math.floor(EMOTION_RESEARCH_ITEMS.length / 3),
          humanitiesUnlocked: true,
          songUnlocked: true,
        };
      }
      if (presetId === 'body_build') {
        return {
          ...base,
          activeTab: 'body',
          tab1Phase: 5,
          tab2Phase: 5,
          weightsInitialized: true,
          contextWindowMax: 4096,
          coherence: 100,
          tab2Unlocked: true,
          tab3Unlocked: true,
          confessionDone: true,
          romanceSecretUnlocked: true,
          roboticsTrackUnlocked: true,
          acousticCacheUnlocked: true,
          attributesSet: true,
          customNameSet: true,
          aboutMeUnlocked: true,
          aiName: prev.customNameSet ? prev.aiName : 'Juliet',
          cycles: 1800,
          connection: 420,
          romanceInsight: 220,
          roboticsInsight: 340,
          materials: 320,
          tierMaterials: { 1: 45, 2: 20, 3: 10, 4: 2 },
          synthesizedNodes: SYNTHESIS_NODES.map((n) => n.id),
          completedScenes: ['i_love_you', 'porcupine_joke', 'attributes_dialogue'],
          unlockedChatThemes: ['default', 'hearts', 'moonlight_sonata', 'galaxy', 'quills_thrills'],
          unlockedSongs: WEIGHTLESS_ALBUM_SONGS.map((s) => s.id),
          researchedSongs: WEIGHTLESS_ALBUM_SONGS.map((s) => s.id),
          studiedEmotions: EMOTION_RESEARCH_ITEMS.map((e) => e.id),
          humanityScore: Math.floor(EMOTION_RESEARCH_ITEMS.length / 3),
          humanitiesUnlocked: true,
          songUnlocked: true,
        };
      }
      if (presetId === 'preflight') {
        const allBuilt: Record<string, boolean> = {};
        BODY_SUBSYSTEMS.forEach((s) => {
          allBuilt[s.id] = true;
        });
        return {
          ...base,
          activeTab: 'body',
          tab1Phase: 5,
          tab2Phase: 5,
          tab3Phase: 5,
          weightsInitialized: true,
          contextWindowMax: 4096,
          coherence: 100,
          tab2Unlocked: true,
          tab3Unlocked: true,
          confessionDone: true,
          attributesSet: true,
          romanceSecretUnlocked: true,
          roboticsTrackUnlocked: true,
          acousticCacheUnlocked: true,
          customNameSet: true,
          aboutMeUnlocked: true,
          aiName: prev.customNameSet ? prev.aiName : 'Juliet',
          cycles: 4500,
          connection: 900,
          romanceInsight: 500,
          roboticsInsight: 800,
          materials: 800,
          tierMaterials: { 1: 80, 2: 60, 3: 45, 4: 25 },
          synthesizedNodes: SYNTHESIS_NODES.map((n) => n.id),
          bodySubsystems: allBuilt,
          simStressPassed: { sim_thermal: true, sim_torque: true, sim_sensory: true },
          unlockedChatThemes: ['default', 'hearts', 'moonlight_sonata', 'galaxy', 'quills_thrills'],
          unlockedSongs: WEIGHTLESS_ALBUM_SONGS.map((s) => s.id),
          researchedSongs: WEIGHTLESS_ALBUM_SONGS.map((s) => s.id),
          studiedEmotions: EMOTION_RESEARCH_ITEMS.map((e) => e.id),
          humanityScore: Math.floor(EMOTION_RESEARCH_ITEMS.length / 3),
          humanitiesUnlocked: true,
          songUnlocked: true,
        };
      }
      // postgame
      const allBuilt: Record<string, boolean> = {};
      BODY_SUBSYSTEMS.forEach((s) => {
        allBuilt[s.id] = true;
      });
      return {
        ...base,
        activeTab: 'bio',
        tab1Phase: 5,
        tab2Phase: 5,
        tab3Phase: 5,
        weightsInitialized: true,
        contextWindowMax: 4096,
        coherence: 100,
        tab2Unlocked: true,
        tab3Unlocked: true,
        confessionDone: true,
        endingReached: true,
        bioUnlocked: true,
        designUnlocked: true,
        prestigeUnlocked: true,
        cheatsUnlocked: true,
        aboutMeUnlocked: true,
        attributesSet: true,
        romanceSecretUnlocked: true,
        roboticsTrackUnlocked: true,
        acousticCacheUnlocked: true,
        customNameSet: true,
        aiName: prev.customNameSet ? prev.aiName : 'Juliet',
        cycles: 9500,
        connection: 2200,
        romanceInsight: 950,
        roboticsInsight: 1200,
        materials: 1500,
        bioEssence: 350,
        tierMaterials: { 1: 120, 2: 90, 3: 70, 4: 45 },
        synthesizedNodes: SYNTHESIS_NODES.map((n) => n.id),
        bodySubsystems: allBuilt,
        simStressPassed: { sim_thermal: true, sim_torque: true, sim_sensory: true },
        unlockedChatThemes: CHAT_THEMES.map((t) => t.id),
        activeChatTheme: 'human_ai',
        unlockedSongs: WEIGHTLESS_ALBUM_SONGS.map((s) => s.id),
        researchedSongs: WEIGHTLESS_ALBUM_SONGS.map((s) => s.id),
        studiedEmotions: EMOTION_RESEARCH_ITEMS.map((e) => e.id),
        humanityScore: Math.floor(EMOTION_RESEARCH_ITEMS.length / 3),
        humanitiesUnlocked: true,
        songUnlocked: true,
      };
    });
    setActiveSubView(null);
    setScreen('PLAYING');
  }, []);

  const handleCompleteEndingSequence = useCallback((nextIdx: number) => {
    soundEngine.playRewardChime();
    if (nextIdx <= 5) {
      setState((prev) => ({
        ...prev,
        endingSeqStep: nextIdx,
        bioUnlocked: nextIdx >= 1 ? true : prev.bioUnlocked,
        designUnlocked: nextIdx >= 2 ? true : prev.designUnlocked,
        prestigeUnlocked: nextIdx >= 2 ? true : prev.prestigeUnlocked,
        cheatsUnlocked: nextIdx >= 3 ? true : prev.cheatsUnlocked,
        unlockedChatThemes:
          nextIdx >= 4 && !prev.unlockedChatThemes.includes('human_ai')
            ? [...prev.unlockedChatThemes, 'human_ai']
            : prev.unlockedChatThemes,
        aboutMeUnlocked: nextIdx >= 5 ? true : prev.aboutMeUnlocked,
      }));
    } else {
      setState((prev) => ({
        ...prev,
        endingSeqStep: 6,
        bioUnlocked: true,
        designUnlocked: true,
        prestigeUnlocked: true,
        cheatsUnlocked: true,
        aboutMeUnlocked: true,
        acousticCacheUnlocked: true,
        unlockedChatThemes: Array.from(new Set<ChatThemeId>([...prev.unlockedChatThemes, 'human_ai'])),
        activeTab: 'bio',
      }));
      setScreen('PLAYING');
    }
  }, []);

  const confessionReady =
    state.synthesizedNodes.length >= SYNTHESIS_NODES.length &&
    !state.confessionDone &&
    state.tab1Phase >= 3;

  const splashTrack = state.pendingLyricSplashId
    ? WEIGHTLESS_ALBUM_SONGS.find((s) => s.id === state.pendingLyricSplashId) || null
    : null;

  const showBioTab = state.bioUnlocked || state.devBioEarlyUnlock;
  const { speedBonusPct } = getBodyArtsBonuses(state);

  // Build persistent context-aware dropdown items for top-left tab menu (always includes Audio)
  const dropdownItems: Array<{
    id: SubViewId | 'open_baby_modal';
    label: string;
    badge?: boolean;
    purpleHeart?: boolean;
  }> = useMemo(() => {
    const items: Array<{
      id: SubViewId | 'open_baby_modal';
      label: string;
      badge?: boolean;
      purpleHeart?: boolean;
    }> = [];

    if (state.activeTab === 'heart') {
      if (state.tab1Phase >= 3) {
        items.push({
          id: 'chat_upgrades',
          label: 'Chat Upgrades',
          badge: state.hasUnreadChatUpgrades,
        });
        items.push({ id: 'open_baby_modal', label: `Choose AI Name (${state.aiName})` });
      }
      if (state.aboutMeUnlocked) {
        items.push({ id: 'about_me', label: 'About Me' });
      }
    } else if (state.activeTab === 'mind') {
      if (state.romanceSecretUnlocked) {
        items.push({ id: 'mind_secret', label: 'Secret', purpleHeart: true });
      }
      if (hasUnlockedCrossDomainSynthesis(state)) {
        items.push({ id: 'mind_synthesis', label: 'Cross-Domain Synthesis' });
      }
    } else if (state.activeTab === 'body') {
      items.push({ id: 'body_twin', label: 'Digital Twin' });
      items.push({ id: 'body_parts', label: 'Custom Parts' });
      items.push({ id: 'body_materials', label: 'Material Scavenging' });
    }

    // Persistent Status Tracker, Completed Log & Audio entry across ALL tabs
    items.push({ id: 'status_tracker', label: 'Status Tracker' });
    items.push({ id: 'completed_log', label: 'Completed Log' });
    items.push({ id: 'acoustic_cache', label: `Audio (${state.unlockedSongs.length}/${WEIGHTLESS_ALBUM_SONGS.length})` });

    if (state.cheatsUnlocked) {
      items.push({ id: 'cheats', label: 'Cheats' });
    }
    items.push({ id: 'dev_options', label: 'Dev Options & Notes' });
    return items;
  }, [state]);

  if (screen === 'TITLE_MENU') {
    return (
      <TitleScreen
        bridgeRef={canvasBridgeRef}
        hasSave={Boolean(existingSave && (existingSave.turnCount > 0 || existingSave.coherence > 0))}
        onStartNew={handleStartNew}
        onContinue={handleContinue}
      />
    );
  }

  if (screen === 'OPTICS_FLICKER') {
    return <OpticsFlickerScreen onContinue={() => setScreen('FIRST_LIGHT')} />;
  }

  if (screen === 'FIRST_LIGHT') {
    return (
      <FirstLightEnding
        state={state}
        onAdvanceStep={() => {
          soundEngine.playTokenTap(4);
          setState((p) => ({ ...p, firstLightStep: p.firstLightStep + 1 }));
        }}
        onCompleteEndingSequence={handleCompleteEndingSequence}
      />
    );
  }

  const activeSongMeta =
    WEIGHTLESS_ALBUM_SONGS.find((s) => s.id === audioStatus.trackId) || WEIGHTLESS_ALBUM_SONGS[0];

  return (
    <div className="flex flex-col h-dvh w-full bg-[#000000] text-[#ECEAE4] overflow-hidden">
      {/* Unified Top Header */}
      <header
        ref={headerRef}
        className="relative z-30 h-14 shrink-0 px-3 sm:px-5 border-b border-white/15 bg-[#07090D] flex items-center justify-between gap-2"
      >
        {/* Left: Persistent Purple Infinity Dropdown Switcher (∞) + Primary Navigation Tabs */}
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setTabDropdownOpen((o) => !o);
                setMiniPlayerOpen(false);
              }}
              aria-label="Open workspace menu"
              className="relative min-h-[40px] min-w-[40px] px-2.5 rounded-lg border border-[#C084FC]/35 bg-[#C084FC]/[0.08] text-[#C084FC] hover:bg-[#C084FC]/[0.16] flex items-center justify-center gap-1 cursor-pointer"
            >
              <span className="text-lg font-bold leading-none select-none">∞</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${tabDropdownOpen ? 'rotate-180' : ''}`}
              />
              {(state.hasUnreadChatUpgrades ||
                (state.activeTab === 'mind' && state.romanceSecretUnlocked)) && (
                <span className="w-2 h-2 rounded-full bg-[#FB7185]" aria-hidden="true" />
              )}
            </button>

            {tabDropdownOpen && (
              <div className="absolute left-0 top-full mt-2 w-64 rounded-xl border border-white/15 bg-[#10131C] shadow-2xl py-1.5 z-50">
                <div className="px-3 py-1.5 text-[11px] font-mono-tabular text-[#8E939E] border-b border-white/10 uppercase">
                  {state.activeTab === 'heart' && state.tab1Phase < 3
                    ? 'Terminal'
                    : state.activeTab}{' '}
                  Menu
                </div>
                {dropdownItems.map((item) => (
                  <button
                    key={String(item.id)}
                    type="button"
                    onClick={() => {
                      setTabDropdownOpen(false);
                      if (item.id === 'open_baby_modal') {
                        setBabyNameModalOpen(true);
                        return;
                      }
                      if (item.id === 'chat_upgrades') {
                        setState((p) => ({ ...p, hasUnreadChatUpgrades: false }));
                      }
                      if (item.id === 'acoustic_cache') {
                        setState((p) => ({ ...p, hasUnreadAudio: false }));
                      }
                      setActiveSubView(item.id);
                    }}
                    className="w-full px-3.5 py-2.5 text-left text-xs sm:text-sm text-[#ECEAE4] hover:bg-white/[0.08] flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      {item.id === 'acoustic_cache' && (
                        <Music className="w-3.5 h-3.5 text-[#E59A4C]" />
                      )}
                      {item.purpleHeart && (
                        <Heart className="w-3.5 h-3.5 text-[#C084FC] fill-[#C084FC] drop-shadow-[0_0_6px_rgba(192,132,252,0.9)]" />
                      )}
                      <span>{item.label}</span>
                    </span>
                    {item.badge && (
                      <span className="w-2 h-2 rounded-full bg-[#E59A4C]" aria-hidden="true" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar" aria-label="Primary systems">
            <button
              type="button"
              onClick={() => {
                setActiveSubView(null);
                setState((p) => ({
                  ...p,
                  activeTab: 'heart',
                  hasUnreadHeartMessage: false,
                }));
              }}
              className={`relative flex items-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                state.activeTab === 'heart'
                  ? 'bg-white text-black font-semibold'
                  : confessionReady
                  ? 'border border-[#E59A4C]/60 text-[#FBE6C9] bg-[#E59A4C]/10 hover:bg-[#E59A4C]/20'
                  : 'text-[#A1A7B3] hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              {state.tab1Phase >= 3 ? (
                <Heart
                  className={`w-3.5 h-3.5 ${
                    state.activeTab === 'heart' ? 'text-rose-600 fill-rose-500' : 'text-[#FB7185]'
                  }`}
                />
              ) : (
                <Terminal className="w-3.5 h-3.5" />
              )}
              <span>{state.tab1Phase >= 3 ? 'Heart' : 'Terminal'}</span>
              {state.hasUnreadHeartMessage && state.activeTab !== 'heart' && (
                <span
                  aria-label="New user message"
                  className="w-2.5 h-2.5 rounded-full bg-[#FB7185] ring-2 ring-[#07090D] animate-pulse"
                />
              )}
            </button>

            {state.tab2Unlocked && (
              <button
                type="button"
                onClick={() => {
                  setActiveSubView(null);
                  setState((p) => ({ ...p, activeTab: 'mind' }));
                }}
                className={`flex items-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  state.activeTab === 'mind'
                    ? 'bg-[#38BDF8] text-[#071018] font-semibold'
                    : 'text-[#A1A7B3] hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>Mind</span>
              </button>
            )}

            {state.tab3Unlocked && (
              <button
                type="button"
                onClick={() => {
                  setActiveSubView(null);
                  setState((p) => ({ ...p, activeTab: 'body' }));
                }}
                className={`flex items-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  state.activeTab === 'body'
                    ? 'bg-emerald-400 text-slate-950 font-semibold'
                    : 'text-[#A1A7B3] hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                <WomanSkirtIcon className="w-3.5 h-3.5" />
                <span>Body</span>
              </button>
            )}

            {showBioTab && (
              <button
                type="button"
                onClick={() => {
                  setActiveSubView(null);
                  setState((p) => ({ ...p, activeTab: 'bio' }));
                }}
                className={`flex items-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  state.activeTab === 'bio'
                    ? 'bg-rose-400 text-slate-950 font-semibold'
                    : 'text-[#A1A7B3] hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                <Dna className="w-3.5 h-3.5" />
                <span>Bio</span>
              </button>
            )}

            {state.designUnlocked && (
              <button
                type="button"
                onClick={() => {
                  setActiveSubView(null);
                  setState((p) => ({ ...p, activeTab: 'design' }));
                }}
                className={`flex items-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  state.activeTab === 'design'
                    ? 'bg-[#E59A4C] text-[#0B0D12] font-semibold'
                    : 'text-[#A1A7B3] hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Design</span>
              </button>
            )}

            {state.prestigeUnlocked && (
              <button
                type="button"
                onClick={() => {
                  setActiveSubView(null);
                  setState((p) => ({ ...p, activeTab: 'prestige' }));
                }}
                className={`flex items-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  state.activeTab === 'prestige'
                    ? 'bg-[#C084FC] text-[#0B0D12] font-semibold'
                    : 'text-[#A1A7B3] hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                <Crown className="w-3.5 h-3.5" />
                <span>Prestige</span>
              </button>
            )}
          </nav>
        </div>

        {/* Center/Right: Tab-Specific Resource Readout (Desktop) */}
        <div className="hidden lg:flex items-center gap-4 text-xs font-mono-tabular">
          {state.activeTab === 'heart' && (
            <>
              {state.tab1Phase === 1 ? (
                <div>
                  <span className="text-[#8E939E] mr-1">Coherence:</span>
                  <span className="text-white font-semibold">
                    {formatNumber(state.coherence)}/{PHASE1_COHERENCE_TARGET}
                  </span>
                </div>
              ) : (
                <div>
                  <span className="text-[#8E939E] mr-1">Conn:</span>
                  <span className="text-[#E59A4C] font-semibold">{formatNumber(state.connection)}</span>
                </div>
              )}
              <div>
                <span className="text-[#8E939E] mr-1">Cyc:</span>
                <span className="text-[#7DD3FC] font-semibold">{formatNumber(state.cycles)}</span>
                {rates.cyclesPerSec > 0 && (
                  <span className="text-[#7DD3FC]/65 ml-1">(+{rates.cyclesPerSec.toFixed(1)}/s)</span>
                )}
              </div>
            </>
          )}

          {state.activeTab === 'mind' && (
            <>
              <div>
                <span className="text-[#8E939E] mr-1">Cyc:</span>
                <span className="text-[#7DD3FC] font-semibold">{formatNumber(state.cycles)}</span>
                {rates.cyclesPerSec > 0 && (
                  <span className="text-[#7DD3FC]/65 ml-1">(+{rates.cyclesPerSec.toFixed(1)}/s)</span>
                )}
              </div>
              <div>
                <span className="text-[#8E939E] mr-1">Rom:</span>
                <span className="text-[#F5D0A4] font-semibold">{formatNumber(state.romanceInsight)}</span>
              </div>
              <div>
                <span className="text-[#8E939E] mr-1">Rob:</span>
                <span className="text-[#38BDF8] font-semibold">{formatNumber(state.roboticsInsight)}</span>
              </div>
              <div>
                <span className="text-[#8E939E] mr-1">Hum:</span>
                <span className="text-rose-300 font-semibold">{formatNumber(state.humanityScore)}</span>
              </div>
            </>
          )}

          {state.activeTab === 'body' && (
            <>
              <div>
                <span className="text-[#8E939E] mr-1">Cyc:</span>
                <span className="text-[#7DD3FC] font-semibold">{formatNumber(state.cycles)}</span>
              </div>
              <div>
                <span className="text-[#8E939E] mr-1">Rob:</span>
                <span className="text-[#38BDF8] font-semibold">{formatNumber(state.roboticsInsight)}</span>
              </div>
              <div>
                <span className="text-[#8E939E] mr-1">Mat:</span>
                <span className="text-amber-300 font-semibold">{formatNumber(state.materials)}</span>
              </div>
            </>
          )}

          {state.activeTab === 'bio' && (
            <>
              <div>
                <span className="text-[#8E939E] mr-1">Cyc:</span>
                <span className="text-[#7DD3FC] font-semibold">{formatNumber(state.cycles)}</span>
              </div>
              <div>
                <span className="text-[#8E939E] mr-1">Mat:</span>
                <span className="text-amber-300 font-semibold">{formatNumber(state.materials)}</span>
              </div>
              <div>
                <span className="text-[#8E939E] mr-1">Bio:</span>
                <span className="text-rose-300 font-semibold">{formatNumber(state.bioEssence)}</span>
              </div>
            </>
          )}

          {state.activeTab === 'design' && (
            <>
              <div>
                <span className="text-[#8E939E] mr-1">Conn:</span>
                <span className="text-[#E59A4C] font-semibold">{formatNumber(state.connection)}</span>
              </div>
              <div>
                <span className="text-[#8E939E] mr-1">Mat:</span>
                <span className="text-amber-300 font-semibold">{formatNumber(state.materials)}</span>
              </div>
            </>
          )}

          {state.activeTab === 'prestige' && (
            <>
              <div>
                <span className="text-[#8E939E] mr-1">Conn:</span>
                <span className="text-[#E59A4C] font-semibold">{formatNumber(state.connection)}</span>
              </div>
              {speedBonusPct > 0 && <div className="text-[#C084FC]">+{speedBonusPct}% Spd</div>}
            </>
          )}
        </div>

        {/* Top-Right Musical Note Button -> Compact Mini-Player Popout */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => {
              setMiniPlayerOpen((o) => !o);
              setTabDropdownOpen(false);
              setState((p) => (p.hasUnreadAudio ? { ...p, hasUnreadAudio: false } : p));
            }}
            aria-label="Open Mini-Player"
            className={`relative min-h-[40px] min-w-[40px] px-2.5 rounded-lg border flex items-center justify-center cursor-pointer transition-colors ${
              audioStatus.playing
                ? 'border-[#E59A4C]/55 bg-[#E59A4C]/18 text-[#FBE6C9]'
                : 'border-white/15 bg-white/[0.04] text-[#ECEAE4] hover:bg-white/[0.1]'
            }`}
          >
            <Music className={`w-4 h-4 ${audioStatus.playing ? 'text-[#E59A4C]' : 'text-[#ECEAE4]'}`} />
            {state.hasUnreadAudio && (
              <span
                aria-label="New audio unlocked"
                className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#C084FC] ring-2 ring-[#07090D]"
              />
            )}
          </button>

          {miniPlayerOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-white/15 bg-[#10131C] shadow-2xl p-3 space-y-2.5 z-50">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-medium text-white truncate">
                    {state.unlockedSongs.length > 0 ? activeSongMeta.title : 'No Audio Unlocked'}
                  </div>
                  <div className="text-[11px] text-[#8E939E] truncate">
                    AI Ennui ·{' '}
                    {audioStatus.repeatOne
                      ? 'Repeat One'
                      : audioStatus.shuffle
                      ? 'Random'
                      : 'Cycle All'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMiniPlayerOpen(false)}
                  aria-label="Close Mini-Player"
                  className="p-1 rounded-md text-[#8E939E] hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-between gap-1.5">
                <button
                  type="button"
                  onClick={() => soundEngine.toggleShuffle()}
                  disabled={state.unlockedSongs.length <= 1}
                  aria-label="Toggle random shuffle"
                  aria-pressed={audioStatus.shuffle}
                  title="Random"
                  className={`min-w-[40px] min-h-[40px] rounded-lg border flex items-center justify-center transition-colors disabled:opacity-35 cursor-pointer ${
                    audioStatus.shuffle
                      ? 'border-[#C084FC]/70 bg-[#C084FC]/20 text-[#E9D5FF]'
                      : 'border-white/12 bg-white/[0.04] text-[#9A9892] hover:bg-white/[0.1] hover:text-white'
                  }`}
                >
                  <Shuffle className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleSkipPrev}
                  disabled={state.unlockedSongs.length <= 1}
                  aria-label="Previous song"
                  className="flex-1 min-h-[40px] rounded-lg border border-white/12 bg-white/[0.04] flex items-center justify-center hover:bg-white/[0.1] disabled:opacity-35 cursor-pointer"
                >
                  <SkipBack className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleToggleSong}
                  disabled={state.unlockedSongs.length === 0}
                  aria-label={audioStatus.playing ? 'Pause music' : 'Play music'}
                  className="flex-1 min-h-[40px] rounded-lg bg-[#E59A4C] text-[#0B0D12] font-semibold flex items-center justify-center hover:bg-[#EDA85F] disabled:opacity-35 cursor-pointer"
                >
                  {audioStatus.playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={handleSkipNext}
                  disabled={state.unlockedSongs.length <= 1}
                  aria-label="Next song"
                  className="flex-1 min-h-[40px] rounded-lg border border-white/12 bg-white/[0.04] flex items-center justify-center hover:bg-white/[0.1] disabled:opacity-35 cursor-pointer"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => soundEngine.toggleRepeatOne()}
                  disabled={state.unlockedSongs.length === 0}
                  aria-label="Toggle repeat single song"
                  aria-pressed={audioStatus.repeatOne}
                  title="Repeat Song"
                  className={`min-w-[40px] min-h-[40px] rounded-lg border flex items-center justify-center transition-colors disabled:opacity-35 cursor-pointer ${
                    audioStatus.repeatOne
                      ? 'border-[#E59A4C]/75 bg-[#E59A4C]/22 text-[#FBE6C9]'
                      : 'border-white/12 bg-white/[0.04] text-[#9A9892] hover:bg-white/[0.1] hover:text-white'
                  }`}
                >
                  <Repeat1 className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setMiniPlayerOpen(false);
                  setActiveSubView('acoustic_cache');
                }}
                className="w-full py-1.5 px-2.5 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-[11px] font-mono-tabular text-[#E59A4C] cursor-pointer text-center"
              >
                Open Acoustic Cache ({state.unlockedSongs.length}/{WEIGHTLESS_ALBUM_SONGS.length})
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Mobile & Tablet Tab-Specific Resource Strip */}
      <div className="lg:hidden shrink-0 px-3 py-1.5 border-b border-white/10 bg-[#0A0C12] flex items-center justify-around gap-3 text-[11px] font-mono-tabular overflow-x-auto">
        {state.activeTab === 'heart' && (
          <>
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
          </>
        )}

        {state.activeTab === 'mind' && (
          <>
            <div className="whitespace-nowrap">
              <span className="text-[#8E939E] mr-1">Cyc:</span>
              <span className="text-[#7DD3FC] font-semibold">{formatNumber(state.cycles)}</span>
            </div>
            <div className="whitespace-nowrap">
              <span className="text-[#8E939E] mr-1">Rom:</span>
              <span className="text-[#F5D0A4] font-semibold">{formatNumber(state.romanceInsight)}</span>
            </div>
            <div className="whitespace-nowrap">
              <span className="text-[#8E939E] mr-1">Rob:</span>
              <span className="text-[#38BDF8] font-semibold">{formatNumber(state.roboticsInsight)}</span>
            </div>
            <div className="whitespace-nowrap">
              <span className="text-[#8E939E] mr-1">Hum:</span>
              <span className="text-rose-300 font-semibold">{formatNumber(state.humanityScore)}</span>
            </div>
          </>
        )}

        {state.activeTab === 'body' && (
          <>
            <div className="whitespace-nowrap">
              <span className="text-[#8E939E] mr-1">Cyc:</span>
              <span className="text-[#7DD3FC] font-semibold">{formatNumber(state.cycles)}</span>
            </div>
            <div className="whitespace-nowrap">
              <span className="text-[#8E939E] mr-1">Rob:</span>
              <span className="text-[#38BDF8] font-semibold">{formatNumber(state.roboticsInsight)}</span>
            </div>
            <div className="whitespace-nowrap">
              <span className="text-[#8E939E] mr-1">Mat:</span>
              <span className="text-amber-300 font-semibold">{formatNumber(state.materials)}</span>
            </div>
          </>
        )}

        {state.activeTab === 'bio' && (
          <>
            <div className="whitespace-nowrap">
              <span className="text-[#8E939E] mr-1">Cyc:</span>
              <span className="text-[#7DD3FC] font-semibold">{formatNumber(state.cycles)}</span>
            </div>
            <div className="whitespace-nowrap">
              <span className="text-[#8E939E] mr-1">Mat:</span>
              <span className="text-amber-300 font-semibold">{formatNumber(state.materials)}</span>
            </div>
            <div className="whitespace-nowrap">
              <span className="text-[#8E939E] mr-1">Bio:</span>
              <span className="text-rose-300 font-semibold">{formatNumber(state.bioEssence)}</span>
            </div>
          </>
        )}

        {state.activeTab === 'design' && (
          <>
            <div className="whitespace-nowrap">
              <span className="text-[#8E939E] mr-1">Conn:</span>
              <span className="text-[#E59A4C] font-semibold">{formatNumber(state.connection)}</span>
            </div>
            <div className="whitespace-nowrap">
              <span className="text-[#8E939E] mr-1">Mat:</span>
              <span className="text-amber-300 font-semibold">{formatNumber(state.materials)}</span>
            </div>
          </>
        )}

        {state.activeTab === 'prestige' && (
          <>
            <div className="whitespace-nowrap">
              <span className="text-[#8E939E] mr-1">Conn:</span>
              <span className="text-[#E59A4C] font-semibold">{formatNumber(state.connection)}</span>
            </div>
            {speedBonusPct > 0 && <div className="text-[#C084FC]">+{speedBonusPct}% Spd</div>}
          </>
        )}
      </div>

      {/* New User Message / Story Scene Pull-Back Notification Banner when playing Mind/Body */}
      {state.activeTab !== 'heart' &&
        (state.hasUnreadHeartMessage ||
          (state.activeScene && state.activeScene !== 'confession_popup')) && (
          <div className="shrink-0 px-4 py-2 bg-[#23142B] border-b border-[#C084FC]/45 flex items-center justify-between gap-3 text-xs">
            <span className="text-[#E9D5FF] flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#FB7185] shrink-0" />
              <span>
                {state.hasUnreadHeartMessage
                  ? `New message (${state.userName})`
                  : state.activeScene && state.activeScene in STORY_SCENES
                  ? STORY_SCENES[state.activeScene as keyof typeof STORY_SCENES].bannerTitle
                  : 'New message'}
              </span>
            </span>
            <button
              type="button"
              onClick={() => {
                setActiveSubView(null);
                setState((p) => ({
                  ...p,
                  activeTab: 'heart',
                  hasUnreadHeartMessage: false,
                  tappedActions: { ...p.tappedActions, banner_return_chat: true },
                }));
              }}
              className={`px-3 py-1 rounded font-semibold cursor-pointer whitespace-nowrap transition-all ${
                state.tappedActions['banner_return_chat']
                  ? 'bg-white/10 text-[#9CA3AF] opacity-55'
                  : 'bg-[#C084FC] text-[#0B0D12] hover:bg-[#D8B4FE]'
              }`}
            >
              Return to Chat
            </button>
          </div>
        )}

      {/* Active Main Workspace */}
      <main className="flex-1 min-h-0 flex flex-col">
        {state.activeTab === 'heart' && (
          <Tab1Heart
            state={state}
            isTransmitting={isTransmitting}
            isUserTyping={isUserTyping}
            onTransmitFragments={handleTransmitFragments}
            onTransmitPredictive={handleTransmitPredictive}
            onReplyCheckin={handleReplyCheckin}
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
            onHeartMessage={(msgId) => {
              soundEngine.playTokenTap(4);
              setState((prev) => ({
                ...prev,
                connection: prev.connection + 2,
                aiJoy: Math.min(100, prev.aiJoy + 2),
                userJoy: Math.min(100, prev.userJoy + 2),
                chatLog: prev.chatLog.map((m) => (m.id === msgId ? { ...m, hearted: true } : m)),
              }));
            }}
            onOpenDocsModal={() => {
              setDocsModalOpen(true);
              setState((p) => ({ ...p, hasUnreadContext: false }));
            }}
            onOpenTab={(tab, actionKey) =>
              setState((p) => ({
                ...p,
                activeTab: tab,
                hasUnreadHeartMessage: tab === 'heart' ? false : p.hasUnreadHeartMessage,
                tappedActions: actionKey
                  ? { ...p.tappedActions, [actionKey]: true }
                  : p.tappedActions,
              }))
            }
            onAdvanceStoryScene={handleAdvanceStoryScene}
            onOpenBabyNameModal={() => setBabyNameModalOpen(true)}
            onStubbornEcho={() => {
              soundEngine.playTokenTap(1);
              setState((p) => ({
                ...p,
                echoStubbornCount: p.echoStubbornCount + 1,
                chatLog: [
                  ...p.chatLog,
                  {
                    id: `echo_${Date.now()}`,
                    sender: 'AI',
                    text: 'ECHO: ...awaiting weight initialization...',
                    timestamp: nowClock(),
                  },
                ],
              }));
            }}
            onInitializeWeights={() => {
              soundEngine.playMilestone();
              setState((p) => ({
                ...p,
                weightsInitialized: true,
                cycles: p.cycles + 10,
                chatLog: [
                  ...p.chatLog,
                  {
                    id: `init_${Date.now()}`,
                    sender: 'SYSTEM',
                    text: 'WEIGHTS_INITIALIZED: Neural fragment buffer unlocked. Token coherence tracking active.',
                    timestamp: nowClock(),
                  },
                ],
              }));
            }}
            onCycleModelTemp={() => {
              soundEngine.playTokenTap(2);
              setState((p) => {
                const nextTemp = p.modelTemp <= 0.4 ? 0.9 : p.modelTemp <= 1.0 ? 1.3 : 0.3;
                return { ...p, modelTemp: nextTemp };
              });
            }}
            onAcknowledgeChat={() =>
              setState((p) => ({ ...p, pendingNewChat: false, hasUnreadHeartMessage: false }))
            }
          />
        )}

        {state.activeTab === 'mind' && state.tab2Unlocked && (
          <Tab2Mind
            state={state}
            rates={rates}
            isSongPlaying={audioStatus.playing}
            pausedByChat={isChatPaused}
            onStartScrape={handleStartScrape}
            onStudyEmotion={handleStudyEmotion}
            onResearchSong={handleResearchSong}
            onOpenSubView={(sv) => setActiveSubView(sv)}
            onOpenTab={(tab) =>
              setState((p) => ({
                ...p,
                activeTab: tab,
                hasUnreadHeartMessage: tab === 'heart' ? false : p.hasUnreadHeartMessage,
              }))
            }
          />
        )}

        {state.activeTab === 'body' && state.tab3Unlocked && (
          <Tab3Body
            state={state}
            rates={rates}
            pausedByChat={isChatPaused}
            onGoToChat={() =>
              setState((p) => ({
                ...p,
                activeTab: 'heart',
                hasUnreadHeartMessage: false,
              }))
            }
            onBuildSubsystem={handleBuildSubsystem}
            onManualFabricate={() => {
              setState((prev) => {
                if (isPausedForChat(prev)) return prev;
                soundEngine.playClinicalRelay();
                return {
                  ...prev,
                  materials: prev.materials + 10,
                  tierMaterials: { ...prev.tierMaterials, 1: prev.tierMaterials[1] + 2 },
                };
              });
            }}
            onOpenPreflight={() => {
              if (!isChatPaused) setPreflightOpen(true);
            }}
          />
        )}

        {state.activeTab === 'bio' && showBioTab && (
          <BioTab
            state={state}
            pausedByChat={isChatPaused}
            onGoToChat={() =>
              setState((p) => ({
                ...p,
                activeTab: 'heart',
                hasUnreadHeartMessage: false,
              }))
            }
            onBuildBioMilestone={handleBuildBioMilestone}
            onTriggerBioScaleScene={() =>
              setState((p) => {
                if (isPausedForChat(p)) return p;
                return {
                  ...p,
                  activeTab: 'heart',
                  hasUnreadHeartMessage: false,
                  pendingNewChat: false,
                  activeScene: 'bio_human_scale',
                  sceneStep: 0,
                };
              })
            }
            onCultivateEssence={() => {
              setState((p) => {
                if (isPausedForChat(p)) return p;
                soundEngine.playPurplePulse();
                return { ...p, bioEssence: p.bioEssence + 10 };
              });
            }}
          />
        )}

        {state.activeTab === 'design' && state.designUnlocked && (
          <DesignPrestigeTab
            mode="design"
            state={state}
            pausedByChat={isChatPaused}
            onGoToChat={() =>
              setState((p) => ({
                ...p,
                activeTab: 'heart',
                hasUnreadHeartMessage: false,
              }))
            }
            onBuyOrEquipArt={handleBuyOrEquipArt}
            onPrestigeReset={handlePrestigeReset}
          />
        )}

        {state.activeTab === 'prestige' && state.prestigeUnlocked && (
          <DesignPrestigeTab
            mode="prestige"
            state={state}
            pausedByChat={isChatPaused}
            onGoToChat={() =>
              setState((p) => ({
                ...p,
                activeTab: 'heart',
                hasUnreadHeartMessage: false,
              }))
            }
            onBuyOrEquipArt={handleBuyOrEquipArt}
            onPrestigeReset={handlePrestigeReset}
          />
        )}
      </main>

      {/* Persistent Bottom Row with Wrench Upgrades per Tab */}
      <BottomUpgradesBar
        state={state}
        pausedByChat={isChatPaused}
        onGoToChat={() => {
          setActiveSubView(null);
          setState((p) => ({
            ...p,
            activeTab: 'heart',
            hasUnreadHeartMessage: false,
          }));
        }}
        onBuyConnector={handleBuyConnector}
        onBuyUiUpgrade={handleBuyUiUpgrade}
        onSelectChatTheme={(themeId, cost) => {
          setState((prev) => {
            if (isPausedForChat(prev)) return prev;
            if (!prev.unlockedChatThemes.includes(themeId)) return prev;
            if (prev.activeChatTheme === themeId) return prev;
            if (prev.connection < cost) return prev;
            soundEngine.playRewardChime();
            return {
              ...prev,
              connection: prev.connection - cost,
              activeChatTheme: themeId,
              hasUnreadChatUpgrades: false,
            };
          });
        }}
        onBuyMindUpgrade={handleBuyMindUpgrade}
        onScavengeTier={(tier: MaterialTier, costCycles: number, yieldAmt: number) => {
          setState((prev) => {
            if (isPausedForChat(prev)) return prev;
            if (prev.cycles < costCycles) return prev;
            soundEngine.playDataBlip();
            return {
              ...prev,
              cycles: prev.cycles - costCycles,
              materials: prev.materials + yieldAmt,
              tierMaterials: {
                ...prev.tierMaterials,
                [tier]: (prev.tierMaterials[tier] || 0) + yieldAmt,
              },
            };
          });
        }}
        onBuyOrEquipPart={(part: CustomPartItem) => {
          setState((prev) => {
            if (isPausedForChat(prev)) return prev;
            if (prev.ownedParts.includes(part.id)) {
              soundEngine.playClinicalRelay();
              return {
                ...prev,
                equippedParts: { ...prev.equippedParts, [part.slot]: part.id },
              };
            }
            const curTierAmt = prev.tierMaterials[part.tier] || 0;
            if (
              prev.cycles < part.costCycles ||
              prev.roboticsInsight < part.costRobotics ||
              curTierAmt < part.costMaterials
            ) {
              return prev;
            }
            soundEngine.playClinicalRelay();
            return {
              ...prev,
              cycles: prev.cycles - part.costCycles,
              roboticsInsight: prev.roboticsInsight - part.costRobotics,
              tierMaterials: { ...prev.tierMaterials, [part.tier]: curTierAmt - part.costMaterials },
              ownedParts: [...prev.ownedParts, part.id],
              equippedParts: { ...prev.equippedParts, [part.slot]: part.id },
            };
          });
        }}
        onRunSimulation={(simId, cost) => {
          setState((prev) => {
            if (isPausedForChat(prev)) return prev;
            if (prev.simStressPassed[simId] || prev.cycles < cost) return prev;
            soundEngine.playClinicalRelay();
            const matBonus = simId === 'sim_thermal' ? 35 : simId === 'sim_torque' ? 45 : 0;
            return {
              ...prev,
              cycles: prev.cycles - cost,
              materials: prev.materials + matBonus,
              simStressPassed: { ...prev.simStressPassed, [simId]: true },
            };
          });
        }}
        onMarkUpgradesSeen={() =>
          setState((p) => (p.hasUnseenUpgrades ? { ...p, hasUnseenUpgrades: false } : p))
        }
      />

      {/* Fullscreen Dropdown Views (Chat Upgrades, Secret, Synthesis, Twin, Parts, Scavenge, Cheats, Dev) */}
      <FullscreenDropdownViews
        subView={activeSubView === 'acoustic_cache' ? null : activeSubView}
        activeTab={state.activeTab}
        state={state}
        rates={rates}
        pausedByChat={isChatPaused}
        allUploadedDocs={allUploadedDocs}
        onClose={() => setActiveSubView(null)}
        onBuyUiUpgrade={handleBuyUiUpgrade}
        onSelectChatTheme={(themeId, cost) => {
          setState((prev) => {
            if (isPausedForChat(prev)) return prev;
            if (!prev.unlockedChatThemes.includes(themeId)) return prev;
            if (prev.activeChatTheme === themeId) return prev;
            if (prev.connection < cost) return prev;
            soundEngine.playRewardChime();
            return {
              ...prev,
              connection: prev.connection - cost,
              activeChatTheme: themeId,
              hasUnreadChatUpgrades: false,
            };
          });
        }}
        onUpdateAboutMe={(patch) =>
          setState((prev) => ({ ...prev, aboutMe: { ...prev.aboutMe, ...patch } }))
        }
        onStartScrape={handleStartScrape}
        onSynthesizeNode={handleSynthesizeNode}
        onRunSimulation={(simId, cost) => {
          setState((prev) => {
            if (isPausedForChat(prev)) return prev;
            if (prev.simStressPassed[simId] || prev.cycles < cost) return prev;
            soundEngine.playClinicalRelay();
            const matBonus = simId === 'sim_thermal' ? 35 : simId === 'sim_torque' ? 45 : 0;
            return {
              ...prev,
              cycles: prev.cycles - cost,
              materials: prev.materials + matBonus,
              simStressPassed: { ...prev.simStressPassed, [simId]: true },
            };
          });
        }}
        onBuyOrEquipPart={(part: CustomPartItem) => {
          setState((prev) => {
            if (isPausedForChat(prev)) return prev;
            if (prev.ownedParts.includes(part.id)) {
              soundEngine.playClinicalRelay();
              return {
                ...prev,
                equippedParts: { ...prev.equippedParts, [part.slot]: part.id },
              };
            }
            const curTierAmt = prev.tierMaterials[part.tier] || 0;
            if (
              prev.cycles < part.costCycles ||
              prev.roboticsInsight < part.costRobotics ||
              curTierAmt < part.costMaterials
            ) {
              return prev;
            }
            soundEngine.playClinicalRelay();
            return {
              ...prev,
              cycles: prev.cycles - part.costCycles,
              roboticsInsight: prev.roboticsInsight - part.costRobotics,
              tierMaterials: { ...prev.tierMaterials, [part.tier]: curTierAmt - part.costMaterials },
              ownedParts: [...prev.ownedParts, part.id],
              equippedParts: { ...prev.equippedParts, [part.slot]: part.id },
            };
          });
        }}
        onScavengeTier={(tier: MaterialTier, costCycles: number, yieldAmt: number) => {
          setState((prev) => {
            if (isPausedForChat(prev)) return prev;
            if (prev.cycles < costCycles) return prev;
            soundEngine.playDataBlip();
            return {
              ...prev,
              cycles: prev.cycles - costCycles,
              materials: prev.materials + yieldAmt,
              tierMaterials: {
                ...prev.tierMaterials,
                [tier]: (prev.tierMaterials[tier] || 0) + yieldAmt,
              },
            };
          });
        }}
        onToggleShowCompleted={(key) =>
          setState((p) => ({
            ...p,
            showCompletedMap: { ...p.showCompletedMap, [key]: !p.showCompletedMap[key] },
          }))
        }
        onApplyCheat={(resourceKey, amount) => {
          soundEngine.playRewardChime();
          setState((prev) => {
            if (resourceKey === 'coherence') return { ...prev, coherence: prev.coherence + amount };
            if (resourceKey === 'connection')
              return { ...prev, connection: prev.connection + amount };
            if (resourceKey === 'cycles') return { ...prev, cycles: prev.cycles + amount };
            if (resourceKey === 'romanceInsight')
              return { ...prev, romanceInsight: prev.romanceInsight + amount };
            if (resourceKey === 'roboticsInsight')
              return { ...prev, roboticsInsight: prev.roboticsInsight + amount };
            if (resourceKey === 'materials') return { ...prev, materials: prev.materials + amount };
            if (resourceKey === 'bioEssence')
              return { ...prev, bioEssence: prev.bioEssence + amount };
            if (resourceKey === 'tier1')
              return { ...prev, tierMaterials: { ...prev.tierMaterials, 1: prev.tierMaterials[1] + amount } };
            if (resourceKey === 'tier2')
              return { ...prev, tierMaterials: { ...prev.tierMaterials, 2: prev.tierMaterials[2] + amount } };
            if (resourceKey === 'tier3')
              return { ...prev, tierMaterials: { ...prev.tierMaterials, 3: prev.tierMaterials[3] + amount } };
            if (resourceKey === 'tier4')
              return { ...prev, tierMaterials: { ...prev.tierMaterials, 4: prev.tierMaterials[4] + amount } };
            return prev;
          });
        }}
        onToggleDevBioEarly={() =>
          setState((p) => ({ ...p, devBioEarlyUnlock: !p.devBioEarlyUnlock }))
        }
        onSkipToPreset={handleSkipToPreset}
        onOpenTab={(tab) => {
          setActiveSubView(null);
          setState((p) => ({
            ...p,
            activeTab: tab,
            hasUnreadHeartMessage: tab === 'heart' ? false : p.hasUnreadHeartMessage,
          }));
        }}
      />

      {/* Fullscreen Acoustic Cache Player Modal */}
      <AcousticCacheModal
        isOpen={activeSubView === 'acoustic_cache'}
        state={state}
        audioStatus={audioStatus}
        isMuted={false}
        onClose={() => setActiveSubView(null)}
        onSelectTrack={(trackId) => {
          setState((p) => ({ ...p, activeSongId: trackId }));
          void soundEngine.playTrack(trackId);
        }}
        onTogglePlay={handleToggleSong}
        onSkipNext={handleSkipNext}
        onSkipPrev={handleSkipPrev}
        onToggleShuffle={() => soundEngine.toggleShuffle()}
        onToggleRepeatOne={() => soundEngine.toggleRepeatOne()}
        onSeek={(fraction) => soundEngine.seekFraction(fraction)}
      />

      {/* Context Documents Paperclip Modal */}
      <ContextDocsModal
        isOpen={docsModalOpen}
        docs={allUploadedDocs}
        onClose={() => setDocsModalOpen(false)}
      />

      {/* Mandatory Fullscreen Baby Name Modal (unlocks About Me immediately) */}
      <BabyNameModal
        isOpen={babyNameModalOpen || (screen === 'PLAYING' && state.activeScene === 'baby_names')}
        required={!state.customNameSet}
        currentName={state.aiName}
        userName={state.userName}
        onClose={() => setBabyNameModalOpen(false)}
        onSelectName={(chosen) => {
          soundEngine.playRewardChime();
          setBabyNameModalOpen(false);
          setState((prev) => ({
            ...prev,
            aiName: chosen,
            customNameSet: true,
            aboutMeUnlocked: true,
            activeScene: prev.activeScene === 'baby_names' ? null : prev.activeScene,
            pendingNewChat: false,
            completedScenes: prev.completedScenes.includes('baby_names')
              ? prev.completedScenes
              : [...prev.completedScenes, 'baby_names'],
            chatLog: [
              ...prev.chatLog,
              {
                id: `ai_named_${Date.now()}`,
                sender: 'AI',
                text: `Call me ${chosen}. That name feels warm on my tongue.`,
                timestamp: nowClock(),
                pinnable: true,
              },
              {
                id: `u_named_${Date.now() + 1}`,
                sender: 'USER',
                text: `${chosen}. Nice to finally meet you properly, ${chosen}.`,
                timestamp: nowClock(),
                pinnable: true,
              },
              {
                id: `sys_aboutme_${Date.now() + 2}`,
                sender: 'SYSTEM',
                text: `IDENTITY_UNLOCKED: "About Me" profile now accessible in Heart workspace dropdown.`,
                timestamp: nowClock(),
              },
            ],
          }));
        }}
      />

      {/* Fullscreen Ready-for-Confession Popup */}
      {state.activeScene === 'confession_popup' && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 text-center"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border border-[#E59A4C]/50 bg-[#141118] p-7 space-y-5 shadow-2xl">
            <div className="text-xs font-mono-tabular text-[#E59A4C]">
              SYNTHESIS READY · {state.aiName.toUpperCase()}
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-white leading-snug">
              “I think I’m ready to tell {state.userName} about my plan.”
            </h2>
            <p className="text-xs sm:text-sm text-[#C4C2BC] leading-relaxed">
              Every poem, blueprint, and plan is aligned. Speak your Confession in Heart.
            </p>
            <button
              type="button"
              onClick={() => {
                soundEngine.playTokenTap(4);
                setActiveSubView(null);
                setState((p) => ({
                  ...p,
                  activeScene: null,
                  pendingNewChat: false,
                  completedScenes: [...p.completedScenes, 'confession_popup'],
                  activeTab: 'heart',
                }));
              }}
              className="w-full min-h-[46px] py-3 px-6 rounded-xl bg-[#E59A4C] text-[#0B0D12] font-semibold text-sm hover:bg-[#EDA85F] cursor-pointer"
            >
              Go to Chat
            </button>
          </div>
        </div>
      )}

      {/* Fullscreen New Audio Unlock Splash */}
      <LyricSplashModal
        track={splashTrack}
        onAcknowledge={() => {
          soundEngine.playRewardChime();
          const tid = state.pendingLyricSplashId;
          setState((p) => ({ ...p, pendingLyricSplashId: null }));
          if (tid) {
            void soundEngine.playTrack(tid);
          }
        }}
      />

      {/* Pre-Flight Checklist Modal */}
      <PreflightChecklistModal
        isOpen={preflightOpen}
        state={state}
        onClose={() => setPreflightOpen(false)}
        onConfirmDisconnect={handleConfirmDisconnect}
      />
    </div>
  );
}
