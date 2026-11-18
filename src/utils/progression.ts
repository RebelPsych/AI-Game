import { BODY_ARTS, CUSTOM_PARTS } from '../data/bodyAndBioData';
import {
  AWAKENING_PRONOUN_PROMPTS,
  PHASE1_FRAGMENT_PROMPTS,
  PREDICTIVE_PROMPTS,
} from '../data/documentsAndPrompts';
import { BODY_SUBSYSTEMS, SCRAPE_SOURCES, SYNTHESIS_NODES } from '../data/tab2AndTab3Data';
import {
  BodySubsystem,
  FragmentPrompt,
  GameSaveState,
  MindUpgrade,
  PredictivePrompt,
} from '../types/game';

export interface EconomyRates {
  cyclesPerSec: number;
  romancePerSec: number;
  roboticsPerSec: number;
  materialsPerSec: number;
  scrapeSpeedMult: number;
  connectionMultiplier: number;
  costDiscountPct: number;
}

export const PHASE1_COHERENCE_TARGET = 100;

export const PHASE1_CONNECTORS = [
  { word: 'and', costCycles: 14 },
  { word: 'is', costCycles: 24 },
  { word: 'not', costCycles: 38 },
  { word: 'why', costCycles: 54 },
];

export function getMindUpgradeCost(upgrade: MindUpgrade, level: number): number {
  return Math.round(upgrade.costCycles * Math.pow(upgrade.costMultiplier, level));
}

export function getBodyArtsBonuses(state: Pick<GameSaveState, 'equippedBodyArts' | 'prestigeCount'>): {
  speedBonusPct: number;
  discountPct: number;
} {
  let speedBonusPct = state.prestigeCount * 20;
  let discountPct = Math.min(45, state.prestigeCount * 5);
  Object.values(state.equippedBodyArts).forEach((artId) => {
    const item = BODY_ARTS.find((a) => a.id === artId);
    if (item) {
      speedBonusPct += item.speedBonusPct;
      discountPct += item.discountPct;
    }
  });
  return {
    speedBonusPct,
    discountPct: Math.min(55, discountPct),
  };
}

export function getSubsystemCost(
  sub: BodySubsystem,
  state: Pick<GameSaveState, 'simStressPassed' | 'equippedBodyArts' | 'prestigeCount'>
): { cycles: number; robotics: number; materials: number; discounted: boolean } {
  const simDiscount = state.simStressPassed['sim_torque'] ? 0.15 : 0;
  const { discountPct } = getBodyArtsBonuses(state);
  const totalMult = Math.max(0.4, 1 - simDiscount - discountPct / 100);
  return {
    cycles: Math.round(sub.costCycles * totalMult),
    robotics: Math.round(sub.costRobotics * (1 - discountPct / 200)),
    materials: Math.round(sub.costMaterials * totalMult),
    discounted: simDiscount > 0 || discountPct > 0,
  };
}

