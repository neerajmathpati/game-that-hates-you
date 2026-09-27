// ─── RevealDirector v2 — Phase 6 ─────────────────────────────────────────────
//
// Manages narrative observation messages ("The game knows you").
//
// Rules:
//   • Generated ONLY from REAL session evidence (never random).
//   • Level 1: No explicit reveal.
//   • Level 2: Very subtle ("Learning.", "Noticed.").
//   • Level 3: First obvious observation ("You chose left 8 times.", etc.).
//   • Level 4: Multiple personalized observations.
//   • Short punchlines, not tutorials.
//   • Duplicates are prevented.
//   • Rate limited / cooldown so messages do not interrupt gameplay.
// ─────────────────────────────────────────────────────────────────────────────

import type { PlayerProfile } from '@/game/types';

export interface Observation {
  id: string;
  message: string;
  level: number;
}

export interface RevealCheckOptions {
  nowMs?: number;
  trigger?: 'level_start' | 'death' | 'decision' | 'complete';
  strategySwitches?: number;
  forceIgnoreCooldown?: boolean;
}

export const HESITATION_THRESHOLD_MS = 1200;
export const MIN_OBSERVATION_COOLDOWN_MS = 4000;

export class RevealDirector {
  private seenMessageIds: Set<string> = new Set();
  private lastObsTimeMs = 0;
  private levelObsCount: Record<number, number> = {};

  /**
   * Reset session observation state.
   */
  reset(): void {
    this.seenMessageIds.clear();
    this.lastObsTimeMs = 0;
    this.levelObsCount = {};
  }

  get seenCount(): number {
    return this.seenMessageIds.size;
  }

  /**
   * Check whether real session evidence qualifies for an observation message.
   */
  check(
    profile: PlayerProfile,
    level: number,
    options: RevealCheckOptions = {},
  ): Observation | null {
    // Level 1: Strictly no reveals
    if (level <= 1) return null;

    const now = options.nowMs ?? Date.now();

    // Check cooldown to avoid spamming / interrupting gameplay (only if prior observation exists)
    if (!options.forceIgnoreCooldown && this.lastObsTimeMs > 0 && (now - this.lastObsTimeMs < MIN_OBSERVATION_COOLDOWN_MS)) {
      return null;
    }

    // Check level progression limits
    const currentCount = this.levelObsCount[level] ?? 0;
    const maxForLevel = level === 2 ? 1 : level === 3 ? 1 : level >= 4 ? 3 : 0;
    if (currentCount >= maxForLevel) {
      return null;
    }

    const candidate = this.evaluateCandidate(profile, level, options.strategySwitches ?? 0);
    if (!candidate) return null;

    // Record and commit observation
    this.seenMessageIds.add(candidate.id);
    this.lastObsTimeMs = now;
    this.levelObsCount[level] = currentCount + 1;

    return candidate;
  }

  private evaluateCandidate(
    profile: PlayerProfile,
    level: number,
    strategySwitches: number,
  ): Observation | null {
    const candidates: Observation[] = [];
    const totalChoices = profile.leftChoices + profile.rightChoices;
    const leftRatio = totalChoices > 0 ? profile.leftChoices / totalChoices : 0;
    const rightRatio = totalChoices > 0 ? profile.rightChoices / totalChoices : 0;

    // ── LEVEL 2: VERY SUBTLE ────────────────────────────────────────────────
    if (level === 2) {
      // Evidence gate: requires at least some active trait evidence or repeated deaths
      const hasTraits = profile.traits.some(t => t.score >= 0.65 && t.confidence >= 0.60);
      const hasAttempts = profile.attempts >= 2 || totalChoices >= 3;

      if (hasTraits || hasAttempts) {
        candidates.push({
          id: 'subtle-noticed',
          message: 'Noticed.',
          level: 2,
        });
      }
    } else {
      // ── LEVEL 3 & LEVEL 4 EVIDENCE GATES ────────────────────────────────────

      // 1. STRATEGY SWITCH GATE
      if (strategySwitches >= 2) {
        const msg = level === 3
          ? 'Try something new.'
          : 'Changing tactics won\'t hide you.';
        candidates.push({ id: `strategy-switch-l${level}`, message: msg, level });
      }

      // 2. LEFT BIAS EVIDENCE GATE (left ratio > 0.75 and >= 8 choices)
      if (leftRatio > 0.75 && profile.leftChoices >= 8) {
        const msg = level === 3
          ? `You chose left ${profile.leftChoices} times.`
          : 'Left again. Always left.';
        candidates.push({ id: `left-bias-l${level}`, message: msg, level });
      }

      // 3. RIGHT BIAS EVIDENCE GATE (right ratio > 0.75 and >= 8 choices)
      if (rightRatio > 0.75 && profile.rightChoices >= 8) {
        const msg = level === 3
          ? `You chose right ${profile.rightChoices} times.`
          : 'Right shortcut predicted.';
        candidates.push({ id: `right-bias-l${level}`, message: msg, level });
      }

      // 4. JUMP HEAVY EVIDENCE GATE (jump count >= 40)
      if (profile.jumps >= 40) {
        const msg = level === 3
          ? `You jumped ${profile.jumps} times.`
          : 'The floor misses your feet.';
        candidates.push({ id: `jump-heavy-l${level}`, message: msg, level });
      }

      // 5. REPETITIVE EVIDENCE GATE (>= 3 repeated deaths/routes or repeat trait)
      const repetitiveTrait = profile.traits.find(t => t.id === 'REPETITIVE');
      if ((repetitiveTrait && repetitiveTrait.score >= 0.65) || profile.attempts >= 4) {
        const msg = level === 3
          ? 'You keep trying the same thing.'
          : 'Insanity is repeating the same path.';
        candidates.push({ id: `repetitive-l${level}`, message: msg, level });
      }

      // 6. HESITATION EVIDENCE GATE (median hesitation > threshold across decisions)
      if (profile.avgHesitationMs > HESITATION_THRESHOLD_MS && totalChoices >= 3) {
        const msg = level === 3
          ? 'You hesitate at every turn.'
          : 'Waiting won\'t save you.';
        candidates.push({ id: `hesitation-l${level}`, message: msg, level });
      }

      // 7. RUSHER EVIDENCE GATE (low hesitation with fast decisions)
      if (profile.avgHesitationMs > 0 && profile.avgHesitationMs < 300 && totalChoices >= 4) {
        const msg = level === 3
          ? 'Always rushing ahead.'
          : 'Slow down.';
        candidates.push({ id: `rusher-l${level}`, message: msg, level });
      }

      // Generic Level 4 observation if strong trait exists
      if (level >= 4 && profile.traits.length > 0) {
        const topTrait = profile.traits[0];
        if (topTrait.score >= 0.70 && topTrait.confidence >= 0.65) {
          candidates.push({
            id: `learning-trait-${topTrait.id.toLowerCase()}`,
            message: 'I know what you will do.',
            level,
          });
        }
      }
    }

    // Return the first candidate that hasn't been seen yet
    for (const c of candidates) {
      if (!this.seenMessageIds.has(c.id)) {
        return c;
      }
    }

    return null;
  }
}

export const revealDirector = new RevealDirector();
