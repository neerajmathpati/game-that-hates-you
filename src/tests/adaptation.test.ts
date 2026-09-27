// ─── adaptation.test.ts — Phase 5 AdaptationEngine unit tests ────────────────
import { describe, it, expect, beforeEach } from 'vitest';
import { AdaptationEngine, CONFIDENCE_GATE, SCORE_GATE } from '@/game/systems/AdaptationEngine';
import { BehaviorAnalyzer } from '@/game/systems/BehaviorAnalyzer';
import { extractFeatures } from '@/game/systems/FeatureExtractor';
import {
  LEFT_HEAVY_PLAYER,
  RIGHT_HEAVY_PLAYER,
  JUMP_HEAVY_PLAYER,
  RUSHER_PLAYER,
  CAUTIOUS_PLAYER,
  REPETITIVE_PLAYER,
  EXPLORER_PLAYER,
  EMPTY_SESSION,
} from './fixtures';
import type { BehaviorTrait, PlayerProfile, TraitId } from '@/game/types';

const BLANK_PROFILE: PlayerProfile = {
  traits: [],
  attempts: 0,
  deaths: 0,
  jumps: 0,
  leftChoices: 0,
  rightChoices: 0,
  avgHesitationMs: 0,
  sessionStart: 0,
};

function makeTrait(id: TraitId, score = 0.85, confidence = 0.85): BehaviorTrait {
  return {
    id,
    score,
    confidence,
    evidenceCount: 10,
    lastUpdatedAt: 1000,
  };
}

function buildProfileFor(events: Parameters<typeof extractFeatures>[0]): PlayerProfile {
  const analyzer = new BehaviorAnalyzer();
  const features = extractFeatures(events);
  const traits   = analyzer.analyze(features, BLANK_PROFILE);
  return { ...BLANK_PROFILE, traits };
}

