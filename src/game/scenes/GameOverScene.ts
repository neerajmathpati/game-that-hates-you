// ─── GameOverScene — stub ─────────────────────────────────────────────────────
import * as Phaser from 'phaser';
import { SCENE_GAMEOVER } from '@/lib/constants';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_GAMEOVER });
  }

  create(): void {
    // Game over is handled by React (EndingScreen) via bridge event.
    // This scene is a stub for future use.
  }
}

