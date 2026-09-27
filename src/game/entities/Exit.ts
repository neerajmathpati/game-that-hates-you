// ─── Exit entity ──────────────────────────────────────────────────────────────
import * as Phaser from 'phaser';
import type { ExitDef } from '@/game/types';
import { COLOR_EXIT } from '@/lib/constants';

export class Exit extends Phaser.Physics.Arcade.Image {
  constructor(scene: Phaser.Scene, def: ExitDef) {
    ensureExitTexture(scene);
    super(scene, def.x + def.w / 2, def.y + def.h / 2, '__exit__');

    scene.add.existing(this);
    scene.physics.add.existing(this, true); // static

    this.setDisplaySize(def.w, def.h);
    this.setDepth(5);

    // Subtle pulse animation
    scene.tweens.add({
      targets: this,
      alpha: 0.6,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }
}

function ensureExitTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists('__exit__')) return;
  const g = scene.make.graphics({ x: 0, y: 0 });
  g.fillStyle(COLOR_EXIT);
  g.fillRect(0, 0, 40, 80);
  // door frame
  g.lineStyle(3, 0xffffff, 0.4);
  g.strokeRect(2, 2, 36, 76);
  // handle
  g.fillStyle(0xffffff, 0.6);
  g.fillCircle(30, 40, 4);
  g.generateTexture('__exit__', 40, 80);
  g.destroy();
}

