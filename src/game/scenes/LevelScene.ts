// ─── LevelScene — core Phaser scene ──────────────────────────────────────────
// All game-loop logic lives here. React is notified only via bridge callbacks.
import * as Phaser from 'phaser';
import { Player, createPlayerTexture } from '@/game/entities/Player';
import { Hazard } from '@/game/entities/Hazard';
import { Exit } from '@/game/entities/Exit';
import { EventRecorder } from '@/game/systems/EventRecorder';
import { getLevelData, applyPlanToLevel } from '@/game/levels/levelCatalog';
import { adaptationEngine } from '@/game/systems/AdaptationEngine';
import { revealDirector } from '@/game/systems/RevealDirector';
import { sessionManager } from '@/game/systems/SessionManager';
import { extractFeatures } from '@/game/systems/FeatureExtractor';
import { BehaviorAnalyzer } from '@/game/systems/BehaviorAnalyzer';
import { soundSystem } from '@/game/systems/SoundSystem';
import { loadSettings } from '@/lib/settings';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  COLOR_BG,
  COLOR_PLATFORM,
  SCENE_LEVEL,
  HUD_PADDING,
} from '@/lib/constants';
import type { BridgeCallback, LevelData } from '@/game/types';

const RETRY_DELAY_MS   = 400; // death → auto-retry feel
const COMPLETE_DELAY_MS = 600;
const PIT_DEATH_Y       = 580; // below world floor

export interface LevelSceneData {
  levelId: number;
  attempts: number;
  onBridge: BridgeCallback;
  muted: boolean;
}

export class LevelScene extends Phaser.Scene {
  // ── Scene data ───────────────────────────────────────────────────────────
  private levelId!: number;
  private levelData!: LevelData;
  private onBridge!: BridgeCallback;

  // ── Entities ─────────────────────────────────────────────────────────────
  private player!: Player;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private hazards!: Phaser.Physics.Arcade.Group;
  private hazardList: Hazard[] = [];
  private exit!: Exit;

  // ── State ─────────────────────────────────────────────────────────────────
  private attempts = 0;
  private isDying  = false;
  private isComplete = false;
  private recorder!: EventRecorder;
  private muted = false;

  // ── HUD ───────────────────────────────────────────────────────────────────
  private hudText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;

  // ── Keys ──────────────────────────────────────────────────────────────────
  private keyEsc!: Phaser.Input.Keyboard.Key;
  private keyR!: Phaser.Input.Keyboard.Key;

