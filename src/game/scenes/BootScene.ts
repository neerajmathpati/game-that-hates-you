// ─── BootScene — stub scene for preloading ────────────────────────────────────
import * as Phaser from 'phaser';
import { SCENE_BOOT } from '@/lib/constants';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_BOOT });
  }

  preload(): void {
    // Future: preload audio / atlas here
  }

  create(): void {
    // Boot scene transitions to LevelScene via bootstrap.ts
  }
}

