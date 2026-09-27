// ─── AdaptationEngine v2 — Phase 5 ───────────────────────────────────────────
//
// Connects the PlayerProfile to the level modifier system deterministically.
//
// Level Rules:
//   Level 1:     No adaptive counters (returns NEUTRAL modifier).
//   Levels 2–4:  Maximum 2 primary active traits.
//   Level 5:     Maximum 3 primary active traits.
//
// Trait Gate:
//   confidence >= 0.65 AND score >= 0.65
//
// Safety Rules:
//   1. Never spawn an adaptive hazard directly on the player (min spawn clearance).
//   2. Never remove an established recovery area.
//   3. Every decision point must retain at least one viable non-counter route.
//   4. Do not create unavoidable deaths (every modifier carries viable counterplay).
//   5. Same PlayerProfile + same seed must produce the same modifier plan.
//   6. If there are no confident traits, use neutral modifiers.
//   7. If player changes strategy repeatedly, reduce counter intensity.
//   8. Never escalate difficulty forever (max intensity capped at 3).
//   9. Do not stack more than two high-intensity (>= 2) counters before Level 4.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  AdaptationPlan,
  LevelModifier,
  LevelModifierSet,
  ModifierSlot,
  PlayerProfile,
  TraitId,
} from '@/game/types';
import {
  DEFAULT_MODIFIER_SLOTS,
  createLevelModifier,
} from '@/game/levels/modifiers';

// ─── Constants & Thresholds ──────────────────────────────────────────────────

export const CONFIDENCE_GATE = 0.65;
export const SCORE_GATE      = 0.65;
export const MAX_INTENSITY   = 3;
export const PLAYER_SPAWN_SAFE_RADIUS = 350; // px clearance from player start

export const CONTRADICTORY_PAIRS: ReadonlyArray<[TraitId, TraitId]> = [
  ['LEFT_BIASED', 'RIGHT_BIASED'],
  ['RUSHER', 'CAUTIOUS'],
];

export interface AdaptationOptions {
  seed?: number;
  strategySwitches?: number;
  slots?: ModifierSlot[];
}

export class AdaptationEngine {
  /**
   * Produce a deterministic AdaptationPlan for a given level and player profile.
   */
  planLevel(
    level: number,
    profile: PlayerProfile,
    options: AdaptationOptions = {},
  ): AdaptationPlan {
    const seed = options.seed ?? 1337 + level * 101;
    const rng = this.createRng(seed);

    // 1. Identify traits meeting the activation gate
    const qualifiedTraits = profile.traits.filter(
      t => t.confidence >= CONFIDENCE_GATE && t.score >= SCORE_GATE,
    );

    // 2. Sort by weighted impact descending (score * confidence), with deterministic tie-break
    qualifiedTraits.sort((a, b) => {
      const impactA = a.score * a.confidence;
      const impactB = b.score * b.confidence;
      if (Math.abs(impactB - impactA) > 1e-6) {
        return impactB - impactA;
      }
      return a.id.localeCompare(b.id);
    });

    // 3. Resolve contradictory traits (e.g. LEFT_BIASED vs RIGHT_BIASED)
    const nonContradictoryTraits = this.filterContradictions(qualifiedTraits);

    // 4. Trait count limits by level
    const maxTraits = level === 1 ? 0 : level >= 5 ? 3 : 2;
    const selectedTraits = nonContradictoryTraits.slice(0, maxTraits);
    const selectedTraitIds = selectedTraits.map(t => t.id);

    // 5. Detect if player is unpredictable or repeatedly switching strategy (Safety Rule 7)
    const isUnpredictable = this.detectStrategyShift(profile, options.strategySwitches ?? 0);

    // 6. Slots available for this level
    const slots = options.slots ?? DEFAULT_MODIFIER_SLOTS[level] ?? [];

    // 7. Generate modifiers
    let modifiers: LevelModifier[] = [];

    if (level === 1 || selectedTraits.length === 0) {
      // Safety Rule 6: If no confident traits or level 1, use neutral modifiers
      modifiers = [
        createLevelModifier('NEUTRAL', 0, {
          slotId: slots[0]?.id ?? 'slot-neutral',
          targetX: 1200,
          targetY: 400,
        }),
      ];
    } else {
      // Build adaptive modifiers for selected traits
      modifiers = selectedTraits.map((trait, index) => {
        const slot = this.selectSlotForTrait(trait.id, slots, index, rng);
        const baseIntensity = this.calculateBaseIntensity(level, trait.score, slot);

        // Safety Rule 7: Reduce intensity if player switches strategy
        let finalIntensity = isUnpredictable
          ? Math.max(1, baseIntensity - 1)
          : baseIntensity;

        // Safety Rule 8: Never exceed MAX_INTENSITY
        finalIntensity = Math.min(MAX_INTENSITY, Math.max(1, finalIntensity));

        return createLevelModifier(trait.id, finalIntensity, {
          slotId: slot?.id ?? `slot-${level}-${trait.id.toLowerCase()}`,
          targetX: slot?.x ?? (1000 + index * 400),
          targetY: slot?.y ?? 380,
        });
      });

      // Safety Rule 9: Do not stack more than two high-intensity (>= 2) counters before Level 4
      if (level < 4) {
        modifiers = this.enforceEarlyLevelIntensityCap(modifiers);
      }
    }

    const modifierSet: LevelModifierSet = {
      level,
      modifiers,
      seed,
      ruleSummary: `Level ${level} plan: ${selectedTraitIds.length} active trait(s)`,
    };

    const modifierMap: Record<string, LevelModifier> = {};
    for (const mod of modifiers) {
      if (mod.slotId) {
        modifierMap[mod.slotId] = mod;
      }
    }

    return {
      level,
      seed,
      activeTraits: selectedTraitIds,
      modifiers,
      modifierSet,
      modifierMap,
    };
  }

