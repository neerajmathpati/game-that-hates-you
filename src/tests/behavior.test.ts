// ─── behavior.test.ts — FeatureExtractor + BehaviorAnalyzer unit tests ────────
import { describe, it, expect, beforeEach } from 'vitest';
import { extractFeatures, median } from '@/game/systems/FeatureExtractor';
import { BehaviorAnalyzer, TRAIT_THRESHOLDS } from '@/game/systems/BehaviorAnalyzer';
import {
  EMPTY_SESSION,
  LEFT_HEAVY_PLAYER,
  RIGHT_HEAVY_PLAYER,
  JUMP_HEAVY_PLAYER,
  REPETITIVE_PLAYER,
  EXPLORER_PLAYER,
  RUSHER_PLAYER,
  CAUTIOUS_PLAYER,
  MIXED_PLAYER,
} from './fixtures';
import type { PlayerProfile } from '@/game/types';

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

// ── median() helper ───────────────────────────────────────────────────────────

describe('median()', () => {
  it('returns 0 for empty array', () => {
    expect(median([])).toBe(0);
  });

  it('returns single value for array of length 1', () => {
    expect(median([42])).toBe(42);
  });

  it('returns middle value for odd-length array', () => {
    expect(median([1, 3, 5])).toBe(3);
  });

  it('returns average of two middle values for even-length array', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
});

// ── extractFeatures() ─────────────────────────────────────────────────────────

describe('extractFeatures()', () => {
  describe('empty session', () => {
    it('returns safe defaults with no events', () => {
      const f = extractFeatures(EMPTY_SESSION);
      expect(f.leftRatio).toBe(0.5);
      expect(f.jumpRate).toBe(0);
      expect(f.medianHesitationMs).toBe(0);
      expect(f.repeatScore).toBe(0);
      expect(f.decisionCount).toBe(0);
      expect(f.jumpCount).toBe(0);
      expect(f.activeSeconds).toBe(0);
    });
  });

  describe('left-heavy player', () => {
    it('detects high left ratio > 0.68', () => {
      const f = extractFeatures(LEFT_HEAVY_PLAYER);
      // All decisions are 'left', so leftRatio from move events
      expect(f.leftRatio).toBeGreaterThan(0.68);
    });

    it('has multiple decision points', () => {
      const f = extractFeatures(LEFT_HEAVY_PLAYER);
      expect(f.decisionCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe('right-heavy player', () => {
    it('detects low left ratio (< 0.32 = right-biased)', () => {
      const f = extractFeatures(RIGHT_HEAVY_PLAYER);
      expect(f.leftRatio).toBeLessThan(0.32);
    });
  });

  describe('jump-heavy player', () => {
    it('detects high jump count', () => {
      const f = extractFeatures(JUMP_HEAVY_PLAYER);
      expect(f.jumpCount).toBeGreaterThanOrEqual(8);
    });

    it('detects high jump rate (> 10 jumps/10sec)', () => {
      const f = extractFeatures(JUMP_HEAVY_PLAYER);
      expect(f.jumpRate).toBeGreaterThan(10);
    });
  });

  describe('repetitive player', () => {
    it('detects repeat score > 0.6 for same-route player', () => {
      const f = extractFeatures(REPETITIVE_PLAYER);
      expect(f.repeatScore).toBeGreaterThan(0.6);
    });
  });

  describe('explorer player', () => {
    it('detects high explore score', () => {
      const f = extractFeatures(EXPLORER_PLAYER);
      expect(f.exploreScore).toBeGreaterThan(0.5);
    });
  });

  describe('rusher player', () => {
    it('has low median hesitation (< 100ms)', () => {
      const f = extractFeatures(RUSHER_PLAYER);
      expect(f.medianHesitationMs).toBeLessThan(100);
    });

    it('has high rush score (> 0.9)', () => {
      const f = extractFeatures(RUSHER_PLAYER);
      expect(f.rushScore).toBeGreaterThan(0.9);
    });
  });

  describe('cautious player', () => {
    it('has high median hesitation (> 900ms)', () => {
      const f = extractFeatures(CAUTIOUS_PLAYER);
      expect(f.medianHesitationMs).toBeGreaterThan(900);
    });

    it('has low rush score', () => {
      const f = extractFeatures(CAUTIOUS_PLAYER);
      expect(f.rushScore).toBeLessThan(0.1);
    });
  });

  describe('mixed player', () => {
    it('has leftRatio near 0.5', () => {
      const f = extractFeatures(MIXED_PLAYER);
      // 2 left decisions, 2 right decisions → equal; 1 left move, 1 right move
      expect(f.leftRatio).toBeGreaterThanOrEqual(0.3);
      expect(f.leftRatio).toBeLessThanOrEqual(0.7);
    });
  });

  describe('activeSeconds', () => {
    it('computes elapsed time from first to last event', () => {
      // LEFT_HEAVY_PLAYER last event t=10500, first t=0 → ~10.5s
      const f = extractFeatures(LEFT_HEAVY_PLAYER);
      expect(f.activeSeconds).toBeCloseTo(10.5, 0);
    });
  });
});

// ── BehaviorAnalyzer ──────────────────────────────────────────────────────────

describe('BehaviorAnalyzer', () => {
  let analyzer: BehaviorAnalyzer;

  beforeEach(() => {
    analyzer = new BehaviorAnalyzer();
  });

  describe('direction bias detection', () => {
    it('marks LEFT_BIASED active for left-heavy player', () => {
      const features = extractFeatures(LEFT_HEAVY_PLAYER);
      const traits   = analyzer.analyze(features, BLANK_PROFILE);
      const active   = analyzer.activeTraits(traits);
      expect(active.some(t => t.id === 'LEFT_BIASED')).toBe(true);
    });

    it('marks RIGHT_BIASED active for right-heavy player', () => {
      const features = extractFeatures(RIGHT_HEAVY_PLAYER);
      const traits   = analyzer.analyze(features, BLANK_PROFILE);
      const active   = analyzer.activeTraits(traits);
      expect(active.some(t => t.id === 'RIGHT_BIASED')).toBe(true);
    });

    it('does NOT mark LEFT_BIASED for right-heavy player', () => {
      const features = extractFeatures(RIGHT_HEAVY_PLAYER);
      const traits   = analyzer.analyze(features, BLANK_PROFILE);
      const active   = analyzer.activeTraits(traits);
      expect(active.some(t => t.id === 'LEFT_BIASED')).toBe(false);
    });
  });

  describe('jump heavy detection', () => {
    it('marks JUMP_HEAVY active for jump-heavy player', () => {
      const features = extractFeatures(JUMP_HEAVY_PLAYER);
      const traits   = analyzer.analyze(features, BLANK_PROFILE);
      const active   = analyzer.activeTraits(traits);
      expect(active.some(t => t.id === 'JUMP_HEAVY')).toBe(true);
    });
  });

  describe('speed traits', () => {
    it('marks RUSHER active for fast player', () => {
      const features = extractFeatures(RUSHER_PLAYER);
      const traits   = analyzer.analyze(features, BLANK_PROFILE);
      const active   = analyzer.activeTraits(traits);
      expect(active.some(t => t.id === 'RUSHER')).toBe(true);
    });

    it('marks CAUTIOUS active for cautious player', () => {
      const features = extractFeatures(CAUTIOUS_PLAYER);
      const traits   = analyzer.analyze(features, BLANK_PROFILE);
      const active   = analyzer.activeTraits(traits);
      expect(active.some(t => t.id === 'CAUTIOUS')).toBe(true);
    });
  });

  describe('confidence threshold boundary', () => {
    it('does NOT activate trait when confidence is below 0.65', () => {
      // Use EMPTY_SESSION — no evidence → no active traits
      const features = extractFeatures(EMPTY_SESSION);
      const traits   = analyzer.analyze(features, BLANK_PROFILE);
      const active   = analyzer.activeTraits(traits);
      expect(active).toHaveLength(0);
    });

    it('activeTraits() returns only traits above both thresholds', () => {
      const features = extractFeatures(LEFT_HEAVY_PLAYER);
      const traits   = analyzer.analyze(features, BLANK_PROFILE);
      for (const t of analyzer.activeTraits(traits)) {
        expect(t.confidence).toBeGreaterThanOrEqual(TRAIT_THRESHOLDS.CONFIDENCE_ACTIVE);
        expect(t.score).toBeGreaterThanOrEqual(TRAIT_THRESHOLDS.SCORE_ACTIVE);
      }
    });
  });

  describe('hysteresis', () => {
    it('keeps active trait active after single contradictory action', () => {
      // First: establish LEFT_BIASED
      const f1 = extractFeatures(LEFT_HEAVY_PLAYER);
      const t1 = analyzer.analyze(f1, BLANK_PROFILE);
      const profileWithTrait: PlayerProfile = { ...BLANK_PROFILE, traits: t1 };

      // Now feed slightly less left data (still above SCORE_DEACTIVATE)
      const f2 = extractFeatures(MIXED_PLAYER);
      const t2 = analyzer.analyze(f2, profileWithTrait);

      // LEFT_BIASED should not be wiped out immediately (score still decays slowly)
      const leftBiased = t2.find(t => t.id === 'LEFT_BIASED');
      expect(leftBiased).toBeDefined();
      // Score should not drop to 0 in one step
      expect(leftBiased!.score).toBeGreaterThan(0);
    });
  });
});
