// ─── Player entity — Phaser 3 ─────────────────────────────────────────────────
import * as Phaser from 'phaser';
import {
  PLAYER_SPEED,
  JUMP_VELOCITY,
  GRAVITY,
  COLOR_PLAYER,
} from '@/lib/constants';
import type { EventRecorder } from '@/game/systems/EventRecorder';
import { soundSystem } from '@/game/systems/SoundSystem';

export class Player extends Phaser.Physics.Arcade.Sprite {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private keyR!: Phaser.Input.Keyboard.Key;
  private recorder: EventRecorder;
  private _isDead = false;

  // Track last horizontal direction for event deduplication
  private lastDirection: 'left' | 'right' | null = null;
  private wasOnGround = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    recorder: EventRecorder,
  ) {
    // Use a rectangle texture generated at runtime
    super(scene, x, y, '__player__');
    this.recorder = recorder;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setGravityY(GRAVITY);
    body.setCollideWorldBounds(false); // handled manually (pit deaths)
    body.setMaxVelocityY(900);
    this.setDepth(10);
  }

  setupInput(): void {
    const kb = this.scene.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.keyW    = kb.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyA    = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD    = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyR    = kb.addKey(Phaser.Input.Keyboard.KeyCodes.R);
  }

  get isDead(): boolean {
    return this._isDead;
  }

  die(): void {
    if (this._isDead) return;
    this._isDead = true;
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    if (body) {
      body.setVelocity(0, -300);
      body.setGravityY(GRAVITY * 0.5);
    }
    this.setTint(0xff0000);
    this.recorder.recordDeath(this.x, this.y);
    soundSystem.playDeath();
  }

  revive(x: number, y: number): void {
    this._isDead = false;
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    if (body) {
      body.reset(x, y);
      body.setGravityY(GRAVITY);
    }
    this.clearTint();
    this.lastDirection = null;
    this.wasOnGround   = false;
  }

  public isMovingLeft = false;
  public isMovingRight = false;
  public wantsJump = false;

  get retryKeyJustDown(): boolean {
    return Phaser.Input.Keyboard.JustDown(this.keyR);
  }

  /** Call once per frame. Returns 'retry' if player pressed R. */
  update(): void {
    if (this._isDead) return;

    const body = this.body as Phaser.Physics.Arcade.Body | null;
    if (!body) return;
    const onGround = body.blocked.down;

    // ── Land event ──────────────────────────────────────────────────────────
    if (onGround && !this.wasOnGround) {
      this.recorder.recordLand(this.x, this.y);
      soundSystem.playLand();
    }
    this.wasOnGround = onGround;

    // ── Horizontal movement ──────────────────────────────────────────────────
    const goLeft  = this.cursors.left.isDown  || this.keyA.isDown || this.isMovingLeft;
    const goRight = this.cursors.right.isDown || this.keyD.isDown || this.isMovingRight;

    if (goLeft && !goRight) {
      body.setVelocityX(-PLAYER_SPEED);
      if (this.lastDirection !== 'left') {
        this.recorder.recordMove('left', this.x, this.y);
        this.lastDirection = 'left';
      }
    } else if (goRight && !goLeft) {
      body.setVelocityX(PLAYER_SPEED);
      if (this.lastDirection !== 'right') {
        this.recorder.recordMove('right', this.x, this.y);
        this.lastDirection = 'right';
      }
    } else {
      body.setVelocityX(0);
      this.lastDirection = null;
    }

    // ── Jump ─────────────────────────────────────────────────────────────────
    const jumpPressed =
      Phaser.Input.Keyboard.JustDown(this.cursors.space) ||
      Phaser.Input.Keyboard.JustDown(this.cursors.up)    ||
      Phaser.Input.Keyboard.JustDown(this.keyW);

    if ((jumpPressed && onGround) || this.wantsJump) {
      this.wantsJump = false;
      body.setVelocityY(JUMP_VELOCITY);
      this.recorder.recordJump(this.x, this.y);
      soundSystem.playJump();
    }
  }

  jump(): void {
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    if (body) {
      body.setVelocityY(JUMP_VELOCITY);
      this.recorder.recordJump(this.x, this.y);
      soundSystem.playJump();
    }
  }
}

/** Generate a rectangle texture for the player (no external asset needed) */
export function createPlayerTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists('__player__')) return;
  const g = scene.make.graphics({ x: 0, y: 0 });
  // Main body
  g.fillStyle(COLOR_PLAYER);
  g.fillRect(0, 0, 24, 32);
  // Eyes
  g.fillStyle(0xffffff);
  g.fillRect(5, 8, 6, 6);
  g.fillRect(13, 8, 6, 6);
  g.fillStyle(0x000000);
  g.fillRect(7, 10, 3, 3);
  g.fillRect(15, 10, 3, 3);
  g.generateTexture('__player__', 24, 32);
  g.destroy();
}

