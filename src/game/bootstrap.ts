// ─── bootstrap.ts — Phaser bootstrapper ──────────────────────────────────────
// Lazily imports Phaser (browser-only) to avoid SSR breakage.
// Returns a cleanup function to destroy the game instance.
import type { BridgeCallback } from '@/game/types';
import type { GameSettings } from '@/game/types';

let gameInstance: import('phaser').Game | null = null;

export async function bootstrapGame(
  containerId: string,
  onBridge: BridgeCallback,
  settings: GameSettings,
): Promise<() => void> {
  // Guard: never mount twice
  if (gameInstance) {
    gameInstance.destroy(true);
    gameInstance = null;
  }
  if (typeof document !== 'undefined') {
    const el = document.getElementById(containerId);
    if (el) el.innerHTML = '';
  }

  // Dynamic import — Phaser only runs in the browser
  const [Phaser, { buildPhaserConfig }, { LevelScene }, { sessionManager }] =
    await Promise.all([
      import('phaser'),
      import('@/game/config'),
      import('@/game/scenes/LevelScene'),
      import('@/game/systems/SessionManager'),
    ]);

  // Start a fresh session
  sessionManager.start();

  // Build scene list
  const scenes = [LevelScene];

  const config = buildPhaserConfig(containerId, scenes);

  const thisGame = new Phaser.Game(config);
  gameInstance = thisGame;

  if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>).__PHASER_GAME__ = thisGame;
    (window as unknown as Record<string, unknown>).__SESSION_MANAGER__ = sessionManager;
  }

  // Wait for boot then start LevelScene with initial data
  thisGame.events.once('ready', () => {
    thisGame.scene.start('LevelScene', {
      levelId:  1,
      attempts: 0,
      onBridge,
      muted:    settings.muted,
    });
  });

  return function destroyGame() {
    thisGame.destroy(true);
    if (gameInstance === thisGame) {
      gameInstance = null;
    }
    if (
      typeof window !== 'undefined' &&
      (window as unknown as Record<string, unknown>).__PHASER_GAME__ === thisGame
    ) {
      (window as unknown as Record<string, unknown>).__PHASER_GAME__ = null;
    }
  };
}