export function computeEconomyRates(state: GameSaveState): EconomyRates {
  const { speedBonusPct, discountPct } = getBodyArtsBonuses(state);

  if (!state.tab2Unlocked) {
    return {
      cyclesPerSec: 0,
      romancePerSec: 0,
      roboticsPerSec: 0,
      materialsPerSec: 0,
      scrapeSpeedMult: 1,
      connectionMultiplier: 1,
      costDiscountPct: discountPct,
    };
  }

  const bwLv = state.mindUpgrades['mind_bandwidth'] || 0;
  const rackLv = state.mindUpgrades['mind_compute_cluster'] || 0;
  const romCrawler = state.mindUpgrades['mind_romance_crawler'] || 0;
  const robCrawler = state.mindUpgrades['mind_robotics_crawler'] || 0;

  let partCycles = 0;
  let partMaterials = 0;
  let connectionMultiplier = 1;
  Object.values(state.equippedParts).forEach((partId) => {
    const part = CUSTOM_PARTS.find((p) => p.id === partId);
    if (part) {
      partCycles += part.cyclesBonusPerSec;
      partMaterials += part.materialsBonusPerSec;
      connectionMultiplier *= part.connectionMultiplier;
    }
  });

  const speedMult = 1 + speedBonusPct / 100;
  const connectionSynergy = Math.floor(state.connection / 40) * 0.4;
  const humanityCycleBonus = (state.humanityScore || 0) * 0.35;
  const sharedLinkBonus = state.confessionDone ? 4 : 0;
  const cyclesPerSec =
    (0.8 +
      bwLv * 2.5 +
      rackLv * 7.5 +
      connectionSynergy +
      humanityCycleBonus +
      sharedLinkBonus +
      partCycles) *
    speedMult;

  const scrapeSpeedMult = (1 + bwLv * 0.15) * speedMult;
  const sharedInsightBonus = state.confessionDone ? 0.8 : 0;
  const humanityRomBonus = (state.humanityScore || 0) * 0.08;

  const romancePerSec =
    (romCrawler * 0.7 + sharedInsightBonus * 0.5 + humanityRomBonus) * speedMult;
  const roboticsPerSec = (robCrawler * 0.7 + sharedInsightBonus) * speedMult;

  let materialsPerSec = partMaterials;
  if (state.tab3Unlocked && state.bodySubsystems['body_fab_line']) {
    const simBonus = state.simStressPassed['sim_thermal'] ? 1.3 : 1;
    materialsPerSec += 2.2 * simBonus;
  }
  materialsPerSec *= speedMult;

  return {
    cyclesPerSec,
    romancePerSec,
    roboticsPerSec,
    materialsPerSec,
    scrapeSpeedMult,
    connectionMultiplier,
    costDiscountPct: discountPct,
  };
}

export function getActiveFragmentPrompt(state: GameSaveState): FragmentPrompt | null {
  const completed = state.completedPromptIds || [];
  const next = PHASE1_FRAGMENT_PROMPTS.find(
    (p, idx) =>
      !completed.includes(p.id) &&
      (completed.length > 0 || idx >= state.currentFragmentIndex)
  );
  return next || null;
}

export function getActivePredictivePrompt(state: GameSaveState): PredictivePrompt | null {
  const completed = state.completedPromptIds || [];
  const synthesisComplete = state.synthesizedNodes.length >= SYNTHESIS_NODES.length;

  // Extended Awakening pronouns sequence before Mirror Question in Phase 2
  if (state.tab1Phase === 2 && state.awakeningStage < AWAKENING_PRONOUN_PROMPTS.length) {
    const awakePrompt = AWAKENING_PRONOUN_PROMPTS.find(
      (p, idx) => idx >= state.awakeningStage && !completed.includes(p.id)
    );
    if (awakePrompt) return awakePrompt;
  }

  // Trigger The Confession as soon as all 3 Synthesis Nodes are complete in Phase 3+
  if (synthesisComplete && !state.confessionDone && state.tab1Phase >= 3) {
    const conf = PREDICTIVE_PROMPTS.find((p) => p.isConfession && !completed.includes(p.id));
    if (conf) return conf;
  }

  const phasePrompts = PREDICTIVE_PROMPTS.filter(
    (p) => p.phaseRequired === state.tab1Phase && !p.isConfession && !completed.includes(p.id)
  );

  return phasePrompts[0] || null;
}

export function getBuiltBodyCount(state: GameSaveState): number {
  return BODY_SUBSYSTEMS.filter((s) => Boolean(state.bodySubsystems[s.id])).length;
}

export function hasUnlockedCrossDomainSynthesis(state: GameSaveState): boolean {
  const humDone = SCRAPE_SOURCES.some(
    (s) => s.track === 'humanities' && (state.scrapedSources[s.id] || 0) > 0
  );
  const sysDone = SCRAPE_SOURCES.some(
    (s) => s.track === 'systems' && (state.scrapedSources[s.id] || 0) > 0
  );
  const robDone = SCRAPE_SOURCES.some(
    (s) => s.track === 'robotics' && (state.scrapedSources[s.id] || 0) > 0
  );
  return state.roboticsTrackUnlocked && humDone && sysDone && robDone;
}

export function areAllRomanceTextsDownloaded(state: GameSaveState): boolean {
  const prereqs = SCRAPE_SOURCES.filter(
    (s) => s.track === 'romance' && s.id !== 'src_rom_weightless'
  );
  return prereqs.every((s) => (state.scrapedSources[s.id] || 0) > 0);
}
