// ─── templates.ts — level template metadata ───────────────────────────────────
import type { LevelTemplate } from '@/game/types';

export const LEVEL_TEMPLATES: LevelTemplate[] = [
  {
    id: 1,
    sceneKey: 'LevelScene',
    durationTargetSec: 60,
    decisionPoints: [],
    modifierSlots: [],
  },
  {
    id: 2,
    sceneKey: 'LevelScene',
    durationTargetSec: 75,
    decisionPoints: [],
    modifierSlots: [
      { id: 'dir-bias',  supports: ['LEFT_BIASED', 'RIGHT_BIASED'], intensity: 1 },
    ],
  },
  {
    id: 3,
    sceneKey: 'LevelScene',
    durationTargetSec: 75,
    decisionPoints: [],
    modifierSlots: [
      { id: 'dir-bias',  supports: ['LEFT_BIASED', 'RIGHT_BIASED'], intensity: 2 },
      { id: 'jump-trap', supports: ['JUMP_HEAVY'], intensity: 1 },
    ],
  },
  {
    id: 4,
    sceneKey: 'LevelScene',
    durationTargetSec: 90,
    decisionPoints: [],
    modifierSlots: [
      { id: 'dir-bias',  supports: ['LEFT_BIASED', 'RIGHT_BIASED'], intensity: 3 },
      { id: 'jump-trap', supports: ['JUMP_HEAVY'], intensity: 2 },
      { id: 'rush-gate', supports: ['RUSHER'], intensity: 2 },
    ],
  },
  {
    id: 5,
    sceneKey: 'LevelScene',
    durationTargetSec: 120,
    decisionPoints: [],
    modifierSlots: [
      { id: 'dir-bias',    supports: ['LEFT_BIASED', 'RIGHT_BIASED'], intensity: 3 },
      { id: 'jump-trap',   supports: ['JUMP_HEAVY'], intensity: 3 },
      { id: 'rush-gate',   supports: ['RUSHER'], intensity: 3 },
      { id: 'caution-trap',supports: ['CAUTIOUS'], intensity: 2 },
    ],
  },
];

