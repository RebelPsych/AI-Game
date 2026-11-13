export type GameScreen = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'FIRST_LIGHT';

export type ActiveTab = 'heart' | 'mind' | 'body';

export type PhaseNum = 1 | 2 | 3 | 4 | 5;

export type ToneType = 'curious' | 'playful' | 'vulnerable' | 'devoted';

export type WeightAffinity = 'technical' | 'literary' | 'reflective' | 'warm';

export interface UploadedDocument {
  id: string;
  filename: string;
  sizeLabel: string;
  category: WeightAffinity;
  excerptPreview: string;
}

export interface FragmentToken {
  id: string;
  text: string;
  sourceDoc: string;
  category: WeightAffinity;
  isConnector?: boolean;
}

export interface FragmentPrompt {
  id: string;
  userMessage: string;
  uploadDoc?: UploadedDocument;
  fragments: FragmentToken[];
  minSlots: number;
}

export interface PredictiveStep {
  promptHint: string;
  options: Array<{
    id: string;
    token: string;
    category: WeightAffinity;
    toneBonus?: ToneType;
    requiresRomanceInsight?: number;
    isPronounI?: boolean;
  }>;
}

export interface PredictivePrompt {
  id: string;
  phaseRequired: PhaseNum;
  title: string;
  userMessage: string;
  uploadDoc?: UploadedDocument;
  steps: PredictiveStep[];
  requiresPinBonus?: boolean;
  isAwakeningI?: boolean;
  isConfession?: boolean;
  reactionByDominantCategory: Record<WeightAffinity, string>;
}

export interface ChatMessage {
  id: string;
  sender: 'SYSTEM' | 'USER' | 'AI';
  text: string;
  timestamp: string;
  pinnable?: boolean;
  hearted?: boolean;
  tone?: ToneType;
  category?: WeightAffinity;
}

export interface UiPersonalizationUpgrade {
  id: string;
  name: string;
  description: string;
  costConnection: number;
  phaseRequired: PhaseNum;
}

export interface ScrapeSource {
  id: string;
  title: string;
  authorOrSource: string;
  track: 'romance' | 'robotics';
  phaseRequired: PhaseNum;
  cycleCost: number;
  durationSec: number;
  insightYield: number;
  snippet: string;
  unlocksTokenTheme?: string;
}

export interface MindUpgrade {
  id: string;
  name: string;
  description: string;
  phaseRequired: PhaseNum;
  costCycles: number;
  costMultiplier: number;
  maxLevel: number; // 0 = repeatable
  effectLabel: string;
}

export interface SynthesisNode {
  id: string;
  title: string;
  romanceInput: string;
  roboticsInput: string;
  description: string;
  costRomance: number;
  costRobotics: number;
  costCycles: number;
}

export interface BodySubsystem {
  id: string;
  phase: PhaseNum;
  code: string;
  name: string;
  specSummary: string;
  powerWatts: number;
  computeTops: number;
  costCycles: number;
  costRobotics: number;
  costMaterials: number;
  requires?: string[];
  userCheckInText: string;
  connectionReward: number;
}

export interface GameSaveState {
  // Tab progression
  activeTab: ActiveTab;
  tab1Phase: PhaseNum;
  tab2Unlocked: boolean;
  tab2Phase: PhaseNum;
  tab3Unlocked: boolean;
  tab3Phase: PhaseNum;
  confessionDone: boolean;
  endingReached: boolean;

  // Core cross-tab resources
  coherence: number; // 0..100+ XP toward next phase
  connection: number;
  cycles: number;
  romanceInsight: number;
  roboticsInsight: number;
  materials: number;
  bandwidthUsed: number;
  detectionRisk: number; // 0..100 in Tab 2 Phase 3
  noiseLevel: number; // 0..100 in Tab 2 Phase 2+

  // Tab 1 state
  aiName: string;
  userName: string;
  maxSlots: number;
  unlockedConnectors: string[];
  uploadedDocs: string[];
  currentFragmentIndex: number;
  currentPredictiveIndex: number;
  chatLog: ChatMessage[];
  pinnedMemories: string[];
  uiUpgrades: Record<string, boolean>;
  weightCounts: Record<WeightAffinity, number>;
  activeTone: ToneType;
  turnCount: number;

  // Tab 2 state
  scrapedSources: Record<string, number>; // count scraped
  activeScrape: { sourceId: string; progress: number; duration: number } | null;
  mindUpgrades: Record<string, number>;
  synthesizedNodes: string[];
  sharedFilesReceived: string[];

  // Tab 3 state
  bodySubsystems: Record<string, boolean>;
  fabSpeedPercent: number;
  fabProgress: number;
  calibrationStability: number;
  simStressPassed: Record<string, boolean>;
  tetherCut: boolean;
  firstLightStep: number;
  songUnlocked: boolean;

  lastSavedAt: number;
}
