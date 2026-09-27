// ─── Shared TypeScript types ─────────────────────────────────────────────────

// ── Events ──────────────────────────────────────────────────────────────────

export type ActionType =
  | 'move'
  | 'jump'
  | 'land'
  | 'decision'
  | 'interact'
  | 'death'
  | 'retry'
  | 'level_start'
  | 'level_complete';

export interface GameEvent {
  /** ms since session start */
  t: number;
  type: ActionType;
  level: number;
  x?: number;
  y?: number;
  choice?: 'left' | 'right' | 'up' | 'down';
  hazardId?: string;
  context?: string;
}

// ── Behavior traits ───────────────────────────────────────────────────────────

export type TraitId =
  | 'LEFT_BIASED'
  | 'RIGHT_BIASED'
  | 'JUMP_HEAVY'
  | 'RUSHER'
  | 'CAUTIOUS'
  | 'REPETITIVE'
  | 'EXPLORER';

export interface BehaviorTrait {
  id: TraitId;
  /** 0–1 strength of evidence */
  score: number;
  /** 0–1 quantity / consistency */
  confidence: number;
  evidenceCount: number;
  lastUpdatedAt: number;
}

// ── Player profile ────────────────────────────────────────────────────────────

export interface PlayerProfile {
  traits: BehaviorTrait[];
  attempts: number;
  deaths: number;
  jumps: number;
  leftChoices: number;
  rightChoices: number;
  avgHesitationMs: number;
  sessionStart: number;
}

// ── Level architecture ────────────────────────────────────────────────────────

export interface DecisionPoint {
  id: string;
  x: number;
  y: number;
  /** Options available at this point */
  options: Array<'left' | 'right' | 'up' | 'down'>;
}

export interface ModifierSlot {
  id: string;
  supports: TraitId[];
  intensity: 0 | 1 | 2 | 3;
  x?: number;
  y?: number;
  description?: string;
}

export interface LevelModifier {
  trait: TraitId | 'NEUTRAL';
  modifier: string;
  intensity: number;
  counterplay: string;
  slotId?: string;
  targetX?: number;
  targetY?: number;
  parameters?: Record<string, number | string | boolean>;
}

export interface LevelModifierSet {
  level: number;
  modifiers: LevelModifier[];
  seed?: number;
  ruleSummary?: string;
}

export interface LevelTemplate {
  id: number;
  sceneKey: string;
  durationTargetSec: number;
  decisionPoints: DecisionPoint[];
  modifierSlots: ModifierSlot[];
}

export interface AdaptationPlan {
  level: number;
  seed: number;
  activeTraits: TraitId[];
  modifiers: LevelModifier[];
  modifierSet: LevelModifierSet;
  modifierMap?: Record<string, LevelModifier>;
}

// ── Platform & hazard data ────────────────────────────────────────────────────

export interface PlatformDef {
  x: number;
  y: number;
  w: number;
  h: number;
  color?: number;
}

export interface HazardDef {
  id: string;
  type: 'spike' | 'pit' | 'moving';
  x: number;
  y: number;
  w: number;
  h: number;
  color?: number;
  /** for moving hazards */
  patrolX?: number;
  speed?: number;
}

export interface ExitDef {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LevelData {
  id: number;
  worldWidth: number;
  worldHeight: number;
  playerStart: { x: number; y: number };
  platforms: PlatformDef[];
  hazards: HazardDef[];
  exit: ExitDef;
  decisionPoints: DecisionPoint[];
}

// ── Bridge events (Phaser → React) ───────────────────────────────────────────

export type BridgeEventType =
  | 'death'
  | 'retry'
  | 'level_complete'
  | 'observation'
  | 'pause'
  | 'resume'
  | 'game_over';

export interface BridgeEvent {
  type: BridgeEventType;
  payload?: Record<string, unknown>;
}

export type BridgeCallback = (event: BridgeEvent) => void;

// ── Settings ─────────────────────────────────────────────────────────────────

export interface GameSettings {
  muted: boolean;
  reducedMotion: boolean;
}

