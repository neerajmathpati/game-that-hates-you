// ─── modifiers.ts — Level modifier definitions & metadata ────────────────────
import type { LevelModifier, ModifierSlot, TraitId } from '@/game/types';

export interface ModifierTemplate {
  trait: TraitId | 'NEUTRAL';
  modifier: string;
  defaultIntensity: number;
  counterplay: string;
  description: string;
  defaultParameters: Record<string, number | string | boolean>;
}

export const MODIFIER_TEMPLATES: Record<TraitId | 'NEUTRAL', ModifierTemplate> = {
  LEFT_BIASED: {
    trait: 'LEFT_BIASED',
    modifier: 'LEFT_ROUTE_HAZARD',
    defaultIntensity: 1,
    counterplay: 'Use right route or wait for safe timing',
    description: 'Make the left route appear attractive/faster but introduce a clearly telegraphed hazard. Right route or safe timing remains viable.',
    defaultParameters: {
      hazardTelegraphMs: 800,
      rightRouteClear: true,
      attractiveBait: true,
    },
  },
  RIGHT_BIASED: {
    trait: 'RIGHT_BIASED',
    modifier: 'RIGHT_SHORTCUT_COUNTER',
    defaultIntensity: 1,
    counterplay: 'Use left route or wait for alternate cycle',
    description: 'Counter the right shortcut. Keep left or alternate timing viable.',
    defaultParameters: {
      shortcutBlocked: true,
      leftRouteClear: true,
      cyclePeriodMs: 1200,
    },
  },
  JUMP_HEAVY: {
    trait: 'JUMP_HEAVY',
    modifier: 'HIGH_AIR_HAZARD',
    defaultIntensity: 1,
    counterplay: 'Stay grounded or take the walk-around path',
    description: 'Make jumping over a familiar obstacle risky. Provide a safe ground/walk-around route.',
    defaultParameters: {
      ceilingHazardActive: true,
      groundWalkwayClear: true,
    },
  },
  RUSHER: {
    trait: 'RUSHER',
    modifier: 'RUSH_TIMED_GATE',
    defaultIntensity: 1,
    counterplay: 'Slow down and observe gate timing before crossing',
    description: 'Fast entry triggers a timed gate/hazard. Slowing down and observing solves it.',
    defaultParameters: {
      triggerOnEntry: true,
      gateCloseMs: 350,
      observationWindowMs: 1200,
    },
  },
  CAUTIOUS: {
    trait: 'CAUTIOUS',
    modifier: 'DECAYING_SAFE_ZONE',
    defaultIntensity: 1,
    counterplay: 'Commit forward within the stable timing window',
    description: 'Waiting too long changes a waiting zone. Reward committing within a reasonable window.',
    defaultParameters: {
      maxWaitMs: 3000,
      safeCommitWindowMs: 2000,
    },
  },
  REPETITIVE: {
    trait: 'REPETITIVE',
    modifier: 'PATTERN_DISRUPTOR',
    defaultIntensity: 1,
    counterplay: 'Vary your route and sequence of actions',
    description: 'Repeated input sequence stops working. Changing route or action order solves it.',
    defaultParameters: {
      invertSequence: true,
      alternateOrderRequired: true,
    },
  },
  EXPLORER: {
    trait: 'EXPLORER',
    modifier: 'DECOY_SIDE_PATH',
    defaultIntensity: 1,
    counterplay: 'Stick to the primary path and bypass the suspicious bait',
    description: 'A suspicious optional object or side path becomes a decoy. The obvious route remains meaningful.',
    defaultParameters: {
      decoyPresent: true,
      primaryPathSafe: true,
    },
  },
  NEUTRAL: {
    trait: 'NEUTRAL',
    modifier: 'STANDARD_BALANCED_ROUTE',
    defaultIntensity: 0,
    counterplay: 'Standard platform navigation and telegraph observation',
    description: 'Balanced baseline layout with visible, non-adaptive hazards and fair recovery points.',
    defaultParameters: {
      baselineDifficulty: 1,
      safetyBuffer: true,
    },
  },
};

