// ─── reveal.test.ts — Phase 6 RevealDirector & Progression tests ──────────────
import { describe, it, expect, beforeEach } from 'vitest';
import { RevealDirector, MIN_OBSERVATION_COOLDOWN_MS } from '@/game/systems/RevealDirector';
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

describe('RevealDirector — Narrative Progression & Evidence Gates', () => {
  let director: RevealDirector;

  beforeEach(() => {
    director = new RevealDirector();
    director.reset();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // §1. EVIDENCE GATES (Messages cannot trigger without evidence)
  // ───────────────────────────────────────────────────────────────────────────
  describe('Evidence Gates', () => {
    it('returns null when profile has NO evidence on Level 3', () => {
      const obs = director.check(BLANK_PROFILE, 3);
      expect(obs).toBeNull();
    });

    it('does NOT trigger LEFT message when leftChoices < 8 despite high leftRatio', () => {
      const profile: PlayerProfile = {
        ...BLANK_PROFILE,
        leftChoices: 6,
        rightChoices: 0, // ratio = 1.0, but count < 8
      };
      const obs = director.check(profile, 3);
      expect(obs).toBeNull();
    });

    it('does NOT trigger LEFT message when leftRatio <= 0.75 despite count >= 8', () => {
      const profile: PlayerProfile = {
        ...BLANK_PROFILE,
        leftChoices: 8,
        rightChoices: 4, // 8 / 12 = 0.67 <= 0.75
      };
      const obs = director.check(profile, 3);
      expect(obs).toBeNull();
    });

    it('triggers LEFT message when leftRatio > 0.75 AND leftChoices >= 8', () => {
      const profile: PlayerProfile = {
        ...BLANK_PROFILE,
        leftChoices: 9,
        rightChoices: 1, // 9 / 10 = 0.90 > 0.75
      };
      const obs = director.check(profile, 3);
      expect(obs).not.toBeNull();
      expect(obs!.message).toBe('You chose left 9 times.');
    });

    it('triggers RIGHT message when rightRatio > 0.75 AND rightChoices >= 8', () => {
      const profile: PlayerProfile = {
        ...BLANK_PROFILE,
        leftChoices: 1,
        rightChoices: 10,
      };
      const obs = director.check(profile, 3);
      expect(obs).not.toBeNull();
      expect(obs!.message).toBe('You chose right 10 times.');
    });

    it('does NOT trigger JUMP message when jump count < 40', () => {
      const profile: PlayerProfile = {
        ...BLANK_PROFILE,
        jumps: 39,
      };
      const obs = director.check(profile, 3);
      expect(obs).toBeNull();
    });

    it('triggers JUMP message when jump count >= 40', () => {
      const profile: PlayerProfile = {
        ...BLANK_PROFILE,
        jumps: 47,
      };
      const obs = director.check(profile, 3);
      expect(obs).not.toBeNull();
      expect(obs!.message).toBe('You jumped 47 times.');
    });

    it('triggers REPETITIVE message when repetitive trait or high attempts exist', () => {
      const profile: PlayerProfile = {
        ...BLANK_PROFILE,
        attempts: 4,
        traits: [makeTrait('REPETITIVE', 0.80, 0.80)],
      };
      const obs = director.check(profile, 3);
      expect(obs).not.toBeNull();
      expect(obs!.message).toBe('You keep trying the same thing.');
    });

    it('triggers HESITATION message when avgHesitationMs > threshold', () => {
      const profile: PlayerProfile = {
        ...BLANK_PROFILE,
        leftChoices: 2,
        rightChoices: 2,
        avgHesitationMs: 1400,
      };
      const obs = director.check(profile, 3);
      expect(obs).not.toBeNull();
      expect(obs!.message).toBe('You hesitate at every turn.');
    });

    it('triggers RUSHER message when hesitation is low and decision count is high', () => {
      const profile: PlayerProfile = {
        ...BLANK_PROFILE,
        leftChoices: 3,
        rightChoices: 3,
        avgHesitationMs: 150,
      };
      const obs = director.check(profile, 3);
      expect(obs).not.toBeNull();
      expect(obs!.message).toBe('Always rushing ahead.');
    });

    it('triggers STRATEGY SWITCH message when strategySwitches >= 2', () => {
      const obs = director.check(BLANK_PROFILE, 3, { strategySwitches: 2 });
      expect(obs).not.toBeNull();
      expect(obs!.message).toBe('Try something new.');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // §2. PROGRESSION BY LEVEL
  // ───────────────────────────────────────────────────────────────────────────
  describe('Progression Rules', () => {
    it('Level 1: NEVER reveals messages regardless of profile', () => {
      const heavyProfile: PlayerProfile = {
        ...BLANK_PROFILE,
        leftChoices: 20,
        jumps: 100,
        attempts: 10,
        traits: [makeTrait('LEFT_BIASED', 0.95)],
      };
      const obs = director.check(heavyProfile, 1);
      expect(obs).toBeNull();
    });

    it('Level 2: Subtle observation only ("Noticed.") with maximum 1 observation', () => {
      const profile: PlayerProfile = {
        ...BLANK_PROFILE,
        attempts: 3,
        traits: [makeTrait('LEFT_BIASED', 0.85)],
      };
      const obs1 = director.check(profile, 2, { nowMs: 1000 });
      expect(obs1).not.toBeNull();
      expect(obs1!.message).toBe('Noticed.');

      // Second check on Level 2 must return null (capped at 1)
      const obs2 = director.check(profile, 2, { nowMs: 10000 });
      expect(obs2).toBeNull();
    });

    it('Level 3: Produces first obvious observation and caps at 1', () => {
      const profile: PlayerProfile = {
        ...BLANK_PROFILE,
        leftChoices: 8,
        rightChoices: 1,
      };
      const obs1 = director.check(profile, 3, { nowMs: 1000 });
      expect(obs1).not.toBeNull();
      expect(obs1!.message).toBe('You chose left 8 times.');

      // Second check on Level 3 must return null
      const obs2 = director.check(profile, 3, { nowMs: 10000 });
      expect(obs2).toBeNull();
    });

    it('Level 4: Allows multiple personalized observations across checks', () => {
      const profile: PlayerProfile = {
        ...BLANK_PROFILE,
        leftChoices: 10,
        rightChoices: 1,
        jumps: 50,
        traits: [makeTrait('LEFT_BIASED', 0.90)],
      };

      const obs1 = director.check(profile, 4, { nowMs: 1000 });
      expect(obs1).not.toBeNull();
      expect(obs1!.message).toBe('Left again. Always left.');

      // After cooldown expires, a second personalized observation is allowed
      const obs2 = director.check(profile, 4, {
        nowMs: 1000 + MIN_OBSERVATION_COOLDOWN_MS + 500,
      });
      expect(obs2).not.toBeNull();
      expect(obs2!.id).not.toBe(obs1!.id);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // §3. DUPLICATE PREVENTION & COOLDOWN
  // ───────────────────────────────────────────────────────────────────────────
  describe('Duplicate Prevention and Rate Limiting', () => {
    it('prevents exact duplicate observation from re-firing in same session', () => {
      const profile: PlayerProfile = {
        ...BLANK_PROFILE,
        jumps: 45,
      };
      const obs1 = director.check(profile, 3, { nowMs: 1000 });
      expect(obs1).not.toBeNull();

      // Reset level count to simulate later query
      const obs2 = director.check(profile, 4, {
        nowMs: 1000 + MIN_OBSERVATION_COOLDOWN_MS + 100,
      });
      // Should not repeat the exact same jump id
      if (obs2) {
        expect(obs2.id).not.toBe(obs1!.id);
      }
    });

    it('respects cooldown and does not interrupt gameplay excessively', () => {
      const profile: PlayerProfile = {
        ...BLANK_PROFILE,
        leftChoices: 10,
        rightChoices: 0,
      };

      const obs1 = director.check(profile, 4, { nowMs: 1000 });
      expect(obs1).not.toBeNull();

      // Immediately checking 500ms later must return null due to cooldown
      const obsFast = director.check(profile, 4, { nowMs: 1500 });
      expect(obsFast).toBeNull();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // §4. FULL PIPELINE: PROFILE → ADAPTATION → LEVEL MODIFIERS → REVEAL
  // ───────────────────────────────────────────────────────────────────────────
  describe('Full Pipeline Integration', () => {
    it('integrates PlayerProfile through AdaptationEngine and LevelCatalog to RevealDirector', () => {
      const engine = new AdaptationEngine();

      // 1. Establish player profile with heavy left bias
      const profile: PlayerProfile = {
        ...BLANK_PROFILE,
        leftChoices: 12,
        rightChoices: 2,
        attempts: 3,
        traits: [makeTrait('LEFT_BIASED', 0.90, 0.90)],
      };

      // 2. Generate adaptation plan for Level 3
      const plan = engine.planLevel(3, profile);
      expect(plan.activeTraits).toContain('LEFT_BIASED');
      expect(plan.modifiers[0].modifier).toBe('LEFT_ROUTE_HAZARD');

      // 3. Apply plan to Level 3 template
      const baseLevel = getLevelData(3);
      const adaptedLevel = applyPlanToLevel(baseLevel, plan);

      // Verify level contains adapted hazard
      const leftHazard = adaptedLevel.hazards.find(h => h.id.includes('adapt-left'));
      expect(leftHazard).toBeDefined();

      // 4. Reveal director produces observation
      const obs = director.check(profile, 3);
      expect(obs).not.toBeNull();
      expect(obs!.message).toBe('You chose left 12 times.');
    });
  });
});
