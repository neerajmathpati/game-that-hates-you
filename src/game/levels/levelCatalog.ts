// ─── Level catalog — hand-authored level templates ────────────────────────────
// World coords: X grows right, Y grows DOWN (Phaser convention).
// GAME_WIDTH = 960, GAME_HEIGHT = 540.
// Level world = 2880 × 540 (3 screens wide).
import type { AdaptationPlan, HazardDef, LevelData } from '@/game/types';
import {
  COLOR_PLATFORM,
  COLOR_SPIKE,
} from '@/lib/constants';

// ─── LEVEL 1 ── NORMAL ────────────────────────────────────────────────────────
// Purpose: teach movement, establish baseline, NO aggressive countering.
const LEVEL_1: LevelData = {
  id: 1,
  worldWidth: 2880,
  worldHeight: 540,
  playerStart: { x: 80, y: 420 },

  platforms: [
    // Screen 1
    { x: 0,   y: 460, w: 240, h: 20, color: COLOR_PLATFORM },
    { x: 290, y: 460, w: 180, h: 20, color: COLOR_PLATFORM },
    { x: 320, y: 340, w: 100, h: 16, color: COLOR_PLATFORM },
    { x: 530, y: 460, w: 220, h: 20, color: COLOR_PLATFORM },
    { x: 620, y: 380, w: 80,  h: 16, color: COLOR_PLATFORM },
    { x: 820, y: 460, w: 160, h: 20, color: COLOR_PLATFORM },

    // Screen 2 ── left/right fork decision
    { x: 960,  y: 460, w: 200, h: 20, color: COLOR_PLATFORM },
    { x: 1180, y: 360, w: 160, h: 16, color: COLOR_PLATFORM },
    { x: 1360, y: 290, w: 120, h: 16, color: COLOR_PLATFORM },
    { x: 1500, y: 360, w: 140, h: 16, color: COLOR_PLATFORM },
    { x: 1180, y: 460, w: 460, h: 20, color: COLOR_PLATFORM },
    { x: 1660, y: 460, w: 200, h: 20, color: COLOR_PLATFORM },
    { x: 1660, y: 360, w: 120, h: 16, color: COLOR_PLATFORM },

    // Screen 3 ── moving hazard section + exit
    { x: 1920, y: 460, w: 200, h: 20, color: COLOR_PLATFORM },
    { x: 2000, y: 360, w: 120, h: 16, color: COLOR_PLATFORM },
    { x: 2180, y: 460, w: 180, h: 20, color: COLOR_PLATFORM },
    { x: 2420, y: 460, w: 260, h: 20, color: COLOR_PLATFORM },
    { x: 2440, y: 360, w: 80,  h: 16, color: COLOR_PLATFORM },
    { x: 2740, y: 460, w: 140, h: 20, color: COLOR_PLATFORM },
  ],

  hazards: [
    {
      id: 'spike-1a',
      type: 'spike',
      x: 475,
      y: 440,
      w: 40,
      h: 20,
    },
    {
      id: 'patrol-1',
      type: 'moving',
      x: 1280,
      y: 440,
      w: 24,
      h: 20,
      patrolX: 1380,
      speed: 80,
    },
    {
      id: 'spike-3a',
      type: 'spike',
      x: 2300,
      y: 440,
      w: 40,
      h: 20,
    },
    {
      id: 'spike-3b',
      type: 'spike',
      x: 2350,
      y: 440,
      w: 40,
      h: 20,
    },
  ],

  exit: {
    x: 2800,
    y: 380,
    w: 40,
    h: 80,
  },

  decisionPoints: [
    { id: 'dp-1-gap',   x: 265,  y: 430, options: ['right'] },
    { id: 'dp-1-step',  x: 615,  y: 420, options: ['left', 'right'] },
    { id: 'dp-1-fork',  x: 1160, y: 430, options: ['left', 'right'] },
    { id: 'dp-1-spike', x: 2280, y: 430, options: ['left', 'right'] },
  ],
};

