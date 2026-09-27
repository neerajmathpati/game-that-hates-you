// ─── FeatureExtractor v2 — deterministic feature extraction ──────────────────
//
// All functions are pure: given an event array → normalized features.
// No side effects, no randomness → fully testable.
//
import type { GameEvent } from '@/game/types';

export interface ExtractedFeatures {
  /** Share of left moves out of total horizontal moves (0–1). */
  leftRatio: number;
  /** Jumps per 10 active seconds. */
  jumpRate: number;
  /** Median hesitation between entering a decision zone and committing (ms). */
  medianHesitationMs: number;
  /** How often the same route sequence is repeated (0–1). */
  repeatScore: number;
  /** Optional interaction rate (0–1). */
  exploreScore: number;
  /** Combined speed / low-hesitation signal (0–1). */
  rushScore: number;
  /** Total unique decision events observed. */
  decisionCount: number;
  /** Total jump events. */
  jumpCount: number;
  /** Active time in seconds (first → last event). */
  activeSeconds: number;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function extractFeatures(events: Readonly<GameEvent[]>): ExtractedFeatures {
  if (events.length === 0) return empty();

  // ── Active time ───────────────────────────────────────────────────────────
  const times = events.map(e => e.t);
  const activeMs = Math.max(times[times.length - 1] - times[0], 1);
  const activeSeconds = activeMs / 1000;

  // ── Direction ratio ───────────────────────────────────────────────────────
  const moves      = events.filter(e => e.type === 'move');
  const leftMoves  = moves.filter(e => e.choice === 'left').length;
  const rightMoves = moves.filter(e => e.choice === 'right').length;
  const totalMoves = leftMoves + rightMoves;
  const leftRatio  = totalMoves > 0 ? leftMoves / totalMoves : 0.5;

  // ── Jump rate ─────────────────────────────────────────────────────────────
  const jumpEvents = events.filter(e => e.type === 'jump');
  const jumpCount  = jumpEvents.length;
  const jumpRate   = (jumpCount / activeSeconds) * 10;

  // ── Decisions & hesitation ────────────────────────────────────────────────
  const decisions = events.filter(e => e.type === 'decision');
  const decisionCount = decisions.length;

  // Parse hesitation from context field (format: "hesitation:NNN")
  const hesitations: number[] = decisions
    .map(d => parseHesitation(d.context))
    .filter((h): h is number => h !== null && h >= 0);

  const medianHesitationMs = median(hesitations);

  // ── Repeat score ──────────────────────────────────────────────────────────
  const repeatScore = computeRepeatScore(events);

  // ── Explore score ─────────────────────────────────────────────────────────
  const interacts   = events.filter(e => e.type === 'interact').length;
  const opportunities = Math.max(decisionCount, 1);
  const exploreScore  = Math.min(interacts / opportunities, 1);

  // ── Rush score (inverted hesitation + fast movement) ─────────────────────
  // Score of 1 = very fast, Score of 0 = very cautious
  const rushScore = medianHesitationMs > 0
    ? Math.max(0, 1 - medianHesitationMs / 3000)
    : jumpCount > 0 ? 0.5 : 0; // default mid when no hesitation data

  return {
    leftRatio,
    jumpRate,
    medianHesitationMs,
    repeatScore,
    exploreScore,
    rushScore,
    decisionCount,
    jumpCount,
    activeSeconds,
  };
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function empty(): ExtractedFeatures {
  return {
    leftRatio: 0.5,
    jumpRate: 0,
    medianHesitationMs: 0,
    repeatScore: 0,
    exploreScore: 0,
    rushScore: 0,
    decisionCount: 0,
    jumpCount: 0,
    activeSeconds: 0,
  };
}

/** Parse "hesitation:NNN" context string. Returns null on failure. */
function parseHesitation(context?: string): number | null {
  if (!context) return null;
  const m = context.match(/hesitation:(\d+)/);
  if (!m) return null;
  return parseInt(m[1], 10);
}

/** Detect repeated action sequences across attempts.
 *
 * Strategy: encode each attempt's decision sequence as a string,
 * check for duplicates among the last N attempts.
 */
function computeRepeatScore(events: Readonly<GameEvent[]>): number {
  // Split events into attempts by 'retry' markers
  const attempts: string[] = [];
  let current: string[] = [];

  for (const e of events) {
    if (e.type === 'retry') {
      if (current.length > 0) {
        attempts.push(current.join('|'));
        current = [];
      }
    } else if (e.type === 'decision' && e.choice) {
      current.push(`${e.choice}@${Math.round((e.x ?? 0) / 100) * 100}`);
    }
  }
  if (current.length > 0) attempts.push(current.join('|'));

  if (attempts.length < 2) return 0;

  // Check last 5 attempts for duplicates
  const window = attempts.slice(-5);
  const seen = new Set<string>();
  let duplicates = 0;
  for (const a of window) {
    if (seen.has(a)) duplicates++;
    seen.add(a);
  }

  return Math.min(duplicates / (window.length - 1), 1);
}

export function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

