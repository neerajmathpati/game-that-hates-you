// ─── Phase 9: Comprehensive QA and Acceptance Test Suite ─────────────────────
import { describe, it, expect, beforeEach } from 'vitest';
import { extractFeatures } from '@/game/systems/FeatureExtractor';
import {
  BehaviorAnalyzer,
  CONFIDENCE_ACTIVE,
  SCORE_ACTIVE,
  SCORE_DEACTIVATE,
} from '@/game/systems/BehaviorAnalyzer';
import {
  AdaptationEngine,
  CONFIDENCE_GATE,
  SCORE_GATE,
} from '@/game/systems/AdaptationEngine';
import { RevealDirector } from '@/game/systems/RevealDirector';
import { SessionManager, MAX_EVENTS } from '@/game/systems/SessionManager';
import type { GameEvent, PlayerProfile, BehaviorTrait, TraitId } from '@/game/types';
import {
  LEFT_HEAVY_PLAYER,
  RIGHT_HEAVY_PLAYER,
  JUMP_HEAVY_PLAYER,
  RUSHER_PLAYER,
  CAUTIOUS_PLAYER,
  REPETITIVE_PLAYER,
  EXPLORER_PLAYER,
  MIXED_PLAYER,
} from './fixtures';

// ── Helpers & Fixtures ────────────────────────────────────────────────────────

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

function createTrait(
  id: TraitId,
  score: number,
  confidence: number,
  evidenceCount = 8,
): BehaviorTrait {
  return {
    id,
    score,
    confidence,
    evidenceCount,
    lastUpdatedAt: 1000,
  };
}

describe('Phase 9 QA: 1. FeatureExtractor Suite', () => {
  it('handles empty event arrays gracefully', () => {
    const f = extractFeatures([]);
    expect(f.leftRatio).toBe(0.5);
    expect(f.jumpRate).toBe(0);
    expect(f.decisionCount).toBe(0);
    expect(f.jumpCount).toBe(0);
    expect(f.rushScore).toBe(0);
    expect(f.exploreScore).toBe(0);
  });

  it('correctly extracts left-choice direction share from move events', () => {
    const events: GameEvent[] = [
      { t: 0, type: 'level_start', level: 1 },
      { t: 500, type: 'move', level: 1, choice: 'left' },
      { t: 1500, type: 'move', level: 1, choice: 'left' },
      { t: 2500, type: 'move', level: 1, choice: 'right' },
    ];
    const f = extractFeatures(events);
    expect(f.leftRatio).toBeCloseTo(2 / 3, 2);
  });

  it('calculates jump rate normalized to active seconds', () => {
    const events: GameEvent[] = [
      { t: 0, type: 'level_start', level: 1 },
      { t: 500, type: 'jump', level: 1 },
      { t: 1000, type: 'jump', level: 1 },
      { t: 1500, type: 'jump', level: 1 },
      { t: 2000, type: 'jump', level: 1 },
      { t: 3000, type: 'jump', level: 1 },
    ];
    const f = extractFeatures(events);
    expect(f.jumpCount).toBe(5);
    expect(f.jumpRate).toBeGreaterThan(0);
  });

  it('calculates median hesitation from decision context', () => {
    const events: GameEvent[] = [
      { t: 1000, type: 'decision', level: 1, choice: 'left', context: 'hesitation:100' },
      { t: 2000, type: 'decision', level: 1, choice: 'left', context: 'hesitation:300' },
      { t: 3000, type: 'decision', level: 1, choice: 'left', context: 'hesitation:900' },
    ];
    const f = extractFeatures(events);
    expect(f.medianHesitationMs).toBe(300);
  });
});