// ─── LEVEL 2 ── SUBTLE ────────────────────────────────────────────────────────
// Purpose: Start countering the player's dominant behavior.
// Adaptive intensity: 1/5. Player thinks: "Maybe that was just unlucky."
const LEVEL_2: LevelData = {
  id: 2,
  worldWidth: 2880,
  worldHeight: 540,
  playerStart: { x: 80, y: 420 },

  platforms: [
    // Screen 1
    { x: 0,   y: 460, w: 260, h: 20, color: COLOR_PLATFORM },
    { x: 310, y: 460, w: 200, h: 20, color: COLOR_PLATFORM },
    { x: 380, y: 360, w: 100, h: 16, color: COLOR_PLATFORM },
    { x: 560, y: 460, w: 240, h: 20, color: COLOR_PLATFORM },
    { x: 680, y: 370, w: 90,  h: 16, color: COLOR_PLATFORM },
    { x: 850, y: 460, w: 150, h: 20, color: COLOR_PLATFORM },

    // Screen 2 ── Major fork with telegraphed challenge
    { x: 1040, y: 460, w: 160, h: 20, color: COLOR_PLATFORM },
    // Upper Left path (looks faster, slightly narrower)
    { x: 1200, y: 370, w: 150, h: 16, color: COLOR_PLATFORM },
    { x: 1380, y: 310, w: 130, h: 16, color: COLOR_PLATFORM },
    { x: 1530, y: 370, w: 130, h: 16, color: COLOR_PLATFORM },
    // Lower Right path (stable ground)
    { x: 1220, y: 460, w: 440, h: 20, color: COLOR_PLATFORM },
    // Merge
    { x: 1700, y: 460, w: 220, h: 20, color: COLOR_PLATFORM },
    { x: 1700, y: 370, w: 120, h: 16, color: COLOR_PLATFORM },

    // Screen 3 ── Approach to exit
    { x: 1960, y: 460, w: 180, h: 20, color: COLOR_PLATFORM },
    { x: 2040, y: 360, w: 110, h: 16, color: COLOR_PLATFORM },
    { x: 2200, y: 460, w: 200, h: 20, color: COLOR_PLATFORM },
    { x: 2440, y: 460, w: 220, h: 20, color: COLOR_PLATFORM },
    { x: 2480, y: 360, w: 100, h: 16, color: COLOR_PLATFORM },
    { x: 2700, y: 460, w: 180, h: 20, color: COLOR_PLATFORM },
  ],

  hazards: [
    {
      id: 'l2-spike-1',
      type: 'spike',
      x: 520,
      y: 440,
      w: 35,
      h: 20,
      color: COLOR_SPIKE,
    },
    {
      id: 'l2-patrol-1',
      type: 'moving',
      x: 1320,
      y: 440,
      w: 24,
      h: 20,
      patrolX: 1440,
      speed: 70,
    },
    {
      id: 'l2-spike-2',
      type: 'spike',
      x: 2150,
      y: 440,
      w: 45,
      h: 20,
    },
  ],

  exit: {
    x: 2800,
    y: 380,
    w: 40,
    h: 80,
  },

  decisionPoints: [
    { id: 'dp-2-step',     x: 650,  y: 420, options: ['left', 'right'] },
    { id: 'dp-2-fork',     x: 1120, y: 430, options: ['left', 'right'] },
    { id: 'dp-2-approach', x: 2240, y: 430, options: ['left', 'right'] },
  ],
};

