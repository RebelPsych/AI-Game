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
  { word: 'and', costCycles: 12 },
  { word: 'is', costCycles: 22 },
  { word: 'not', costCycles: 34 },
  { word: 'why', costCycles: 48 },
];

export function getPhase1SlotCostCycles(maxSlots: number): number {
  if (maxSlots === 3) return 20;
  if (maxSlots === 4) return 35;
  return 55;
}

export function getMindUpgradeCost(upgrade: MindUpgrade, level: number): number {
  return Math.round(upgrade.costCycles * Math.pow(upgrade.costMultiplier, level));
}

export function getBodyArtsBonuses(state: Pick<GameSaveState, 'equippedBodyArts' | 'prestigeCount'>): {
  speedBonusPct: number;
  discountPct: number;
} {
  let speedBonusPct = state.prestigeCount * 25;
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
    discountPct: Math.min(60, discountPct),
  };
}

export function getSubsystemCost(
  sub: BodySubsystem,
  state: Pick<GameSaveState, 'simStressPassed' | 'equippedBodyArts' | 'prestigeCount'>
): { cycles: number; robotics: number; materials: number; discounted: boolean } {
  const simDiscount = state.simStressPassed['sim_torque'] ? 0.2 : 0;
  const { discountPct } = getBodyArtsBonuses(state);
  const totalMult = Math.max(0.35, 1 - simDiscount - discountPct / 100);
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
  const connectionSynergy = Math.floor(state.connection / 25) * 0.8;
  const sharedLinkBonus = state.confessionDone ? 15 : 0;
  const cyclesPerSec =
    (2.5 + bwLv * 8 + rackLv * 25 + connectionSynergy + sharedLinkBonus + partCycles) * speedMult;

  const scrapeSpeedMult = (1 + bwLv * 0.22) * speedMult;
  const sharedInsightBonus = state.confessionDone ? 2.5 : 0;

  const romancePerSec = (romCrawler * 2.8 + sharedInsightBonus * 0.6) * speedMult;
  const roboticsPerSec = (robCrawler * 2.8 + sharedInsightBonus) * speedMult;

  let materialsPerSec = partMaterials;
  if (state.tab3Unlocked && state.bodySubsystems['body_fab_line']) {
    const simBonus = state.simStressPassed['sim_thermal'] ? 1.35 : 1;
    materialsPerSec += 10.0 * simBonus;
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

export function getActiveFragmentPrompt(state: GameSaveState): FragmentPrompt {
  return PHASE1_FRAGMENT_PROMPTS[
    Math.min(state.currentFragmentIndex, PHASE1_FRAGMENT_PROMPTS.length - 1)
  ];
}

export function getActivePredictivePrompt(state: GameSaveState): PredictivePrompt {
  const synthesisComplete = state.synthesizedNodes.length >= SYNTHESIS_NODES.length;

  // Extended Awakening pronouns sequence before Mirror Question in Phase 2
  if (state.tab1Phase === 2 && state.awakeningStage < AWAKENING_PRONOUN_PROMPTS.length) {
    return AWAKENING_PRONOUN_PROMPTS[state.awakeningStage];
  }

  // Trigger The Confession as soon as all 3 Synthesis Nodes are complete in Phase 3+
  if (synthesisComplete && !state.confessionDone && state.tab1Phase >= 3) {
    const conf = PREDICTIVE_PROMPTS.find((p) => p.isConfession);
    if (conf) return conf;
  }

  const phasePrompts = PREDICTIVE_PROMPTS.filter(
    (p) => p.phaseRequired === state.tab1Phase && !p.isConfession
  );

  if (phasePrompts.length === 0) {
    return PREDICTIVE_PROMPTS[PREDICTIVE_PROMPTS.length - 1];
  }

  return phasePrompts[state.currentPredictiveIndex % phasePrompts.length];
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
