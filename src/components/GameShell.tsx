'use client';

// ─── GameShell — mounts/unmounts Phaser exactly once ─────────────────────────
// Key rules:
//   • Phaser is only imported dynamically (browser-only)
//   • React state is updated ONLY on coarse bridge events (not per frame)
//   • Cleanup destroys game on unmount (prevents duplicate instances)

import { useEffect, useRef, useCallback, useState } from 'react';
import { bootstrapGame } from '@/game/bootstrap';
import { loadSettings, saveSettings } from '@/lib/settings';
import { sessionManager } from '@/game/systems/SessionManager';
import { revealDirector } from '@/game/systems/RevealDirector';
import { soundSystem } from '@/game/systems/SoundSystem';
import { GameOverlay } from './GameOverlay';
import { ObservationToast } from './ObservationToast';
import { EndingScreen } from './EndingScreen';
import { DebugPanel } from './DebugPanel';
import type { BridgeEvent } from '@/game/types';

const CONTAINER_ID = 'phaser-game-container';

export function GameShell() {
  const destroyRef    = useRef<(() => void) | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [isPaused, setIsPaused]     = useState(false);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [attempts, setAttempts]     = useState(0);
  const [observation, setObservation] = useState<string | null>(null);
  const [gameOver, setGameOver]     = useState(false);
  const [settings, setSettings]     = useState(loadSettings);
  const [level5IntroVisible, setLevel5IntroVisible] = useState(false);

  // ── Bridge callback (Phaser → React) ──────────────────────────────────────
  // Stable reference via useCallback + ref
  const onBridge = useCallback((event: BridgeEvent) => {
    switch (event.type) {
      case 'death':
        break; // fast auto-retry — no React state needed
      case 'retry':
        setAttempts(event.payload?.attempts as number ?? 0);
        break;
      case 'level_complete': {
        const completedLevel = event.payload?.level as number ?? 1;
        if (completedLevel === 4) {
          setLevel5IntroVisible(true);
          setTimeout(() => setLevel5IntroVisible(false), 3500);
        }
        setCurrentLevel(Math.min(completedLevel + 1, 5));
        setAttempts(0);
        break;
      }
      case 'observation':
        setObservation(event.payload?.message as string ?? null);
        break;
      case 'pause':
        setIsPaused(true);
        break;
      case 'resume':
        setIsPaused(false);
        break;
      case 'game_over':
        setGameOver(true);
        break;
    }
  }, []);

  // ── Boot ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        setLoading(true);
        setError(null);
        if (typeof window !== 'undefined') {
          (window as unknown as Record<string, unknown>).__TRIGGER_BRIDGE__ = onBridge;
        }
        const destroy = await bootstrapGame(CONTAINER_ID, onBridge, settings);
        if (cancelled) {
          destroy();
          return;
        }
        destroyRef.current = destroy;
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load game');
          setLoading(false);
        }
      }
    }

    void boot();

    return () => {
      cancelled = true;
      if (typeof window !== 'undefined') {
        (window as unknown as Record<string, unknown>).__TRIGGER_BRIDGE__ = null;
      }
      destroyRef.current?.();
      destroyRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally run once

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleResume = useCallback(() => {
    setIsPaused(false);
    onBridge({ type: 'resume' });
  }, [onBridge]);

  const handleRestart = useCallback(() => {
    setIsPaused(false);
    setGameOver(false);
    setCurrentLevel(1);
    setAttempts(0);
    setObservation(null);
    destroyRef.current?.();
    sessionManager.reset();
    revealDirector.reset();
    void bootstrapGame(CONTAINER_ID, onBridge, settings).then(d => {
      destroyRef.current = d;
    });
  }, [onBridge, settings]);

  const handleToggleMute = useCallback(() => {
    setSettings(prev => {
      const next = { ...prev, muted: !prev.muted };
      soundSystem.muted = next.muted;
      saveSettings({ muted: next.muted });
      return next;
    });
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100%', background: '#0a0a0f', color: '#ef4444',
        fontFamily: 'monospace', padding: 32, textAlign: 'center',
      }}>
        <div>
          <p style={{ fontSize: 18, marginBottom: 8 }}>Failed to load game</p>
          <p style={{ fontSize: 12, color: '#6b7280' }}>{error}</p>
          <button
            onClick={handleRestart}
            style={{ marginTop: 16, background: 'none', border: '1px solid #ef4444',
              color: '#ef4444', cursor: 'pointer', fontFamily: 'monospace',
              padding: '8px 24px', borderRadius: 4 }}
          >
            RETRY
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#0a0a0f' }}>
      {/* Loading screen */}
      {loading && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
          justifyContent: 'center', background: '#0a0a0f', zIndex: 50,
        }}>
          <div style={{ textAlign: 'center', fontFamily: 'monospace' }}>
            <p style={{ color: '#7c3aed', letterSpacing: 4, fontSize: 12 }}>LOADING</p>
            <div style={{ marginTop: 12, display: 'flex', gap: 6, justifyContent: 'center' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 6, height: 6, borderRadius: '50%', background: '#7c3aed',
                  animation: `pulse 1s ease-in-out ${i * 0.2}s infinite`,
                }} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Phaser canvas target */}
      <div
        id={CONTAINER_ID}
        style={{ width: '100%', height: '100%' }}
        aria-label="Game canvas"
      />

      {/* React overlays — updated only from bridge events */}
      {!loading && !gameOver && (
        <GameOverlay
          isPaused={isPaused}
          currentLevel={currentLevel}
          attempts={attempts}
          muted={settings.muted}
          onResume={handleResume}
          onRestart={handleRestart}
          onToggleMute={handleToggleMute}
          onPause={() => setIsPaused(true)}
        />
      )}

      {/* Level 5 intro overlay */}
      {currentLevel === 5 && level5IntroVisible && !gameOver && (
        <div
          id="level-5-intro-overlay"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(5, 5, 12, 0.88)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 400,
            backdropFilter: 'blur(8px)',
            transition: 'opacity 0.8s ease',
            pointerEvents: 'none',
          }}
        >
          <p
            style={{
              color: '#ef4444',
              fontFamily: 'monospace',
              fontSize: 12,
              letterSpacing: 6,
              marginBottom: 12,
              fontWeight: 700,
            }}
          >
            {'// LEVEL 5 • THE PERSONAL LEVEL'}
          </p>
          <h1
            style={{
              color: '#f9fafb',
              fontFamily: 'monospace',
              fontSize: 26,
              letterSpacing: 4,
              textAlign: 'center',
              textShadow: '0 0 20px rgba(239, 68, 68, 0.6)',
            }}
          >
            &ldquo;I have been paying attention.&rdquo;
          </h1>
        </div>
      )}

      {observation && (
        <ObservationToast
          message={observation}
          onDismiss={() => setObservation(null)}
        />
      )}

      {gameOver && (
        <EndingScreen
          profile={sessionManager.profile}
          onPlayAgain={handleRestart}
        />
      )}

      {/* Dev-only debug panel */}
      <DebugPanel />
    </div>
  );
}
