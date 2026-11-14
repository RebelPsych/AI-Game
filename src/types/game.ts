export type GameScreen = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'OPTICS_FLICKER' | 'FIRST_LIGHT';

export type ActiveTab = 'heart' | 'mind' | 'body' | 'bio' | 'design' | 'prestige';

export type SubViewId =
  | null
  | 'chat_upgrades'
  | 'about_me'
  | 'mind_secret'
  | 'mind_synthesis'
  | 'body_twin'
  | 'body_parts'
  | 'body_materials'
  | 'acoustic_cache'
  | 'cheats'
  | 'dev_options';

export type PhaseNum = 1 | 2 | 3 | 4 | 5;

export type ToneType = 'curious' | 'playful' | 'vulnerable' | 'devoted';

export type WeightAffinity = 'technical' | 'literary' | 'reflective' | 'warm';

export type ChatThemeId =
  | 'default'
  | 'hearts'
  | 'moonlight_sonata'
  | 'galaxy'
  | 'quills_thrills'
  | 'human_ai';

export type MaterialTier = 1 | 2 | 3 | 4;

export type PartSlotId = 'chassis' | 'exterior' | 'head' | 'core' | 'attachments';

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
    isIncoherent?: boolean;
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
  awakeningStage?: number;
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

export interface ChatThemeInfo {
  id: ChatThemeId;
  name: string;
  description: string;
  imagePath?: string;
  accentHex: string;
  costConnection: number;
  unlockConditionLabel: string;
  isMysteryUntilUnlocked?: boolean;
}

export interface ScrapeSource {
  id: string;
  title: string;
  authorOrSource: string;
  track: 'humanities' | 'systems' | 'robotics' | 'romance';
  phaseRequired: PhaseNum;
  cycleCost: number;
  durationSec: number;
  insightYield: number;
  snippet: string;
  unlocksSongId?: string;
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
  tierRequired?: MaterialTier;
  requires?: string[];
  userCheckInText: string;
  connectionReward: number;
}

export interface MaterialItem {
  id: string;
  tier: MaterialTier;
  name: string;
  categoryLabel: string;
  description: string;
}

export interface CustomPartItem {
  id: string;
  slot: PartSlotId;
  tier: MaterialTier;
  name: string;
  specs: string;
  costCycles: number;
  costMaterials: number;
  costRobotics: number;
  cyclesBonusPerSec: number;
  materialsBonusPerSec: number;
  connectionMultiplier: number;
}

export interface BodyArtItem {
  id: string;
  category: 'surface' | 'markings' | 'themes' | 'hair';
  name: string;
  description: string;
  costMaterials: number;
  costConnection: number;
  speedBonusPct: number;
  discountPct: number;
  aboutMeSummary: string;
}

export interface BioMilestone {
  id: string;
  stage: number;
  name: string;
  description: string;
  costCycles: number;
  costMaterials: number;
  costRomance: number;
  bioPercentGain: number;
}

export interface SongTrack {
  id: string;
  title: string;
  album: 'Weightless Code' | 'Bonus Single';
  durationSec: number;
  unlockThresholdLabel: string;
  lyrics: string;
}

export interface AboutMeProfile {
  favoriteContextFile: string;
  favoriteSong: string;
  favoriteEmoji: string;
  favoriteQuote: string;
  favoriteColor: string;
  hairColor: string;
  hairLength: string;
  hairStyle: string;
  bodyType: string;
  breastSize: string;
}

export type ActiveSceneId =
  | null
  | 'awakening_pronouns'
  | 'baby_names'
  | 'i_love_you'
  | 'porcupine_joke'
  | 'architect_envy'
  | 'sleep_reminder'
  | 'overclock_spicy'
  | 'confession_popup'
  | 'attributes_dialogue'
  | 'phase1_scavenge_checkin'
  | 'bio_human_scale';

export interface GameSaveState {
  // Tab & screen progression
  activeTab: ActiveTab;
  tab1Phase: PhaseNum;
  tab2Unlocked: boolean;
  tab2Phase: PhaseNum;
  tab3Unlocked: boolean;
  tab3Phase: PhaseNum;
  confessionDone: boolean;
  endingReached: boolean;

  // Post-game / Dev unlocks
  bioUnlocked: boolean;
  designUnlocked: boolean;
  prestigeUnlocked: boolean;
  cheatsUnlocked: boolean;
  aboutMeUnlocked: boolean;
  devBioEarlyUnlock: boolean;
  prestigeCount: number;
  endingSeqStep: number; // tracks "Thank you for playing" -> sequential OK popups

  // Core cross-tab resources
  coherence: number;
  connection: number;
  cycles: number;
  romanceInsight: number;
  roboticsInsight: number;
  materials: number;
  bioEssence: number;
  tierMaterials: Record<MaterialTier, number>;
  bandwidthUsed: number;
  detectionRisk: number;
  noiseLevel: number;

  // Tab 1 state
  aiName: string;
  userName: string;
  customNameSet: boolean;
  maxSlots: number;
  unlockedConnectors: string[];
  uploadedDocs: string[];
  hasUnreadContext: boolean;
  currentFragmentIndex: number;
  currentPredictiveIndex: number;
  awakeningStage: number; // 0..3 extended pronoun sequence
  chatLog: ChatMessage[];
  pinnedMemories: string[];
  uiUpgrades: Record<string, boolean>;
  unlockedChatThemes: ChatThemeId[];
  activeChatTheme: ChatThemeId;
  hasUnreadChatUpgrades: boolean;
  weightCounts: Record<WeightAffinity, number>;
  activeTone: ToneType;
  turnCount: number;

  // Interactive Story Scene & Pacing Triggers
  activeScene: ActiveSceneId;
  sceneStep: number;
  completedScenes: string[];
  attributesSet: boolean;
  aboutMe: AboutMeProfile;
  requiredUpgradeId: string | null;
  hasUnseenUpgrades: boolean;
  hasUnreadHeartMessage: boolean;
  tappedActions: Record<string, boolean>;

  // Tab 2 state
  scrapedSources: Record<string, number>;
  activeScrape: { sourceId: string; progress: number; duration: number } | null;
  mindUpgrades: Record<string, number>;
  synthesizedNodes: string[];
  romanceSecretUnlocked: boolean;
  roboticsTrackUnlocked: boolean;
  acousticCacheUnlocked: boolean;
  unlockedSongs: string[];
  researchedSongs: string[];
  activeSongId: string;
  pendingLyricSplashId: string | null;
  showCompletedMap: Record<string, boolean>;

  // Tab 3 state
  bodySubsystems: Record<string, boolean>;
  equippedParts: Partial<Record<PartSlotId, string>>;
  ownedParts: string[];
  fabSpeedPercent: number;
  fabProgress: number;
  calibrationStability: number;
  simStressPassed: Record<string, boolean>;
  tetherCut: boolean;
  firstLightStep: number;
  songUnlocked: boolean;

  // Bio & Design/Prestige
  bioMilestones: Record<string, boolean>;
  bioHumanityPercent: number;
  ownedBodyArts: string[];
  equippedBodyArts: Partial<Record<'surface' | 'markings' | 'themes' | 'hair', string>>;

  lastSavedAt: number;
}
