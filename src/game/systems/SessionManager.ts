// ─── SessionManager v2 — deterministic ring buffer ───────────────────────────
// Rules:
//   • In-memory only — no localStorage, no remote telemetry
//   • Session-relative milliseconds (Date.now() – sessionStartMs)
//   • Ring buffer: max MAX_EVENTS events, drop oldest ¼ when full
//   • Never captures PII
import type { GameEvent, PlayerProfile } from '@/game/types';

export const MAX_EVENTS = 5000;
const EVICT_SIZE = MAX_EVENTS / 4; // drop this many when buffer is full

export class SessionManager {
  private events: GameEvent[] = [];
  private sessionStartMs = 0;
  private _profile: PlayerProfile = this.blankProfile();

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  start(): void {
    this.sessionStartMs = Date.now();
    this.events = [];
    this._profile = this.blankProfile();
    this._profile.sessionStart = this.sessionStartMs;
  }

  reset(): void {
    this.start();
  }

  // ── Time ──────────────────────────────────────────────────────────────────

  /** Session-relative timestamp in milliseconds (never wall-clock). */
  nowMs(): number {
    return Date.now() - this.sessionStartMs;
  }

  // ── Event recording ───────────────────────────────────────────────────────

  record(partial: Omit<GameEvent, 't'>): GameEvent {
    if (this.events.length >= MAX_EVENTS) {
      this.events = this.events.slice(EVICT_SIZE);
    }
    const evt: GameEvent = { t: this.nowMs(), ...partial };
    this.events.push(evt);
    return evt;
  }

  /** Inject pre-built event (used by tests with controlled timestamps). */
  inject(evt: GameEvent): void {
    if (this.events.length >= MAX_EVENTS) {
      this.events = this.events.slice(EVICT_SIZE);
    }
    this.events.push(evt);
  }

  getEvents(): Readonly<GameEvent[]> {
    return this.events;
  }

  get eventCount(): number {
    return this.events.length;
  }

  // ── Profile ───────────────────────────────────────────────────────────────

  get profile(): PlayerProfile {
    return this._profile;
  }

  updateProfile(partial: Partial<PlayerProfile>): void {
    this._profile = { ...this._profile, ...partial };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private blankProfile(): PlayerProfile {
    return {
      traits: [],
      attempts: 0,
      deaths: 0,
      jumps: 0,
      leftChoices: 0,
      rightChoices: 0,
      avgHesitationMs: 0,
      sessionStart: 0,
    };
  }
}

// Singleton — one session per browser tab
export const sessionManager = new SessionManager();