  /**
   * Filter contradictory trait pairs, keeping only the one with higher weighted impact.
   */
  private filterContradictions(traits: PlayerProfile['traits']): PlayerProfile['traits'] {
    const suppressed = new Set<TraitId>();

    for (const [traitA, traitB] of CONTRADICTORY_PAIRS) {
      const hasA = traits.find(t => t.id === traitA);
      const hasB = traits.find(t => t.id === traitB);

      if (hasA && hasB) {
        const impactA = hasA.score * hasA.confidence;
        const impactB = hasB.score * hasB.confidence;
        // Suppress the weaker one
        if (impactA >= impactB) {
          suppressed.add(traitB);
        } else {
          suppressed.add(traitA);
        }
      }
    }

    return traits.filter(t => !suppressed.has(t.id));
  }

  /**
   * Detect whether player behavior shows erratic / alternating patterns (Safety Rule 7).
   */
  private detectStrategyShift(profile: PlayerProfile, externalSwitches: number): boolean {
    if (externalSwitches >= 2) return true;

    // Check if left and right choices are evenly split despite repeated decisions
    const totalChoices = profile.leftChoices + profile.rightChoices;
    if (totalChoices >= 6) {
      const diff = Math.abs(profile.leftChoices - profile.rightChoices);
      if (diff <= 1) {
        return true; // balanced oscillation indicates switching
      }
    }

    return false;
  }

  /**
   * Deterministically select a suitable slot for a trait.
   */
  private selectSlotForTrait(
    traitId: TraitId,
    slots: ModifierSlot[],
    index: number,
    rng: () => number,
  ): ModifierSlot | undefined {
    const matching = slots.filter(s => s.supports.includes(traitId));
    if (matching.length === 0) {
      return slots[index % (slots.length || 1)];
    }
    const pickedIndex = Math.floor(rng() * matching.length);
    return matching[pickedIndex];
  }

  /**
   * Calculate base intensity for a trait counter given level and score.
   */
  private calculateBaseIntensity(level: number, score: number, slot?: ModifierSlot): number {
    let intensity = 1;
    if (level === 2) {
      intensity = 1;
    } else if (level === 3) {
      intensity = score >= 0.85 ? 2 : 1;
    } else if (level === 4) {
      intensity = score >= 0.85 ? 3 : 2;
    } else if (level >= 5) {
      intensity = score >= 0.80 ? 3 : 2;
    }

    if (slot && slot.intensity > 0) {
      intensity = Math.min(intensity, slot.intensity);
    }

    return intensity;
  }

  /**
   * Enforce Safety Rule 9: In levels < 4, at most 2 modifiers may have intensity >= 2.
   */
  private enforceEarlyLevelIntensityCap(modifiers: LevelModifier[]): LevelModifier[] {
    let highIntensityCount = 0;
    return modifiers.map(mod => {
      if (mod.intensity >= 2) {
        highIntensityCount++;
        if (highIntensityCount > 2) {
          return { ...mod, intensity: 1 };
        }
      }
      return mod;
    });
  }

  /**
   * Deterministic pseudo-random number generator (Mulberry32).
   */
  private createRng(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
      let t = (s += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * Safety invariant verifier for tests and runtime checks.
   */
  validatePlanSafety(
    plan: AdaptationPlan,
    playerStart: { x: number; y: number } = { x: 80, y: 420 },
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Level 1 must have no active traits
    if (plan.level === 1 && plan.activeTraits.length > 0) {
      errors.push('Level 1 must not contain active adaptive traits');
    }

    // Level 2-4 max 2 traits, Level 5 max 3 traits
    const maxAllowed = plan.level >= 5 ? 3 : plan.level >= 2 ? 2 : 0;
    if (plan.activeTraits.length > maxAllowed) {
      errors.push(`Level ${plan.level} exceeds maximum traits limit (${maxAllowed})`);
    }

    // Check contradictory pairs
    for (const [a, b] of CONTRADICTORY_PAIRS) {
      if (plan.activeTraits.includes(a) && plan.activeTraits.includes(b)) {
        errors.push(`Contradictory traits ${a} and ${b} are both active`);
      }
    }

    let highIntensityCount = 0;
    for (const mod of plan.modifiers) {
      // Counterplay must be present and non-empty
      if (!mod.counterplay || mod.counterplay.trim().length === 0) {
        errors.push(`Modifier ${mod.modifier} lacks counterplay description`);
      }

      // Intensity must be 0..3
      if (mod.intensity < 0 || mod.intensity > MAX_INTENSITY) {
        errors.push(`Modifier ${mod.modifier} has invalid intensity: ${mod.intensity}`);
      }

      if (mod.intensity >= 2) {
        highIntensityCount++;
      }

      // Check spawn safe zone: target coordinates must not be within safe radius of player start
      if (mod.targetX !== undefined && mod.targetY !== undefined) {
        const dx = mod.targetX - playerStart.x;
        const dy = mod.targetY - playerStart.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < PLAYER_SPAWN_SAFE_RADIUS && mod.intensity > 0) {
          errors.push(`Modifier ${mod.modifier} spawns too close to player (${dist.toFixed(0)}px < ${PLAYER_SPAWN_SAFE_RADIUS}px)`);
        }
      }
    }

    // Safety Rule 9: Before Level 4, no more than 2 high-intensity counters
    if (plan.level < 4 && highIntensityCount > 2) {
      errors.push(`Before Level 4, cannot have more than 2 high-intensity counters (found ${highIntensityCount})`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export const adaptationEngine = new AdaptationEngine();
