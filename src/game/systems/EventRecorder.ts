// ─── EventRecorder v2 — rate-limited, semantic-only event capture ─────────────
//
// Design rules (TRD §6):
//   • Record semantic events at decision points — NOT every animation frame
//   • Keep continuous movement as aggregates (direction change = one event)
//   • Rate-limit per event type with configurable cooldowns
//   • Never record PII
//   • Use session-relative ms (never wall-clock)
//
import { sessionManager } from './SessionManager';
import type { GameEvent, ActionType } from '@/game/types';

// Minimum ms between consecutive events of the same type
const RATE_LIMITS: Partial<Record<ActionType, number>> = {
  move:     100,   // aggregate direction changes — max 10/sec
  jump:       0,   // every jump matters
  land:       0,   // every landing matters
  decision:   0,   // every decision matters
  interact: 200,
  death:      0,
  retry:      0,
  level_start: 0,
  level_complete: 0,
};

export class EventRecorder {
  private level: number;
  private lastEmit: Partial<Record<ActionType, number>> = {};
  private lastMoveDirection: 'left' | 'right' | null = null;
  private hesitationEnteredAt: number | null = null;

  constructor(level: number) {
    this.level = level;
  }

  setLevel(level: number): void {
    this.level = level;
  }

  // ── Core record ───────────────────────────────────────────────────────────

  record(
    type: ActionType,
    extras?: Partial<Omit<GameEvent, 't' | 'type' | 'level'>>,
  ): void {
    const now = sessionManager.nowMs();
    const limit = RATE_LIMITS[type] ?? 0;
    const last = this.lastEmit[type] ?? -Infinity;

    if (now - last < limit) return; // rate-limited
    this.lastEmit[type] = now;

    sessionManager.record({ type, level: this.level, ...extras });
  }

  // ── Semantic helpers ──────────────────────────────────────────────────────

  /** Record only when horizontal direction changes (aggregate, not per frame). */
  recordMove(direction: 'left' | 'right', x: number, y: number): void {
    if (direction === this.lastMoveDirection) return; // same direction, skip
    this.lastMoveDirection = direction;
    this.record('move', { choice: direction, x, y });
  }

  /** Reset move aggregation when player stops. */
  clearMoveDirection(): void {
    this.lastMoveDirection = null;
  }

  recordJump(x: number, y: number): void {
    this.record('jump', { x, y });
    sessionManager.updateProfile({
      jumps: sessionManager.profile.jumps + 1,
    });
  }

  recordLand(x: number, y: number): void {
    this.record('land', { x, y });
  }

  recordDeath(x: number, y: number, hazardId?: string): void {
    this.record('death', { x, y, hazardId });
    sessionManager.updateProfile({
      deaths: sessionManager.profile.deaths + 1,
    });
    this.hesitationEnteredAt = null;
  }

  recordRetry(): void {
    this.record('retry');
    sessionManager.updateProfile({
      attempts: sessionManager.profile.attempts + 1,
    });
    this.lastMoveDirection = null;
    this.hesitationEnteredAt = null;
  }

  recordLevelStart(): void {
    this.record('level_start');
  }

  recordLevelComplete(): void {
    this.record('level_complete');
  }

  /** Call when player enters a decision zone (start timing hesitation). */
  enterDecisionZone(): void {
    this.hesitationEnteredAt = sessionManager.nowMs();
  }

  /**
   * Call when player commits a direction inside a decision zone.
   * Emits a `decision` event with hesitation encoded in context.
   */
  recordDecision(
    choice: 'left' | 'right',
    x: number,
    y: number,
    context?: string,
  ): void {
    const now = sessionManager.nowMs();
    const hesitationMs = this.hesitationEnteredAt !== null
      ? now - this.hesitationEnteredAt
      : 0;
    this.hesitationEnteredAt = null;

    this.record('decision', {
      choice,
      x,
      y,
      context: context ?? `hesitation:${hesitationMs}`,
    });

    // Update profile aggregates
    const p = sessionManager.profile;
    const totalDecisions = p.leftChoices + p.rightChoices + 1;
    const newAvg = (p.avgHesitationMs * (totalDecisions - 1) + hesitationMs) / totalDecisions;

    sessionManager.updateProfile({
      leftChoices:    p.leftChoices  + (choice === 'left'  ? 1 : 0),
      rightChoices:   p.rightChoices + (choice === 'right' ? 1 : 0),
      avgHesitationMs: newAvg,
    });
  }

  recordInteract(x: number, y: number, context?: string): void {
    this.record('interact', { x, y, context });
  }
}

