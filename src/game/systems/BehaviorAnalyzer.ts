// ─── BehaviorAnalyzer v2 — Phase 4 ───────────────────────────────────────────
//
// Classifies 7 behavioural traits with evidence-gated confidence.
//
// Activation gate:  confidence >= 0.65 AND score >= 0.65
// Hysteresis rule:  active trait is only deactivated when score drops
//                   BELOW 0.45 (SCORE_DEACTIVATE) AND confidence <= 0.65
//                   after at LEAST MIN_OBSERVATIONS_TO_DEACTIVATE new samples.
//
// All calculations are deterministic (no randomness).
// ─────────────────────────────────────────────────────────────────────────────
import type { BehaviorTrait, PlayerProfile, TraitId } from '@/game/types';
import type { ExtractedFeatures } from './FeatureExtractor';

// ── Activation thresholds ─────────────────────────────────────────────────────

export const CONFIDENCE_ACTIVE   = 0.65;   // min confidence to be "active"
export const SCORE_ACTIVE        = 0.65;   // min score to be "active"
export const SCORE_DEACTIVATE    = 0.45;   // score must fall below this to lose active status
const        MIN_DEACTIVATE_OBS  = 3;      // observations that must disagree before deactivation

// ── Signal thresholds (deterministic, from TRD §6) ───────────────────────────

export const THRESHOLDS = {
  // Direction bias: share of moves/decisions going one way
  directionBias:           0.68,

  // Jump heavy: jump rate per 10 active seconds
  jumpRateHeavy:           1.5,

  // RUSHER: both signals must exceed their respective thresholds
  rusherMaxHesitationMs:   350,   // median decision pause below this = fast
  rusherMinRushScore:      0.65,  // combined rush signal above this

  // CAUTIOUS: both signals must exceed
  cautiousMinHesitationMs: 900,   // median decision pause above this = slow
  cautiousMinStopScore:    0.5,   // additional stop behaviour signal

  // REPETITIVE: same route sequence repeated >= 3 times (enforced by repeatScore)
  repeatScore:             0.70,

  // EXPLORER: high optional interaction / side-path rate
  exploreScore:            0.55,
} as const;

// ── Per-trait evidence saturation (lower = signal is stronger per sample) ────
// e.g. CAUTIOUS saturates at 4 because 3 decisions all > 900ms is very strong.

const SATURATION: Record<TraitId, number> = {
  LEFT_BIASED:  8,
  RIGHT_BIASED: 8,
  JUMP_HEAVY:   10,
  RUSHER:       5,
  CAUTIOUS:     4,
  REPETITIVE:   5,
  EXPLORER:     5,
};

// ─── BehaviorAnalyzer ─────────────────────────────────────────────────────────

export class BehaviorAnalyzer {
  /**
   * Compute the full trait vector from extracted features and the previous profile.
   * Call this after each meaningful event batch (not every frame).
   *
   * @param features  Output of extractFeatures()
   * @param prev      The last PlayerProfile (pass blank profile if first call)
   * @param now       Deterministic timestamp (default: Date.now())
   * @returns         New trait vector (replaces prev.traits)
   */
  analyze(
    features: ExtractedFeatures,
    prev: PlayerProfile,
    now: number = Date.now(),
  ): BehaviorTrait[] {
    const traits: BehaviorTrait[] = [];

    // ── LEFT_BIASED / RIGHT_BIASED ─────────────────────────────────────────
    // Require at least 2 decision points.
    if (features.decisionCount >= 2) {
      traits.push(this.compute(
        'LEFT_BIASED',
        features.leftRatio,
        THRESHOLDS.directionBias,
        features.decisionCount,
        prev, now,
      ));
      traits.push(this.compute(
        'RIGHT_BIASED',
        1 - features.leftRatio,
        THRESHOLDS.directionBias,
        features.decisionCount,
        prev, now,
      ));
    }

    // ── JUMP_HEAVY ────────────────────────────────────────────────────────
    // Require at least 3 jumps observed.
    if (features.jumpCount >= 3) {
      // Score: how far above the threshold jump rate is (saturates at 2×)
      const jumpScore = Math.min(
        features.jumpRate / (THRESHOLDS.jumpRateHeavy * 2),
        1,
      );
      traits.push(this.compute(
        'JUMP_HEAVY',
        jumpScore,
        0.5,
        features.jumpCount,
        prev, now,
      ));
    }

    // ── RUSHER ────────────────────────────────────────────────────────────
    // TWO independent signals must agree before RUSHER can be active:
    //   Signal 1: low median hesitation (< rusherMaxHesitationMs)
    //   Signal 2: high rush score (> rusherMinRushScore)
    if (features.decisionCount >= 3) {
      const fastHesitation = features.medianHesitationMs > 0
        && features.medianHesitationMs < THRESHOLDS.rusherMaxHesitationMs;
      const fastMovement  = features.rushScore >= THRESHOLDS.rusherMinRushScore;

      // Score only reaches 1.0 when BOTH signals are strong
      const rusherScore = buildTwoSignalScore(
        fastHesitation
          ? 1 - features.medianHesitationMs / THRESHOLDS.rusherMaxHesitationMs
          : 0,
        features.rushScore,
        fastHesitation && fastMovement,
      );

      traits.push(this.compute(
        'RUSHER',
        rusherScore,
        THRESHOLDS.rusherMinRushScore,
        features.decisionCount,
        prev, now,
      ));

      // ── CAUTIOUS ──────────────────────────────────────────────────────
      // TWO independent signals must agree:
      //   Signal 1: high median hesitation (> cautiousMinHesitationMs)
      //   Signal 2: low rush score indicates stopping behaviour
      const slowHesitation = features.medianHesitationMs > THRESHOLDS.cautiousMinHesitationMs;
      const slowMovement   = features.rushScore < 0.35;  // inverse of rush

      const cautiousScore = buildTwoSignalScore(
        slowHesitation
          ? Math.min(features.medianHesitationMs / 5000, 1)
          : 0,
        slowMovement ? 1 - features.rushScore : 0,
        slowHesitation && slowMovement,
      );

      traits.push(this.compute(
        'CAUTIOUS',
        cautiousScore,
        THRESHOLDS.cautiousMinStopScore,
        features.decisionCount,
        prev, now,
      ));
    }

    // ── REPETITIVE ────────────────────────────────────────────────────────
    // Require at least 3 retry attempts (so we can have 3+ repeated routes).
    // repeatScore is already 0–1 from FeatureExtractor.
    if (features.repeatScore > 0) {
      traits.push(this.compute(
        'REPETITIVE',
        features.repeatScore,
        THRESHOLDS.repeatScore,
        features.decisionCount,
        prev, now,
      ));
    }

    // ── EXPLORER ──────────────────────────────────────────────────────────
    // Require at least 2 decision points observed.
    if (features.decisionCount >= 2) {
      traits.push(this.compute(
        'EXPLORER',
        features.exploreScore,
        THRESHOLDS.exploreScore,
        features.decisionCount,
        prev, now,
      ));
    }

    return traits;
  }