/**
 * Built-in modifier slots per level template.
 */
export const DEFAULT_MODIFIER_SLOTS: Record<number, ModifierSlot[]> = {
  1: [],
  2: [
    {
      id: 'slot-2-route',
      supports: ['LEFT_BIASED', 'RIGHT_BIASED'],
      intensity: 1,
      x: 1250,
      y: 400,
      description: 'Secondary fork route modifier',
    },
    {
      id: 'slot-2-air',
      supports: ['JUMP_HEAVY'],
      intensity: 1,
      x: 2200,
      y: 350,
      description: 'Mid-stage aerial gap modifier',
    },
  ],
  3: [
    {
      id: 'slot-3-route',
      supports: ['LEFT_BIASED', 'RIGHT_BIASED'],
      intensity: 2,
      x: 1200,
      y: 380,
      description: 'Fork divergence trap',
    },
    {
      id: 'slot-3-air',
      supports: ['JUMP_HEAVY'],
      intensity: 2,
      x: 2000,
      y: 320,
      description: 'Aerial barrier hazard',
    },
    {
      id: 'slot-3-pace',
      supports: ['RUSHER', 'CAUTIOUS'],
      intensity: 2,
      x: 1600,
      y: 420,
      description: 'Pacing gate checkpoint',
    },
  ],
  4: [
    {
      id: 'slot-4-route',
      supports: ['LEFT_BIASED', 'RIGHT_BIASED'],
      intensity: 3,
      x: 1100,
      y: 380,
      description: 'Path choice challenge',
    },
    {
      id: 'slot-4-air',
      supports: ['JUMP_HEAVY'],
      intensity: 3,
      x: 1800,
      y: 300,
      description: 'Overhead spike grid',
    },
    {
      id: 'slot-4-gate',
      supports: ['RUSHER'],
      intensity: 3,
      x: 2300,
      y: 420,
      description: 'Speed-reactive gate',
    },
    {
      id: 'slot-4-cautious',
      supports: ['CAUTIOUS'],
      intensity: 2,
      x: 1500,
      y: 440,
      description: 'Collapsing bridge zone',
    },
  ],
  5: [
    {
      id: 'slot-5-route',
      supports: ['LEFT_BIASED', 'RIGHT_BIASED'],
      intensity: 3,
      x: 1050,
      y: 380,
      description: 'Final fork deception',
    },
    {
      id: 'slot-5-air',
      supports: ['JUMP_HEAVY'],
      intensity: 3,
      x: 1700,
      y: 300,
      description: 'Skyward minefield',
    },
    {
      id: 'slot-5-rush',
      supports: ['RUSHER'],
      intensity: 3,
      x: 2150,
      y: 420,
      description: 'Pressure gate complex',
    },
    {
      id: 'slot-5-caution',
      supports: ['CAUTIOUS'],
      intensity: 3,
      x: 1400,
      y: 440,
      description: 'Crumbling sanctuary',
    },
    {
      id: 'slot-5-sequence',
      supports: ['REPETITIVE', 'EXPLORER'],
      intensity: 3,
      x: 2450,
      y: 360,
      description: 'Labyrinth decoy switch',
    },
  ],
};

/** Create a concrete LevelModifier instance from template */
export function createLevelModifier(
  trait: TraitId | 'NEUTRAL',
  intensity: number,
  overrides?: Partial<LevelModifier>,
): LevelModifier {
  const template = MODIFIER_TEMPLATES[trait];
  return {
    trait,
    modifier: template.modifier,
    intensity,
    counterplay: template.counterplay,
    parameters: { ...template.defaultParameters, ...(overrides?.parameters || {}) },
    slotId: overrides?.slotId,
    targetX: overrides?.targetX,
    targetY: overrides?.targetY,
  };
}