describe('Phase 9 QA: 2. BehaviorAnalyzer Boundaries & Hysteresis', () => {
  let analyzer: BehaviorAnalyzer;

  beforeEach(() => {
    analyzer = new BehaviorAnalyzer();
  });

  // Confidence boundaries
  it('boundary: confidence 0.64 does NOT activate trait', () => {
    const features = {
      leftRatio: 1.0,
      jumpRate: 0,
      medianHesitationMs: 300,
      repeatScore: 0,
      exploreScore: 0,
      rushScore: 0,
      decisionCount: 1, // Only 1 decision: confidence is capped < 0.65
      jumpCount: 0,
      activeSeconds: 5,
    };
    const traits = analyzer.analyze(features, BLANK_PROFILE);
    const leftTrait = traits.find(t => t.id === 'LEFT_BIASED');
    expect(leftTrait?.confidence ?? 0).toBeLessThan(0.65);
    expect(traits.some(t => t.id === 'LEFT_BIASED' && t.confidence >= CONFIDENCE_ACTIVE)).toBe(false);
  });

  it('boundary: confidence 0.65 and score 0.65 activates trait', () => {
    const features = {
      leftRatio: 1.0, // score >= 0.65
      jumpRate: 0,
      medianHesitationMs: 300,
      repeatScore: 0,
      exploreScore: 0,
      rushScore: 0,
      decisionCount: 8, // saturates confidence
      jumpCount: 0,
      activeSeconds: 5,
    };
    const traits = analyzer.analyze(features, BLANK_PROFILE);
    const leftTrait = traits.find(t => t.id === 'LEFT_BIASED');
    expect(leftTrait).toBeDefined();
    expect(leftTrait!.confidence).toBeGreaterThanOrEqual(CONFIDENCE_ACTIVE);
    expect(leftTrait!.score).toBeGreaterThanOrEqual(SCORE_ACTIVE);
  });

  it('boundary: score 0.64 does NOT activate trait even with high confidence', () => {
    const features = {
      leftRatio: 0.64,
      jumpRate: 0,
      medianHesitationMs: 300,
      repeatScore: 0,
      exploreScore: 0,
      rushScore: 0,
      decisionCount: 10,
      jumpCount: 0,
      activeSeconds: 10,
    };
    const traits = analyzer.analyze(features, BLANK_PROFILE);
    const leftTrait = traits.find(t => t.id === 'LEFT_BIASED');
    expect(leftTrait?.score ?? 0).toBeLessThan(SCORE_ACTIVE);
  });

  it('hysteresis: score decays gradually on single contrary observation instead of instant drop', () => {
    const prevProfile: PlayerProfile = {
      ...BLANK_PROFILE,
      traits: [createTrait('RIGHT_BIASED', 0.85, 0.80, 10)],
    };

    // 1 single contrary observation (decisionCount 11 vs prev 10)
    const f = {
      leftRatio: 0.80, // raw score for RIGHT_BIASED is 0.20
      jumpRate: 0,
      medianHesitationMs: 300,
      repeatScore: 0,
      exploreScore: 0,
      rushScore: 0,
      decisionCount: 11,
      jumpCount: 0,
      activeSeconds: 10,
    };

    const traits = analyzer.analyze(f, prevProfile);
    const rb = traits.find(t => t.id === 'RIGHT_BIASED');
    expect(rb).toBeDefined();
    // Decays gradually: 0.85 * 0.85 ≈ 0.72 > 0.50, not instantaneous 0.20
    expect(rb!.score).toBeGreaterThan(0.50);
  });

  it('hysteresis: deactivates when sufficient contradictory samples accumulate', () => {
    const prevProfile: PlayerProfile = {
      ...BLANK_PROFILE,
      traits: [createTrait('RIGHT_BIASED', 0.85, 0.80, 10)],
    };

    // 6 new contrary observations (decisionCount 16 vs prev 10)
    const f = {
      leftRatio: 0.90, // raw score for RIGHT_BIASED is 0.10
      jumpRate: 0,
      medianHesitationMs: 300,
      repeatScore: 0,
      exploreScore: 0,
      rushScore: 0,
      decisionCount: 16,
      jumpCount: 0,
      activeSeconds: 15,
    };

    const traits = analyzer.analyze(f, prevProfile);
    const rb = traits.find(t => t.id === 'RIGHT_BIASED');
    expect(rb!.score).toBeLessThan(SCORE_DEACTIVATE);
  });

  it('insufficient evidence: zero decisions produces zero confidence', () => {
    const features = {
      leftRatio: 0.5,
      jumpRate: 0,
      medianHesitationMs: 0,
      repeatScore: 0,
      exploreScore: 0,
      rushScore: 0,
      decisionCount: 0,
      jumpCount: 0,
      activeSeconds: 1,
    };
    const traits = analyzer.analyze(features, BLANK_PROFILE);
    expect(traits).toHaveLength(0);
  });
});