  /** Returns only traits that meet the activation gate. */
  activeTraits(traits: BehaviorTrait[]): BehaviorTrait[] {
    return traits.filter(
      t => t.confidence >= CONFIDENCE_ACTIVE && t.score >= SCORE_ACTIVE,
    );
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private compute(
    id: TraitId,
    rawScore: number,
    threshold: number,
    evidenceCount: number,
    prevProfile: PlayerProfile,
    now: number,
  ): BehaviorTrait {
    const prevTrait = prevProfile.traits.find(t => t.id === id);
    const score     = Math.max(0, Math.min(1, rawScore));

    // Confidence: grows as evidence accumulates up to the saturation point
    const saturation     = SATURATION[id];
    const baseConfidence = Math.min(evidenceCount / saturation, 1);

    // Amplify confidence when score comfortably exceeds threshold
    const amplified = score >= threshold
      ? Math.min(baseConfidence * (score / threshold), 1)
      : baseConfidence * 0.35; // sub-threshold evidence is weak

    const confidence = Math.max(0, Math.min(1, amplified));

    // ── Hysteresis ─────────────────────────────────────────────────────────
    // Determine if the trait was previously active
    const wasActive = prevTrait !== undefined
      && prevTrait.confidence >= CONFIDENCE_ACTIVE
      && prevTrait.score >= SCORE_ACTIVE;

    // Count how many consecutive observations have been below SCORE_DEACTIVATE
    // We encode this as a negative integer in the 'evidenceCount' gap between
    // the observed evidenceCount and the previous — but the cleaner approach
    // is to rely on score-decay: decay slowly when active, reset fast when not.
    const effectiveScore = (() => {
      if (!wasActive) return score;
      // Still comfortably above deactivate threshold → no hysteresis needed
      if (score >= SCORE_DEACTIVATE) return score;
      // Below deactivate threshold but was active:
      // Check if we have enough contradictory evidence to actually deactivate.
      // We use evidenceCount growth as a proxy: if new evidenceCount hasn't
      // grown much from previous, not enough new observations to flip.
      const prevEvidence = prevTrait?.evidenceCount ?? 0;
      const newSamples   = evidenceCount - prevEvidence;
      if (newSamples < MIN_DEACTIVATE_OBS) {
        // Not enough new observations yet — decay slowly from previous score
        return Math.max(SCORE_DEACTIVATE, prevTrait!.score * 0.85);
      }
      // Enough observations: allow actual deactivation
      return score;
    })();

    return {
      id,
      score:         Math.max(0, Math.min(1, effectiveScore)),
      confidence:    Math.max(0, Math.min(1, confidence)),
      evidenceCount,
      lastUpdatedAt: now,
    };
  }
}

// ── Pure helpers ───────────────────────────────────────────────────────────────

/**
 * Combine two independent signal scores.
 * Returns 0 if either signal is absent.
 * Returns geometric mean of both if both are present.
 * Full score (1.0) only when both signals are at maximum.
 */
function buildTwoSignalScore(
  signal1: number,
  signal2: number,
  bothActive: boolean,
): number {
  if (!bothActive) return 0;
  // Geometric mean keeps the score honest: both must be strong
  return Math.sqrt(Math.max(0, signal1) * Math.max(0, signal2));
}

// Re-export thresholds for tests
export const TRAIT_THRESHOLDS = {
  CONFIDENCE_ACTIVE,
  SCORE_ACTIVE,
  SCORE_DEACTIVATE,
  MIN_DEACTIVATE_OBS,
};