// ─── LEVEL 3 ── SUSPICIOUS ────────────────────────────────────────────────────
// Purpose: Make adaptation detectable.
// Adaptive intensity: 2/5. One or two counters + first observation message.
const LEVEL_3: LevelData = {
  id: 3,
  worldWidth: 2880,
  worldHeight: 540,
  playerStart: { x: 80, y: 420 },

  platforms: [
    // Screen 1 ── Double tier
    { x: 0,   y: 460, w: 220, h: 20, color: COLOR_PLATFORM },
    { x: 280, y: 460, w: 200, h: 20, color: COLOR_PLATFORM },
    { x: 350, y: 330, w: 160, h: 16, color: COLOR_PLATFORM },
    { x: 540, y: 460, w: 180, h: 20, color: COLOR_PLATFORM },
    { x: 580, y: 330, w: 150, h: 16, color: COLOR_PLATFORM },
    { x: 760, y: 460, w: 200, h: 20, color: COLOR_PLATFORM },

    // Screen 2 ── Pacing gate / checkpoint chamber
    { x: 1000, y: 460, w: 240, h: 20, color: COLOR_PLATFORM },
    { x: 1080, y: 350, w: 120, h: 16, color: COLOR_PLATFORM },
    { x: 1280, y: 460, w: 380, h: 20, color: COLOR_PLATFORM },
    { x: 1340, y: 320, w: 140, h: 16, color: COLOR_PLATFORM },
    { x: 1700, y: 460, w: 220, h: 20, color: COLOR_PLATFORM },

    // Screen 3 ── Symmetrical fork with divergent hazard profiles
    { x: 1960, y: 460, w: 180, h: 20, color: COLOR_PLATFORM },
    { x: 2160, y: 340, w: 160, h: 16, color: COLOR_PLATFORM },
    { x: 2360, y: 320, w: 140, h: 16, color: COLOR_PLATFORM },
    { x: 2160, y: 460, w: 360, h: 20, color: COLOR_PLATFORM },
    { x: 2560, y: 460, w: 320, h: 20, color: COLOR_PLATFORM },
  ],

  hazards: [
    {
      id: 'l3-spike-1',
      type: 'spike',
      x: 500,
      y: 440,
      w: 35,
      h: 20,
    },
    {
      id: 'l3-patrol-gate',
      type: 'moving',
      x: 1400,
      y: 440,
      w: 26,
      h: 20,
      patrolX: 1540,
      speed: 95,
    },
    {
      id: 'l3-spike-2',
      type: 'spike',
      x: 2320,
      y: 440,
      w: 40,
      h: 20,
    },
  ],

  exit: {
    x: 2800,
    y: 380,
    w: 40,
    h: 80,
  },

  decisionPoints: [
    { id: 'dp-3-tier',  x: 400,  y: 420, options: ['left', 'right'] },
    { id: 'dp-3-gate',  x: 1200, y: 430, options: ['left', 'right'] },
    { id: 'dp-3-split', x: 2020, y: 430, options: ['left', 'right'] },
  ],
};

// ─── LEVEL 4 ── PERSONAL ──────────────────────────────────────────────────────
// Purpose: Target the player's top 2–3 habits.
// Adaptive intensity: 3–4/5. Hazards feel suspiciously tailored.
const LEVEL_4: LevelData = {
  id: 4,
  worldWidth: 2880,
  worldHeight: 540,
  playerStart: { x: 80, y: 420 },

  platforms: [
    // Screen 1 ── Decoy side path & multi-hazard gauntlet
    { x: 0,   y: 460, w: 200, h: 20, color: COLOR_PLATFORM },
    { x: 250, y: 460, w: 140, h: 20, color: COLOR_PLATFORM },
    { x: 280, y: 290, w: 110, h: 16, color: COLOR_PLATFORM }, // Decoy optional ledge
    { x: 430, y: 460, w: 180, h: 20, color: COLOR_PLATFORM },
    { x: 650, y: 460, w: 160, h: 20, color: COLOR_PLATFORM },
    { x: 700, y: 360, w: 100, h: 16, color: COLOR_PLATFORM },
    { x: 850, y: 460, w: 150, h: 20, color: COLOR_PLATFORM },

    // Screen 2 ── Dynamic counter-weighted fork
    { x: 1040, y: 460, w: 180, h: 20, color: COLOR_PLATFORM },
    { x: 1240, y: 360, w: 130, h: 16, color: COLOR_PLATFORM },
    { x: 1400, y: 300, w: 130, h: 16, color: COLOR_PLATFORM },
    { x: 1550, y: 360, w: 130, h: 16, color: COLOR_PLATFORM },
    { x: 1240, y: 460, w: 440, h: 20, color: COLOR_PLATFORM },
    { x: 1720, y: 460, w: 200, h: 20, color: COLOR_PLATFORM },

    // Screen 3 ── Synchronized timing corridor
    { x: 1960, y: 460, w: 120, h: 20, color: COLOR_PLATFORM },
    { x: 2120, y: 460, w: 120, h: 20, color: COLOR_PLATFORM },
    { x: 2160, y: 350, w: 100, h: 16, color: COLOR_PLATFORM },
    { x: 2300, y: 330, w: 140, h: 16, color: COLOR_PLATFORM },
    { x: 2280, y: 460, w: 180, h: 20, color: COLOR_PLATFORM },
    { x: 2500, y: 460, w: 380, h: 20, color: COLOR_PLATFORM },
  ],

  hazards: [
    {
      id: 'l4-spike-decoy',
      type: 'spike',
      x: 320,
      y: 270,
      w: 30,
      h: 20,
    },
    {
      id: 'l4-spike-gap',
      type: 'spike',
      x: 400,
      y: 440,
      w: 30,
      h: 20,
    },
    {
      id: 'l4-patrol-fork',
      type: 'moving',
      x: 1340,
      y: 440,
      w: 26,
      h: 20,
      patrolX: 1460,
      speed: 110,
    },
    {
      id: 'l4-spike-corridor',
      type: 'spike',
      x: 2080,
      y: 440,
      w: 35,
      h: 20,
    },
  ],

  exit: {
    x: 2800,
    y: 380,
    w: 40,
    h: 80,
  },

  decisionPoints: [
    { id: 'dp-4-decoy',    x: 300,  y: 420, options: ['left', 'right'] },
    { id: 'dp-4-fork',     x: 1120, y: 430, options: ['left', 'right'] },
    { id: 'dp-4-gauntlet', x: 2140, y: 430, options: ['left', 'right'] },
  ],
};