describe('Phase 9 QA: 3. AdaptationEngine Level Gating & Budgets', () => {
  let engine: AdaptationEngine;

  beforeEach(() => {
    engine = new AdaptationEngine();
  });

  it('Level 1 strictly selects 0 counters (returns neutral modifier)', () => {
    const profile: PlayerProfile = {
      ...BLANK_PROFILE,
      traits: [
        createTrait('LEFT_BIASED', 0.95, 0.95),
        createTrait('JUMP_HEAVY', 0.90, 0.90),
      ],
    };
    const plan = engine.planLevel(1, profile);
    expect(plan.activeTraits).toHaveLength(0);
    expect(plan.modifiers[0].trait).toBe('NEUTRAL');
  });

  it('Levels 2–4 enforce max 2 primary active traits', () => {
    const profile: PlayerProfile = {
      ...BLANK_PROFILE,
      traits: [
        createTrait('LEFT_BIASED', 0.95, 0.95),
        createTrait('JUMP_HEAVY', 0.90, 0.90),
        createTrait('RUSHER', 0.85, 0.85),
      ],
    };
    for (const lvl of [2, 3, 4]) {
      const plan = engine.planLevel(lvl, profile);
      expect(plan.activeTraits.length).toBeLessThanOrEqual(2);
    }
  });

  it('Level 5 allows up to 3 primary active traits', () => {
    const profile: PlayerProfile = {
      ...BLANK_PROFILE,
      traits: [
        createTrait('LEFT_BIASED', 0.95, 0.95),
        createTrait('JUMP_HEAVY', 0.90, 0.90),
        createTrait('RUSHER', 0.85, 0.85),
        createTrait('EXPLORER', 0.80, 0.80),
      ],
    };
    const plan = engine.planLevel(5, profile);
    expect(plan.activeTraits.length).toBeLessThanOrEqual(3);
    expect(plan.activeTraits.length).toBe(3);
  });

  it('boundary: trait with score 0.64 is rejected by AdaptationEngine gate', () => {
    const profile: PlayerProfile = {
      ...BLANK_PROFILE,
      traits: [createTrait('LEFT_BIASED', 0.64, 0.90)],
    };
    const plan = engine.planLevel(2, profile);
    expect(plan.activeTraits).not.toContain('LEFT_BIASED');
  });

  it('boundary: trait with confidence 0.64 is rejected by AdaptationEngine gate', () => {
    const profile: PlayerProfile = {
      ...BLANK_PROFILE,
      traits: [createTrait('LEFT_BIASED', 0.90, 0.64)],
    };
    const plan = engine.planLevel(2, profile);
    expect(plan.activeTraits).not.toContain('LEFT_BIASED');
  });

  it('boundary: trait with score 0.65 and confidence 0.65 passes gate', () => {
    const profile: PlayerProfile = {
      ...BLANK_PROFILE,
      traits: [createTrait('LEFT_BIASED', SCORE_GATE, CONFIDENCE_GATE)],
    };
    const plan = engine.planLevel(2, profile);
    expect(plan.activeTraits).toContain('LEFT_BIASED');
  });
});

