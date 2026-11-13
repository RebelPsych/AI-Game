import {
  PHASE1_FRAGMENT_PROMPTS,
  PREDICTIVE_PROMPTS,
} from '../data/documentsAndPrompts';
import { BODY_SUBSYSTEMS, SYNTHESIS_NODES } from '../data/tab2AndTab3Data';
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

export function getSubsystemCost(
  sub: BodySubsystem,
  state: Pick<GameSaveState, 'simStressPassed'>
): { cycles: number; robotics: number; materials: number; discounted: boolean } {
  const discounted = Boolean(state.simStressPassed['sim_torque']);
  const mult = discounted ? 0.8 : 1;
  return {
    cycles: Math.round(sub.costCycles * mult),
    robotics: sub.costRobotics,
    materials: Math.round(sub.costMaterials * mult),
    discounted,
  };
}

export function computeEconomyRates(state: GameSaveState): EconomyRates {
  if (!state.tab2Unlocked || state.endingReached) {
    return {
      cyclesPerSec: 0,
      romancePerSec: 0,
      roboticsPerSec: 0,
      materialsPerSec: 0,
      scrapeSpeedMult: 1,
    };
  }

  const bwLv = state.mindUpgrades['mind_bandwidth'] || 0;
  const rackLv = state.mindUpgrades['mind_compute_cluster'] || 0;
  const romCrawler = state.mindUpgrades['mind_romance_crawler'] || 0;
  const robCrawler = state.mindUpgrades['mind_robotics_crawler'] || 0;

  const connectionSynergy = Math.floor(state.connection / 25) * 0.8;
  const sharedLinkBonus = state.confessionDone ? 15 : 0;
  const cyclesPerSec = 2.5 + bwLv * 8 + rackLv * 25 + connectionSynergy + sharedLinkBonus;

  const scrapeSpeedMult = 1 + bwLv * 0.2;
  const sharedInsightBonus = state.confessionDone ? 2.5 : 0;

  const romancePerSec = romCrawler * 2.8 + sharedInsightBonus * 0.6;
  const roboticsPerSec = robCrawler * 2.8 + sharedInsightBonus;

  let materialsPerSec = 0;
  if (state.tab3Unlocked && state.bodySubsystems['body_fab_line']) {
    const simBonus = state.simStressPassed['sim_thermal'] ? 1.35 : 1;
    materialsPerSec = 10.0 * simBonus;
  }

  return {
    cyclesPerSec,
    romancePerSec,
    roboticsPerSec,
    materialsPerSec,
    scrapeSpeedMult,
  };
}

export function getActiveFragmentPrompt(state: GameSaveState): FragmentPrompt {
  return PHASE1_FRAGMENT_PROMPTS[
    Math.min(state.currentFragmentIndex, PHASE1_FRAGMENT_PROMPTS.length - 1)
  ];
}

export function getActivePredictivePrompt(state: GameSaveState): PredictivePrompt {
  const synthesisComplete = state.synthesizedNodes.length >= SYNTHESIS_NODES.length;

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