  constructor() {
    super({ key: SCENE_LEVEL });
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  init(data: LevelSceneData): void {
    this.levelId    = data.levelId ?? 1;
    this.attempts   = data.attempts ?? 0;
    this.onBridge   = data?.onBridge ?? this.onBridge ?? (() => {});
    this.muted      = data.muted ?? false;
    this.isDying    = false;
    this.isComplete = false;

    soundSystem.muted = this.muted;
    soundSystem.setLevel(this.levelId);

    // Update PlayerProfile from session events if available
    const events = sessionManager.getEvents();
    if (events.length > 0) {
      const features = extractFeatures(events);
      const analyzer = new BehaviorAnalyzer();
      const traits = analyzer.analyze(features, sessionManager.profile);
      sessionManager.updateProfile({
        traits,
        attempts: this.attempts,
        jumps: features.jumpCount,
        leftChoices: Math.round(features.decisionCount * features.leftRatio),
        rightChoices: Math.round(features.decisionCount * (1 - features.leftRatio)),
        avgHesitationMs: features.medianHesitationMs,
      });
    }

    // Plan and apply level modifiers
    const plan = adaptationEngine.planLevel(this.levelId, sessionManager.profile);
    const baseData = getLevelData(this.levelId);
    this.levelData = applyPlanToLevel(baseData, plan);

    // Check for reveal observation
    const obs = revealDirector.check(sessionManager.profile, this.levelId, {
      trigger: 'level_start',
    });
    if (obs) {
      soundSystem.playReveal();
      this.onBridge({
        type: 'observation',
        payload: { message: obs.message },
      });
    }
  }

  // ── Create ────────────────────────────────────────────────────────────────

  create(): void {
    this.recorder = new EventRecorder(this.levelId);
    this.recorder.recordLevelStart();

    // World bounds
    this.physics.world.setBounds(
      0, 0,
      this.levelData.worldWidth,
      this.levelData.worldHeight + 200,
    );

    // Background
    this.cameras.main.setBackgroundColor(COLOR_BG);

    // Parallax backdrop strips
    this.buildBackdrop();

    // Platforms
    this.buildPlatforms();

    // Hazards
    this.buildHazards();

    // Exit
    this.exit = new Exit(this, this.levelData.exit);

    // Player texture + entity
    createPlayerTexture(this);
    this.player = new Player(
      this,
      this.levelData.playerStart.x,
      this.levelData.playerStart.y,
      this.recorder,
    );
    this.player.setupInput();

    // Camera
    this.cameras.main.setBounds(
      0, 0,
      this.levelData.worldWidth,
      this.levelData.worldHeight,
    );
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // Colliders
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.hazards, this.platforms);

    // Overlap: player ↔ hazard
    this.physics.add.overlap(
      this.player,
      this.hazards,
      this.handleHazardHit,
      undefined,
      this,
    );

    // Overlap: player ↔ exit
    this.physics.add.overlap(
      this.player,
      this.exit,
      this.handleExitReached,
      undefined,
      this,
    );

    // HUD (fixed to camera)
    this.buildHUD();

    // Level 5 intro overlay
    if (this.levelId === 5) {
      const banner = this.add.text(
        GAME_WIDTH / 2,
        140,
        '"I have been paying attention."',
        {
          fontFamily: 'monospace',
          fontSize: '22px',
          color: '#ef4444',
          stroke: '#000000',
          strokeThickness: 5,
          align: 'center',
        },
      )
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(150)
        .setAlpha(0);

      this.tweens.add({
        targets: banner,
        alpha: { from: 0, to: 1 },
        duration: 600,
        yoyo: true,
        hold: 2400,
        ease: 'Quad.easeInOut',
      });
    }

    // Keys
    this.keyEsc = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.ESC,
    );
    this.keyR = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.R,
    );

    if (typeof window !== 'undefined') {
      (window as unknown as Record<string, unknown>).__ACTIVE_LEVEL_SCENE__ = this;
    }

    this.events.once('shutdown', () => {
      if (
        typeof window !== 'undefined' &&
        (window as unknown as Record<string, unknown>).__ACTIVE_LEVEL_SCENE__ === this
      ) {
        (window as unknown as Record<string, unknown>).__ACTIVE_LEVEL_SCENE__ = null;
      }
    });
  }

  // ── Update (game loop) ────────────────────────────────────────────────────

  update(): void {
    if (this.isComplete) return;

    // Retry key (always available)
    if (Phaser.Input.Keyboard.JustDown(this.keyR)) {
      this.triggerRetry();
      return;
    }

    // Pause
    if (Phaser.Input.Keyboard.JustDown(this.keyEsc)) {
      this.onBridge({ type: 'pause' });
    }

    if (!this.isDying) {
      this.player.update();

      // Pit death: player fell below world
      if (this.player.y > PIT_DEATH_Y) {
        this.handleHazardHit();
      }
    }

    // Moving hazards
    for (const h of this.hazardList) {
      h.update();
    }

    // Update HUD
    this.hudText.setText(`Attempts: ${this.attempts}`);
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  private handleHazardHit = (): void => {
    if (this.isDying || this.player.isDead) return;
    this.isDying = true;
    soundSystem.playHit();
    this.player.die();

    // Track death in profile
    sessionManager.updateProfile({
      deaths: (sessionManager.profile.deaths || 0) + 1,
      attempts: this.attempts,
    });

    this.onBridge({ type: 'death', payload: { level: this.levelId } });

    // Flash screen only if reduced motion is disabled
    const settings = loadSettings();
    if (!settings.reducedMotion) {
      this.cameras?.main?.flash(200, 239, 68, 68);
    }

    // Check if death triggered a personalized observation
    const obs = revealDirector.check(sessionManager.profile, this.levelId, {
      trigger: 'death',
    });
    if (obs) {
      soundSystem.playReveal();
      this.onBridge({
        type: 'observation',
        payload: { message: obs.message },
      });
    }

    // Auto-retry after short delay
    this.time.delayedCall(RETRY_DELAY_MS, () => {
      this.triggerRetry();
    });
  };

  private handleExitReached = (): void => {
    if (this.isComplete || this.isDying) return;
    this.isComplete = true;
    this.recorder.recordLevelComplete();
    soundSystem.playSuccess();

    // Victory flash only if reduced motion is disabled
    const settings = loadSettings();
    if (!settings.reducedMotion) {
      this.cameras?.main?.flash(300, 16, 185, 129);
    }

    this.onBridge({
      type: 'level_complete',
      payload: { level: this.levelId },
    });

    const obs = revealDirector.check(sessionManager.profile, this.levelId, {
      trigger: 'complete',
    });
    if (obs) {
      soundSystem.playReveal();
      this.onBridge({
        type: 'observation',
        payload: { message: obs.message },
      });
    }

    this.time.delayedCall(COMPLETE_DELAY_MS, () => {
      // Advance to next level
      const nextLevel = this.levelId + 1;
      if (nextLevel <= 5) {
        this.scene.restart({
          levelId:  nextLevel,
          attempts: 0,
          onBridge: this.onBridge,
          muted:    this.muted,
        } satisfies LevelSceneData);
      } else {
        this.onBridge({ type: 'game_over' });
      }
    });
  };

  private triggerRetry(): void {
    if (this.isComplete) return;
    this.attempts++;
    this.recorder.recordRetry();
    this.onBridge({ type: 'retry', payload: { attempts: this.attempts } });
    this.scene.restart({
      levelId:  this.levelId,
      attempts: this.attempts,
      onBridge: this.onBridge,
      muted:    this.muted,
    } satisfies LevelSceneData);
  }

  // ── Builders ──────────────────────────────────────────────────────────────

  private buildBackdrop(): void {
    const w = this.levelData.worldWidth;
    const h = GAME_HEIGHT;

    // Dark gradient strips using rectangles
    for (let i = 0; i < 8; i++) {
      const alpha = 0.03 + i * 0.01;
      this.add
        .rectangle(w / 2, 60 + i * 30, w, 25, 0x7c3aed, alpha)
        .setDepth(-2);
    }

    // Decorative background columns
    for (let x = 0; x < w; x += 240) {
      this.add
        .rectangle(x, h / 2, 2, h, 0x2a2a3a, 0.3)
        .setDepth(-1);
    }
  }

  private buildPlatforms(): void {
    this.platforms = this.physics.add.staticGroup();

    if (!this.textures.exists('__blank__')) {
      this.textures.generate('__blank__', { data: ['1'], pixelWidth: 1 });
    }

    for (const def of this.levelData.platforms) {
      const color = def.color ?? COLOR_PLATFORM;

      const rect = this.add.rectangle(
        def.x + def.w / 2,
        def.y + def.h / 2,
        def.w,
        def.h,
        color,
      );
      rect.setDepth(3);

      // Top ledge highlight
      this.add
        .rectangle(def.x + def.w / 2, def.y + 2, def.w, 3, 0xffffff, 0.12)
        .setDepth(4);

      // Physics body (invisible static)
      const body = this.platforms.create(
        def.x + def.w / 2,
        def.y + def.h / 2,
        '__blank__',
      ) as Phaser.Physics.Arcade.Image;
      body.setDisplaySize(def.w, def.h);
      body.setVisible(false);
      body.refreshBody();
    }
  }

  private buildHazards(): void {
    this.hazards    = this.physics.add.group();
    this.hazardList = [];

    for (const def of this.levelData.hazards) {
      const h = new Hazard(this, def);
      this.hazardList.push(h);
      this.hazards.add(h);
    }
  }

  private buildHUD(): void {
    const cam = this.cameras.main;

    // Level label
    this.levelText = this.add
      .text(HUD_PADDING, HUD_PADDING, `LEVEL ${this.levelId}`, {
        fontSize: '11px',
        fontFamily: 'monospace',
        color: '#6b7280',
        letterSpacing: 3,
      })
      .setScrollFactor(0)
      .setDepth(100);

    // Attempt counter
    this.hudText = this.add
      .text(HUD_PADDING, HUD_PADDING + 22, `Attempts: ${this.attempts}`, {
        fontSize: '12px',
        fontFamily: 'monospace',
        color: '#9ca3af',
      })
      .setScrollFactor(0)
      .setDepth(100);

    // Controls hint (bottom right)
    this.add
      .text(
        GAME_WIDTH - HUD_PADDING,
        GAME_HEIGHT - HUD_PADDING,
        'Arrow/WASD · Space/W jump · R retry · Esc pause',
        {
          fontSize: '9px',
          fontFamily: 'monospace',
          color: '#4b5563',
        },
      )
      .setScrollFactor(0)
      .setOrigin(1, 1)
      .setDepth(100);

    void cam;
  }
}