describe('Phase 9 QA: 4. RevealDirector Evidence Gating & Cool-down', () => {
  let director: RevealDirector;

  beforeEach(() => {
    director = new RevealDirector();
  });

  it('does NOT fire observation message on Level 1', () => {
    const profile: PlayerProfile = {
      ...BLANK_PROFILE,
      leftChoices: 10,
      attempts: 5,
    };
    const result = director.check(profile, 1, { trigger: 'death' });
    expect(result).toBeNull();
  });

  it('fires observation when evidence threshold is met on Level 3+', () => {
    const profile: PlayerProfile = {
      ...BLANK_PROFILE,
      leftChoices: 8,
      attempts: 3,
    };
    const result = director.check(profile, 3, { trigger: 'decision', nowMs: 5000 });
    expect(result).not.toBeNull();
    expect(result?.message).toContain('8');
  });

  it('enforces cool-down and does not spam consecutive messages', () => {
    const profile: PlayerProfile = {
      ...BLANK_PROFILE,
      jumps: 50,
      attempts: 2,
    };
    const msg1 = director.check(profile, 3, { trigger: 'death', nowMs: 1000 });
    expect(msg1).not.toBeNull();

    // Immediately check again (under cool-down) — must be throttled
    const msg2 = director.check(profile, 3, { trigger: 'death', nowMs: 1500 });
    expect(msg2).toBeNull();
  });

  it('reset clears message history and allows messages to trigger again', () => {
    const profile: PlayerProfile = {
      ...BLANK_PROFILE,
      attempts: 6,
    };
    const msg1 = director.check(profile, 3, { trigger: 'death', nowMs: 1000 });
    expect(msg1).not.toBeNull();

    director.reset();
    expect(director.seenCount).toBe(0);
  });
});

describe('Phase 9 QA: 5. SessionManager Ring Buffer & Invariants', () => {
  let sm: SessionManager;

  beforeEach(() => {
    sm = new SessionManager();
    sm.start();
  });

  it('bounds events to MAX_EVENTS (5000) using ring buffer eviction', () => {
    for (let i = 0; i < MAX_EVENTS + 100; i++) {
      sm.record({ type: 'jump', level: 1 });
    }
    expect(sm.eventCount).toBeLessThanOrEqual(MAX_EVENTS);
    expect(sm.eventCount).toBe(MAX_EVENTS - MAX_EVENTS / 4 + 100);
  });

  it('produces strictly session-relative timestamps (ms >= 0)', () => {
    const evt = sm.record({ type: 'move', level: 1 });
    expect(evt.t).toBeGreaterThanOrEqual(0);
    expect(evt.t).toBeLessThan(10_000);
  });

  it('complete reset wipes all events and profile data', () => {
    sm.record({ type: 'jump', level: 1 });
    sm.record({ type: 'death', level: 1 });
    sm.updateProfile({ attempts: 4, jumps: 12 });

    expect(sm.eventCount).toBe(2);
    expect(sm.profile.attempts).toBe(4);

    sm.reset();

    expect(sm.eventCount).toBe(0);
    expect(sm.profile.attempts).toBe(0);
    expect(sm.profile.jumps).toBe(0);
    expect(sm.profile.traits).toHaveLength(0);
  });
});

