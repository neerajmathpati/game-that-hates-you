// ─── settings.ts — localStorage helpers ──────────────────────────────────────
import { LS_MUTED, LS_REDUCED_MOTION } from './constants';
import type { GameSettings } from '@/game/types';

function safeGet(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore quota errors
  }
}

export function loadSettings(): GameSettings {
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  return {
    muted: safeGet(LS_MUTED) === 'true',
    reducedMotion: safeGet(LS_REDUCED_MOTION) === 'true' || prefersReducedMotion,
  };
}

export function saveSettings(settings: Partial<GameSettings>): void {
  if (settings.muted !== undefined) {
    safeSet(LS_MUTED, String(settings.muted));
  }
  if (settings.reducedMotion !== undefined) {
    safeSet(LS_REDUCED_MOTION, String(settings.reducedMotion));
  }
}
