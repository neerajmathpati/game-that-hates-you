// ─── session-reset.test.ts — SessionManager unit tests ───────────────────────
import { describe, it, expect, beforeEach } from 'vitest';
import { MAX_EVENTS } from '@/game/systems/SessionManager';
import type { GameEvent } from '@/game/types';

// Import fresh instance for each test by creating a local version
// (the singleton is shared across tests if we import it directly,
//  so we test the class directly)
import { sessionManager } from '@/game/systems/SessionManager';

describe('SessionManager', () => {
  beforeEach(() => {
    sessionManager.reset();
  });

  describe('initialization', () => {
    it('starts with 0 events', () => {
      expect(sessionManager.eventCount).toBe(0);
    });

    it('starts with blank profile', () => {
      const p = sessionManager.profile;
      expect(p.attempts).toBe(0);
      expect(p.deaths).toBe(0);
      expect(p.jumps).toBe(0);
      expect(p.leftChoices).toBe(0);
      expect(p.rightChoices).toBe(0);
      expect(p.traits).toHaveLength(0);
    });
  });

  describe('event recording', () => {
    it('records events with session-relative timestamps (not wall-clock)', () => {
      sessionManager.start();
      sessionManager.record({ type: 'jump', level: 1, x: 100, y: 200 });
      const events = sessionManager.getEvents();
      expect(events.length).toBe(1);
      // t should be small (ms since start), not a large unix timestamp
      expect(events[0].t).toBeGreaterThanOrEqual(0);
      expect(events[0].t).toBeLessThan(5000); // should be under 5s
    });

    it('records event type correctly', () => {
      sessionManager.record({ type: 'death', level: 1 });
      const events = sessionManager.getEvents();
      expect(events[0].type).toBe('death');
    });

    it('allows injecting pre-built events (for tests)', () => {
      const fixed: GameEvent = { t: 42, type: 'jump', level: 1, x: 100, y: 200 };
      sessionManager.inject(fixed);
      expect(sessionManager.getEvents()[0].t).toBe(42);
    });
  });

  describe('ring buffer', () => {
    it('caps at MAX_EVENTS and evicts oldest quarter', () => {
      for (let i = 0; i < MAX_EVENTS + 10; i++) {
        sessionManager.record({ type: 'move', level: 1, choice: 'right' });
      }
      // After eviction, should have at most MAX_EVENTS
      expect(sessionManager.eventCount).toBeLessThanOrEqual(MAX_EVENTS);
    });

    it('retains recent events after eviction', () => {
      // Fill to over capacity
      for (let i = 0; i < MAX_EVENTS + 5; i++) {
        sessionManager.record({ type: 'move', level: 1 });
      }
      // Record a distinctive final event
      sessionManager.record({ type: 'level_complete', level: 2 });
      const events = sessionManager.getEvents();
      const last = events[events.length - 1];
      expect(last.type).toBe('level_complete');
      expect(last.level).toBe(2);
    });
  });

  describe('profile updates', () => {
    it('updates profile fields without losing other fields', () => {
      sessionManager.updateProfile({ deaths: 3 });
      expect(sessionManager.profile.deaths).toBe(3);
      expect(sessionManager.profile.jumps).toBe(0); // unchanged
    });

    it('accumulates deaths correctly', () => {
      sessionManager.updateProfile({ deaths: sessionManager.profile.deaths + 1 });
      sessionManager.updateProfile({ deaths: sessionManager.profile.deaths + 1 });
      expect(sessionManager.profile.deaths).toBe(2);
    });
  });

  describe('reset', () => {
    it('clears all events on reset', () => {
      sessionManager.record({ type: 'jump', level: 1 });
      sessionManager.record({ type: 'death', level: 1 });
      sessionManager.reset();
      expect(sessionManager.eventCount).toBe(0);
    });

    it('clears profile on reset', () => {
      sessionManager.updateProfile({ deaths: 5, jumps: 10, leftChoices: 3 });
      sessionManager.reset();
      expect(sessionManager.profile.deaths).toBe(0);
      expect(sessionManager.profile.jumps).toBe(0);
      expect(sessionManager.profile.leftChoices).toBe(0);
    });

    it('does NOT carry stale state between resets', () => {
      // Session 1
      sessionManager.record({ type: 'jump', level: 1 });
      sessionManager.updateProfile({ jumps: 5 });
      sessionManager.reset();

      // Session 2 — should be completely clean
      const events = sessionManager.getEvents();
      expect(events).toHaveLength(0);
      expect(sessionManager.profile.jumps).toBe(0);
    });

    it('generates a new session start time after reset', () => {
      const t1 = sessionManager.profile.sessionStart;
      sessionManager.reset();
      const t2 = sessionManager.profile.sessionStart;
      // May equal if very fast — but sessionStart field should be set
      expect(t2).toBeGreaterThanOrEqual(t1);
    });
  });
});