describe('AdaptationEngine — Phase 5 Comprehensive Suite', () => {
  let engine: AdaptationEngine;

  beforeEach(() => {
    engine = new AdaptationEngine();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // §1. LEVEL 1: NO ADAPTIVE COUNTERS
  // ───────────────────────────────────────────────────────────────────────────
  describe('Level 1 — No adaptive counters', () => {
    it('returns 0 active traits for Level 1 regardless of profile', () => {
      const profile: PlayerProfile = {
        ...BLANK_PROFILE,
        traits: [makeTrait('LEFT_BIASED', 0.95, 0.95), makeTrait('JUMP_HEAVY', 0.9, 0.9)],
      };
      const plan = engine.planLevel(1, profile);
      expect(plan.activeTraits).toHaveLength(0);
    });

    it('returns neutral modifier for Level 1', () => {
      const profile = buildProfileFor(LEFT_HEAVY_PLAYER);
      const plan    = engine.planLevel(1, profile);
      expect(plan.modifiers).toHaveLength(1);
      expect(plan.modifiers[0].trait).toBe('NEUTRAL');
      expect(plan.modifiers[0].intensity).toBe(0);
      expect(plan.modifiers[0].counterplay).toBeDefined();
    });

    it('validates safety invariants on Level 1', () => {
      const plan = engine.planLevel(1, BLANK_PROFILE);
      const safety = engine.validatePlanSafety(plan);
      expect(safety.valid).toBe(true);
      expect(safety.errors).toHaveLength(0);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // §2. INDEPENDENT TRAIT COUNTERS (Each trait tested independently)
  // ───────────────────────────────────────────────────────────────────────────
  describe('Independent Trait Counters', () => {
    it('counters LEFT_BIASED with telegraphed left hazard and viable right route', () => {
      const profile: PlayerProfile = {
        ...BLANK_PROFILE,
        traits: [makeTrait('LEFT_BIASED', 0.88, 0.85)],
      };
      const plan = engine.planLevel(2, profile);
      expect(plan.activeTraits).toContain('LEFT_BIASED');

      const mod = plan.modifiers.find(m => m.trait === 'LEFT_BIASED');
      expect(mod).toBeDefined();
      expect(mod!.modifier).toBe('LEFT_ROUTE_HAZARD');
      expect(mod!.counterplay.toLowerCase()).toContain('right route');
      expect(mod!.parameters?.rightRouteClear).toBe(true);
      expect(mod!.parameters?.attractiveBait).toBe(true);
    });

    it('counters RIGHT_BIASED with right shortcut counter and viable left route', () => {
      const profile: PlayerProfile = {
        ...BLANK_PROFILE,
        traits: [makeTrait('RIGHT_BIASED', 0.88, 0.85)],
      };
      const plan = engine.planLevel(2, profile);
      expect(plan.activeTraits).toContain('RIGHT_BIASED');

      const mod = plan.modifiers.find(m => m.trait === 'RIGHT_BIASED');
      expect(mod).toBeDefined();
      expect(mod!.modifier).toBe('RIGHT_SHORTCUT_COUNTER');
      expect(mod!.counterplay.toLowerCase()).toContain('left route');
      expect(mod!.parameters?.leftRouteClear).toBe(true);
    });

    it('counters JUMP_HEAVY with risky air hazard and safe ground walkway', () => {
      const profile: PlayerProfile = {
        ...BLANK_PROFILE,
        traits: [makeTrait('JUMP_HEAVY', 0.88, 0.85)],
      };
      const plan = engine.planLevel(2, profile);
      expect(plan.activeTraits).toContain('JUMP_HEAVY');

      const mod = plan.modifiers.find(m => m.trait === 'JUMP_HEAVY');
      expect(mod).toBeDefined();
      expect(mod!.modifier).toBe('HIGH_AIR_HAZARD');
      expect(mod!.counterplay.toLowerCase()).toMatch(/ground|walk-around/);
      expect(mod!.parameters?.groundWalkwayClear).toBe(true);
    });

    it('counters RUSHER with timed entry gate and observation counterplay', () => {
      const profile: PlayerProfile = {
        ...BLANK_PROFILE,
        traits: [makeTrait('RUSHER', 0.88, 0.85)],
      };
      const plan = engine.planLevel(2, profile);
      expect(plan.activeTraits).toContain('RUSHER');

      const mod = plan.modifiers.find(m => m.trait === 'RUSHER');
      expect(mod).toBeDefined();
      expect(mod!.modifier).toBe('RUSH_TIMED_GATE');
      expect(mod!.counterplay.toLowerCase()).toMatch(/slow down|observe/);
      expect(mod!.parameters?.triggerOnEntry).toBe(true);
    });

    it('counters CAUTIOUS with decaying safe zone rewarding commitment', () => {
      const profile: PlayerProfile = {
        ...BLANK_PROFILE,
        traits: [makeTrait('CAUTIOUS', 0.88, 0.85)],
      };
      const plan = engine.planLevel(2, profile);
      expect(plan.activeTraits).toContain('CAUTIOUS');

      const mod = plan.modifiers.find(m => m.trait === 'CAUTIOUS');
      expect(mod).toBeDefined();
      expect(mod!.modifier).toBe('DECAYING_SAFE_ZONE');
      expect(mod!.counterplay.toLowerCase()).toMatch(/commit|timing window/);
      expect(mod!.parameters?.safeCommitWindowMs).toBeDefined();
    });

    it('counters REPETITIVE with pattern disruptor requiring varied sequence', () => {
      const profile: PlayerProfile = {
        ...BLANK_PROFILE,
        traits: [makeTrait('REPETITIVE', 0.88, 0.85)],
      };
      const plan = engine.planLevel(2, profile);
      expect(plan.activeTraits).toContain('REPETITIVE');

      const mod = plan.modifiers.find(m => m.trait === 'REPETITIVE');
      expect(mod).toBeDefined();
      expect(mod!.modifier).toBe('PATTERN_DISRUPTOR');
      expect(mod!.counterplay.toLowerCase()).toMatch(/vary|route|action/);
      expect(mod!.parameters?.invertSequence).toBe(true);
    });

    it('counters EXPLORER with decoy side path while primary path remains safe', () => {
      const profile: PlayerProfile = {
        ...BLANK_PROFILE,
        traits: [makeTrait('EXPLORER', 0.88, 0.85)],
      };
      const plan = engine.planLevel(2, profile);
      expect(plan.activeTraits).toContain('EXPLORER');

      const mod = plan.modifiers.find(m => m.trait === 'EXPLORER');
      expect(mod).toBeDefined();
      expect(mod!.modifier).toBe('DECOY_SIDE_PATH');
      expect(mod!.counterplay.toLowerCase()).toMatch(/primary path|decoy/);
      expect(mod!.parameters?.primaryPathSafe).toBe(true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // §3. TRAIT COUNT LIMITS (no traits, one, two, three traits)
  // ───────────────────────────────────────────────────────────────────────────
  describe('Trait Count Caps by Level', () => {
    it('handles NO confident traits by generating neutral fallback', () => {
      const unconfidentProfile: PlayerProfile = {
        ...BLANK_PROFILE,
        traits: [makeTrait('LEFT_BIASED', 0.50, 0.50)], // sub-gate
      };
      const plan = engine.planLevel(3, unconfidentProfile);
      expect(plan.activeTraits).toHaveLength(0);
      expect(plan.modifiers).toHaveLength(1);
      expect(plan.modifiers[0].trait).toBe('NEUTRAL');
      expect(plan.modifiers[0].intensity).toBe(0);
    });

    it('handles ONE active trait at Level 2', () => {
      const profile: PlayerProfile = {
        ...BLANK_PROFILE,
        traits: [makeTrait('JUMP_HEAVY', 0.8, 0.8)],
      };
      const plan = engine.planLevel(2, profile);
      expect(plan.activeTraits).toEqual(['JUMP_HEAVY']);
      expect(plan.modifiers).toHaveLength(1);
    });

    it('handles TWO active traits at Level 2-4', () => {
      const profile: PlayerProfile = {
        ...BLANK_PROFILE,
        traits: [
          makeTrait('LEFT_BIASED', 0.85, 0.85),
          makeTrait('JUMP_HEAVY', 0.80, 0.80),
        ],
      };
      const plan = engine.planLevel(3, profile);
      expect(plan.activeTraits).toHaveLength(2);
      expect(plan.activeTraits).toContain('LEFT_BIASED');
      expect(plan.activeTraits).toContain('JUMP_HEAVY');
    });

    it('caps at TWO traits on Level 4 even when three confident traits exist', () => {
      const profile: PlayerProfile = {
        ...BLANK_PROFILE,
        traits: [
          makeTrait('LEFT_BIASED', 0.90, 0.90),
          makeTrait('JUMP_HEAVY', 0.85, 0.85),
          makeTrait('EXPLORER', 0.80, 0.80),
        ],
      };
      const plan = engine.planLevel(4, profile);
      expect(plan.activeTraits).toHaveLength(2);
      expect(plan.activeTraits).toEqual(['LEFT_BIASED', 'JUMP_HEAVY']);
    });

    it('allows up to THREE traits on Level 5', () => {
      const profile: PlayerProfile = {
        ...BLANK_PROFILE,
        traits: [
          makeTrait('LEFT_BIASED', 0.95, 0.95),
          makeTrait('JUMP_HEAVY', 0.90, 0.90),
          makeTrait('EXPLORER', 0.85, 0.85),
          makeTrait('REPETITIVE', 0.70, 0.70),
        ],
      };
      const plan = engine.planLevel(5, profile);
      expect(plan.activeTraits).toHaveLength(3);
      expect(plan.activeTraits).toEqual(['LEFT_BIASED', 'JUMP_HEAVY', 'EXPLORER']);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // §4. WEIGHTED IMPACT SORTING
  // ───────────────────────────────────────────────────────────────────────────
  describe('Weighted Impact Sorting', () => {
    it('sorts traits strictly by (score * confidence) descending', () => {
      const profile: PlayerProfile = {
        ...BLANK_PROFILE,
        traits: [
          makeTrait('EXPLORER', 0.70, 0.70),    // impact = 0.49
          makeTrait('LEFT_BIASED', 0.90, 0.90), // impact = 0.81
          makeTrait('JUMP_HEAVY', 0.80, 0.80),  // impact = 0.64
        ],
      };
      const plan = engine.planLevel(5, profile);
      expect(plan.activeTraits).toEqual(['LEFT_BIASED', 'JUMP_HEAVY', 'EXPLORER']);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // §5. CONTRADICTORY TRAITS RESOLUTION
  // ───────────────────────────────────────────────────────────────────────────
  describe('Contradictory Traits Resolution', () => {
    it('suppresses RIGHT_BIASED when LEFT_BIASED has higher impact', () => {
      const profile: PlayerProfile = {
        ...BLANK_PROFILE,
        traits: [
          makeTrait('LEFT_BIASED', 0.90, 0.90),
          makeTrait('RIGHT_BIASED', 0.70, 0.70),
        ],
      };
      const plan = engine.planLevel(2, profile);
      expect(plan.activeTraits).toContain('LEFT_BIASED');
      expect(plan.activeTraits).not.toContain('RIGHT_BIASED');
    });

    it('suppresses LEFT_BIASED when RIGHT_BIASED has higher impact', () => {
      const profile: PlayerProfile = {
        ...BLANK_PROFILE,
        traits: [
          makeTrait('LEFT_BIASED', 0.70, 0.70),
          makeTrait('RIGHT_BIASED', 0.92, 0.90),
        ],
      };
      const plan = engine.planLevel(2, profile);
      expect(plan.activeTraits).toContain('RIGHT_BIASED');
      expect(plan.activeTraits).not.toContain('LEFT_BIASED');
    });

    it('suppresses CAUTIOUS when RUSHER has higher impact', () => {
      const profile: PlayerProfile = {
        ...BLANK_PROFILE,
        traits: [
          makeTrait('RUSHER', 0.88, 0.85),
          makeTrait('CAUTIOUS', 0.72, 0.70),
        ],
      };
      const plan = engine.planLevel(2, profile);
      expect(plan.activeTraits).toContain('RUSHER');
      expect(plan.activeTraits).not.toContain('CAUTIOUS');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // §6. UNPREDICTABLE PLAYER / STRATEGY SHIFTING
  // ───────────────────────────────────────────────────────────────────────────
  describe('Unpredictable Player & Strategy Shifting (Safety Rule 7)', () => {
    it('reduces counter intensity when player switches strategy repeatedly', () => {
      const profile: PlayerProfile = {
        ...BLANK_PROFILE,
        traits: [makeTrait('JUMP_HEAVY', 0.90, 0.90)],
      };

      // Normal plan on Level 4 has higher intensity
      const normalPlan = engine.planLevel(4, profile, { strategySwitches: 0 });
      // Shifting plan with repeated strategy switches
      const shiftingPlan = engine.planLevel(4, profile, { strategySwitches: 3 });

      expect(shiftingPlan.modifiers[0].intensity).toBeLessThan(normalPlan.modifiers[0].intensity);
    });

    it('detects balanced left/right oscillation as strategy shift in profile', () => {
      const profile: PlayerProfile = {
        ...BLANK_PROFILE,
        leftChoices: 5,
        rightChoices: 5,
        traits: [makeTrait('JUMP_HEAVY', 0.90, 0.90)],
      };
      const plan = engine.planLevel(4, profile);
      expect(plan.modifiers[0].intensity).toBeLessThanOrEqual(2);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // §7. DETERMINISTIC OUTPUT
  // ───────────────────────────────────────────────────────────────────────────
  describe('Deterministic Output (Safety Rule 5)', () => {
    it('generates the exact same plan given same profile and seed', () => {
      const profile: PlayerProfile = {
        ...BLANK_PROFILE,
        traits: [
          makeTrait('LEFT_BIASED', 0.85, 0.85),
          makeTrait('JUMP_HEAVY', 0.75, 0.75),
        ],
      };

      const planA = engine.planLevel(3, profile, { seed: 4242 });
      const planB = engine.planLevel(3, profile, { seed: 4242 });

      expect(planA).toEqual(planB);
      expect(planA.activeTraits).toEqual(planB.activeTraits);
      expect(planA.modifiers).toEqual(planB.modifiers);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // §8. COUNTERPLAY & SAFETY INVARIANTS
  // ───────────────────────────────────────────────────────────────────────────
  describe('Counterplay & Safety Invariants', () => {
    it('satisfies all safety rules on all levels from 1 to 5', () => {
      const profile: PlayerProfile = {
        ...BLANK_PROFILE,
        traits: [
          makeTrait('LEFT_BIASED', 0.90, 0.90),
          makeTrait('JUMP_HEAVY', 0.85, 0.85),
          makeTrait('EXPLORER', 0.80, 0.80),
        ],
      };

      for (let level = 1; level <= 5; level++) {
        const plan = engine.planLevel(level, profile);
        const safety = engine.validatePlanSafety(plan);
        expect(safety.valid).toBe(true);
        expect(safety.errors).toHaveLength(0);
      }
    });

    it('ensures every modifier has explicit counterplay metadata', () => {
      const traits: TraitId[] = [
        'LEFT_BIASED', 'RIGHT_BIASED', 'JUMP_HEAVY',
        'RUSHER', 'CAUTIOUS', 'REPETITIVE', 'EXPLORER',
      ];
      for (const t of traits) {
        const profile: PlayerProfile = { ...BLANK_PROFILE, traits: [makeTrait(t)] };
        const plan = engine.planLevel(2, profile);
        for (const mod of plan.modifiers) {
          expect(mod.counterplay).toBeDefined();
          expect(mod.counterplay.trim().length).toBeGreaterThan(5);
        }
      }
    });

    it('never stacks more than two high-intensity counters before Level 4 (Safety Rule 9)', () => {
      const profile: PlayerProfile = {
        ...BLANK_PROFILE,
        traits: [
          makeTrait('LEFT_BIASED', 0.99, 0.99),
          makeTrait('JUMP_HEAVY', 0.99, 0.99),
        ],
      };
      const planL2 = engine.planLevel(2, profile);
      const planL3 = engine.planLevel(3, profile);

      const countHighL2 = planL2.modifiers.filter(m => m.intensity >= 2).length;
      const countHighL3 = planL3.modifiers.filter(m => m.intensity >= 2).length;

      expect(countHighL2).toBeLessThanOrEqual(2);
      expect(countHighL3).toBeLessThanOrEqual(2);
    });

    it('never exceeds MAX_INTENSITY (3) under any circumstances (Safety Rule 8)', () => {
      const profile: PlayerProfile = {
        ...BLANK_PROFILE,
        traits: [makeTrait('LEFT_BIASED', 1.0, 1.0)],
      };
      const plan = engine.planLevel(5, profile);
      for (const mod of plan.modifiers) {
        expect(mod.intensity).toBeLessThanOrEqual(3);
      }
    });

    it('never places hazards directly on the player start zone (Safety Rule 1)', () => {
      const profile: PlayerProfile = {
        ...BLANK_PROFILE,
        traits: [
          makeTrait('LEFT_BIASED', 0.9, 0.9),
          makeTrait('JUMP_HEAVY', 0.9, 0.9),
        ],
      };
      const plan = engine.planLevel(3, profile);
      const playerStart = { x: 80, y: 420 };

      for (const mod of plan.modifiers) {
        if (mod.targetX !== undefined && mod.targetY !== undefined) {
          const dx = mod.targetX - playerStart.x;
          const dy = mod.targetY - playerStart.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          expect(dist).toBeGreaterThanOrEqual(350);
        }
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // §9. BACKWARD COMPATIBILITY & FIXTURE INTEGRATION
  // ───────────────────────────────────────────────────────────────────────────
  describe('Fixture Integration', () => {
    it('detects LEFT_BIASED for left-heavy player fixture', () => {
      const profile = buildProfileFor(LEFT_HEAVY_PLAYER);
      const plan    = engine.planLevel(2, profile);
      expect(plan.activeTraits).toContain('LEFT_BIASED');
    });

    it('detects RIGHT_BIASED for right-heavy player fixture', () => {
      const profile = buildProfileFor(RIGHT_HEAVY_PLAYER);
      const plan    = engine.planLevel(2, profile);
      expect(plan.activeTraits).toContain('RIGHT_BIASED');
    });

    it('detects JUMP_HEAVY for jump-heavy player fixture', () => {
      const profile = buildProfileFor(JUMP_HEAVY_PLAYER);
      const plan    = engine.planLevel(5, profile);
      expect(plan.activeTraits).toContain('JUMP_HEAVY');
    });

    it('detects RUSHER for rusher fixture', () => {
      const profile = buildProfileFor(RUSHER_PLAYER);
      const plan    = engine.planLevel(3, profile);
      expect(plan.activeTraits).toContain('RUSHER');
    });

    it('detects CAUTIOUS for cautious fixture', () => {
      const profile = buildProfileFor(CAUTIOUS_PLAYER);
      const plan    = engine.planLevel(3, profile);
      expect(plan.activeTraits).toContain('CAUTIOUS');
    });

    it('detects REPETITIVE for repetitive fixture', () => {
      const profile = buildProfileFor(REPETITIVE_PLAYER);
      const plan    = engine.planLevel(3, profile);
      expect(plan.activeTraits).toContain('REPETITIVE');
    });

    it('detects EXPLORER for explorer fixture', () => {
      const profile = buildProfileFor(EXPLORER_PLAYER);
      const plan    = engine.planLevel(3, profile);
      expect(plan.activeTraits).toContain('EXPLORER');
    });

    it('confirms CONFIDENCE_GATE and SCORE_GATE are set to 0.65', () => {
      expect(CONFIDENCE_GATE).toBe(0.65);
      expect(SCORE_GATE).toBe(0.65);
    });

    it('returns valid plan for empty session fixture', () => {
      const profile = buildProfileFor(EMPTY_SESSION);
      for (const level of [1, 2, 3, 4, 5]) {
        const plan = engine.planLevel(level, profile);
        expect(plan.level).toBe(level);
        expect(Array.isArray(plan.activeTraits)).toBe(true);
        expect(typeof plan.modifiers).toBe('object');
      }
    });
  });
});