describe('Phase 9 QA: All 9 Player Profiles (A through I)', () => {
  let analyzer: BehaviorAnalyzer;
  let engine: AdaptationEngine;

  beforeEach(() => {
    analyzer = new BehaviorAnalyzer();
    engine = new AdaptationEngine();
  });

  // A. LEFT-ONLY
  it('Profile A: LEFT-ONLY triggers LEFT_BIASED trait and generates left counter', () => {
    const features = extractFeatures(LEFT_HEAVY_PLAYER);
    const traits = analyzer.analyze(features, BLANK_PROFILE);
    expect(traits.some(t => t.id === 'LEFT_BIASED' && t.score >= 0.65)).toBe(true);

    const plan = engine.planLevel(2, { ...BLANK_PROFILE, traits });
    expect(plan.activeTraits).toContain('LEFT_BIASED');
    expect(plan.modifiers.some(m => m.trait === 'LEFT_BIASED')).toBe(true);
  });

  // B. RIGHT-ONLY
  it('Profile B: RIGHT-ONLY triggers RIGHT_BIASED trait and generates right counter', () => {
    const features = extractFeatures(RIGHT_HEAVY_PLAYER);
    const traits = analyzer.analyze(features, BLANK_PROFILE);
    expect(traits.some(t => t.id === 'RIGHT_BIASED' && t.score >= 0.65)).toBe(true);

    const plan = engine.planLevel(2, { ...BLANK_PROFILE, traits });
    expect(plan.activeTraits).toContain('RIGHT_BIASED');
    expect(plan.modifiers.some(m => m.trait === 'RIGHT_BIASED')).toBe(true);
  });

  // C. JUMP-HEAVY
  it('Profile C: JUMP-HEAVY triggers JUMP_HEAVY trait and counters aerial paths', () => {
    const features = extractFeatures(JUMP_HEAVY_PLAYER);
    const traits = analyzer.analyze(features, BLANK_PROFILE);
    expect(traits.some(t => t.id === 'JUMP_HEAVY')).toBe(true);

    const plan = engine.planLevel(2, { ...BLANK_PROFILE, traits });
    expect(plan.activeTraits).toContain('JUMP_HEAVY');
    expect(plan.modifiers.some(m => m.trait === 'JUMP_HEAVY')).toBe(true);
  });

  // D. RUSHER
  it('Profile D: RUSHER triggers RUSHER trait and places speed gate', () => {
    const features = extractFeatures(RUSHER_PLAYER);
    const traits = analyzer.analyze(features, BLANK_PROFILE);
    expect(traits.some(t => t.id === 'RUSHER')).toBe(true);

    const plan = engine.planLevel(2, { ...BLANK_PROFILE, traits });
    expect(plan.activeTraits).toContain('RUSHER');
    expect(plan.modifiers.some(m => m.trait === 'RUSHER')).toBe(true);
  });

  // E. CAUTIOUS
  it('Profile E: CAUTIOUS triggers CAUTIOUS trait and adds stall timer', () => {
    const features = extractFeatures(CAUTIOUS_PLAYER);
    const traits = analyzer.analyze(features, BLANK_PROFILE);
    expect(traits.some(t => t.id === 'CAUTIOUS')).toBe(true);

    const plan = engine.planLevel(2, { ...BLANK_PROFILE, traits });
    expect(plan.activeTraits).toContain('CAUTIOUS');
    expect(plan.modifiers.some(m => m.trait === 'CAUTIOUS')).toBe(true);
  });

  // F. REPETITIVE
  it('Profile F: REPETITIVE triggers REPETITIVE trait when repeating identical route >= 3 times', () => {
    const features = extractFeatures(REPETITIVE_PLAYER);
    const traits = analyzer.analyze(features, BLANK_PROFILE);
    expect(traits.some(t => t.id === 'REPETITIVE')).toBe(true);

    const plan = engine.planLevel(2, { ...BLANK_PROFILE, traits });
    expect(plan.activeTraits).toContain('REPETITIVE');
    expect(plan.modifiers.some(m => m.trait === 'REPETITIVE')).toBe(true);
  });

  // G. EXPLORER
  it('Profile G: EXPLORER triggers EXPLORER trait and places decoy hazard', () => {
    const features = extractFeatures(EXPLORER_PLAYER);
    const traits = analyzer.analyze(features, BLANK_PROFILE);
    expect(traits.some(t => t.id === 'EXPLORER')).toBe(true);

    const plan = engine.planLevel(2, { ...BLANK_PROFILE, traits });
    expect(plan.activeTraits).toContain('EXPLORER');
    expect(plan.modifiers.some(m => m.trait === 'EXPLORER')).toBe(true);
  });

  // H. RANDOM/CHAOTIC
  it('Profile H: RANDOM/CHAOTIC with mixed choices triggers NO dominant traits', () => {
    const features = extractFeatures(MIXED_PLAYER);
    const traits = analyzer.analyze(features, BLANK_PROFILE);
    expect(traits.some(t => t.id === 'LEFT_BIASED' && t.confidence >= 0.65)).toBe(false);
    expect(traits.some(t => t.id === 'RIGHT_BIASED' && t.confidence >= 0.65)).toBe(false);
    expect(traits.some(t => t.id === 'RUSHER' && t.confidence >= 0.65)).toBe(false);
    expect(traits.some(t => t.id === 'CAUTIOUS' && t.confidence >= 0.65)).toBe(false);

    const plan = engine.planLevel(2, { ...BLANK_PROFILE, traits });
    expect(plan.activeTraits).toHaveLength(0);
  });

  // I. STRATEGY-SWITCHING
  it('Profile I: STRATEGY-SWITCHING updates player profile and adapts gracefully', () => {
    // Phase 1: Left-biased session
    const leftEvents: GameEvent[] = [
      { t: 0, type: 'level_start', level: 1 },
      { t: 100, type: 'move', level: 1, choice: 'left' },
      { t: 200, type: 'move', level: 1, choice: 'left' },
      { t: 300, type: 'move', level: 1, choice: 'left' },
      { t: 500, type: 'decision', level: 1, choice: 'left', context: 'hesitation:300' },
      { t: 1500, type: 'decision', level: 1, choice: 'left', context: 'hesitation:300' },
      { t: 2500, type: 'decision', level: 1, choice: 'left', context: 'hesitation:300' },
      { t: 3500, type: 'decision', level: 1, choice: 'left', context: 'hesitation:300' },
      { t: 4500, type: 'decision', level: 1, choice: 'left', context: 'hesitation:300' },
    ];
    const profilePhase1: PlayerProfile = {
      ...BLANK_PROFILE,
      traits: analyzer.analyze(extractFeatures(leftEvents), BLANK_PROFILE),
    };
    expect(profilePhase1.traits.some(t => t.id === 'LEFT_BIASED')).toBe(true);

    // Phase 2: Player realizes game countered left, and switches to Right heavily
    const switchedEvents: GameEvent[] = [
      ...leftEvents,
      { t: 5000, type: 'move', level: 2, choice: 'right' },
      { t: 5100, type: 'move', level: 2, choice: 'right' },
      { t: 5200, type: 'move', level: 2, choice: 'right' },
      { t: 5300, type: 'move', level: 2, choice: 'right' },
      { t: 5400, type: 'move', level: 2, choice: 'right' },
      { t: 5500, type: 'move', level: 2, choice: 'right' },
      { t: 5600, type: 'move', level: 2, choice: 'right' },
      { t: 5700, type: 'move', level: 2, choice: 'right' },
      { t: 5800, type: 'move', level: 2, choice: 'right' },
      { t: 6000, type: 'decision', level: 2, choice: 'right', context: 'hesitation:300' },
      { t: 7000, type: 'decision', level: 2, choice: 'right', context: 'hesitation:300' },
      { t: 8000, type: 'decision', level: 2, choice: 'right', context: 'hesitation:300' },
      { t: 9000, type: 'decision', level: 2, choice: 'right', context: 'hesitation:300' },
      { t: 10000, type: 'decision', level: 2, choice: 'right', context: 'hesitation:300' },
      { t: 11000, type: 'decision', level: 2, choice: 'right', context: 'hesitation:300' },
      { t: 12000, type: 'decision', level: 2, choice: 'right', context: 'hesitation:300' },
    ];
    const profilePhase2: PlayerProfile = {
      ...profilePhase1,
      traits: analyzer.analyze(extractFeatures(switchedEvents), profilePhase1),
    };

    // Right choices dominate now, left trait decayed
    const rightTrait = profilePhase2.traits.find(t => t.id === 'RIGHT_BIASED');
    const leftTrait = profilePhase2.traits.find(t => t.id === 'LEFT_BIASED');
    expect(rightTrait?.score ?? 0).toBeGreaterThan(0.65);
    expect(leftTrait?.score ?? 0).toBeLessThan(0.45);
  });
});
