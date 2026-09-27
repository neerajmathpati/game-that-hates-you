// ─── level5-personal.test.ts — Phase 7 Level 5 Personal Level Tests ───────────
import { describe, it, expect, beforeEach } from 'vitest';
import { AdaptationEngine } from '@/game/systems/AdaptationEngine';
import { getLevelData, applyPlanToLevel } from '@/game/levels/levelCatalog';
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

describe('Phase 7: Level 5 Personal Level', () => {
  let engine: AdaptationEngine;

  beforeEach(() => {
    engine = new AdaptationEngine();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // §1. LEVEL 5 USES ACTUAL PLAYER PROFILE
  // ───────────────────────────────────────────────────────────────────────────
  describe('Profile-Driven Generation', () => {
    it('generates Level 5 counters strictly from the active PlayerProfile', () => {
      const leftProfile: PlayerProfile = {
        ...BLANK_PROFILE,
        traits: [makeTrait('LEFT_BIASED', 0.92, 0.90)],
      };
      const planLeft = engine.planLevel(5, leftProfile);
      expect(planLeft.activeTraits).toContain('LEFT_BIASED');

      const levelLeft = applyPlanToLevel(getLevelData(5), planLeft);
      const hasLeftHazard = levelLeft.hazards.some(h => h.id.includes('adapt-left'));
      expect(hasLeftHazard).toBe(true);

      const jumpProfile: PlayerProfile = {
        ...BLANK_PROFILE,
        traits: [makeTrait('JUMP_HEAVY', 0.92, 0.90)],
      };
      const planJump = engine.planLevel(5, jumpProfile);
      expect(planJump.activeTraits).toContain('JUMP_HEAVY');

      const levelJump = applyPlanToLevel(getLevelData(5), planJump);
      const hasAirHazard = levelJump.hazards.some(h => h.id.includes('adapt-jump'));
      expect(hasAirHazard).toBe(true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // §2. THREE TRAITS CAN BE COMBINED ON LEVEL 5
  // ───────────────────────────────────────────────────────────────────────────
  describe('Multi-Trait Combination (Up to 3 Traits)', () => {
    it('selects and combines up to 3 strongest confident traits on Level 5', () => {
      const multiProfile: PlayerProfile = {
        ...BLANK_PROFILE,
        traits: [
          makeTrait('LEFT_BIASED', 0.95, 0.95), // impact: 0.9025
          makeTrait('JUMP_HEAVY', 0.90, 0.90),  // impact: 0.8100
          makeTrait('EXPLORER', 0.85, 0.85),    // impact: 0.7225
          makeTrait('REPETITIVE', 0.70, 0.70),  // 4th trait: pruned
        ],
      };

      const plan = engine.planLevel(5, multiProfile);
      expect(plan.activeTraits).toHaveLength(3);
      expect(plan.activeTraits).toEqual(['LEFT_BIASED', 'JUMP_HEAVY', 'EXPLORER']);

      const level = applyPlanToLevel(getLevelData(5), plan);
      expect(level.hazards.some(h => h.id.includes('adapt-left'))).toBe(true);
      expect(level.hazards.some(h => h.id.includes('adapt-jump'))).toBe(true);
      expect(level.hazards.some(h => h.id.includes('adapt-decoy'))).toBe(true);
    });

    it('ensures each combined hazard receives a unique identifier without collisions', () => {
      const multiProfile: PlayerProfile = {
        ...BLANK_PROFILE,
        traits: [
          makeTrait('LEFT_BIASED', 0.90),
          makeTrait('JUMP_HEAVY', 0.88),
          makeTrait('RUSHER', 0.85),
        ],
      };

      const plan = engine.planLevel(5, multiProfile);
      const level = applyPlanToLevel(getLevelData(5), plan);

      const hazardIds = level.hazards.map(h => h.id);
      const uniqueIds = new Set(hazardIds);
      expect(uniqueIds.size).toBe(hazardIds.length);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // §3. NO TRAIT PRODUCES AN IMPOSSIBLE LEVEL (SOLVABILITY & COUNTERPLAY)
  // ───────────────────────────────────────────────────────────────────────────
  describe('Solvability & Viable Counterplay', () => {
    it('guarantees every combined modifier carries non-empty counterplay instructions', () => {
      const multiProfile: PlayerProfile = {
        ...BLANK_PROFILE,
        traits: [
          makeTrait('LEFT_BIASED', 0.95),
          makeTrait('JUMP_HEAVY', 0.90),
          makeTrait('RUSHER', 0.85),
        ],
      };

      const plan = engine.planLevel(5, multiProfile);
      for (const mod of plan.modifiers) {
        expect(mod.counterplay).toBeDefined();
        expect(mod.counterplay.length).toBeGreaterThan(10);
      }
    });

    it('maintains safe recovery zones and player spawn clearance in Level 5', () => {
      const extremeProfile: PlayerProfile = {
        ...BLANK_PROFILE,
        traits: [
          makeTrait('LEFT_BIASED', 1.0, 1.0),
          makeTrait('JUMP_HEAVY', 1.0, 1.0),
          makeTrait('RUSHER', 1.0, 1.0),
        ],
      };

      const plan = engine.planLevel(5, extremeProfile);
      const safety = engine.validatePlanSafety(plan, { x: 80, y: 420 });
      expect(safety.valid).toBe(true);
      expect(safety.errors).toHaveLength(0);

      const level = applyPlanToLevel(getLevelData(5), plan);
      // Verify recovery platform at x=1720 remains intact
      const recoveryPlatform = level.platforms.find(p => p.x === 1720 && p.y === 460);
      expect(recoveryPlatform).toBeDefined();
      expect(recoveryPlatform!.w).toBeGreaterThanOrEqual(180);
    });

    it('ensures every decision point in Level 5 retains an open non-counter path', () => {
      // Test when LEFT_BIASED is countered
      const leftProfile: PlayerProfile = {
        ...BLANK_PROFILE,
        traits: [makeTrait('LEFT_BIASED', 0.95)],
      };
      const planLeft = engine.planLevel(5, leftProfile);
      expect(planLeft.modifiers[0].parameters?.rightRouteClear).toBe(true);

      // Test when JUMP_HEAVY is countered
      const jumpProfile: PlayerProfile = {
        ...BLANK_PROFILE,
        traits: [makeTrait('JUMP_HEAVY', 0.95)],
      };
      const planJump = engine.planLevel(5, jumpProfile);
      expect(planJump.modifiers[0].parameters?.groundWalkwayClear).toBe(true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // §4. EMPTY PROFILE USES FALLBACK MODIFIERS
  // ───────────────────────────────────────────────────────────────────────────
  describe('Fallback for Empty or Unconfident Profile', () => {
    it('uses fallback NEUTRAL modifier when no confident traits exist', () => {
      const plan = engine.planLevel(5, BLANK_PROFILE);
      expect(plan.activeTraits).toHaveLength(0);
      expect(plan.modifiers).toHaveLength(1);
      expect(plan.modifiers[0].trait).toBe('NEUTRAL');
      expect(plan.modifiers[0].intensity).toBe(0);

      const level = applyPlanToLevel(getLevelData(5), plan);
      // Base hazards only, no adaptive traps added
      const adaptiveHazards = level.hazards.filter(h => h.id.startsWith('adapt-'));
      expect(adaptiveHazards).toHaveLength(0);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // §5. STRATEGY SWITCHING REDUCES INTENSITY
  // ───────────────────────────────────────────────────────────────────────────
  describe('Strategy Switching & Predictability Reduction', () => {
    it('reduces adaptation intensity when player switches strategy repeatedly', () => {
      const predictableProfile: PlayerProfile = {
        ...BLANK_PROFILE,
        traits: [
          makeTrait('LEFT_BIASED', 0.90),
          makeTrait('JUMP_HEAVY', 0.88),
          makeTrait('RUSHER', 0.85),
        ],
      };

      // Standard predictable plan on Level 5
      const standardPlan = engine.planLevel(5, predictableProfile, { strategySwitches: 0 });

      // Player who changed tactics repeatedly (strategy switches = 3)
      const shiftingPlan = engine.planLevel(5, predictableProfile, { strategySwitches: 3 });

      const sumStandardIntensity = standardPlan.modifiers.reduce((sum, m) => sum + m.intensity, 0);
      const sumShiftingIntensity = shiftingPlan.modifiers.reduce((sum, m) => sum + m.intensity, 0);

      expect(sumShiftingIntensity).toBeLessThan(sumStandardIntensity);
    });

    it('rewards unpredictable player with lower counter pressure', () => {
      const profile: PlayerProfile = {
        ...BLANK_PROFILE,
        leftChoices: 6,
        rightChoices: 6, // balanced oscillation
        traits: [makeTrait('JUMP_HEAVY', 0.85)],
      };

      const plan = engine.planLevel(5, profile);
      // Intensity should be dampened from max
      expect(plan.modifiers[0].intensity).toBeLessThanOrEqual(2);
    });
  });
});