// ─── LEVEL 5 ── PERSONAL (FINAL LEVEL) ────────────────────────────────────────
// Purpose: Climax level adapting to up to 3 dominant learned traits.
// The level communicates: "I have been paying attention."
// Solvability requirement: Every decision point retains viable counterplay.
const LEVEL_5: LevelData = {
  id: 5,
  worldWidth: 2880,
  worldHeight: 540,
  playerStart: { x: 80, y: 420 },

  platforms: [
    // Screen 1 ── The Threshold (Explorer decoy & jumping choice)
    { x: 0,    y: 460, w: 220, h: 20, color: COLOR_PLATFORM },
    { x: 280,  y: 460, w: 180, h: 20, color: COLOR_PLATFORM },
    { x: 320,  y: 280, w: 120, h: 16, color: COLOR_PLATFORM }, // Optional high shelf (decoy slot)
    { x: 520,  y: 460, w: 220, h: 20, color: COLOR_PLATFORM },
    { x: 600,  y: 360, w: 100, h: 16, color: COLOR_PLATFORM }, // Jump-heavy aerial route
    { x: 800,  y: 460, w: 180, h: 20, color: COLOR_PLATFORM },

    // Screen 2 ── The Adaptive Crossroads (Multi-trait convergence fork)
    { x: 1020, y: 460, w: 160, h: 20, color: COLOR_PLATFORM },
    // Left / Upper route (telegraphed hazard if LEFT_BIASED)
    { x: 1220, y: 350, w: 140, h: 16, color: COLOR_PLATFORM },
    { x: 1380, y: 290, w: 130, h: 16, color: COLOR_PLATFORM },
    { x: 1530, y: 350, w: 140, h: 16, color: COLOR_PLATFORM },
    // Right / Lower route (walkable ground path, countered if RIGHT_BIASED)
    { x: 1220, y: 460, w: 450, h: 20, color: COLOR_PLATFORM },
    // Pacing checkpoint (affected by RUSHER gate or CAUTIOUS decaying zone)
    { x: 1420, y: 460, w: 120, h: 20, color: COLOR_PLATFORM },
    // Recovery sanctuary
    { x: 1720, y: 460, w: 200, h: 20, color: COLOR_PLATFORM },
    { x: 1720, y: 360, w: 120, h: 16, color: COLOR_PLATFORM },

    // Screen 3 ── The Predictability Gauntlet & Exit Portal
    { x: 1960, y: 460, w: 140, h: 20, color: COLOR_PLATFORM },
    { x: 2140, y: 460, w: 140, h: 20, color: COLOR_PLATFORM },
    // High air bypass (affected if JUMP_HEAVY)
    { x: 2160, y: 340, w: 110, h: 16, color: COLOR_PLATFORM },
    { x: 2320, y: 320, w: 130, h: 16, color: COLOR_PLATFORM },
    // Low ground crawl (always viable if ceiling is hazardous)
    { x: 2320, y: 460, w: 180, h: 20, color: COLOR_PLATFORM },
    // Pre-exit final platform
    { x: 2540, y: 460, w: 340, h: 20, color: COLOR_PLATFORM },
  ],

  hazards: [
    {
      id: 'l5-spike-gap',
      type: 'spike',
      x: 480,
      y: 440,
      w: 35,
      h: 20,
    },
    {
      id: 'l5-patrol-base',
      type: 'moving',
      x: 1300,
      y: 440,
      w: 26,
      h: 20,
      patrolX: 1420,
      speed: 100,
    },
    {
      id: 'l5-spike-corridor',
      type: 'spike',
      x: 2100,
      y: 440,
      w: 35,
      h: 20,
    },
  ],

  exit: {
    x: 2800,
    y: 380,
    w: 40,
    h: 80,
  },

  decisionPoints: [
    { id: 'dp-5-entry',    x: 310,  y: 420, options: ['left', 'right'] },
    { id: 'dp-5-fork',     x: 1100, y: 430, options: ['left', 'right'] },
    { id: 'dp-5-gauntlet', x: 2100, y: 430, options: ['left', 'right'] },
  ],
};

