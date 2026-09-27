// ─── Hazard entity ────────────────────────────────────────────────────────────
import * as Phaser from 'phaser';
import type { HazardDef } from '@/game/types';
import { COLOR_HAZARD, COLOR_SPIKE } from '@/lib/constants';

export class Hazard extends Phaser.Physics.Arcade.Image {
  readonly hazardId: string;
  readonly hazardType: HazardDef['type'];
  private patrolX?: number;
  private speed: number;
  private patrolDir = 1;

  constructor(scene: Phaser.Scene, def: HazardDef) {
    const texKey = `__hazard_${def.type}__`;
    ensureHazardTexture(scene, def.type);
    super(scene, def.x + def.w / 2, def.y + def.h / 2, texKey);

    this.hazardId   = def.id;
    this.hazardType = def.type;
    this.patrolX    = def.patrolX;
    this.speed      = def.speed ?? 0;

    scene.add.existing(this);
    scene.physics.add.existing(this, false);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setImmovable(true);
    body.setAllowGravity(false);
    if (def.type === 'moving') {
      body.setVelocityX(this.speed);
    }

    this.setDisplaySize(def.w, def.h);
    this.setDepth(5);
  }

  update(): void {
    if (this.hazardType !== 'moving' || this.patrolX === undefined) return;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const originX = this.x - body.velocity.x / this.speed * 0;

    if (this.patrolDir === 1 && this.x >= this.patrolX) {
      this.patrolDir = -1;
      body.setVelocityX(-this.speed);
    } else if (this.patrolDir === -1 && this.x <= this.x - (this.patrolX - this.x)) {
      // reset
      this.patrolDir = 1;
      body.setVelocityX(this.speed);
    }
    void originX;
  }
}

function ensureHazardTexture(scene: Phaser.Scene, type: HazardDef['type']): void {
  const key = `__hazard_${type}__`;
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0 });
  if (type === 'spike') {
    g.fillStyle(COLOR_SPIKE);
    // triangle spike shape 40×20
    g.fillTriangle(0, 20, 20, 0, 40, 20);
    g.generateTexture(key, 40, 20);
  } else {
    g.fillStyle(COLOR_HAZARD);
    g.fillRect(0, 0, 24, 20);
    g.generateTexture(key, 24, 20);
  }
  g.destroy();
}

