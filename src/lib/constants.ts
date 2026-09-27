// ─── Game constants ───────────────────────────────────────────────────────────

export const GAME_WIDTH  = 960;
export const GAME_HEIGHT = 540;

// Physics
export const GRAVITY        = 1400;
export const PLAYER_SPEED   = 220;
export const JUMP_VELOCITY  = -580;
export const MAX_JUMPS      = 1; // single jump only

// Colours (shared between Phaser & CSS)
export const COLOR_BG        = 0x0a0a0f;
export const COLOR_PLATFORM  = 0x2a2a3a;
export const COLOR_PLAYER    = 0x7c3aed; // violet
export const COLOR_HAZARD    = 0xef4444; // red
export const COLOR_EXIT      = 0x10b981; // emerald
export const COLOR_COIN      = 0xfbbf24; // amber
export const COLOR_SPIKE     = 0xf97316; // orange

// HUD
export const HUD_PADDING = 16;

// Level IDs
export const LEVEL_IDS = [1, 2, 3, 4, 5] as const;
export type LevelId = (typeof LEVEL_IDS)[number];

// Scene keys
export const SCENE_BOOT    = 'BootScene';
export const SCENE_LEVEL   = 'LevelScene';
export const SCENE_GAMEOVER = 'GameOverScene';

// Local-storage keys
export const LS_MUTED         = 'tgthy_muted';
export const LS_REDUCED_MOTION = 'tgthy_reduced_motion';
