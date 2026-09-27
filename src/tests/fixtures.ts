// ─── Test fixtures — deterministic event sequences ────────────────────────────
// Used by behavior.test.ts, adaptation.test.ts, session-reset.test.ts
// No wall-clock timestamps — all t values are session-relative ms.
import type { GameEvent } from '@/game/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function mkEvent(
  type: GameEvent['type'],
  t: number,
  extra?: Partial<GameEvent>,
): GameEvent {
  return { t, type, level: 1, ...extra };
}

function levelStart(t = 0): GameEvent {
  return mkEvent('level_start', t);
}

function decision(
  t: number,
  choice: 'left' | 'right',
  x = 500,
  hesitation = 300,
): GameEvent {
  return mkEvent('decision', t, {
    choice,
    x,
    y: 400,
    context: `hesitation:${hesitation}`,
  });
}

function move(t: number, dir: 'left' | 'right'): GameEvent {
  return mkEvent('move', t, { choice: dir, x: 100, y: 400 });
}

function jump(t: number, x = 200): GameEvent {
  return mkEvent('jump', t, { x, y: 380 });
}

function land(t: number): GameEvent {
  return mkEvent('land', t, { x: 300, y: 460 });
}

function death(t: number): GameEvent {
  return mkEvent('death', t, { x: 400, y: 460 });
}

function retry(t: number): GameEvent {
  return mkEvent('retry', t);
}

function interact(t: number, x = 600): GameEvent {
  return mkEvent('interact', t, { x, y: 400 });
}

// ── Named fixtures ────────────────────────────────────────────────────────────

/** Player takes the left path every time across 5 attempts. */
export const LEFT_HEAVY_PLAYER: GameEvent[] = [
  levelStart(0),
  move(100, 'left'),
  decision(500, 'left', 400, 200),
  decision(2000, 'left', 800, 180),
  decision(3500, 'left', 1200, 210),
  death(4000),
  retry(4200),

  move(4300, 'left'),
  decision(4800, 'left', 400, 190),
  decision(6200, 'left', 800, 170),
  decision(7700, 'left', 1200, 195),
  death(8200),
  retry(8400),

  move(8500, 'left'),
  decision(9000, 'left', 400, 185),
  decision(10500, 'left', 800, 175),
];

/** Player takes the right path every time. */
export const RIGHT_HEAVY_PLAYER: GameEvent[] = [
  levelStart(0),
  move(100, 'right'),
  decision(500, 'right', 400, 210),
  decision(2000, 'right', 800, 200),
  decision(3500, 'right', 1200, 195),
  death(4000),
  retry(4200),

  move(4300, 'right'),
  decision(4800, 'right', 400, 205),
  decision(6200, 'right', 800, 210),
  death(7000),
  retry(7200),
];

/** Player jumps constantly. */
export const JUMP_HEAVY_PLAYER: GameEvent[] = [
  levelStart(0),
  move(100, 'right'),
  jump(300, 200),
  land(700),
  jump(900, 300),
  land(1200),
  jump(1400, 400),
  land(1700),
  jump(1900, 500),
  land(2200),
  jump(2400, 600),
  land(2700),
  jump(2900, 700),
  land(3200),
  jump(3400, 800),
  land(3700),
  jump(3900, 900),
  land(4200),
  // 8 jumps in ~4 seconds = 20 per 10 sec → very high rate
  decision(5000, 'right', 1000, 250),
];

/** Player always repeats the exact same route. */
export const REPETITIVE_PLAYER: GameEvent[] = [
  levelStart(0),
  move(100, 'left'),
  decision(600, 'left', 400, 300),
  decision(1800, 'right', 800, 280),
  death(2500),
  retry(2700),

  move(2800, 'left'),
  decision(3300, 'left', 400, 305),
  decision(4500, 'right', 800, 275),
  death(5200),
  retry(5400),

  move(5500, 'left'),
  decision(6000, 'left', 400, 300),
  decision(7200, 'right', 800, 280),
  death(7900),
  retry(8100),

  move(8200, 'left'),
  decision(8700, 'left', 400, 295),
  decision(9900, 'right', 800, 285),
];

/** Player interacts with lots of optional objects. */
export const EXPLORER_PLAYER: GameEvent[] = [
  levelStart(0),
  move(200, 'right'),
  interact(600, 300),
  interact(1200, 500),
  decision(2000, 'right', 700, 350),
  interact(2800, 900),
  interact(3400, 1100),
  decision(4200, 'right', 1300, 320),
  interact(5000, 1500),
  interact(5600, 1700),
];

/** Fast/rusher player — very low hesitation, moves right fast. */
export const RUSHER_PLAYER: GameEvent[] = [
  levelStart(0),
  move(50, 'right'),
  decision(300, 'right', 400, 50),    // 50ms hesitation
  decision(800, 'right', 800, 40),
  decision(1200, 'right', 1200, 35),
  decision(1700, 'right', 1600, 45),
  decision(2200, 'right', 2000, 30),
];

/** Cautious player — very long hesitation at decisions. */
export const CAUTIOUS_PLAYER: GameEvent[] = [
  levelStart(0),
  move(200, 'right'),
  decision(3200, 'right', 400, 3000),   // 3 second pause
  decision(8500, 'left', 800, 4800),    // almost 5 seconds
  decision(14000, 'right', 1200, 5000),
];

/** Completely empty session. */
export const EMPTY_SESSION: GameEvent[] = [];

/** Mixed / chaotic player (no clear pattern). */
export const MIXED_PLAYER: GameEvent[] = [
  levelStart(0),
  move(100, 'left'),
  decision(500, 'left', 400, 300),
  move(800, 'right'),
  jump(1000, 500),
  decision(1800, 'right', 800, 400),
  decision(2600, 'left', 1200, 350),
  interact(3200, 1400),
  decision(4200, 'right', 1600, 500),
];