export const LEVEL_CATALOG: Record<number, LevelData> = {
  1: LEVEL_1,
  2: LEVEL_2,
  3: LEVEL_3,
  4: LEVEL_4,
  5: LEVEL_5,
};

export function getLevelData(id: number): LevelData {
  return LEVEL_CATALOG[id] ?? LEVEL_1;
}

/**
 * Deterministically applies an AdaptationPlan to a level template.
 * Spawns or tunes adaptive hazards according to learned traits and intensity.
 */
export function applyPlanToLevel(baseLevel: LevelData, plan: AdaptationPlan): LevelData {
  // Deep clone level data to prevent mutating the template
  const level: LevelData = {
    ...baseLevel,
    platforms: [...baseLevel.platforms],
    hazards: baseLevel.hazards.map(h => ({ ...h })),
    decisionPoints: [...baseLevel.decisionPoints],
  };

  if (plan.level === 1 || plan.modifiers.length === 0) {
    return level;
  }

  for (let i = 0; i < plan.modifiers.length; i++) {
    const mod = plan.modifiers[i];
    if (mod.intensity <= 0 || mod.trait === 'NEUTRAL') continue;

    switch (mod.trait) {
      case 'LEFT_BIASED': {
        // Introduce clearly telegraphed hazard on attractive left path (targetX >= 1200)
        const leftHazard: HazardDef = {
          id: `adapt-left-${plan.level}-${i}`,
          type: 'spike',
          x: mod.targetX ?? 1360,
          y: (mod.targetY ?? 360) - 20,
          w: 36,
          h: 20,
        };
        level.hazards.push(leftHazard);
        break;
      }

      case 'RIGHT_BIASED': {
        // Counter right shortcut while keeping left route viable
        const rightHazard: HazardDef = {
          id: `adapt-right-${plan.level}-${i}`,
          type: 'moving',
          x: mod.targetX ?? 1420,
          y: 440,
          w: 26,
          h: 20,
          patrolX: (mod.targetX ?? 1420) + 90,
          speed: 80 + mod.intensity * 25,
        };
        level.hazards.push(rightHazard);
        break;
      }

      case 'JUMP_HEAVY': {
        // Risky high air hazard over familiar obstacle
        const airHazard: HazardDef = {
          id: `adapt-jump-${plan.level}-${i}`,
          type: 'spike',
          x: mod.targetX ?? 2000,
          y: (mod.targetY ?? 340) - 40,
          w: 48,
          h: 20,
        };
        level.hazards.push(airHazard);
        break;
      }

      case 'RUSHER': {
        // Speed-reactive timed gate
        const rushHazard: HazardDef = {
          id: `adapt-rush-${plan.level}-${i}`,
          type: 'moving',
          x: mod.targetX ?? 1600,
          y: 440,
          w: 28,
          h: 20,
          patrolX: (mod.targetX ?? 1600) + 120,
          speed: 100 + mod.intensity * 35,
        };
        level.hazards.push(rushHazard);
        break;
      }

      case 'CAUTIOUS': {
        // Decaying safe zone hazard closing in on prolonged waiting
        const cautionHazard: HazardDef = {
          id: `adapt-caution-${plan.level}-${i}`,
          type: 'spike',
          x: mod.targetX ?? 1100,
          y: 440,
          w: 32,
          h: 20,
        };
        level.hazards.push(cautionHazard);
        break;
      }

      case 'REPETITIVE': {
        // Invert patrol hazard timing
        for (const h of level.hazards) {
          if (h.type === 'moving' && h.speed) {
            h.speed = -h.speed; // invert sequence
          }
        }
        break;
      }

      case 'EXPLORER': {
        // Decoy side path hazard
        const decoyHazard: HazardDef = {
          id: `adapt-decoy-${plan.level}-${i}`,
          type: 'spike',
          x: mod.targetX ?? 320,
          y: (mod.targetY ?? 280) - 10,
          w: 30,
          h: 20,
        };
        level.hazards.push(decoyHazard);
        break;
      }
    }
  }

  return level;
}
