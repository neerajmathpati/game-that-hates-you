// ─── Phaser game config ───────────────────────────────────────────────────────
// config.ts is only imported dynamically (inside bootstrap.ts) so Phaser
// value imports are safe here — this file never runs on the server.
import * as Phaser from 'phaser';

import { GAME_WIDTH, GAME_HEIGHT, COLOR_BG } from '@/lib/constants';

export function buildPhaserConfig(
  parent: string,
  scenes: Phaser.Types.Scenes.SceneType[],
): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent,
    backgroundColor: `#${COLOR_BG.toString(16).padStart(6, '0')}`,
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 }, // gravity applied per-body in Player
        debug:
          process.env.NODE_ENV === 'development' &&
          process.env.NEXT_PUBLIC_ENABLE_DEBUG === 'true',
      },
    },
    scene: scenes,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    audio: {
      disableWebAudio: false,
    },
    render: {
      antialias: false,
      pixelArt: false,
    },
    input: {
      keyboard: true,
      mouse: true,
      touch: true,
      gamepad: false,
    },
  };
}

